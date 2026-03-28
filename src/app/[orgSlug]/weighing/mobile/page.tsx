"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    CargoTypeModal,
    DriverModal,
    OriginDestinationModal,
    SCALE_TEST_SUCCESS_DESCRIPTION,
    SCALE_TEST_SUCCESS_MESSAGE,
    TransporterModal,
    VehicleMakeModal,
    WeighingCaptureStep,
    WeighingDecisionStep,
    WeighingPageHeader,
    WeighingStepper,
    WeighingVehicleStep,
    WeightCaptureCard,
    WeightConfirmationModal
} from '@/components/weighing';
import { MissingFieldsWarningModal } from '@/components/weighing/MissingFieldsWarningModal';
import { ScaleInfo as ComponentScaleInfo } from '@/components/weighing/ScaleHealthPanel';
import { ScaleTestModal } from '@/components/weighing/ScaleTestModal';
import {
    useAllActs,
    useAllSettings,
    useAxleWeightReferences,
    useCreateVehicle,
    useDeleteWeighingTransaction,
    useMyScaleTestStatus,
    useMyStation,
    usePendingWeighings,
    useProsecutionDefaults,
    useUpdateProsecutionDefaults,
    useToleranceSettings,
    useUpdateVehicle,
    useVehicleByRegNo,
    useWeighingAxleConfigurations
} from '@/hooks/queries';
import { useHasPermission } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMiddleware } from '@/hooks/useMiddleware';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { useWeighing } from '@/hooks/useWeighing';
import { useWeighingUI } from '@/hooks/useWeighingUI';
import { downloadAndSavePdf, downloadWeightTicketPdf, ScaleTest, UpdateWeighingRequest, WeighingTransaction } from '@/lib/api/weighing';
import { createVehicleTag, createYardEntry, fetchTagCategories } from '@/lib/api/yard';
import { calculateOverallStatus, validateRequiredFields } from '@/lib/weighing-utils';
import { useAuthStore } from '@/stores/auth.store';
import {
    AxleGroupResult,
    ComplianceStatus,
    ScaleStatus,
    WeighingStep
} from '@/types/weighing';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

/**
 * Mobile Weighing Page
 *
 * 3-Step workflow for axle-by-axle portable weighing:
 * Step 1: Capture (Scale test, images, plate entry)
 * Step 2: Vehicle (Axle config, vehicle details, weight capture, real-time compliance)
 * Step 3: Decision (Final decision and actions)
 */
