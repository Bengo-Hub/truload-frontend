"use client";


import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    AxleConfigurationCard,
    CargoTypeModal,
    ComplianceBanner,
    ComplianceTable,
    DriverModal,
    ImageCaptureCard,
    MultideckWeightsCard,
    OriginDestinationModal,
    SCALE_TEST_SUCCESS_DESCRIPTION,
    SCALE_TEST_SUCCESS_MESSAGE,
    TransporterModal,
    VehicleDetailsCard,
    VehicleMakeModal,
    WeighingPageHeader,
    WeighingStepper,
    WeightConfirmationModal,
} from '@/components/weighing';
import { MissingFieldsWarningModal } from '@/components/weighing/MissingFieldsWarningModal';
import { ScaleInfo } from '@/components/weighing/ScaleHealthPanel';
import { ScaleTestModal } from '@/components/weighing/ScaleTestModal';
import { WeighingCaptureStep } from '@/components/weighing/steps/WeighingCaptureStep';
import { WeighingDecisionStep } from '@/components/weighing/steps/WeighingDecisionStep';
import {
    useAllActs,
    useAllSettings,
    useAxleWeightReferences,
    useCreateVehicle,
    useDeleteWeighingTransaction,
    useMyScaleTestStatus,
    useMyStation,
    usePendingWeighings,
    useToleranceSettings,
    useUpdateVehicle,
    useVehicleByRegNo,
    useWeighingAxleConfigurations,
} from '@/hooks/queries';
import { useHasPermission } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMiddleware } from '@/hooks/useMiddleware';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { useWeighing } from '@/hooks/useWeighing';
import { useWeighingUI } from '@/hooks/useWeighingUI';
import { downloadWeightTicketPdf, UpdateWeighingRequest, WeighingTransaction } from '@/lib/api/weighing';
import { apiClient } from '@/lib/api/client';
import { createYardEntry } from '@/lib/api/yard';
import { calculateOverallStatus, validateRequiredFields } from '@/lib/weighing-utils';
import { useAuthStore } from '@/stores/auth.store';
import {
    AxleGroupResult,
    ComplianceStatus,
    DeckWeight,
    WeighingStep
} from '@/types/weighing';
import { ChevronLeft, ChevronRight, Loader2, Scale } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

/**
 * Multideck Weighing Page
 */