export default function MobileWeighingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const tenantType = user?.tenantType ?? 'AxleLoadEnforcement';
  const isCommercialTenant = tenantType === 'CommercialWeighing';
  const isCommercial = isCommercialTenant || searchParams.get('commercial') === 'true';
  const orgSlug = useOrgSlug();
  const queryClient = useQueryClient();

  // Workflow state - 3 steps: capture → vehicle → decision
  const [currentStep, setCurrentStep] = useState<WeighingStep>('capture');
  const [completedSteps, setCompletedSteps] = useState<WeighingStep[]>([]);

  // TanStack Query hooks for data fetching with caching
  const {
    data: currentStation,
    isLoading: isLoadingStation,
    error: stationError,
  } = useMyStation();

  const {
    data: axleConfigurations = [],
    isLoading: isLoadingAxleConfigs,
    error: axleConfigError,
  } = useWeighingAxleConfigurations();

  // Fetch pending transactions for resume functionality (only mobile type)
  const { data: pendingWeighings } = usePendingWeighings(currentStation?.id, 'mobile');
  const pendingTransactions = pendingWeighings?.items ?? [];

  // Fetch all settings to check for scale test requirement
  const { data: allSettings = [] } = useAllSettings();
  const scaleTestRequired = useMemo(() => {
    const setting = allSettings.find(s => s.settingKey === 'weighing.scale_test_required');
    if (!setting) return false;
    return setting.settingValue?.toLowerCase() === 'true';
  }, [allSettings]);

  // Operational tolerance (kg) from settings — used in local compliance calculation
  const operationalToleranceKg = useMemo(() => {
    const setting = allSettings.find(s => s.settingKey === 'weighing.operational_tolerance_kg');
    return setting?.settingValue ? parseInt(setting.settingValue, 10) : 200;
  }, [allSettings]);

  // Entity creation mutations are now handled by useWeighingUI
  // Vehicle lookup mutation for auto-creating vehicles
  const createVehicleMutation = useCreateVehicle();
  const deleteWeighingMutation = useDeleteWeighingTransaction();

  // Bound state for bidirectional stations
  const [currentBoundState, setCurrentBoundState] = useState<string | undefined>();

  // Derive bound from station data — default to bound A
  const currentBound = currentBoundState ?? currentStation?.boundACode ?? 'A';

  // Weight state - MUST be declared before useMiddleware hook
  const [currentAxleWeight, setCurrentAxleWeight] = useState(0);

  // Scale health panel state - MUST be declared before useMiddleware hook
  const [scales, setScales] = useState<ComponentScaleInfo[]>([
    {
      id: 'scale-a',
      name: 'Scale A',
      status: 'disconnected',
      weight: 0,
      temperature: 0,
      battery: 0,
      signalStrength: 0,
      capacity: 15000,
      lastReading: new Date(),
      isActive: false,
      make: 'Intercomp',
      model: 'LP600',
      syncType: 'API',
    },
    {
      id: 'scale-b',
      name: 'Scale B',
      status: 'disconnected',
      weight: 0,
      temperature: 0,
      battery: 0,
      signalStrength: 0,
      capacity: 15000,
      lastReading: new Date(),
      isActive: false,
      make: 'Intercomp',
      model: 'LP600',
      syncType: 'API',
    },
  ]);
  const [isScalesConnected, setIsScalesConnected] = useState(false);
  const [middlewareConnected, setMiddlewareConnected] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [weighingType, _setWeighingType] = useState<'mobile' | 'multideck'>('mobile');

  // Scale metadata from middleware (make/model)
  const [scaleMetadata, setScaleMetadata] = useState<{ make: string | null; model: string | null }>({
    make: null,
    model: null,
  });

  // UI state and common handlers extracted to custom hook
  const ui = useWeighingUI({ stationId: currentStation?.id });

  const {
    // Geographic
    counties, subcounties, roads,
    selectedCountyId, setSelectedCountyId,
    selectedSubcountyId, setSelectedSubcountyId,
    selectedRoadId, setSelectedRoadId,

    // Media
    frontViewImage, setFrontViewImage,
    overviewImage, setOverviewImage,
    handleCaptureFront, handleCaptureOverview,

    // Vehicle/Plate
    vehiclePlate, setVehiclePlate, debouncedPlate,
    isPlateDisabled, setIsPlateDisabled, handleScanPlate,

    // Config
    selectedConfig, setSelectedConfig,

    // Handlers
    handleSaveDriver, handleSaveTransporter,
    handleSaveLocation, handleSaveCargoType,
    handleSaveVehicleMake,

    // Master Data
    drivers, transporters, cargoTypes, locations, vehicleMakesData,

    // Modal States
    isDriverModalOpen, setIsDriverModalOpen,
    isTransporterModalOpen, setIsTransporterModalOpen,
    isLocationModalOpen, setIsLocationModalOpen,
    locationModalTarget, setLocationModalTarget,
    isVehicleMakeModalOpen, setIsVehicleMakeModalOpen,
    isCargoTypeModalOpen, setIsCargoTypeModalOpen,
    isSavingEntity, setIsSavingEntity,
    isScaleTestModalOpen, setIsScaleTestModalOpen,
    showCancelConfirm, setShowCancelConfirm,
    isConfirmModalOpen, setIsConfirmModalOpen,
    isMissingFieldsModalOpen, setIsMissingFieldsModalOpen,

    // Selections
    selectedDriverId, setSelectedDriverId,
    selectedTransporterId, setSelectedTransporterId,
    selectedCargoId, setSelectedCargoId,
    selectedOriginId, setSelectedOriginId,
    selectedDestinationId, setSelectedDestinationId,
    vehicleMake, setVehicleMake,

    // Refetch Functions
    refetchDrivers,
    refetchTransporters,
    refetchLocations,
    refetchCargoTypes,
    refetchVehicleMakes,
  } = ui;

  // useWeighing hook for backend persistence
  const weighingHook = useWeighing({
    weighingMode: 'mobile',
    bound: currentBound,
    autoInitialize: true,
  });

  // Use capture state from useWeighing hook (with local fallbacks for UI)
  const {
    capturedAxles: hookCapturedAxles,
    currentAxle: hookCurrentAxle,
    setCurrentAxle: setHookCurrentAxle,
    totalAxles: hookTotalAxles,
    allAxlesCaptured: hookAllAxlesCaptured,
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
    isWeightConfirmed,
    isLoading: isWeighingLoading,
    isUpdatingDetails,
    error: weighingError,
    setVehiclePlate: setHookVehiclePlate,
    setAxleConfig,
  } = weighingHook;

  const { position: geoPosition, refresh: refreshGeolocation, isSupported: isGeolocationSupported } = useGeolocation({ enableHighAccuracy: true, timeout: 10000 });

  // Local state for captured weights (for UI display during capture)
  const [localCapturedWeights, setLocalCapturedWeights] = useState<number[]>([]);
  const [localCurrentAxle, setLocalCurrentAxle] = useState(1);

  // Sync local captured weights from restored session (so compliance display works after page reload)
  const lastSyncedSessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (weighingSession?.transactionId && weighingSession.transactionId !== lastSyncedSessionIdRef.current) {
      lastSyncedSessionIdRef.current = weighingSession.transactionId;
      if (weighingSession.capturedAxles.length > 0) {
        setLocalCapturedWeights(weighingSession.capturedAxles.map(a => a.weightKg));
        setLocalCurrentAxle(weighingSession.capturedAxles.length + 1);
      }
    }
  }, [weighingSession?.transactionId, weighingSession?.capturedAxles]);

  // Derive captured state from hook or local state
  const capturedAxles = weighingSession?.capturedAxles.map(a => a.axleNumber) || [];
  const capturedWeights = weighingSession?.capturedAxles.map(a => a.weightKg) || localCapturedWeights;
  const currentAxle = hookCurrentAxle || localCurrentAxle;
  const setCurrentAxle = (axle: number) => {
    setHookCurrentAxle(axle);
    setLocalCurrentAxle(axle);
  };

  const [autoAcquire, setAutoAcquire] = useState(false);

  // Middleware hook - handles WebSocket connection to local scale bridge
  const middleware = useMiddleware({
    stationCode: currentStation?.code || '',
    bound: currentBound as 'A' | 'B',
    mode: 'mobile',
    onWeightUpdate: (weight) => {
      if (weight.mode === 'mobile') {
        setCurrentAxleWeight(weight.weight || 0);
      }
      setIsSimulationMode(weight.simulation || false);
      if (weight.connection?.connected !== undefined) {
        setIsScalesConnected(weight.connection.connected);
      }
    },
    onScaleStatusChange: (status) => {
      setIsScalesConnected(status.connected);
      setIsSimulationMode(status.simulation || false);

      // Update individual scales array for health panel
      setScales(prev => prev.map(s => {
        const info = s.id === 'scale-a' ? status.scaleA : status.scaleB;
        if (!info) return s;

        return {
          ...s,
          status: info.status,
          weight: info.weight || 0,
          isActive: info.status === 'connected',
          temperature: info.temp || s.temperature,
          battery: info.battery || s.battery,
          lastReading: new Date(),
        };
      }));
    },
    onConnectionModeChange: (mode) => {
      setMiddlewareConnected(mode !== 'disconnected');
    },
  });

  // Sync middleware connected state
  useEffect(() => {
    setMiddlewareConnected(middleware.connected);
  }, [middleware.connected]);

  // Weight confirmation modal state
  const [isCapturingWeight, setIsCapturingWeight] = useState(false);

  // Prosecution defaults for pre-filling location
  const { data: prosecutionDefaults } = useProsecutionDefaults();
  const updateProsecutionDefaultsMutation = useUpdateProsecutionDefaults();

  // Ensure location defaults are applied only once per station to avoid update loops
  const [locationInitialized, setLocationInitialized] = useState(false);

  // Default to Nairobi and persist station settings (run once per station)
  useEffect(() => {
    if (!currentStation?.id || locationInitialized) return;

    const storageKey = `truload_settings_${currentStation.id}`;
    const savedSettings = localStorage.getItem(storageKey);

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.countyId) setSelectedCountyId(parsed.countyId);
        if (parsed.subcountyId) setSelectedSubcountyId(parsed.subcountyId);
        if (parsed.roadId) setSelectedRoadId(parsed.roadId);
      } catch (e) {
        console.error('Failed to parse saved settings', e);
      }
    } else if (prosecutionDefaults) {
      // Use prosecution defaults if no saved settings for this station
      if (prosecutionDefaults.defaultCountyId) setSelectedCountyId(prosecutionDefaults.defaultCountyId);
      if (prosecutionDefaults.defaultSubcountyId) setSelectedSubcountyId(prosecutionDefaults.defaultSubcountyId);
      if (prosecutionDefaults.defaultRoadId) setSelectedRoadId(prosecutionDefaults.defaultRoadId);
    } else if (counties?.length > 0) {
      // Default to Nairobi City
      const nairobi = (counties as { name: string; id: string }[]).find(c => (c.name || '').includes('Nairobi'));
      if (nairobi) {
        setSelectedCountyId(nairobi.id);
      }
    }

    setLocationInitialized(true);
  }, [currentStation?.id, counties, prosecutionDefaults, locationInitialized, setSelectedCountyId, setSelectedSubcountyId, setSelectedRoadId]);

  // Save settings when they change
  useEffect(() => {
    if (!currentStation?.id) return;
    const storageKey = `truload_settings_${currentStation.id}`;
    const settings = {
      countyId: selectedCountyId,
      subcountyId: selectedSubcountyId,
      roadId: selectedRoadId,
    };
    localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [currentStation?.id, selectedCountyId, selectedSubcountyId, selectedRoadId]);

  // Derive selected configuration ID for weight references lookup
  const selectedConfigId = useMemo(() => {
    if (!selectedConfig || axleConfigurations.length === 0) return undefined;
    const config = axleConfigurations.find((c: any) => c.axleCode === selectedConfig);
    return config?.id;
  }, [selectedConfig, axleConfigurations]);

  // Fetch weight references for the selected configuration
  const { data: weightReferences = [] } = useAxleWeightReferences(selectedConfigId);

  // Scale test status from TanStack Query (same source as multideck; banner and message shared)
  const { data: scaleTestStatus } = useMyScaleTestStatus(currentBound);

  // Set bound when station loads
  useEffect(() => {
    if (currentStation?.supportsBidirectional && currentStation.boundACode && !currentBoundState) {
      setCurrentBoundState(currentStation.boundACode);
    }
  }, [currentStation, currentBoundState]);

  // Set default axle config when data loads
  useEffect(() => {
    if (axleConfigurations.length > 0 && !selectedConfig) {
      const defaultConfig = axleConfigurations.find((c: any) => c.axleCode === '2A') || axleConfigurations[0];
      setSelectedConfig(defaultConfig.axleCode);
      setAxleConfig(defaultConfig.axleCode);
    }
  }, [axleConfigurations, selectedConfig]);

  // Show warning if no station assigned
  useEffect(() => {
    if (!isLoadingStation && !currentStation) {
      toast.warning('No station assigned to your account.', {
        description: 'Contact administrator to link a station to your profile.',
      });
    }
  }, [isLoadingStation, currentStation]);

  // Vehicle details form state - linked entity IDs
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>();
  const [selectedActId, setSelectedActId] = useState<string | undefined>();

  // Acts for compliance (default: Traffic Act)
  const { data: acts = [] } = useAllActs();
  const defaultActId = acts.find((a) => a.isDefault)?.id ?? acts[0]?.id;
  const effectiveActId = selectedActId || defaultActId;

  // Resolve legal framework from selected act for tolerance lookup
  const effectiveAct = acts.find(a => a.id === effectiveActId);
  const effectiveLegalFramework = effectiveAct?.code || 'TRAFFIC_ACT';

  // Fetch DB tolerance settings for the active legal framework (cached 30min)
  const { data: toleranceSettings = [] } = useToleranceSettings(effectiveLegalFramework);

  // Vehicle details form state - simple values
  const [permitNo, setPermitNo] = useState('');
  const [trailerNo, setTrailerNo] = useState('');
  const [comment, setComment] = useState('');
  const [reliefVehicleReg, setReliefVehicleReg] = useState('');

  // Auto-lookup vehicle by registration number (using debounced value)
  const { data: existingVehicle } = useVehicleByRegNo(debouncedPlate.length >= 5 ? debouncedPlate : undefined);

  // Mutations
  const updateVehicleMutation = useUpdateVehicle();

  // Update selected vehicle when lookup returns
  useEffect(() => {
    if (existingVehicle?.id) {
      setSelectedVehicleId(existingVehicle.id);
      // Auto-populate fields from existing vehicle
      if (existingVehicle.transporterId) {
        setSelectedTransporterId(existingVehicle.transporterId);
      }
      if (existingVehicle.axleConfigurationId) {
        const config = axleConfigurations.find((c: any) => c.id === existingVehicle.axleConfigurationId);
        if (config) {
          setSelectedConfig(config.axleCode);
          // Only change axle config if no weights have been captured yet — preserves in-progress capture
          if (!weighingSession?.capturedAxles?.length) {
            setAxleConfig(config.axleCode);
          }
        }
      }
      if (existingVehicle.makeModel) {
        setVehicleMake(existingVehicle.makeModel);
      }
    } else {
      setSelectedVehicleId(undefined);
    }
  }, [existingVehicle, axleConfigurations]);

  // Prefill vehicle details form from transaction when we land on vehicle step (e.g. after create or resume)
  const lastPrefilledTransactionIdRef = useRef<string | null>(null);
  useEffect(() => {
    const txn = weighingHook.transaction;
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
    if (txn.axleConfiguration) {
      setSelectedConfig(txn.axleConfiguration);
      // Only change axle config if no weights have been captured yet — preserves restored session axles
      if (!weighingSession?.capturedAxles?.length) {
        setAxleConfig(txn.axleConfiguration);
      }
    }
    // County: resolve from subcounty if we have subcounties loaded
    if (txn.subcountyId && subcounties?.length) {
      const sub = (subcounties as { id: string; countyId?: string }[]).find(s => s.id === txn.subcountyId);
      if (sub?.countyId) setSelectedCountyId(sub.countyId);
    }
  }, [currentStep, weighingHook.transaction, subcounties]);

  // Sync vehicle make and axle config to Vehicle entity only when a vehicle make is selected; always pass regNo so backend does not 400.
  useEffect(() => {
    if (!selectedVehicleId || !vehiclePlate?.trim()) return;
    if (!vehicleMake) return;

    const timeoutId = setTimeout(() => {
      const config = axleConfigurations.find((c: any) => c.axleCode === selectedConfig);
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

  // Sync axle configuration to middleware when it changes during an active weighing session
  useEffect(() => {
    if (middleware.connected && weighingHook.session?.transactionId && selectedConfig) {
      const config = axleConfigurations.find((c: any) => c.axleCode === selectedConfig);
      const configAxleCount = config?.axleNumber || totalAxles;

      middleware.syncTransaction({
        transactionId: weighingHook.session.transactionId,
        vehicleRegNumber: vehiclePlate,
        axleConfigCode: selectedConfig,
        totalAxles: configAxleCount,
        stationId: currentStation?.id || '',
        bound: currentBound,
        weighingMode: 'mobile',
      });

      console.log(`[WebSocket] Synced axle configuration change to middleware: ${selectedConfig} (${configAxleCount} axles)`);
    }
  }, [selectedConfig, middleware.connected, weighingHook.session?.transactionId, vehiclePlate, currentStation?.id, currentBound, axleConfigurations]);

  // Request location when on vehicle step (optional; used for weighing location coordinates)
  useEffect(() => {
    if (currentStep === 'vehicle' && weighingHook.session?.transactionId && isGeolocationSupported) {
      refreshGeolocation();
    }
  }, [currentStep, weighingHook.session?.transactionId, isGeolocationSupported, refreshGeolocation]);

  // Derived primitives so sync effect doesn't re-run on every counties/subcounties/roads/geo ref change (avoids PUT storm)
  const locationCountyName = useMemo(
    () => (counties as { id?: string; name?: string }[]).find((c) => c.id === selectedCountyId)?.name ?? '',
    [counties, selectedCountyId]
  );
  const locationSubcountyName = useMemo(
    () => (subcounties as { id?: string; name?: string }[]).find((s) => s.id === selectedSubcountyId)?.name ?? '',
    [subcounties, selectedSubcountyId]
  );
  const locationRoadName = useMemo(
    () => (roads as { id?: string; name?: string; code?: string }[]).find((r) => r.id === selectedRoadId)?.name
      ?? (roads as { id?: string; code?: string }[]).find((r) => r.id === selectedRoadId)?.code ?? '',
    [roads, selectedRoadId]
  );
  const geoLat = geoPosition?.latitude;
  const geoLng = geoPosition?.longitude;

  // Don't sync for the first few seconds after transaction appears (avoids PUT on load when dropdowns populate)
  const syncAllowedAfterRef = useRef<number>(0);
  useEffect(() => {
    const tid = weighingHook.session?.transactionId;
    if (tid) {
      if (syncAllowedAfterRef.current === 0) syncAllowedAfterRef.current = Date.now() + 3000;
    } else {
      syncAllowedAfterRef.current = 0;
    }
  }, [weighingHook.session?.transactionId]);

  // Sync driver/transporter/cargo/origin/destination selections to backend. Debounce 2s + throttle/backoff in updateVehicleDetails.
  useEffect(() => {
    if (!weighingHook.session?.transactionId) return;

    const timeoutId = setTimeout(() => {
      if (Date.now() < syncAllowedAfterRef.current) return;
      const updates: Partial<UpdateWeighingRequest> = {};
      if (selectedDriverId) updates.driverId = selectedDriverId;
      if (selectedTransporterId) updates.transporterId = selectedTransporterId;
      if (selectedOriginId) updates.originId = selectedOriginId;
      if (selectedDestinationId) updates.destinationId = selectedDestinationId;
      if (selectedCargoId) updates.cargoId = selectedCargoId;
      if (effectiveActId) updates.actId = effectiveActId;
      if (locationCountyName) updates.locationCounty = locationCountyName;
      if (selectedSubcountyId) {
        updates.subcountyId = selectedSubcountyId;
        if (locationSubcountyName) updates.locationSubcounty = locationSubcountyName;
      }
      if (selectedRoadId) {
        updates.roadId = selectedRoadId;
        if (locationRoadName) updates.locationTown = locationRoadName;
      }
      if (geoLat != null && geoLng != null) {
        updates.locationLat = geoLat;
        updates.locationLng = geoLng;
      }

      if (Object.keys(updates).length > 0) {
        weighingHook.updateVehicleDetails(updates).catch((err) => {
          console.warn('Failed to sync vehicle details to backend:', err);
        });
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [
    weighingHook.session?.transactionId,
    weighingHook.updateVehicleDetails,
    selectedDriverId,
    selectedTransporterId,
    selectedOriginId,
    selectedDestinationId,
    selectedCargoId,
    effectiveActId,
    selectedCountyId,
    locationCountyName,
    selectedSubcountyId,
    locationSubcountyName,
    selectedRoadId,
    locationRoadName,
    geoLat,
    geoLng,
  ]);


  // Permissions - mapped to backend permission codes
  const canCapture = useHasPermission('weighing.create');
  const canPrint = useHasPermission('weighing.export');
  const canTag = useHasPermission('tag.create');
  const canSendToYard = useHasPermission('weighing.send_to_yard');
  const canSpecialRelease = useHasPermission('case.special_release');

  // Scale status derived from middleware connection state
  const scaleStatus: ScaleStatus = middlewareConnected ? 'connected' : 'disconnected';

  // Ticket number derived from session
  const ticketNumber = weighingSession?.ticketNumber || weighingTransaction?.ticketNumber;

  // Loading and Error states
  const isLoadingData = isLoadingStation || isLoadingAxleConfigs || isWeighingLoading;
  const loadError = stationError || axleConfigError || weighingError;

  // Scale test helpers (aligned with multideck: same card, same message)
  const isScaleTestCompleted = scaleTestStatus?.hasValidTest ?? false;
  const lastScaleTestAt = scaleTestStatus?.latestTest ? new Date(scaleTestStatus.latestTest.carriedAt) : undefined;

  // Get total axles from the actual config object (not hardcoded)
  const totalAxles = useMemo(() => {
    const config = axleConfigurations.find(c => c.axleCode === selectedConfig);
    return config?.axleNumber || 0;
  }, [selectedConfig, axleConfigurations]);

  // Build local compliance group results from weight references and captured weights (preview before backend submission)
  const localGroupResults: AxleGroupResult[] = useMemo(() => {
    // Map captured weights by axle number for easy lookup
    const capturedWeightMap = new Map<number, number>();
    capturedWeights.forEach((weight, index) => {
      const axleNum = index + 1;
      capturedWeightMap.set(axleNum, weight);
    });

    // If no weight references, use selected axle config's GVW as fallback
    if (weightReferences.length === 0) {
      const fallbackConfig = axleConfigurations.find(c => c.axleCode === selectedConfig);
      const configGvw = fallbackConfig?.gvwPermissibleKg || 0;
      const perAxlePermissible = totalAxles > 0 ? Math.round(configGvw / totalAxles) : 0;
      const totalMeasured = capturedWeights.reduce((sum, w) => sum + w, 0);
      return [{
        groupLabel: 'A',
        axleType: 'Unknown',
        axleCount: totalAxles || 1,
        permissibleKg: configGvw,
        toleranceKg: 0,
        effectiveLimitKg: configGvw,
        measuredKg: totalMeasured,
        overloadKg: Math.max(0, totalMeasured - configGvw),
        pavementDamageFactor: 1.0,
        status: configGvw > 0 && totalMeasured > configGvw ? 'OVERLOAD' : 'LEGAL',
        axles: capturedWeights.map((w, i) => ({
          axleNumber: i + 1,
          measuredKg: w,
          permissibleKg: perAxlePermissible,
        })),
      }];
    }

    // Group weight references by axleGrouping (A, B, C, D)
    const groupMap = new Map<string, typeof weightReferences>();
    weightReferences.forEach(ref => {
      const group = ref.axleGrouping || 'A';
      if (!groupMap.has(group)) {
        groupMap.set(group, []);
      }
      groupMap.get(group)!.push(ref);
    });

    // Determine axle type based on axle count
    const getAxleType = (count: number, groupLabel: string): string => {
      if (groupLabel === 'A' && count === 1) return 'Steering';
      if (count === 1) return 'Single';
      if (count === 2) return 'Tandem';
      if (count === 3) return 'Tridem';
      if (count === 4) return 'Quad';
      return 'Group';
    };

    // Build group results
    const results: AxleGroupResult[] = [];
    const sortedGroups = Array.from(groupMap.keys()).sort();

    for (const groupLabel of sortedGroups) {
      const refs = groupMap.get(groupLabel)!;
      const sortedRefs = refs.sort((a: any, b: any) => a.axlePosition - b.axlePosition);

      // Calculate permissible weight for the group (sum of individual axle limits)
      const permissibleKg = sortedRefs.reduce((sum: number, r: any) => sum + r.axleLegalWeightKg, 0);

      // Apply tolerance from DB settings (per legal framework)
      // Prefer framework-specific setting over BOTH/GLOBAL wildcard
      const axleTolerance =
        toleranceSettings.find(t => t.appliesTo === 'AXLE' && t.isActive && t.legalFramework !== 'BOTH' && t.legalFramework !== 'GLOBAL') ||
        toleranceSettings.find(t => t.appliesTo === 'AXLE' && t.isActive);
      let toleranceKg = 0;
      if (axleTolerance) {
        if (axleTolerance.toleranceKg && axleTolerance.toleranceKg > 0) {
          toleranceKg = axleTolerance.toleranceKg;
        } else if (axleTolerance.tolerancePercentage > 0) {
          toleranceKg = Math.round(permissibleKg * axleTolerance.tolerancePercentage / 100);
        }
      }
      const effectiveLimitKg = permissibleKg + toleranceKg;

      const axles = sortedRefs.map((ref: any) => {
        const measured = capturedWeightMap.get(ref.axlePosition) || 0;
        return {
          axleNumber: ref.axlePosition,
          measuredKg: measured,
          permissibleKg: ref.axleLegalWeightKg,
        };
      });

      const measuredKg = axles.reduce((sum: number, a: any) => sum + a.measuredKg, 0);
      const overloadKg = Math.max(0, measuredKg - effectiveLimitKg);

      // Determine status
      let status: ComplianceStatus = 'LEGAL';
      if (measuredKg > effectiveLimitKg) {
        status = 'OVERLOAD';
      } else if (measuredKg > permissibleKg && measuredKg <= effectiveLimitKg) {
        status = 'WARNING';
      }

      // Calculate pavement damage factor (simplified: (measured/permissible)^4)
      const pavementDamageFactor = permissibleKg > 0
        ? Math.round(Math.pow(measuredKg / permissibleKg, 4) * 100) / 100
        : 0;

      results.push({
        groupLabel,
        axleType: getAxleType(sortedRefs.length, groupLabel),
        axleCount: sortedRefs.length,
        permissibleKg,
        toleranceKg,
        effectiveLimitKg,
        measuredKg,
        overloadKg,
        pavementDamageFactor,
        operationalToleranceKg,
        status,
        axles,
      });
    }

    return results;
  }, [weightReferences, capturedWeights, totalAxles, axleConfigurations, selectedConfig, operationalToleranceKg, toleranceSettings]);

  // When backend returns group results (after weight submission), use those as the
  // authoritative source — they have correct DB-driven tolerance per legal framework.
  // Local groupResults are used as preview-only before submission.
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

  // Use compliance data from hook if available, otherwise from selected axle config
  const selectedAxleGvw = axleConfigurations.find(c => c.axleCode === selectedConfig)?.gvwPermissibleKg;
  const gvwPermissible = complianceResult?.gvwPermissibleKg || selectedAxleGvw || effectiveGroupResults.reduce((sum, g) => sum + g.permissibleKg, 0);
  const gvwMeasured = complianceResult?.gvwMeasuredKg || effectiveGroupResults.reduce((sum, g) => sum + g.measuredKg, 0);

  // Compute GVW tolerance from DB settings (local fallback before backend submission)
  const localGvwTolerance = useMemo(() => {
    // Prefer framework-specific GVW tolerance over BOTH/GLOBAL wildcard
    const gvwTolerance =
      toleranceSettings.find(t => t.appliesTo === 'GVW' && t.isActive && t.legalFramework !== 'BOTH' && t.legalFramework !== 'GLOBAL') ||
      toleranceSettings.find(t => t.appliesTo === 'GVW' && t.isActive);
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
  const overallStatus: ComplianceStatus = complianceResult?.overallStatus as ComplianceStatus || calculateOverallStatus(effectiveGroupResults, gvwOverload);
  const allAxlesCaptured = hookAllAxlesCaptured || capturedAxles.length === totalAxles;

  // Required field validation for decision actions (Driver, Transporter, Origin, Destination, Cargo)
  const validationResult = useMemo(() => validateRequiredFields({
    driverId: selectedDriverId,
    transporterId: selectedTransporterId,
    originId: selectedOriginId,
    destinationId: selectedDestinationId,
    cargoId: selectedCargoId,
  }), [selectedDriverId, selectedTransporterId, selectedOriginId, selectedDestinationId, selectedCargoId]);

  const hasShownSentToYardToast = useRef(false);

  // Toast when vehicle already sent to yard (backend auto-created on overload)
  useEffect(() => {
    if (
      currentStep === 'decision' &&
      overallStatus === 'OVERLOAD' &&
      complianceResult?.isSentToYard &&
      !hasShownSentToYardToast.current
    ) {
      hasShownSentToYardToast.current = true;
      toast.info('Vehicle has been sent to yard', {
        description: 'The yard entry was created automatically when the overload was detected.',
      });
    }
  }, [currentStep, overallStatus, complianceResult?.isSentToYard]);

  // Step navigation - 3 steps only
  const goToStep = (step: WeighingStep) => {
    setCurrentStep(step);
  };

  const completeCurrentStep = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
  };

  // Step order: capture → vehicle → decision (3 steps)
  const steps: WeighingStep[] = ['capture', 'vehicle', 'decision'];

  const handleNextStep = async () => {
    // If moving from capture to vehicle, save prosecution defaults
    if (currentStep === 'capture') {
      try {
        await updateProsecutionDefaultsMutation.mutateAsync({
          defaultCountyId: selectedCountyId || undefined,
          defaultSubcountyId: selectedSubcountyId || undefined,
          defaultRoadId: selectedRoadId || undefined,
        });
        console.log('Prosecution defaults updated with current location');
      } catch (err) {
        console.warn('Failed to update prosecution defaults:', err);
      }
    }

    completeCurrentStep();
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handlePrevStep = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  // Capture handlers - capture weight from scale and persist to backend via useWeighing hook
  const handleCaptureAxle = useCallback(async () => {
    if (capturedAxles.includes(currentAxle)) {
      toast.warning(`Axle ${currentAxle} already captured.`);
      return;
    }

    // Use actual weight from scale (currentAxleWeight is updated by middleware WebSocket)
    if (currentAxleWeight <= 0) {
      toast.error('No weight reading from scale. Check scale connection.');
      return;
    }

    if (!weighingSession) {
      toast.error('No active weighing session. Start a new session first.');
      return;
    }

    const weight = currentAxleWeight;

    // Capture via useWeighing hook (persists locally, submitted to backend on confirm)
    const success = await captureAxleWeight(currentAxle, weight);

    if (success) {
      // Sync axle capture to middleware (autoweigh tracking; middleware sends weigh command to console for next axle)
      if (middleware.connected) {
        middleware.captureAxle(currentAxle, weight);
      }

      // Update local state for immediate UI feedback
      setLocalCapturedWeights(prev => [...prev, weight]);

      if (currentAxle < totalAxles) {
        setCurrentAxle(currentAxle + 1);
        // Reset weight display for next axle
        setTimeout(() => setCurrentAxleWeight(0), 500);
      }
    } else {
      toast.error(`Failed to capture axle ${currentAxle}. Please try again.`);
    }
  }, [capturedAxles, captureAxleWeight, currentAxle, currentAxleWeight, totalAxles, middleware, weighingSession]);

  // Edit plate handler (logs event)
  const handleEditPlate = () => {
    console.log('[AUDIT] Plate edit requested for:', vehiclePlate);
    setIsPlateDisabled(false);
  };

  // Scale handlers
  const handleConnectScales = useCallback(() => {
    setIsScalesConnected(true);
    setScales(prev => prev.map(s => ({ ...s, status: 'connected' as ScaleStatus })));
  }, []);

  const handleToggleScale = useCallback((scaleId: string, active: boolean) => {
    setScales(prev => prev.map(s =>
      s.id === scaleId ? { ...s, isActive: active } : s
    ));
  }, []);

  // Navigate to multideck weighing page
  const handleChangeWeighingType = useCallback(() => {
    router.push(`/${orgSlug}/weighing/multideck`);
  }, [router, orgSlug]);

  // Handle bound change - updates local state, notifies middleware, and syncs backend
  const handleBoundChange = useCallback((newBound: string) => {
    // Update local state
    setCurrentBoundState(newBound);

    // Notify middleware via WebSocket (if connected)
    if (middleware.connected) {
      middleware.switchBound(newBound as 'A' | 'B');
      console.log(`[Mobile] Bound switched to ${newBound}, notified middleware`);
    }

    // TODO: Update backend API when endpoint is available
    // For now, the middleware will handle bound persistence if needed
    toast.info(`Switched to Bound ${newBound}`, {
      description: currentStation?.supportsBidirectional
        ? `Now weighing on direction ${newBound}`
        : undefined,
    });
  }, [middleware, currentStation]);

  // Scale test handler - opens the modal
  const handleStartScaleTest = useCallback(() => {
    setIsScaleTestModalOpen(true);
  }, []);

  // Handle scale test completion (same message as multideck; query invalidation via mutation)
  const handleScaleTestComplete = useCallback((test: ScaleTest) => {
    if (test.result === 'pass') {
      toast.success(SCALE_TEST_SUCCESS_MESSAGE, {
        description: SCALE_TEST_SUCCESS_DESCRIPTION,
      });
    }
  }, []);

  // Weight confirmation handlers — "Take Weight" saves weights without requiring vehicle details.
  // Required-field validation is only enforced when the user clicks "Proceed to Decision".
  const handleOpenConfirmModal = useCallback(() => {
    setIsConfirmModalOpen(true);
  }, []);

  const handleConfirmWeight = useCallback(async () => {
    setIsCapturingWeight(true);
    try {
      const result = await confirmWeight();
      if (result) {
        toast.success('Weights confirmed and submitted successfully.');
        // Notify TruConnect that weights have been captured — middleware can reset and prepare for next vehicle
        if (middleware.connected) {
          middleware.sendWeightsCaptured();
        }
      } else {
        toast.error('Failed to submit weights. Please try again.');
      }
    } catch {
      toast.error('Failed to submit weights. Please try again.');
    } finally {
      setIsCapturingWeight(false);
      setIsConfirmModalOpen(false);
    }
  }, [confirmWeight, middleware]);

  // Resume a pending transaction — reset capture state so user can weigh fresh
  const handleResumeTransaction = useCallback((txn: WeighingTransaction) => {
    // Reset weighing session so captured axles are cleared for fresh capture
    resetSession();
    setLocalCapturedWeights([]);
    setLocalCurrentAxle(1);
    setCurrentAxle(1);

    setVehiclePlate(txn.vehicleRegNumber || '');
    setIsPlateDisabled(true);
    if (txn.driverId) setSelectedDriverId(txn.driverId);
    if (txn.transporterId) setSelectedTransporterId(txn.transporterId);
    if (txn.originId) setSelectedOriginId(txn.originId);
    if (txn.destinationId) setSelectedDestinationId(txn.destinationId);
    setCurrentStep('vehicle');
    toast.info(`Resuming weighing for ${txn.vehicleRegNumber}`);
  }, [resetSession, setCurrentAxle]);

  // Discard a pending transaction
  const handleDiscardTransaction = useCallback(async (txn: WeighingTransaction) => {
    try {
      await deleteWeighingMutation.mutateAsync(txn.id);
      toast.success(`Transaction ${txn.vehicleRegNumber} discarded successfully.`);
    } catch (error) {
      console.error('Failed to discard transaction:', error);
      toast.error('Failed to discard transaction.');
    }
  }, [deleteWeighingMutation]);

  // Proceed to vehicle step - auto-create vehicle if needed and initialize transaction
  const handleProceedToVehicle = async () => {
    let _vehicleId = selectedVehicleId;

    // Auto-create vehicle if it doesn't exist (first-time weighing)
    if (!existingVehicle && vehiclePlate.length >= 5) {
      try {
        const newVehicle = await createVehicleMutation.mutateAsync({
          regNo: vehiclePlate,
          // Only regNo is required - other details captured from VehicleDetailsCard later
        });
        _vehicleId = newVehicle.id;
        setSelectedVehicleId(newVehicle.id);
        toast.success(`Vehicle ${vehiclePlate} created automatically.`);
      } catch (error) {
        console.warn('Could not auto-create vehicle:', error);
        // Continue without vehicle ID - transaction can still be created
      }
    }

    // Sync plate to middleware
    if (middleware.connected) {
      middleware.sendPlate(vehiclePlate);
    }

    // Initialize transaction via useWeighing hook
    // Use selected config, or fallback to first available config from loaded configurations
    const configToUse = selectedConfig || axleConfigurations[0]?.axleCode || '6C';
    
    // Add default prosecution settings to the initial transaction
    const transaction = await initializeTransaction(vehiclePlate, configToUse, {
      roadId: selectedRoadId || undefined,
      subcountyId: selectedSubcountyId || undefined,
      locationCounty: locationCountyName || undefined,
    });

    if (transaction) {
      // Sync transaction context to middleware for autoweigh tracking
      if (middleware.connected && currentStation) {
        middleware.syncTransaction({
          transactionId: transaction.id,
          vehicleRegNumber: vehiclePlate,
          axleConfigCode: configToUse,
          totalAxles: axleConfigurations.find(c => c.axleCode === configToUse)?.axleNumber || totalAxles,
          stationId: currentStation.id,
          bound: currentBound,
          weighingMode: 'mobile',
        });
      }

      handleNextStep();
    } else {
      toast.error('Could not create transaction. Please check your connection and try again.');
    }
  };

  const handleCancelWeighing = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancelWeighing = async () => {
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

    // Reset local UI state
    setLocalCapturedWeights([]);
    setLocalCurrentAxle(1);
    setCurrentAxleWeight(0);
    setVehiclePlate('');
    setCurrentStep('capture');
    setCompletedSteps([]);

    // Reset linked entity IDs
    setSelectedDriverId(undefined);
    setSelectedTransporterId(undefined);
    setSelectedCargoId(undefined);
    setSelectedOriginId(undefined);
    setSelectedDestinationId(undefined);
    setSelectedVehicleId(undefined);
    setPermitNo('');
    setTrailerNo('');
    setVehicleMake('');
    setComment('');
    setReliefVehicleReg('');
    toast.success('Weighing cancelled.');
  };

  // Modal handlers are now managed by useWeighingUI

  // Decision Panel Action Handlers

  // Print weight ticket - calls backend PDF endpoint
  const handlePrintTicket = useCallback(async () => {
    if (!weighingSession?.transactionId) {
      toast.error('No active transaction to print');
      return;
    }

    try {
      toast.info('Generating weight ticket PDF...', {
        description: `Ticket: ${ticketNumber || weighingSession.ticketNumber}`,
      });

      // Download PDF from backend and open in new window for printing
      const pdfBlob = await downloadWeightTicketPdf(weighingSession.transactionId);
      const pdfUrl = window.URL.createObjectURL(pdfBlob);

      // Open PDF in new window for printing/preview
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
        toast.success('Weight ticket generated successfully', {
          description: 'PDF opened in new window',
        });
      } else {
        // Fallback: trigger download if popup blocked
        await downloadAndSavePdf(
          () => Promise.resolve(pdfBlob),
          `WeightTicket_${ticketNumber || weighingSession.ticketNumber}.pdf`
        );
        toast.success('Weight ticket downloaded', {
          description: 'Check your downloads folder',
        });
      }
    } catch (error) {
      console.error('Failed to print ticket:', error);
      toast.error('Failed to generate weight ticket', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  }, [weighingSession, ticketNumber]);

  // Tag vehicle - creates a tag in the backend
  const _handleTagVehicle = useCallback(async () => {
    if (!vehiclePlate || !currentStation?.code) {
      toast.error('Missing vehicle plate or station');
      return;
    }

    try {
      // Fetch tag categories first
      const categories = await fetchTagCategories();
      const defaultCategory = categories.find(c => c.code === 'OVERLOAD') || categories[0];

      if (!defaultCategory) {
        toast.error('No tag categories available');
        return;
      }

      const tag = await createVehicleTag({
        regNo: vehiclePlate,
        tagType: 'WEIGHING',
        tagCategoryId: defaultCategory.id,
        reason: overallStatus === 'OVERLOAD'
          ? `Overloaded by ${gvwOverload.toLocaleString()} kg`
          : `Weighing compliance check - ${overallStatus}`,
        stationCode: currentStation.code,
        effectiveDays: 30,
      });

      toast.success('Vehicle tagged successfully', {
        description: `Tag ID: ${tag.id.slice(0, 8)}...`,
      });
    } catch (error) {
      console.error('Failed to tag vehicle:', error);
      toast.error('Failed to create vehicle tag');
    }
  }, [vehiclePlate, currentStation, overallStatus, gvwOverload]);

  // Proceed to decision step (flushes vehicle details to backend)
  // This is where required-field validation is enforced (not on "Take Weight")
  const handleProceedToDecision = useCallback(async () => {
    // Validate required fields before proceeding to decision
    if (!validationResult.isValid) {
      setIsMissingFieldsModalOpen(true);
      return;
    }

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

    try {
      // Use force: true to bypass debouncing and ensure it saves NOW
      const ok = await updateVehicleDetails(payload, { force: true });
      if (!ok) {
        toast.error('Could not save vehicle details. Please try again.');
        return;
      }
      handleNextStep();
    } catch {
      toast.error('Failed to update weighing transaction.');
    }
  }, [weighingSession, vehiclePlate, selectedDriverId, selectedTransporterId, selectedOriginId, selectedDestinationId, selectedCargoId, effectiveActId, selectedRoadId, selectedSubcountyId, locationCountyName, reliefVehicleReg, comment, geoLat, geoLng, updateVehicleDetails, handleNextStep, validationResult.isValid]);

  // Send to yard - creates a yard entry for non-compliant vehicles
  const handleSendToYard = useCallback(async () => {
    if (!weighingSession?.transactionId || !currentStation?.id) {
      toast.error('No active transaction or station');
      return;
    }

    // Ensure all details are flushed before sending to yard
    await handleProceedToDecision();

    try {
      const reason = overallStatus === 'OVERLOAD'
        ? `GVW overload of ${gvwOverload.toLocaleString()} kg`
        : 'Compliance verification required';

      const yardEntry = await createYardEntry({
        weighingId: weighingSession.transactionId,
        stationId: currentStation.id,
        reason,
      });

      toast.success('Vehicle sent to yard', {
        description: `Entry ID: ${yardEntry.id.slice(0, 8)}... - Reason: ${reason}`,
      });
    } catch (error) {
      console.error('Failed to send to yard:', error);
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('already exists') || (error as { response?: { status?: number } })?.response?.status === 409) {
        toast.info('Vehicle has already been sent to yard', {
          description: 'A yard entry was created automatically when the overload was detected.',
        });
      } else {
        toast.error('Failed to create yard entry');
      }
    }
  }, [weighingSession, currentStation, overallStatus, gvwOverload]);

  // Special release - navigates to special release workflow
  const handleSpecialRelease = useCallback(async () => {
    if (!weighingSession?.transactionId) {
      toast.error('No active transaction');
      return;
    }

    // Ensure all details are flushed before special release
    await handleProceedToDecision();

    // Navigate to special release page with transaction context
    router.push(`/${orgSlug}/weighing/special-release?transactionId=${weighingSession.transactionId}`);
  }, [weighingSession, router, orgSlug, handleProceedToDecision]);

  // Finish & Exit: end session, reset middleware, redirect to capture (no print). Always available on decision screen.
  const handleFinishOnly = useCallback(() => {
    resetSession();
    if (middleware.connected) {
      middleware.resetSession();
    }

    // Clear all weighing-related TanStack Query caches to prevent stale data
    queryClient.removeQueries({ queryKey: ['weighingTransactions'] });
    queryClient.removeQueries({ queryKey: ['pendingWeighings'] });
    queryClient.invalidateQueries({ queryKey: ['weighingTransactions'] });

    // Reset all local UI state for fresh session
    setVehiclePlate('');
    setIsPlateDisabled(false);
    setFrontViewImage(undefined);
    setOverviewImage(undefined);
    setComment('');
    setReliefVehicleReg('');
    setSelectedConfig('2A');
    setSelectedDriverId(undefined);
    setSelectedTransporterId(undefined);
    setSelectedCargoId(undefined);
    setSelectedOriginId(undefined);
    setSelectedDestinationId(undefined);
    setSelectedVehicleId(undefined);
    setLocalCapturedWeights([]);
    setLocalCurrentAxle(1);
    hasShownSentToYardToast.current = false;
    setCompletedSteps([]);
    setCurrentStep('capture');
    toast.success('Session ended. Ready for next vehicle.');
  }, [resetSession, middleware, queryClient, setVehiclePlate, setIsPlateDisabled, setFrontViewImage, setOverviewImage, setComment, setReliefVehicleReg, setCurrentStep, setCompletedSteps]);

  // Finish & Print Ticket: print then finish (for compliant vehicles). Calls handleFinishOnly after print.
  const handleFinishAndNew = useCallback(async () => {
    // Ensure all details are flushed before finishing
    await handleProceedToDecision();
    await handlePrintTicket();
    handleFinishOnly();
    toast.success('Weighing completed. Ready for next vehicle.');
  }, [handleProceedToDecision, handlePrintTicket, handleFinishOnly]);

  // Collect payment for commercial weighing - navigate to invoices for this transaction
  const handleCollectPayment = useCallback(() => {
    if (!weighingSession?.transactionId) {
      toast.error('No active transaction');
      return;
    }
    router.push(`/${orgSlug}/financial/invoices?transactionId=${weighingSession.transactionId}`);
  }, [weighingSession, router, orgSlug]);

  // Initiate a reweigh - creates new transaction linked to original
  const handleReweigh = useCallback(async () => {
    const newTransaction = await initiateReweigh();
    if (newTransaction) {
      // Reset capture state for reweigh
      setLocalCapturedWeights([]);
      setLocalCurrentAxle(1);
      setCurrentAxleWeight(0);
      setCurrentStep('vehicle');
      toast.success(`Re-weigh initiated (Cycle ${newTransaction.reweighCycleNo ?? reweighCycleNo + 1})`);
    } else {
      toast.error('Failed to initiate re-weigh.');
    }
  }, [initiateReweigh, reweighCycleNo]);



  // Validation for step transitions (also disable during transaction creation to prevent double-click)
  const canProceedFromCapture = useMemo(() => {
    const isPlateValid = vehiclePlate.length >= 5;
    const isScaleTestValid = scaleTestRequired ? isScaleTestCompleted : true;
    return isPlateValid && isScaleTestValid && !isWeighingLoading;
  }, [vehiclePlate, scaleTestRequired, isScaleTestCompleted, isWeighingLoading]);
  const canProceedFromVehicle = selectedConfig !== '' && !!complianceResult;

  // Derive station display name
  const stationDisplayName = currentStation
    ? currentStation.supportsBidirectional
      ? `${currentStation.name} (${currentStation.boundACode || 'A'})`
      : currentStation.name
    : 'Loading...';

  const stationCode = currentStation?.code || '';

  // Loading state
  if (isLoadingData) {
    return (
      <AppShell title="Mobile Weighing" subtitle="Loading...">
        <ProtectedRoute requiredPermissions={['weighing.create']}>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading station and configuration data...</p>
            </div>
          </div>
        </ProtectedRoute>
      </AppShell>
    );
  }

  return (
    <AppShell title="Mobile Weighing" subtitle={stationDisplayName}>
      <ProtectedRoute requiredPermissions={['weighing.create']}>
        <div className="space-y-4">
          {/* Data Loading Warning Banner */}
          {loadError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-yellow-600 text-sm">{loadError?.message || 'Failed to load weighing data'}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Header with Station Info */}
          <WeighingPageHeader
            title="Mobile Weighing"
            subtitle={`${stationDisplayName} | Station: ${stationCode}`}
            scaleStatus={scaleStatus}
            scaleLabel="Scale"
          />

          {/* Stepper - 3 steps */}
          <WeighingStepper
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={goToStep}
          />

          {/* Non-blocking saving indicator when vehicle details are syncing */}
          {isUpdatingDetails && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              <span>Saving vehicle details...</span>
            </div>
          )}

          {/* Step Content */}
          <div className="min-h-[500px]">
            {currentStep === 'capture' && (
              <WeighingCaptureStep
                pendingTransactions={pendingTransactions}
                middlewareConnected={middleware.connected}
                currentStation={currentStation}
                currentBound={currentBound}
                scales={scales}
                isScalesConnected={isScalesConnected}
                isScaleTestCompleted={isScaleTestCompleted}
                lastScaleTestAt={lastScaleTestAt}
                weighingType="mobile"
                isSimulationMode={middleware.simulation}
                handleResumeTransaction={handleResumeTransaction}
                handleDiscardTransaction={handleDiscardTransaction}
                handleStartScaleTest={() => setIsScaleTestModalOpen(true)}
                handleConnectScales={() => middleware.connect()}
                handleToggleScale={() => { }}
                handleChangeWeighingType={handleChangeWeighingType}
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
                canProceedFromCapture={vehiclePlate.length >= 5}
                isCommercial={isCommercial}
                handleBoundChange={setCurrentBoundState}
                onEnter={middleware.sendEnter}
                onMoveForward={middleware.sendMoveForward}
                onMoveBack={middleware.sendMoveBack}
                onStop={middleware.sendStop}
              />
            )}

            {currentStep === 'vehicle' && (
              <WeighingVehicleStep
                selectedConfig={selectedConfig}
                axleConfigurations={axleConfigurations}
                vehiclePlate={vehiclePlate}
                ticketNumber={ticketNumber || weighingSession?.ticketNumber || ''}
                capturedAxles={capturedAxles}
                currentAxle={currentAxle}
                onAxleSelect={setCurrentAxle}
                weightReferences={weightReferences}
                onConfigChange={(config) => {
                  const configObj = axleConfigurations.find(c => c.axleCode === config);
                  setSelectedConfig(config);
                  setAxleConfig(config);
                  setLocalCapturedWeights([]);
                  setLocalCurrentAxle(1);
                  // Notify TruConnect of expected axle count for autoweigh tracking
                  if (middleware.connected && configObj) {
                    middleware.sendUpdateConfig(configObj.axleNumber, config);
                  }
                }}
                isCommercial={isCommercial}
                groupResults={effectiveGroupResults}
                gvwPermissible={gvwPermissible}
                gvwMeasured={gvwMeasured}
                gvwOverload={gvwOverload}
                overallStatus={overallStatus}
                gvwToleranceDisplay={gvwToleranceDisplay}
                gvwToleranceKg={gvwToleranceKg}
                gvwEffectiveLimitKg={gvwEffectiveLimitKg}
                allAxlesCaptured={allAxlesCaptured}
                isWeightConfirmed={isWeightConfirmed}
                onTakeWeight={handleOpenConfirmModal}
                reweighCycleNo={reweighCycleNo}
                handlePrevStep={handlePrevStep}
                handleProceedToDecision={handleProceedToDecision}
                isProceedDisabled={!allAxlesCaptured || !isWeightConfirmed}
                isWeighingLoading={isWeighingLoading}
                handleCancelWeighing={handleCancelWeighing}
                vehicleDetailsProps={{
                  vehicles: [],
                  selectedVehicleId,
                  onVehicleIdChange: setSelectedVehicleId,
                  drivers,
                  selectedDriverId,
                  onDriverIdChange: setSelectedDriverId,
                  onAddDriver: () => setIsDriverModalOpen(true),
                  onRefreshDrivers: refetchDrivers,
                  transporters,
                  selectedTransporterId,
                  onTransporterIdChange: setSelectedTransporterId,
                  onAddTransporter: () => setIsTransporterModalOpen(true),
                  onRefreshTransporters: refetchTransporters,
                  cargoTypes,
                  selectedCargoId,
                  onCargoIdChange: setSelectedCargoId,
                  onAddCargoType: () => setIsCargoTypeModalOpen(true),
                  onRefreshCargoTypes: refetchCargoTypes,
                  locations,
                  selectedOriginId,
                  onOriginIdChange: setSelectedOriginId,
                  selectedDestinationId,
                  onDestinationIdChange: setSelectedDestinationId,
                  onAddOriginLocation: () => { setLocationModalTarget('origin'); setIsLocationModalOpen(true); },
                  onAddDestinationLocation: () => { setLocationModalTarget('destination'); setIsLocationModalOpen(true); },
                  onRefreshLocations: refetchLocations,
                  acts,
                  selectedActId,
                  onActIdChange: setSelectedActId,
                  permitNo,
                  onPermitNoChange: setPermitNo,
                  trailerNo,
                  onTrailerNoChange: setTrailerNo,
                  vehicleMake,
                  onVehicleMakeChange: setVehicleMake,
                  onAddVehicleMake: () => setIsVehicleMakeModalOpen(true),
                  onRefreshVehicleMakes: refetchVehicleMakes,
                  reliefVehicleReg,
                  onReliefVehicleRegChange: setReliefVehicleReg,
                  showReliefVehicleReg: reweighCycleNo > 0,
                  comment,
                  onCommentChange: setComment,
                  isCommercial,
                  showPermitSection: true,
                }}
              >
                <WeightCaptureCard
                  currentAxle={currentAxle}
                  totalAxles={totalAxles}
                  capturedWeights={capturedWeights}
                  capturedAxles={capturedAxles}
                  currentWeight={currentAxleWeight}
                  onCaptureAxle={handleCaptureAxle}
                  scaleAStatus={middleware.scaleStatus?.scaleA?.status === 'connected' ? 'connected' : 'disconnected'}
                  scaleBStatus={middleware.scaleStatus?.scaleB?.status === 'connected' ? 'connected' : 'disconnected'}
                />
              </WeighingVehicleStep>
            )}

            {currentStep === 'decision' && (
              <WeighingDecisionStep
                ticketNumber={ticketNumber || weighingSession?.ticketNumber || ''}
                vehiclePlate={vehiclePlate}
                overallStatus={overallStatus}
                gvwMeasured={gvwMeasured}
                reweighCycleNo={reweighCycleNo}
                totalFeeUsd={complianceResult?.totalFeeUsd ?? 0}
                isValid={validationResult.isValid}
                missingFields={validationResult.missingFields}
                isSentToYard={complianceResult?.isSentToYard ?? false}
                canPrint={canPrint}
                canSendToYard={canSendToYard}
                canSpecialRelease={canSpecialRelease}
                canReweigh={false}
                onFinishOnly={handleFinishOnly}
                onFinishAndNew={handleFinishAndNew}
                onSendToYard={handleSendToYard}
                onSpecialRelease={handleSpecialRelease}
                onReweigh={handleReweigh}
                onPrintTicket={handlePrintTicket}
                onCollectPayment={isCommercial ? handleCollectPayment : undefined}
                isFinishing={isWeighingLoading}
                isCommercial={isCommercial}
                operationalToleranceKg={operationalToleranceKg}
              />
            )}

            {/* Scale Test Modal - Connected to middleware for live weight readings */}
            {/* PAW scales: middleware derives scaleA/scaleB from combined weight (total/2) */}
            {/* Haenni scales: middleware may provide scaleA/scaleB directly if supported */}
            <ScaleTestModal
              open={isScaleTestModalOpen}
              onOpenChange={setIsScaleTestModalOpen}
              station={currentStation ?? null}
              bound={currentBound}
              onTestComplete={handleScaleTestComplete}
              weighingMode="mobile"
              middlewareConnected={middleware.connected}
              middlewareWeights={middleware.weights ? {
                currentWeight: (middleware.weights as any).weight || (middleware.weights as any).currentWeight,
                // Individual scale weights - PAW: derived from combined, Haenni: may be direct
                scaleA: (middleware.weights as any).scaleA,
                scaleB: (middleware.weights as any).scaleB,
                scaleWeightMode: (middleware.weights as any).scaleWeightMode,
              } : null}
              middlewareScaleStatus={middleware.scaleStatus ? {
                scaleA: middleware.scaleStatus.scaleA ? {
                  weight: middleware.scaleStatus.scaleA.weight,
                  connected: middleware.scaleStatus.scaleA.status === 'connected',
                } : undefined,
                scaleB: middleware.scaleStatus.scaleB ? {
                  weight: middleware.scaleStatus.scaleB.weight,
                  connected: middleware.scaleStatus.scaleB.status === 'connected',
                } : undefined,
              } : undefined}
            />

            {/* Weight Confirmation Modal */}
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

            {/* Missing Fields Warning Modal */}
            <MissingFieldsWarningModal
              isOpen={isMissingFieldsModalOpen}
              onClose={() => setIsMissingFieldsModalOpen(false)}
              missingFields={validationResult.missingFields}
            />

            {/* Entity Modals */}
            <DriverModal
              open={isDriverModalOpen}
              onOpenChange={setIsDriverModalOpen}
              mode="create"
              onSave={handleSaveDriver}
              isSaving={isSavingEntity}
            />

            <TransporterModal
              open={isTransporterModalOpen}
              onOpenChange={setIsTransporterModalOpen}
              mode="create"
              onSave={handleSaveTransporter}
              isSaving={isSavingEntity}
            />

            <OriginDestinationModal
              open={isLocationModalOpen}
              onOpenChange={setIsLocationModalOpen}
              mode="create"
              onSave={handleSaveLocation}
              isSaving={isSavingEntity}
            />

            <VehicleMakeModal
              open={isVehicleMakeModalOpen}
              onOpenChange={setIsVehicleMakeModalOpen}
              mode="create"
              onSave={async (data) => {
                await handleSaveVehicleMake(data);
                if (selectedVehicleId && data.name) {
                  const config = axleConfigurations.find((c: any) => c.axleCode === selectedConfig);
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
            />

            <CargoTypeModal
              open={isCargoTypeModalOpen}
              onOpenChange={setIsCargoTypeModalOpen}
              mode="create"
              onSave={handleSaveCargoType}
              isSaving={isSavingEntity}
            />

          </div>
        </div>
      </ProtectedRoute>

      {/* Cancel Weighing Confirmation */}
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
    </AppShell>
  );
}