export default function MultideckWeighingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const tenantType = user?.tenantType ?? 'AxleLoadEnforcement';
  const isCommercialTenant = tenantType === 'CommercialWeighing';
  const isCommercial = isCommercialTenant || searchParams.get('commercial') === 'true';
  const orgSlug = useOrgSlug();

  // Workflow state
  const [currentStep, setCurrentStep] = useState<WeighingStep>('capture');
  const [completedSteps, setCompletedSteps] = useState<WeighingStep[]>([]);

  // TanStack Query hooks
  const {
    data: currentStation,
    isLoading: isLoadingStation,
    error: stationError,
  } = useMyStation();

  const {
    data: axleConfigurations = [],
    isLoading: isLoadingAxleConfigs,
  } = useWeighingAxleConfigurations();

  // Fetch pending transactions
  const { data: pendingWeighings } = usePendingWeighings(currentStation?.id, 'multideck');
  const pendingTransactions = pendingWeighings?.items ?? [];

  // useWeighingUI hook for unified state management
  const weighingUI = useWeighingUI({ 
    stationId: currentStation?.id,
    currentStation
  });
  const {
    frontViewImage, setFrontViewImage, overviewImage, setOverviewImage,
    handleCaptureFront, handleCaptureOverview, handleScanPlate,
    vehiclePlate, setVehiclePlate, debouncedPlate,
    isPlateDisabled, setIsPlateDisabled,
    selectedCountyId, setSelectedCountyId,
    selectedSubcountyId, setSelectedSubcountyId,
    selectedRoadId, setSelectedRoadId,
    isDriverModalOpen, setIsDriverModalOpen,
    isTransporterModalOpen, setIsTransporterModalOpen,
    isLocationModalOpen, setIsLocationModalOpen,
    locationModalTarget, setLocationModalTarget,
    isVehicleMakeModalOpen, setIsVehicleMakeModalOpen,
    isCargoTypeModalOpen, setIsCargoTypeModalOpen,
    isSavingEntity,
    isScaleTestModalOpen, setIsScaleTestModalOpen,
    showCancelConfirm, setShowCancelConfirm,
    counties, subcounties, roads,
    drivers, transporters, locations, cargoTypes,
    selectedDriverId, setSelectedDriverId,
    selectedTransporterId, setSelectedTransporterId,
    selectedCargoId, setSelectedCargoId,
    selectedOriginId, setSelectedOriginId,
    selectedDestinationId, setSelectedDestinationId,
    vehicleMake, setVehicleMake,
    handleSaveDriver, handleSaveTransporter, handleSaveLocation,
    handleSaveCargoType, handleSaveVehicleMake,
    selectedVehicleId, setSelectedVehicleId,
    comment, setComment,
    permitNo, setPermitNo,
    trailerNo, setTrailerNo,
    reliefVehicleReg, setReliefVehicleReg,
  } = weighingUI;

  // Vehicle lookup mutation
  const createVehicleMutation = useCreateVehicle();
  const updateVehicleMutation = useUpdateVehicle();
  const deleteWeighingMutation = useDeleteWeighingTransaction();

  // Bound state
  const [currentBoundState, setCurrentBoundState] = useState<string | undefined>();
  // Derive bound from station data — default to bound A
  const currentBound = currentBoundState ?? currentStation?.boundACode ?? 'A';

  // Indicator health state
  const [indicators, setIndicators] = useState<ScaleInfo[]>([
    {
      id: 'indicator-1',
      name: 'Weight Indicator',
      status: 'disconnected',
      weight: 0,
      signalStrength: 0,
      capacity: 80000,
      lastReading: new Date(),
      isActive: false,
      make: 'Zedem',
      model: 'ZM-400',
      syncType: 'TCP',
    },
  ]);
  const [isIndicatorConnected, setIsIndicatorConnected] = useState(false);
  const [middlewareConnected, setMiddlewareConnected] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);

  // Live deck weights
  const [liveDeckWeights, setLiveDeckWeights] = useState<{ deck: number; weight: number; status: 'stable' | 'unstable' }[]>([
    { deck: 1, weight: 0, status: 'stable' },
    { deck: 2, weight: 0, status: 'stable' },
    { deck: 3, weight: 0, status: 'stable' },
    { deck: 4, weight: 0, status: 'stable' },
  ]);

  // Scale test status
  const {
    data: scaleTestStatus,
    isLoading: isLoadingScaleTest,
  } = useMyScaleTestStatus(currentBound);

  const isScaleTestCompleted = scaleTestStatus?.hasValidTest ?? false;
  const lastScaleTestAt = scaleTestStatus?.latestTest ? new Date(scaleTestStatus.latestTest.carriedAt) : undefined;

  // Combined loading state
  const isLoadingData = isLoadingStation || isLoadingAxleConfigs || isLoadingScaleTest;
  const loadError = stationError || (currentStation === null && !isLoadingStation)
    ? 'Failed to load station data. Please ensure you are assigned to a station.'
    : null;

  // useWeighing hook
  const weighingHook = useWeighing({
    weighingMode: 'multideck',
    bound: currentBound,
    autoInitialize: true,
  });

  const {
    initializeTransaction,
    captureAxleWeight,
    confirmWeight,
    initiateReweigh,
    updateVehicleDetails,
    resetSession,
    session: weighingSession,
    transaction: weighingTransaction,
    complianceResult,
    reweighCycleNo,
    isLoading: isWeighingLoading,
    error: weighingError,
  } = weighingHook;

  // Acts for compliance (permit/act section at top of Vehicle Details)
  const { data: acts = [] } = useAllActs();
  const { data: allSettings = [] } = useAllSettings();
  const [selectedActId, setSelectedActId] = useState<string | undefined>();
  const defaultActId = acts.find((a) => a.isDefault)?.id ?? acts[0]?.id;
  const effectiveActId = selectedActId || defaultActId;

  // Resolve legal framework and fetch DB tolerance settings (cached 30min)
  const effectiveAct = acts.find(a => a.id === effectiveActId);
  const effectiveLegalFramework = effectiveAct?.code || 'TRAFFIC_ACT';
  const { data: toleranceSettings = [] } = useToleranceSettings(effectiveLegalFramework);

  // Operational tolerance (kg) from ToleranceSetting table (OPERATIONAL_ALLOWANCE)
  // Single source of truth — same table used by backend CalculateComplianceAsync
  const operationalToleranceKg = useMemo(() => {
    const opAllowance = toleranceSettings.find((t: any) => t.code === 'OPERATIONAL_ALLOWANCE' && t.isActive);
    if (opAllowance && opAllowance.toleranceKg !== null && opAllowance.toleranceKg !== undefined) {
      return opAllowance.toleranceKg;
    }
    return 200; // Fallback only if setting not found in DB
  }, [toleranceSettings]);

  const { position: geoPosition, refresh: refreshGeolocation, isSupported: isGeolocationSupported } = useGeolocation({ enableHighAccuracy: true, timeout: 10000 });

  // useMiddleware hook
  const middleware = useMiddleware({
    stationCode: currentStation?.code || 'DEFAULT',
    bound: (currentBound as 'A' | 'B') || 'A',
    mode: 'multideck',
    autoConnect: true,
    clientName: `TruLoad Frontend - ${currentStation?.name || 'Multideck'}`,
    clientType: 'truload-frontend',
    onWeightUpdate: (weight) => {
      if (weight.mode === 'multideck') {
        setLiveDeckWeights([
          { deck: 1, weight: weight.deck1 ?? 0, status: weight.stable ? 'stable' : 'unstable' },
          { deck: 2, weight: weight.deck2 ?? 0, status: weight.stable ? 'stable' : 'unstable' },
          { deck: 3, weight: weight.deck3 ?? 0, status: weight.stable ? 'stable' : 'unstable' },
          { deck: 4, weight: weight.deck4 ?? 0, status: weight.stable ? 'stable' : 'unstable' },
        ]);
      } else {
        setLiveDeckWeights([
          { deck: 1, weight: 0, status: 'stable' },
          { deck: 2, weight: 0, status: 'stable' },
          { deck: 3, weight: 0, status: 'stable' },
          { deck: 4, weight: 0, status: 'stable' },
        ]);
      }
      setIsSimulationMode(weight.simulation || false);
      if (weight.connection?.connected !== undefined) {
        setIsIndicatorConnected(weight.connection.connected);
      }
    },
    onScaleStatusChange: (status) => {
      setIsIndicatorConnected(status.connected);
      setIsSimulationMode(status.simulation || false);
    },
    onConnectionModeChange: (mode) => {
      setMiddlewareConnected(mode !== 'disconnected');
    },
  });

  // Sync middleware connected state
  useEffect(() => {
    setMiddlewareConnected(middleware.connected);
  }, [middleware.connected]);

  // Vehicle state
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [ticketNumber, setTicketNumber] = useState('');

  // Set default axle config
  useEffect(() => {
    if (axleConfigurations.length > 0 && !selectedConfig) {
      const defaultConfig = axleConfigurations.find(c => c.axleCode === '6C') || axleConfigurations[0];
      if (defaultConfig) {
        setSelectedConfig(defaultConfig.axleCode);
      }
    }
  }, [axleConfigurations, selectedConfig]);

  // Weight references
  const selectedConfigId = useMemo(() => {
    if (!selectedConfig || axleConfigurations.length === 0) return undefined;
    const config = axleConfigurations.find(c => c.axleCode === selectedConfig);
    return config?.id;
  }, [selectedConfig, axleConfigurations]);

  const { data: weightReferences = [] } = useAxleWeightReferences(selectedConfigId);

  // Vehicle lookup
  const { data: existingVehicle } = useVehicleByRegNo(debouncedPlate.length >= 5 ? debouncedPlate : undefined);

  useEffect(() => {
    if (existingVehicle?.id) {
      setSelectedVehicleId(existingVehicle.id);
      if (existingVehicle.transporterId) setSelectedTransporterId(existingVehicle.transporterId);
      if (existingVehicle.axleConfigurationId) {
        const config = axleConfigurations.find(c => c.id === existingVehicle.axleConfigurationId);
        if (config) setSelectedConfig(config.axleCode);
      }
      if (existingVehicle.makeModel) setVehicleMake(existingVehicle.makeModel);
    } else {
      setSelectedVehicleId(undefined);
    }
  }, [existingVehicle, axleConfigurations]);

  // Prefill vehicle details form from transaction when we land on vehicle step (e.g. after create or resume)
  const lastPrefilledTransactionIdRef = useRef<string | null>(null);
  useEffect(() => {
    const txn = weighingTransaction;
    if (currentStep !== 'vehicle' || !txn?.id) return;
    if (lastPrefilledTransactionIdRef.current === txn.id) return;
    lastPrefilledTransactionIdRef.current = txn.id;
    if (txn.driverId) setSelectedDriverId(txn.driverId);
    if (txn.transporterId) setSelectedTransporterId(txn.transporterId);
    if (txn.originId) setSelectedOriginId(txn.originId);
    if (txn.destinationId) setSelectedDestinationId(txn.destinationId);
    if (txn.cargoId) setSelectedCargoId(txn.cargoId);
    if (txn.roadId) setSelectedRoadId(txn.roadId);
    if (txn.subcountyId) setSelectedSubcountyId(txn.subcountyId);
    if (txn.vehicleMake) setVehicleMake(txn.vehicleMake);
    if (txn.axleConfiguration) setSelectedConfig(txn.axleConfiguration);
    if (txn.subcountyId && subcounties?.length) {
      const sub = (subcounties as { id: string; countyId?: string }[]).find(s => s.id === txn.subcountyId);
      if (sub?.countyId) setSelectedCountyId(sub.countyId);
    }
  }, [currentStep, weighingTransaction, subcounties]);

  // Sync vehicle make and axle config to Vehicle entity only when a vehicle make is selected; always pass regNo so backend does not 400.
  useEffect(() => {
    if (!selectedVehicleId || !vehiclePlate?.trim()) return;
    if (!vehicleMake) return;

    const timeoutId = setTimeout(() => {
      const config = axleConfigurations.find(c => c.axleCode === selectedConfig);
      const updates: { regNo: string; make?: string; axleConfigurationId?: string } = {
        regNo: vehiclePlate.trim().toUpperCase(),
      };
      let hasChanges = false;

      if (vehicleMake && vehicleMake !== existingVehicle?.makeModel) {
        updates.make = vehicleMake;
        hasChanges = true;
      }
      if (config?.id && config.id !== existingVehicle?.axleConfigurationId) {
        updates.axleConfigurationId = config.id;
        hasChanges = true;
      }

      if (hasChanges) {
        updateVehicleMutation.mutate({
          id: selectedVehicleId,
          payload: updates,
        });
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [selectedVehicleId, vehiclePlate, vehicleMake, selectedConfig, axleConfigurations, existingVehicle, updateVehicleMutation]);

  // Request location when on vehicle step (optional; used for weighing location coordinates)
  useEffect(() => {
    if (currentStep === 'vehicle' && weighingSession?.transactionId && isGeolocationSupported) {
      refreshGeolocation();
    }
  }, [currentStep, weighingSession?.transactionId, isGeolocationSupported, refreshGeolocation]);

  // Derived primitives so sync effect doesn't re-run on every counties/geo ref change (avoids PUT storm)
  const locationCountyName = useMemo(
    () => counties.find((c) => c.id === selectedCountyId)?.name ?? '',
    [counties, selectedCountyId]
  );
  const geoLat = geoPosition?.latitude;
  const geoLng = geoPosition?.longitude;

  // Don't sync for the first few seconds after transaction appears (avoids PUT on load when dropdowns populate)
  const syncAllowedAfterRef = useRef<number>(0);
  useEffect(() => {
    const tid = weighingSession?.transactionId;
    if (tid) {
      if (syncAllowedAfterRef.current === 0) syncAllowedAfterRef.current = Date.now() + 3000;
    } else {
      syncAllowedAfterRef.current = 0;
    }
  }, [weighingSession?.transactionId]);

  // Sync vehicle details (including act for permit/legal framework and optional lat/lng). Debounce 2s + throttle/backoff in updateVehicleDetails.
  useEffect(() => {
    if (!weighingSession?.transactionId) return;

    const timeoutId = setTimeout(() => {
      if (Date.now() < syncAllowedAfterRef.current) return;
      const updates: Partial<UpdateWeighingRequest> = {};
      if (selectedDriverId) updates.driverId = selectedDriverId;
      if (selectedTransporterId) updates.transporterId = selectedTransporterId;
      if (selectedOriginId) updates.originId = selectedOriginId;
      if (selectedDestinationId) updates.destinationId = selectedDestinationId;
      if (selectedCargoId) updates.cargoId = selectedCargoId;
      if (selectedRoadId) updates.roadId = selectedRoadId;
      if (selectedSubcountyId) updates.subcountyId = selectedSubcountyId;
      if (locationCountyName) updates.locationCounty = locationCountyName;
      if (effectiveActId) updates.actId = effectiveActId;
      if (geoLat != null && geoLng != null) {
        updates.locationLat = geoLat;
        updates.locationLng = geoLng;
      }

      if (Object.keys(updates).length > 0) {
        updateVehicleDetails(updates).catch(console.warn);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [
    weighingSession?.transactionId,
    selectedDriverId,
    selectedTransporterId,
    selectedOriginId,
    selectedDestinationId,
    selectedCargoId,
    selectedRoadId,
    selectedSubcountyId,
    selectedCountyId,
    locationCountyName,
    effectiveActId,
    geoLat,
    geoLng,
    updateVehicleDetails,
  ]);

  // Sync selected axle configuration to TruConnect when on vehicle step (WebSocket or API polling)
  useEffect(() => {
    if (currentStep !== 'vehicle' || !weighingSession?.transactionId || !selectedConfig || !currentStation || !vehiclePlate) return;
    const config = axleConfigurations.find(c => c.axleCode === selectedConfig);
    const totalAxles = config?.axleNumber ?? 0;
    if (totalAxles === 0) return;
    middleware.syncTransaction({
      transactionId: weighingSession.transactionId,
      vehicleRegNumber: vehiclePlate,
      axleConfigCode: selectedConfig,
      totalAxles,
      stationId: currentStation.id,
      bound: currentBound || 'A',
      weighingMode: 'multideck',
    });
  }, [currentStep, weighingSession?.transactionId, selectedConfig, vehiclePlate, currentStation, currentBound, axleConfigurations, middleware]);

  // Capture state
  const [isCaptured, setIsCaptured] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isMissingFieldsModalOpen, setIsMissingFieldsModalOpen] = useState(false);
  const [isFinishExitMissingModalOpen, setIsFinishExitMissingModalOpen] = useState(false);
  const [highlightMissingVehicleFields, setHighlightMissingVehicleFields] = useState<string[]>([]);
  const [isCapturingWeight, setIsCapturingWeight] = useState(false);
  const [isFlushingVehicleDetails, setIsFlushingVehicleDetails] = useState(false);

  // Permissions
  const canPrint = useHasPermission('weighing.export');
  const canSendToYard = useHasPermission('weighing.send_to_yard');
  const canSpecialRelease = useHasPermission('case.special_release');

  const deckWeights: DeckWeight[] = liveDeckWeights;
  const isMultideckWeights = middleware.weights?.mode === 'multideck';
  const totalGVW = isMultideckWeights && middleware.weights?.gvw != null
    ? middleware.weights.gvw
    : deckWeights.reduce((sum, d) => sum + d.weight, 0);

  // Group results: deck 1 → A, deck 2 → B, deck 3 → C, deck 4 → D. Only 4 decks; axles are grouped per config.
  const localGroupResults: AxleGroupResult[] = useMemo(() => {
    const deckToGroup: Record<number, string> = { 1: 'A', 2: 'B', 3: 'C', 4: 'D' };
    const deckWeightMap = new Map<string, number>();
    deckWeights.forEach(dw => {
      const group = deckToGroup[dw.deck];
      if (group) deckWeightMap.set(group, dw.weight);
    });

    if (weightReferences.length === 0) {
      // Fallback: use tolerance from DB settings, not hardcoded
      const axleTol =
        toleranceSettings.find((t: any) => t.appliesTo === 'AXLE' && t.isActive && t.legalFramework !== 'BOTH' && t.legalFramework !== 'GLOBAL') ||
        toleranceSettings.find((t: any) => t.appliesTo === 'AXLE' && t.isActive);
      return ['A', 'B', 'C', 'D'].map((groupLabel, index) => {
        const deckNum = index + 1;
        const measuredKg = isCaptured ? (deckWeightMap.get(groupLabel) || 0) : 0;
        const permissibleKg = groupLabel === 'A' ? 8000 : 16000;
        let tolKg = 0;
        if (axleTol) {
          if (axleTol.toleranceKg && axleTol.toleranceKg > 0) tolKg = axleTol.toleranceKg;
          else if (axleTol.tolerancePercentage > 0) tolKg = Math.round(permissibleKg * axleTol.tolerancePercentage / 100);
        }
        const effectiveLimitKg = permissibleKg + tolKg;
        let status: ComplianceStatus = 'LEGAL';
        if (measuredKg > effectiveLimitKg) status = 'OVERLOAD';
        else if (measuredKg > permissibleKg) status = 'WARNING';

        return {
          groupLabel,
          axleType: groupLabel === 'A' ? 'Steering' : 'Tandem',
          axleCount: groupLabel === 'A' ? 1 : 2,
          permissibleKg,
          toleranceKg: tolKg,
          effectiveLimitKg,
          measuredKg,
          overloadKg: Math.max(0, measuredKg - effectiveLimitKg),
          pavementDamageFactor: 0,
          operationalToleranceKg,
          status,
          axles: [{ axleNumber: deckNum, measuredKg, permissibleKg }],
        };
      });
    }

    const groupMap = new Map<string, typeof weightReferences>();
    weightReferences.forEach(ref => {
      const group = ref.axleGrouping || 'A';
      if (!groupMap.has(group)) groupMap.set(group, []);
      groupMap.get(group)!.push(ref);
    });

    const results: AxleGroupResult[] = [];
    for (const groupLabel of Array.from(groupMap.keys()).sort()) {
      const refs = groupMap.get(groupLabel)!;
      const permissibleKg = refs.reduce((sum, r) => sum + r.axleLegalWeightKg, 0);
      // Apply tolerance from DB settings
      // Priority: framework-specific → standard law by axle type → 0% strict
      const isSingleAxle = refs.length <= 1;
      const axleTolerance =
        toleranceSettings.find((t: any) => t.appliesTo === 'AXLE' && t.isActive && t.legalFramework !== 'BOTH' && t.legalFramework !== 'GLOBAL') ||
        toleranceSettings.find((t: any) => t.appliesTo === 'AXLE' && t.isActive && t.legalFramework === 'BOTH');
      let toleranceKg = 0;
      if (axleTolerance && (axleTolerance.toleranceKg ?? 0) > 0) {
        toleranceKg = axleTolerance.toleranceKg;
      } else if (axleTolerance && axleTolerance.tolerancePercentage > 0) {
        toleranceKg = Math.round(permissibleKg * axleTolerance.tolerancePercentage / 100);
      }
      // If framework-specific returned 0, check standard law tolerance by axle type
      if (toleranceKg === 0) {
        const standardCode = isSingleAxle ? 'STANDARD_LAW_SINGLE' : 'STANDARD_LAW_GROUP';
        const standardTolerance = toleranceSettings.find((t: any) => t.code === standardCode && t.isActive);
        if (standardTolerance) {
          if ((standardTolerance.toleranceKg ?? 0) > 0) {
            toleranceKg = standardTolerance.toleranceKg;
          } else if (standardTolerance.tolerancePercentage > 0) {
            toleranceKg = Math.round(permissibleKg * standardTolerance.tolerancePercentage / 100);
          }
        }
      }
      const effectiveLimitKg = permissibleKg + toleranceKg;
      const measuredKg = isCaptured ? (deckWeightMap.get(groupLabel) || 0) : 0;

      results.push({
        groupLabel,
        axleType: refs.length === 1 ? (groupLabel === 'A' ? 'Steering' : 'Single') : (refs.length === 2 ? 'Tandem' : 'Tridem'),
        axleCount: refs.length,
        permissibleKg,
        toleranceKg,
        effectiveLimitKg,
        measuredKg,
        overloadKg: Math.max(0, measuredKg - effectiveLimitKg),
        pavementDamageFactor: 0,
        operationalToleranceKg,
        status: measuredKg > effectiveLimitKg ? 'OVERLOAD' : (measuredKg > permissibleKg ? 'WARNING' : 'LEGAL'),
        axles: refs.map(r => ({ axleNumber: r.axlePosition, measuredKg: Math.round(measuredKg / refs.length), permissibleKg: r.axleLegalWeightKg })),
      });
    }
    return results;
  }, [weightReferences, deckWeights, isCaptured, toleranceSettings, operationalToleranceKg]);

  // When backend returns group results (after weight submission), use those as
  // authoritative source with correct DB-driven tolerance per legal framework.
  const effectiveGroupResults: AxleGroupResult[] = useMemo(() => {
    if (!complianceResult?.groupResults || complianceResult.groupResults.length === 0) {
      return localGroupResults;
    }
    return complianceResult.groupResults.map(bg => ({
      groupLabel: bg.groupLabel,
      axleType: bg.axleType,
      axleCount: bg.axleCount,
      permissibleKg: bg.groupPermissibleKg,
      toleranceKg: bg.toleranceKg,
      effectiveLimitKg: bg.effectiveLimitKg,
      measuredKg: bg.groupWeightKg,
      overloadKg: bg.overloadKg,
      pavementDamageFactor: bg.pavementDamageFactor,
      status: (bg.status as ComplianceStatus) || 'LEGAL',
      operationalToleranceKg: bg.operationalToleranceKg,
      axles: bg.axles.map(a => ({
        axleNumber: a.axleNumber,
        measuredKg: a.measuredWeightKg,
        permissibleKg: a.permissibleWeightKg,
      })),
    }));
  }, [complianceResult?.groupResults, localGroupResults]);

  const gvwPermissible = complianceResult?.gvwPermissibleKg || effectiveGroupResults.reduce((sum, g) => sum + g.permissibleKg, 0) || 56000;
  const gvwMeasured = complianceResult?.gvwMeasuredKg || (isCaptured ? totalGVW : 0);

  // Compute GVW tolerance from DB settings (local fallback before backend submission)
  const localGvwTolerance = useMemo(() => {
    // Prefer framework-specific GVW tolerance over BOTH/GLOBAL wildcard
    const gvwTolerance =
      toleranceSettings.find((t: any) => t.appliesTo === 'GVW' && t.isActive && t.legalFramework !== 'BOTH' && t.legalFramework !== 'GLOBAL') ||
      toleranceSettings.find((t: any) => t.appliesTo === 'GVW' && t.isActive);
    if (!gvwTolerance) return { kg: 0, display: '0% (strict)' };
    if (gvwTolerance.toleranceKg && gvwTolerance.toleranceKg > 0) {
      return { kg: gvwTolerance.toleranceKg, display: `${gvwTolerance.toleranceKg.toLocaleString()} kg` };
    }
    if (gvwTolerance.tolerancePercentage > 0) {
      const kg = Math.round(gvwPermissible * gvwTolerance.tolerancePercentage / 100);
      return { kg, display: `${gvwTolerance.tolerancePercentage}%` };
    }
    return { kg: 0, display: '0% (strict)' };
  }, [toleranceSettings, gvwPermissible]);

  // Use backend tolerance if available, otherwise local DB-based tolerance
  const gvwToleranceKg = complianceResult?.gvwToleranceKg ?? localGvwTolerance.kg;
  const gvwToleranceDisplay = complianceResult?.gvwToleranceDisplay ?? localGvwTolerance.display;
  const gvwEffectiveLimitKg = gvwPermissible + gvwToleranceKg;

  const gvwOverload = complianceResult?.gvwOverloadKg ?? Math.max(0, gvwMeasured - gvwEffectiveLimitKg);
  const overallStatus: ComplianceStatus = (complianceResult?.overallStatus as ComplianceStatus) || (isCaptured ? calculateOverallStatus(effectiveGroupResults, gvwOverload) : 'LEGAL');

  // Actions
  const handleProceedToDecision = async () => {
    if (!weighingSession?.transactionId) {
      handleNextStep();
      return;
    }
    const payload: Partial<UpdateWeighingRequest> = {};
    if (vehiclePlate?.trim()) payload.vehicleRegNumber = vehiclePlate.trim().toUpperCase();
    if (selectedDriverId) payload.driverId = selectedDriverId;
    if (selectedTransporterId) payload.transporterId = selectedTransporterId;
    if (selectedOriginId) payload.originId = selectedOriginId;
    if (selectedDestinationId) payload.destinationId = selectedDestinationId;
    if (selectedCargoId) payload.cargoId = selectedCargoId;
    if (effectiveActId) payload.actId = effectiveActId;
    if (selectedRoadId) payload.roadId = selectedRoadId;
    if (selectedSubcountyId) payload.subcountyId = selectedSubcountyId;
    if (locationCountyName) payload.locationCounty = locationCountyName;
    if (reliefVehicleReg) payload.reliefVehicleReg = reliefVehicleReg;
    if (comment) payload.comment = comment;
    if (geoLat != null && geoLng != null) {
      payload.locationLat = geoLat;
      payload.locationLng = geoLng;
    }
    if (Object.keys(payload).length === 0) {
      handleNextStep();
      return;
    }
    setIsFlushingVehicleDetails(true);
    try {
      // Use force: true to bypass debouncing and ensure it saves NOW
      const ok = await updateVehicleDetails(payload, { force: true });
      if (!ok) {
        toast.error('Could not save vehicle details. Please try again.');
        return;
      }
      if (currentStep === 'vehicle') {
        handleNextStep();
      }
    } catch {
      toast.error('Failed to update weighing transaction.');
    } finally {
      setIsFlushingVehicleDetails(false);
    }
  };

  const handleNextStep = () => {
    if (!completedSteps.includes(currentStep)) setCompletedSteps([...completedSteps, currentStep]);
    const steps: WeighingStep[] = ['capture', 'vehicle', 'decision'];
    const idx = steps.indexOf(currentStep);
    if (idx < steps.length - 1) setCurrentStep(steps[idx + 1]);
  };

  const handlePrevStep = () => {
    const steps: WeighingStep[] = ['capture', 'vehicle', 'decision'];
    const idx = steps.indexOf(currentStep);
    if (idx > 0) setCurrentStep(steps[idx - 1]);
  };

  const handleCapture = useCallback(async () => {
    const deck1Groups = localGroupResults.filter(g => g.groupLabel === 'A');
    const deck2Groups = localGroupResults.filter(g => g.groupLabel === 'B');
    const deck3Groups = localGroupResults.filter(g => g.groupLabel === 'C');
    const deck4Groups = localGroupResults.filter(g => g.groupLabel === 'D');

    const captureGroup = async (groups: AxleGroupResult[]) => {
      for (const group of groups) {
        for (const axle of group.axles) {
          // Pass selectedConfigId so backend uses the correct axle config (not a fallback standard)
          await captureAxleWeight(axle.axleNumber, axle.measuredKg, selectedConfigId);
        }
      }
    };

    await captureGroup(deck1Groups);
    await captureGroup(deck2Groups);
    await captureGroup(deck3Groups);
    await captureGroup(deck4Groups);

    setIsCaptured(true);
  }, [localGroupResults, captureAxleWeight, selectedConfigId]);

  const handleFinishAndNew = useCallback(async () => {
    // Ensure last minute details are saved
    await handleProceedToDecision();
    if (weighingSession?.transactionId) {
       await downloadWeightTicketPdf(weighingSession.transactionId);
    }
    resetSession();
    middleware.resetSession();

    // Clear weighing-related TanStack Query caches to prevent stale data
    queryClient.removeQueries({ queryKey: ['weighingTransactions'] });
    queryClient.removeQueries({ queryKey: ['pendingWeighings'] });
    queryClient.invalidateQueries({ queryKey: ['weighingTransactions'] });

    // Reset all local UI state for fresh session
    setIsCaptured(false);
    setVehiclePlate('');
    setIsPlateDisabled(false);
    setFrontViewImage(undefined);
    setOverviewImage(undefined);
    setCompletedSteps([]);
    setCurrentStep('capture');
    setSelectedConfig('2A');
    setSelectedDriverId(undefined);
    setSelectedTransporterId(undefined);
    setSelectedCargoId(undefined);
    setSelectedOriginId(undefined);
    setSelectedDestinationId(undefined);
    setSelectedVehicleId(undefined);
    setSelectedActId(undefined);
    setComment('');
    toast.success('Transaction completed.');
  }, [weighingSession, resetSession, middleware, queryClient, handleProceedToDecision]);

  const handleSendToYard = useCallback(async () => {
    if (!weighingSession?.transactionId || !currentStation?.id) return;
    // Flush details before sending to yard
    await handleProceedToDecision();
    try {
      await createYardEntry({
         weighingId: weighingSession.transactionId,
         stationId: currentStation.id,
         reason: `Overload of ${gvwOverload.toLocaleString()} kg`
      });
      toast.success('Vehicle sent to yard.');
      handleFinishAndNew();
    } catch {
      toast.error('Failed to send vehicle to yard.');
    }
  }, [weighingSession, currentStation, gvwOverload, handleProceedToDecision, handleFinishAndNew]);

  const handleSpecialRelease = useCallback(async () => {
    if (!weighingSession?.transactionId) return;
    // Flush details before special release
    await handleProceedToDecision();
    router.push(`/${orgSlug}/weighing/special-release?transactionId=${weighingSession?.transactionId}`);
  }, [weighingSession, router, orgSlug, handleProceedToDecision]);

  const handleReweigh = useCallback(async () => {
    await initiateReweigh();
    setIsCaptured(false);
    setCurrentStep('vehicle');
  }, [initiateReweigh]);

  // Scale test completion (same message as mobile; query invalidation via mutation)
  const handleScaleTestComplete = useCallback((test: { result?: string }) => {
    if (test.result === 'pass') {
      toast.success(SCALE_TEST_SUCCESS_MESSAGE, {
        description: SCALE_TEST_SUCCESS_DESCRIPTION,
      });
    }
  }, []);

  const handleCancelWeighing = useCallback(() => {
    setShowCancelConfirm(true);
  }, [setShowCancelConfirm]);

  const confirmCancelWeighing = useCallback(async () => {
    setShowCancelConfirm(false);
    if (weighingSession?.transactionId) {
      try {
        await deleteWeighingMutation.mutateAsync(weighingSession.transactionId);
      } catch (err) {
        console.error('Failed to delete pending transaction:', err);
      }
    }
    
    // Explicitly reset middleware and frontend session
    middleware.resetSession();
    resetSession();
    
    setIsCaptured(false);
    setVehiclePlate('');
    setIsPlateDisabled(false);
    setFrontViewImage(undefined);
    setOverviewImage(undefined);
    setCompletedSteps([]);
    setCurrentStep('capture');
    setSelectedDriverId(undefined);
    setSelectedTransporterId(undefined);
    setSelectedCargoId(undefined);
    setSelectedOriginId(undefined);
    setSelectedDestinationId(undefined);
    setSelectedVehicleId(undefined);
    setComment('');
    setPermitNo('');
    setTrailerNo('');
    setReliefVehicleReg('');
    toast.success('Weighing cancelled.');
  }, [weighingSession, resetSession, middleware, deleteWeighingMutation]);

  const handleResumeTransaction = useCallback((txn: WeighingTransaction) => {
    resetSession();
    if (middleware.connected) middleware.resetSession();
    setVehiclePlate(txn.vehicleRegNumber || '');
    setIsPlateDisabled(true);
    if (txn.driverId) setSelectedDriverId(txn.driverId);
    if (txn.transporterId) setSelectedTransporterId(txn.transporterId);
    if (txn.originId) setSelectedOriginId(txn.originId);
    if (txn.destinationId) setSelectedDestinationId(txn.destinationId);
    if (txn.cargoId) setSelectedCargoId(txn.cargoId);
    setCurrentStep('vehicle');
    toast.info(`Resuming weighing for ${txn.vehicleRegNumber}`);
  }, [resetSession, middleware]);

  const handleDiscardTransaction = useCallback(async (txn: WeighingTransaction) => {
    try {
      await deleteWeighingMutation.mutateAsync(txn.id);
      toast.success(`Transaction ${txn.vehicleRegNumber} discarded successfully.`);
    } catch (error) {
      console.error('Failed to discard transaction:', error);
      toast.error('Failed to discard transaction.');
    }
  }, [deleteWeighingMutation]);

  const validationResult = useMemo(() => validateRequiredFields({
    driverId: selectedDriverId,
    transporterId: selectedTransporterId,
    originId: selectedOriginId,
    destinationId: selectedDestinationId,
    cargoId: selectedCargoId,
    roadId: selectedRoadId,
    subcountyId: selectedSubcountyId,
  }), [selectedDriverId, selectedTransporterId, selectedOriginId, selectedDestinationId, selectedCargoId, selectedRoadId, selectedSubcountyId]);

  useEffect(() => {
    if (validationResult.isValid && highlightMissingVehicleFields.length > 0) {
      setHighlightMissingVehicleFields([]);
    }
  }, [validationResult.isValid, highlightMissingVehicleFields.length]);

  const handleOpenConfirmModal = useCallback(() => {
    if (!validationResult.isValid) {
      setIsMissingFieldsModalOpen(true);
      return;
    }
    setIsConfirmModalOpen(true);
  }, [validationResult.isValid]);

  const handleTakeWeight = useCallback(async () => {
    await handleCapture();
    setIsConfirmModalOpen(true);
  }, [handleCapture]);

  const handleFinishExit = useCallback(() => {
    if (!validationResult.isValid) {
      setIsFinishExitMissingModalOpen(true);
      return;
    }
    void handleFinishAndNew();
  }, [validationResult.isValid, handleFinishAndNew]);

  const handleConfirmWeight = useCallback(async () => {
    setIsCapturingWeight(true);
    try {
      if (!isCaptured) await handleCapture();
      const result = await confirmWeight();
      if (result) {
        toast.success('Weights confirmed and submitted successfully.');
      } else {
        toast.error('Failed to submit weights. Please try again.');
      }
      setIsCaptured(true);

      // Notify TruConnect (weights captured + autoweigh) and reset for next vehicle (WebSocket or API)
      const axleWeights = localGroupResults.flatMap((g) => g.axles.map((a) => a.measuredKg));
      const totalAxles = axleWeights.length;
      if (weighingSession?.transactionId && totalAxles > 0 && middleware.connected) {
        middleware.completeVehicle({
          transactionId: weighingSession.transactionId,
          totalAxles,
          axleWeights,
          gvw: gvwMeasured,
          axleConfigurationCode: selectedConfig,
        });
        middleware.resetSession();
      }
    } catch {
      toast.error('Failed to submit weights. Please try again.');
    } finally {
      setIsCapturingWeight(false);
      setIsConfirmModalOpen(false);
    }
  }, [handleCapture, confirmWeight, isCaptured, localGroupResults, gvwMeasured, weighingSession?.transactionId, selectedConfig, middleware]);

  const getTotalAxles = useCallback((config: string): number => {
    const configObj = axleConfigurations.find(c => c.axleCode === config);
    return configObj?.axleNumber || 2;
  }, [axleConfigurations]);

  // Proceed to vehicle step - auto-create vehicle if needed and initialize transaction (same as mobile)
  const handleProceedToVehicle = useCallback(async () => {
    if (!existingVehicle && vehiclePlate.length >= 5) {
      try {
        const newVehicle = await createVehicleMutation.mutateAsync({ regNo: vehiclePlate });
        setSelectedVehicleId(newVehicle.id);
        toast.success(`Vehicle ${vehiclePlate} created automatically.`);
      } catch (error) {
        console.warn('Could not auto-create vehicle:', error);
      }
    }

    if (middleware.connected) {
      middleware.sendPlate(vehiclePlate);
    }

    const configToUse = selectedConfig || axleConfigurations[0]?.axleCode || '6C';
    const transaction = await initializeTransaction(vehiclePlate, configToUse, {
      roadId: selectedRoadId || undefined,
      subcountyId: selectedSubcountyId || undefined,
      locationCounty: locationCountyName || undefined,
    });

    if (transaction) {
      if (middleware.connected && currentStation) {
        middleware.syncTransaction({
          transactionId: transaction.id,
          vehicleRegNumber: vehiclePlate,
          axleConfigCode: configToUse,
          totalAxles: getTotalAxles(configToUse),
          stationId: currentStation.id,
          bound: currentBound,
          weighingMode: 'multideck',
        });
      }
      handleNextStep();
    } else {
      toast.error('Could not create transaction. Please check your connection and try again.');
    }
  }, [existingVehicle, vehiclePlate, createVehicleMutation, middleware, selectedConfig, axleConfigurations, initializeTransaction, currentStation, currentBound, getTotalAxles, handleNextStep]);

  const canProceedFromCapture = vehiclePlate.length >= 5;
  const canProceedFromVehicle = selectedConfig !== '' && !!complianceResult;
  const stationDisplayName = currentStation ? `${currentStation.name} (${currentBound || 'A'})` : 'Loading...';



  if (isLoadingData) {
    return (
      <AppShell title="Multideck Weighing" subtitle="Loading...">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Multideck Weighing" subtitle={stationDisplayName}>
      <ProtectedRoute requiredPermissions={['weighing.create']}>
        <div className="space-y-5 pb-6">
          <WeighingPageHeader
            title="Multideck Weighing"
            subtitle={`${stationDisplayName} | Station: ${currentStation?.code}`}
            scaleStatus={middlewareConnected ? 'connected' : 'disconnected'}
          />

          <WeighingStepper
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={setCurrentStep}
          />

          <div className="min-h-[480px]">
            {currentStep === 'capture' && (
              <div className="rounded-xl border border-gray-200 bg-gray-50/30 p-4 shadow-sm md:p-5">
                <WeighingCaptureStep
                stationId={currentStation?.id}
                currentStation={currentStation}
                currentBound={currentBound}
                middlewareConnected={middlewareConnected}
                scales={indicators}
                isScalesConnected={isIndicatorConnected}
                isScaleTestCompleted={isScaleTestCompleted}
                lastScaleTestAt={lastScaleTestAt}
                weighingType="multideck"
                isSimulationMode={isSimulationMode}
                isCommercial={isCommercial}
                handleResumeTransaction={handleResumeTransaction}
                handleDiscardTransaction={handleDiscardTransaction}
                handleStartScaleTest={() => setIsScaleTestModalOpen(true)}
                handleConnectScales={() => middleware.connect()}
                handleToggleScale={() => {}}
                handleChangeWeighingType={() => router.push(`/${orgSlug}/weighing/mobile`)}
                selectedCountyId={selectedCountyId}
                setSelectedCountyId={setSelectedCountyId}
                selectedSubcountyId={selectedSubcountyId}
                setSelectedSubcountyId={setSelectedSubcountyId}
                selectedRoadId={selectedRoadId}
                setSelectedRoadId={setSelectedRoadId}
                frontViewImage={frontViewImage}
                setFrontViewImage={setFrontViewImage}
                overviewImage={overviewImage}
                setOverviewImage={setOverviewImage}
                handleCaptureFront={handleCaptureFront}
                handleCaptureOverview={handleCaptureOverview}
                vehiclePlate={vehiclePlate}
                setVehiclePlate={setVehiclePlate}
                isPlateDisabled={isPlateDisabled}
                handleScanPlate={handleScanPlate}
                handleEditPlate={() => setIsPlateDisabled(false)}
                handleProceedToVehicle={handleProceedToVehicle}
                canProceedFromCapture={canProceedFromCapture}
                handleBoundChange={setCurrentBoundState}
                pendingTransactions={pendingTransactions}
              >
                <MultideckWeightsCard
                  platformName={currentStation?.code || 'ROMIA'}
                  deckWeights={deckWeights}
                  totalGVW={totalGVW}
                  vehicleOnDeck={vehiclePlate.length > 0}
                />
                </WeighingCaptureStep>
              </div>
            )}

            {currentStep === 'vehicle' && (
              <div className="flex flex-col min-h-0 gap-4">
                {/* Ticket row + Cancel Weighing (same as mobile) */}
                <Card className="border-gray-200 shrink-0">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-bold text-lg">{weighingSession?.ticketNumber || ticketNumber || 'PENDING'}</span>
                      <span className="text-gray-400">|</span>
                      <span className="font-mono text-xl font-bold text-blue-600">{vehiclePlate}</span>
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleCancelWeighing}>
                      CANCEL WEIGHING
                    </Button>
                  </CardContent>
                </Card>

                <div className="rounded-xl border border-gray-200 bg-gray-50/30 p-4 shadow-sm md:p-5 flex flex-col min-h-0">
                  {/* MULTIDECK card at top (read-only display of deck weights / GVW) */}
                  <div className="mb-4 md:mb-5 shrink-0">
                    <MultideckWeightsCard
                      platformName={currentStation?.code || 'ROMIA'}
                      deckWeights={deckWeights}
                      totalGVW={totalGVW}
                      vehicleOnDeck={vehiclePlate.length > 0}
                      onCapture={handleTakeWeight}
                    />
                  </div>
                  {/* Left column sets height (no scroll); right column scrolls when it exceeds that height */}
                  <div className="relative">
                    {/* Left: in flow — defines height, never scrolls */}
                    <div className="w-full lg:w-1/2 lg:pr-5 space-y-4">
                      <AxleConfigurationCard
                        axleConfigurations={axleConfigurations}
                        selectedConfig={selectedConfig}
                        onConfigChange={(config) => setSelectedConfig(config)}
                        vehiclePlate={vehiclePlate}
                        capturedAxles={[]}
                        currentAxle={0}
                        weightReferences={weightReferences}
                      />
                      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        <ImageCaptureCard
                          frontImage={frontViewImage}
                          overviewImage={overviewImage}
                          isReadOnly={true}
                        />
                      </div>
                      <div className="space-y-3">
                        <ComplianceBanner status={overallStatus} gvwMeasured={gvwMeasured} gvwOverload={gvwOverload} />
                        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                          <ComplianceTable
                            groupResults={effectiveGroupResults}
                            gvwPermissible={gvwPermissible}
                            gvwMeasured={gvwMeasured}
                            gvwOverload={gvwOverload}
                            overallStatus={overallStatus}
                            gvwToleranceDisplay={gvwToleranceDisplay}
                            gvwToleranceKg={gvwToleranceKg}
                            gvwEffectiveLimitKg={gvwEffectiveLimitKg}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right: on lg, absolute so height = left; scrolls when content exceeds left height */}
                    <div className="mt-4 lg:mt-0 lg:absolute lg:top-0 lg:right-0 lg:w-[calc(50%-0.625rem)] lg:h-full lg:overflow-hidden flex flex-col">
                      <div className="min-h-0 flex-1 flex flex-col overflow-hidden lg:h-full">
                        <VehicleDetailsCard
                          selectedDriverId={selectedDriverId}
                          onDriverIdChange={setSelectedDriverId}
                          drivers={drivers}
                          selectedTransporterId={selectedTransporterId}
                          onTransporterIdChange={setSelectedTransporterId}
                          transporters={transporters}
                          selectedCargoId={selectedCargoId}
                          onCargoIdChange={setSelectedCargoId}
                          cargoTypes={cargoTypes}
                          selectedOriginId={selectedOriginId}
                          onOriginIdChange={setSelectedOriginId}
                          selectedDestinationId={selectedDestinationId}
                          onDestinationIdChange={setSelectedDestinationId}
                          locations={locations}
                          vehiclePlate={vehiclePlate}
                          onVehiclePlateChange={setVehiclePlate}
                          selectedConfig={selectedConfig}
                          onConfigChange={setSelectedConfig}
                          acts={acts}
                          selectedActId={selectedActId}
                          onActIdChange={setSelectedActId}
                          permitNo={permitNo}
                          onPermitNoChange={setPermitNo}
                          trailerNo={trailerNo}
                          onTrailerNoChange={setTrailerNo}
                          vehicleMake={vehicleMake}
                          onVehicleMakeChange={setVehicleMake}
                          reliefVehicleReg={reliefVehicleReg}
                          onReliefVehicleRegChange={setReliefVehicleReg}
                          showReliefVehicleReg={reweighCycleNo > 0}
                          comment={comment}
                          onCommentChange={setComment}
                          isCommercial={isCommercial}
                          showPermitSection={true}
                          onAddDriver={() => setIsDriverModalOpen(true)}
                          onAddTransporter={() => setIsTransporterModalOpen(true)}
                          onAddOriginLocation={() => { setLocationModalTarget('origin'); setIsLocationModalOpen(true); }}
                          onAddDestinationLocation={() => { setLocationModalTarget('destination'); setIsLocationModalOpen(true); }}
                          onAddVehicleMake={() => setIsVehicleMakeModalOpen(true)}
                          onAddCargoType={() => setIsCargoTypeModalOpen(true)}
                          axleConfigurations={axleConfigurations}
                          fillHeightAndScroll
                          highlightMissingFieldLabels={highlightMissingVehicleFields}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Single row: Back, Take Weight, Proceed to Decision */}
                <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
                  <Button variant="outline" onClick={handlePrevStep} className="gap-2 shrink-0" disabled={isCapturingWeight}>
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                  <div className="flex items-center gap-3">
                    {!complianceResult && (
                      <Button
                        onClick={handleTakeWeight}
                        className="bg-green-600 hover:bg-green-700 text-white gap-2 shrink-0"
                        disabled={isCapturingWeight || !selectedConfig || !vehiclePlate}
                      >
                        <Scale className="h-4 w-4" />
                        Take Weight
                      </Button>
                    )}
                    <Button
                      onClick={() => void handleProceedToDecision()}
                      disabled={!canProceedFromVehicle || isCapturingWeight || isFlushingVehicleDetails}
                      className="gap-2 shrink-0"
                    >
                      {isCapturingWeight || isFlushingVehicleDetails ? 'Processing...' : 'Proceed to Decision'}
                      {!isCapturingWeight && !isFlushingVehicleDetails && <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}

             {currentStep === 'decision' && (
               <WeighingDecisionStep
                 ticketNumber={ticketNumber || 'PENDING'}
                 vehiclePlate={vehiclePlate}
                 gvwMeasured={gvwMeasured}
                 overallStatus={overallStatus}
                 totalFeeUsd={complianceResult?.totalFeeUsd ?? 0}
                 reweighCycleNo={reweighCycleNo}
                 isValid={validationResult.isValid}
                 missingFields={validationResult.missingFields}
                 onFinishOnly={handleFinishExit}
                 onFinishAndNew={handleFinishAndNew}
                 onSendToYard={handleSendToYard}
                 onSpecialRelease={handleSpecialRelease}
                 onReweigh={handleReweigh}
                 onPrintTicket={handleFinishAndNew}
                 canPrint={canPrint}
                 canSendToYard={canSendToYard}
                 canSpecialRelease={canSpecialRelease}
                 canReweigh={false}
                 isSentToYard={complianceResult?.isSentToYard ?? false}
                 onBack={handlePrevStep}
                 operationalToleranceKg={operationalToleranceKg}
               />
             )}
          </div>
        </div>

        {/* Weight Confirmation Modal (same as mobile) */}
        <WeightConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleConfirmWeight}
          vehiclePlate={vehiclePlate}
          axleType={selectedConfig}
          axleGroups={effectiveGroupResults.map(g => ({
            group: g.groupLabel,
            permissible: g.permissibleKg,
            tolerance: g.toleranceKg > 0 ? `${g.toleranceKg.toLocaleString()} kg` : '0% (strict)',
            operationalTolerance: g.operationalToleranceKg,
            actual: g.measuredKg,
            overload: g.overloadKg,
            result: g.overloadKg > 0 ? 'Overload' as const : 'Legal' as const,
          }))}
          gvw={{
            permissible: gvwPermissible,
            tolerance: gvwToleranceDisplay,
            actual: gvwMeasured,
            overload: gvwOverload,
            result: gvwOverload > 0 ? 'Overload' : 'Legal',
          }}
          isLoading={isCapturingWeight}
        />

        <MissingFieldsWarningModal
          isOpen={isMissingFieldsModalOpen}
          onClose={() => setIsMissingFieldsModalOpen(false)}
          missingFields={validationResult.missingFields}
        />

        <MissingFieldsWarningModal
          isOpen={isFinishExitMissingModalOpen}
          onClose={() => setIsFinishExitMissingModalOpen(false)}
          missingFields={validationResult.missingFields}
          title="Complete vehicle details before exiting"
          description="The following required fields are missing. After OK you will return to the Vehicle step to fill them, then you can finish and exit."
          primaryActionLabel="OK — go to Vehicle details"
          onPrimaryAction={() => {
            setHighlightMissingVehicleFields([...validationResult.missingFields]);
            setCurrentStep('vehicle');
          }}
        />

        <ScaleTestModal
          open={isScaleTestModalOpen}
          onOpenChange={setIsScaleTestModalOpen}
          station={currentStation ?? null}
          bound={currentBound}
          onTestComplete={handleScaleTestComplete}
          weighingMode="multideck"
          middlewareConnected={middlewareConnected}
        />

        <DriverModal open={isDriverModalOpen} onOpenChange={setIsDriverModalOpen} onSave={handleSaveDriver} isSaving={isSavingEntity} mode="create" />
        <TransporterModal open={isTransporterModalOpen} onOpenChange={setIsTransporterModalOpen} onSave={handleSaveTransporter} isSaving={isSavingEntity} mode="create" />
        <OriginDestinationModal open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen} onSave={handleSaveLocation} isSaving={isSavingEntity} mode="create" />
        <VehicleMakeModal
          open={isVehicleMakeModalOpen}
          onOpenChange={setIsVehicleMakeModalOpen}
          onSave={async (data) => {
            await handleSaveVehicleMake(data);
            if (selectedVehicleId && data.name) {
              const config = axleConfigurations.find(c => c.axleCode === selectedConfig);
              updateVehicleMutation.mutate({
                id: selectedVehicleId,
                payload: {
                  makeModel: data.name,
                  ...(config?.id && { axleConfigurationId: config.id }),
                },
              });
            }
          }}
          isSaving={isSavingEntity}
          mode="create"
        />
        <CargoTypeModal open={isCargoTypeModalOpen} onOpenChange={setIsCargoTypeModalOpen} onSave={handleSaveCargoType} isSaving={isSavingEntity} mode="create" />

        {/* Cancel Weighing confirmation (same as mobile) */}
        <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Weighing</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this weighing? All captured data will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continue Weighing</AlertDialogCancel>
              <AlertDialogAction onClick={confirmCancelWeighing} className="bg-red-600 hover:bg-red-700">
                Cancel Weighing
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ProtectedRoute>
    </AppShell>
  );
}
