"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    AxleConfigurationCard,
    CargoTypeModal,
    ComplianceBanner,
    ComplianceTable,
    DecisionPanel,
    DriverModal,
    getDefaultAxleConfig,
    ImageCaptureCard,
    OriginDestinationModal,
    TransporterModal,
    VehicleDetailsCard,
    VehicleMakeModal,
    WeighingPageHeader,
    WeighingStepper,
    WeightCaptureCard
} from '@/components/weighing';
import { MissingFieldsWarningModal } from '@/components/weighing/MissingFieldsWarningModal';
import { PendingTransactionCard } from '@/components/weighing/PendingTransactionCard';
import { ScaleHealthPanel, ScaleInfo } from '@/components/weighing/ScaleHealthPanel';
import { ScaleTestBanner } from '@/components/weighing/ScaleTestBanner';
import { ScaleTestModal } from '@/components/weighing/ScaleTestModal';
import { WeightConfirmationModal } from '@/components/weighing/WeightConfirmationModal';
import {
    useAxleWeightReferences,
    useCargoTypes,
    useCreateCargoType,
    useCreateDriver,
    useCreateOriginDestination,
    useCreateTransporter,
    useCreateVehicle,
    useCreateVehicleMake,
    useDrivers,
    useMyScaleTestStatus,
    useMyStation,
    useOriginsDestinations,
    usePendingWeighings,
    useTransporters,
    useVehicleByRegNo,
    useVehicleMakes,
    useWeighingAxleConfigurations,
} from '@/hooks/queries';
import { useHasPermission } from '@/hooks/useAuth';
import { useMiddleware } from '@/hooks/useMiddleware';
import { useWeighing } from '@/hooks/useWeighing';
import { CargoType, downloadAndSavePdf, downloadWeightTicketPdf, Driver, OriginDestination, ScaleTest, Transporter, WeighingTransaction } from '@/lib/api/weighing';
import { createVehicleTag, createYardEntry, fetchTagCategories } from '@/lib/api/yard';
import { QUERY_KEYS } from '@/lib/query/config';
import { calculateOverallStatus, validateRequiredFields } from '@/lib/weighing-utils';
import {
    AxleGroupResult,
    ComplianceStatus,
    CreateDriverRequest,
    CreateOriginDestinationRequest,
    CreateTransporterRequest,
    CreateVehicleMakeRequest,
    ScaleStatus,
    WeighingStep,
} from '@/types/weighing';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Edit3, Loader2, Scale, ScanLine } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

  // Fetch drivers, transporters, cargo types, and locations for VehicleDetailsCard
  const { data: drivers = [] } = useDrivers();
  const { data: transporters = [] } = useTransporters();
  const { data: cargoTypes = [] } = useCargoTypes();
  const { data: locations = [] } = useOriginsDestinations();

  // Vehicle lookup mutation for auto-creating vehicles
  const createVehicleMutation = useCreateVehicle();

  // Entity creation mutations
  const createDriverMutation = useCreateDriver();
  const createTransporterMutation = useCreateTransporter();
  const createCargoTypeMutation = useCreateCargoType();
  const createOriginDestinationMutation = useCreateOriginDestination();
  const createVehicleMakeMutation = useCreateVehicleMake();
  const { data: vehicleMakesData = [], refetch: refetchVehicleMakes } = useVehicleMakes();

  // Bound state for bidirectional stations
  const [currentBoundState, setCurrentBoundState] = useState<string | undefined>();

  // Derive bound from station data
  const currentBound = currentBoundState ?? (currentStation?.supportsBidirectional ? currentStation.boundACode : undefined);

  // Weight state - MUST be declared before useMiddleware hook
  const [currentAxleWeight, setCurrentAxleWeight] = useState(0);

  // Scale health panel state - MUST be declared before useMiddleware hook
  const [scales, setScales] = useState<ScaleInfo[]>([
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

  // useWeighing hook for backend persistence
  const weighingHook = useWeighing({
    weighingMode: 'mobile',
    bound: currentBound,
    autoInitialize: true,
  });

  // useMiddleware hook for real-time WebSocket connection to TruConnect middleware
  const middleware = useMiddleware({
    stationCode: currentStation?.code || 'DEFAULT',
    bound: (currentBound as 'A' | 'B') || 'A',
    mode: 'mobile',
    autoConnect: true,
    clientName: `TruLoad Frontend - ${currentStation?.name || 'Mobile'}`,
    clientType: 'truload-frontend',
    onWeightUpdate: (weight) => {
      // Update current axle weight from middleware
      if (weight.weight !== undefined) {
        setCurrentAxleWeight(weight.weight);
      }
      // Update simulation mode from weight data
      setIsSimulationMode(weight.simulation || false);
      // Update connection status from weight data
      if (weight.connection?.connected !== undefined) {
        setIsScalesConnected(weight.connection.connected);
      }
      // Update scale info from weight data if available
      // Now handles both scaleAStatus and scaleBStatus from enhanced middleware data
      if (weight.scaleInfo || weight.scaleAStatus || weight.scaleBStatus) {
        setScales(prev => [
          {
            ...prev[0],
            status: (weight.scaleAStatus?.connected ?? weight.connection?.connected) ? 'connected' : 'disconnected',
            weight: weight.scaleA ?? weight.weight ?? 0,
            battery: weight.scaleAStatus?.battery ?? weight.scaleInfo?.battery ?? prev[0].battery,
            temperature: weight.scaleAStatus?.temperature ?? weight.scaleInfo?.temperature ?? prev[0].temperature,
            signalStrength: weight.scaleAStatus?.signalStrength ?? weight.scaleInfo?.signalStrength ?? prev[0].signalStrength,
            make: weight.scaleInfo?.make ?? prev[0].make,
            model: weight.scaleInfo?.model ?? prev[0].model,
          },
          {
            ...prev[1],
            // Scale B status - for PAW/simulation, both scales are connected since weight is split
            status: (weight.scaleBStatus?.connected ?? weight.connection?.connected) ? 'connected' : 'disconnected',
            weight: weight.scaleB ?? (weight.weight ? Math.floor(weight.weight / 2) : 0),
            battery: weight.scaleBStatus?.battery ?? weight.scaleInfo?.battery ?? prev[1].battery,
            temperature: weight.scaleBStatus?.temperature ?? weight.scaleInfo?.temperature ?? prev[1].temperature,
            signalStrength: weight.scaleBStatus?.signalStrength ?? weight.scaleInfo?.signalStrength ?? prev[1].signalStrength,
            make: weight.scaleInfo?.make ?? prev[1].make,
            model: weight.scaleInfo?.model ?? prev[1].model,
          },
        ]);
      }
      console.log('[Mobile] Weight update from middleware:', weight);
    },
    onScaleStatusChange: (status) => {
      console.log('[Mobile] Scale status from middleware:', status);
      // Update simulation mode
      setIsSimulationMode(status.simulation || false);
      // Update scale connection status - now handles both scales properly
      if (status.scaleA || status.scaleB) {
        setScales(prev => [
          {
            ...prev[0],
            status: status.scaleA?.status === 'connected' ? 'connected' : 'disconnected',
            weight: status.scaleA?.weight || 0,
            battery: status.scaleA?.battery || prev[0].battery,
            temperature: status.scaleA?.temp || prev[0].temperature,
          },
          {
            ...prev[1],
            status: status.scaleB?.status === 'connected' ? 'connected' : 'disconnected',
            weight: status.scaleB?.weight || 0,
            battery: status.scaleB?.battery || prev[1].battery,
            temperature: status.scaleB?.temp || prev[1].temperature,
          },
        ]);
      }
      setIsScalesConnected(status.connected);
    },
    onConnectionModeChange: (mode, url) => {
      console.log(`[Mobile] Connection mode changed: ${mode} (${url})`);
      setMiddlewareConnected(mode !== 'disconnected');
    },
  });

  // Scale test status query (depends on currentBound)
  const {
    data: scaleTestStatus,
    isLoading: isLoadingScaleTest,
  } = useMyScaleTestStatus(currentBound);

  // Derive scale test state from query
  const isScaleTestCompleted = scaleTestStatus?.hasValidTest ?? false;
  const lastScaleTestAt = scaleTestStatus?.latestTest ? new Date(scaleTestStatus.latestTest.carriedAt) : undefined;
  const [_currentScaleTest, setCurrentScaleTest] = useState<ScaleTest | null>(null);

  // Combined loading state
  const isLoadingData = isLoadingStation || isLoadingAxleConfigs || isLoadingScaleTest;
  const loadError = stationError || axleConfigError
    ? 'Failed to load data. The page will work with limited functionality.'
    : null;

  // Vehicle state (declared before effects that use them)
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [isPlateDisabled, setIsPlateDisabled] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [_axleConfig, setAxleConfig] = useState(getDefaultAxleConfig(''));
  const [ticketNumber, setTicketNumber] = useState('');

  // Derive selected configuration ID for weight references lookup
  const selectedConfigId = useMemo(() => {
    if (!selectedConfig || axleConfigurations.length === 0) return undefined;
    const config = axleConfigurations.find(c => c.axleCode === selectedConfig);
    return config?.id;
  }, [selectedConfig, axleConfigurations]);

  // Fetch weight references for the selected configuration
  const { data: weightReferences = [] } = useAxleWeightReferences(selectedConfigId);

  // Update scale test from query result
  useEffect(() => {
    if (scaleTestStatus?.latestTest) {
      setCurrentScaleTest(scaleTestStatus.latestTest);
    }
  }, [scaleTestStatus]);

  // Set bound when station loads
  useEffect(() => {
    if (currentStation?.supportsBidirectional && currentStation.boundACode && !currentBoundState) {
      setCurrentBoundState(currentStation.boundACode);
    }
  }, [currentStation, currentBoundState]);

  // Set default axle config when data loads
  useEffect(() => {
    if (axleConfigurations.length > 0 && !selectedConfig) {
      const defaultConfig = axleConfigurations.find(c => c.axleCode === '2A') || axleConfigurations[0];
      setSelectedConfig(defaultConfig.axleCode);
      setAxleConfig(getDefaultAxleConfig(defaultConfig.axleCode));
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
  const [selectedDriverId, setSelectedDriverId] = useState<string | undefined>();
  const [selectedTransporterId, setSelectedTransporterId] = useState<string | undefined>();
  const [selectedCargoId, setSelectedCargoId] = useState<string | undefined>();
  const [selectedOriginId, setSelectedOriginId] = useState<string | undefined>();
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | undefined>();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>();

  // Vehicle details form state - simple values
  const [permitNo, setPermitNo] = useState('');
  const [trailerNo, setTrailerNo] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [comment, setComment] = useState('');
  const [reliefVehicleReg, setReliefVehicleReg] = useState('');

  // Auto-lookup vehicle by registration number
  const { data: existingVehicle } = useVehicleByRegNo(vehiclePlate.length >= 5 ? vehiclePlate : undefined);

  // Update selected vehicle when lookup returns
  useEffect(() => {
    if (existingVehicle?.id) {
      setSelectedVehicleId(existingVehicle.id);
      // Auto-populate fields from existing vehicle
      if (existingVehicle.transporterId) {
        setSelectedTransporterId(existingVehicle.transporterId);
      }
      if (existingVehicle.axleConfigurationId) {
        const config = axleConfigurations.find(c => c.id === existingVehicle.axleConfigurationId);
        if (config) {
          setSelectedConfig(config.axleCode);
          setAxleConfig(getDefaultAxleConfig(config.axleCode));
        }
      }
    } else {
      setSelectedVehicleId(undefined);
    }
  }, [existingVehicle, axleConfigurations]);

  // Sync driver/transporter/cargo/origin/destination selections to backend transaction
  useEffect(() => {
    // Only sync if we have an active transaction
    if (!weighingHook.session?.transactionId) return;

    // Debounce updates to avoid excessive API calls
    const timeoutId = setTimeout(() => {
      const updates: Record<string, string | undefined> = {};

      if (selectedDriverId) updates.driverId = selectedDriverId;
      if (selectedTransporterId) updates.transporterId = selectedTransporterId;
      if (selectedOriginId) updates.originId = selectedOriginId;
      if (selectedDestinationId) updates.destinationId = selectedDestinationId;
      if (selectedCargoId) updates.cargoId = selectedCargoId;

      // Only update if there's something to update
      if (Object.keys(updates).length > 0) {
        weighingHook.updateVehicleDetails(updates).catch((err) => {
          console.warn('Failed to sync vehicle details to backend:', err);
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    weighingHook.session?.transactionId,
    selectedDriverId,
    selectedTransporterId,
    selectedOriginId,
    selectedDestinationId,
    selectedCargoId,
  ]);

  // Use capture state from useWeighing hook (with local fallbacks for UI)
  const {
    capturedAxles: _hookCapturedAxles,
    currentAxle: hookCurrentAxle,
    setCurrentAxle: setHookCurrentAxle,
    totalAxles: _hookTotalAxles,
    allAxlesCaptured: hookAllAxlesCaptured,
    initializeTransaction,
    captureAxleWeight,
    confirmWeight,
    initiateReweigh,
    updateVehicleDetails: _updateVehicleDetails,
    resetSession,
    session: weighingSession,
    transaction: _weighingTransaction,
    complianceResult,
    reweighCycleNo,
    isWeightConfirmed,
    isLoading: isWeighingLoading,
    error: _weighingError,
  } = weighingHook;

  // Local state for captured weights (for UI display during capture)
  const [localCapturedWeights, setLocalCapturedWeights] = useState<number[]>([]);
  const [localCurrentAxle, setLocalCurrentAxle] = useState(1);

  // Derive captured state from hook or local state
  const capturedAxles = weighingSession?.capturedAxles.map(a => a.axleNumber) || [];
  const capturedWeights = weighingSession?.capturedAxles.map(a => a.weightKg) || localCapturedWeights;
  const currentAxle = hookCurrentAxle || localCurrentAxle;
  const setCurrentAxle = (axle: number) => {
    setHookCurrentAxle(axle);
    setLocalCurrentAxle(axle);
  };

  // Image state
  const [frontViewImage, setFrontViewImage] = useState<string | undefined>();
  const [overviewImage, setOverviewImage] = useState<string | undefined>();

  // Sync middleware hook state with component state
  useEffect(() => {
    // Update middleware connection status from the hook
    setMiddlewareConnected(middleware.connected);

    // Sync simulation mode from middleware state or weight data
    const simMode = middleware.simulation || middleware.weights?.simulation || false;
    setIsSimulationMode(simMode);

    if (simMode) {
      console.log('[Mobile] Running in simulation mode');
    }

    // Update weight from middleware if available
    if (middleware.weights?.weight !== undefined) {
      setCurrentAxleWeight(middleware.weights.weight);
    }

    // Sync connection status from weight data
    if (middleware.weights?.connection?.connected !== undefined) {
      setIsScalesConnected(middleware.weights.connection.connected);
    }
  }, [middleware.connected, middleware.simulation, middleware.weights]);

  // Electron IPC fallback for scale sync (only used when running in Electron app)
  // WebSocket connection is handled by useMiddleware hook for PWA/browser mode
  useEffect(() => {
    // Define type for scale status with make/model
    interface ScaleStatusData {
      connected: boolean;
      weight: number;
      battery: number;
      temperature: number;
      signalStrength: number;
      make?: string;
      model?: string;
    }

    // Check if we're in an Electron environment
    const electronAPI = (window as { electronAPI?: {
      getScaleStatus: () => Promise<{ success: boolean; scales: {
        scaleA: ScaleStatusData;
        scaleB: ScaleStatusData;
        anyConnected: boolean;
      }}>;
      onScaleStatusChanged: (callback: (data: {
        scaleId: string;
        status: ScaleStatusData;
        allScales: {
          scaleA: ScaleStatusData;
          scaleB: ScaleStatusData;
          anyConnected: boolean;
        };
      }) => void) => () => void;
    }}).electronAPI;

    // If not in Electron, the useMiddleware hook handles WebSocket connection
    // No need for direct API fetch here - it would duplicate the connection
    if (!electronAPI) {
      console.log('[Mobile] Running in browser/PWA mode - WebSocket handled by useMiddleware');
      return;
    }

    // Get initial scale status from middleware (Electron only)
    electronAPI.getScaleStatus().then(result => {
      if (result.success && result.scales) {
        updateScalesFromMiddleware(result.scales);
        // Update metadata from first scale that has it
        if (result.scales.scaleA?.make || result.scales.scaleB?.make) {
          setScaleMetadata({
            make: result.scales.scaleA?.make || result.scales.scaleB?.make || null,
            model: result.scales.scaleA?.model || result.scales.scaleB?.model || null,
          });
        }
        setMiddlewareConnected(true);
      }
    }).catch(err => {
      console.error('[Mobile] Failed to get scale status:', err);
    });

    // Listen for scale status changes (Electron only)
    const unsubscribe = electronAPI.onScaleStatusChanged((data) => {
      console.log('[Mobile] Scale status changed:', data);
      updateScalesFromMiddleware(data.allScales);
      setMiddlewareConnected(true);
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  // Helper to update scales from middleware data
  const updateScalesFromMiddleware = useCallback((allScales: {
    scaleA: { connected: boolean; weight: number; battery: number; temperature: number; signalStrength: number; make?: string; model?: string };
    scaleB: { connected: boolean; weight: number; battery: number; temperature: number; signalStrength: number; make?: string; model?: string };
    anyConnected: boolean;
  }) => {
    setScales(prev => [
      {
        ...prev[0],
        status: allScales.scaleA?.connected ? 'connected' : 'disconnected',
        weight: allScales.scaleA?.weight || 0,
        battery: allScales.scaleA?.battery || 0,
        temperature: allScales.scaleA?.temperature || 0,
        signalStrength: allScales.scaleA?.signalStrength || 0,
        isActive: allScales.scaleA?.connected || false,
        make: allScales.scaleA?.make || scaleMetadata.make || prev[0].make,
        model: allScales.scaleA?.model || scaleMetadata.model || prev[0].model,
        lastReading: new Date(),
      },
      {
        ...prev[1],
        status: allScales.scaleB?.connected ? 'connected' : 'disconnected',
        weight: allScales.scaleB?.weight || 0,
        battery: allScales.scaleB?.battery || 0,
        temperature: allScales.scaleB?.temperature || 0,
        signalStrength: allScales.scaleB?.signalStrength || 0,
        isActive: allScales.scaleB?.connected || false,
        make: allScales.scaleB?.make || scaleMetadata.make || prev[1].make,
        model: allScales.scaleB?.model || scaleMetadata.model || prev[1].model,
        lastReading: new Date(),
      },
    ]);
    setIsScalesConnected(allScales.anyConnected);
  }, [scaleMetadata]);

  // Entity Modal States
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isTransporterModalOpen, setIsTransporterModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationModalTarget, setLocationModalTarget] = useState<'origin' | 'destination'>('origin');
  const [isVehicleMakeModalOpen, setIsVehicleMakeModalOpen] = useState(false);
  const [isCargoTypeModalOpen, setIsCargoTypeModalOpen] = useState(false);
  const [isSavingEntity, setIsSavingEntity] = useState(false);

  // Scale test modal state (scale test status is now from TanStack Query)
  const [isScaleTestModalOpen, setIsScaleTestModalOpen] = useState(false);

  // Weight confirmation modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isCapturingWeight, setIsCapturingWeight] = useState(false);

  // Permissions - mapped to backend permission codes
  const _canCapture = useHasPermission('weighing.create');
  const canPrint = useHasPermission('weighing.export');
  const _canTag = useHasPermission('tag.create');
  const canSendToYard = useHasPermission('weighing.send_to_yard');
  const canSpecialRelease = useHasPermission('case.special_release');

  // Scale status derived from middleware connection state
  const scaleStatus: ScaleStatus = middlewareConnected ? 'connected' : 'disconnected';

  // Get total axles based on selected config
  const getTotalAxles = (config: string): number => {
    const axleCount: Record<string, number> = {
      '2A': 2, '3A': 3, '4A': 4, '5A': 5, '6C': 6, '7A': 7,
    };
    return axleCount[config] || 6;
  };
  const totalAxles = getTotalAxles(selectedConfig);

  // Build compliance group results from weight references and captured weights
  const groupResults: AxleGroupResult[] = useMemo(() => {
    // Map captured weights by axle number for easy lookup
    const capturedWeightMap = new Map<number, number>();
    localCapturedWeights.forEach((weight, index) => {
      const axleNum = index + 1;
      capturedWeightMap.set(axleNum, weight);
    });

    // If no weight references, use selected axle config's GVW as fallback
    if (weightReferences.length === 0) {
      const fallbackConfig = axleConfigurations.find(c => c.axleCode === selectedConfig);
      const configGvw = fallbackConfig?.gvwPermissibleKg || 0;
      const perAxlePermissible = totalAxles > 0 ? Math.round(configGvw / totalAxles) : 0;
      const totalMeasured = localCapturedWeights.reduce((sum, w) => sum + w, 0);
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
        axles: localCapturedWeights.map((w, i) => ({
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
      const sortedRefs = refs.sort((a, b) => a.axlePosition - b.axlePosition);

      // Calculate permissible weight for the group (sum of individual axle limits)
      const permissibleKg = sortedRefs.reduce((sum, r) => sum + r.axleLegalWeightKg, 0);

      // Apply tolerance per Kenya Traffic Act Cap 403:
      // 5% for any single-axle group (Steering or Single Drive), 0% for grouped (Tandem/Tridem)
      const isSingleAxle = sortedRefs.length === 1;
      const tolerancePercent = isSingleAxle ? 5 : 0;
      const toleranceKg = Math.round(permissibleKg * tolerancePercent / 100);
      const effectiveLimitKg = permissibleKg + toleranceKg;

      // Calculate measured weight for the group
      const axles = sortedRefs.map(ref => {
        const measured = capturedWeightMap.get(ref.axlePosition) || 0;
        return {
          axleNumber: ref.axlePosition,
          measuredKg: measured,
          permissibleKg: ref.axleLegalWeightKg,
        };
      });

      const measuredKg = axles.reduce((sum, a) => sum + a.measuredKg, 0);
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
        status,
        axles,
      });
    }

    return results;
  }, [weightReferences, localCapturedWeights, totalAxles, axleConfigurations, selectedConfig]);

  // Use compliance data from hook if available, otherwise from selected axle config
  const selectedAxleGvw = axleConfigurations.find(c => c.axleCode === selectedConfig)?.gvwPermissibleKg;
  const gvwPermissible = complianceResult?.gvwPermissibleKg || selectedAxleGvw || groupResults.reduce((sum, g) => sum + g.permissibleKg, 0);
  const gvwMeasured = complianceResult?.gvwMeasuredKg || groupResults.reduce((sum, g) => sum + g.measuredKg, 0);
  const gvwOverload = complianceResult?.gvwOverloadKg || Math.max(0, gvwMeasured - gvwPermissible);
  const overallStatus: ComplianceStatus = complianceResult?.overallStatus as ComplianceStatus || calculateOverallStatus(groupResults, gvwOverload);
  const allAxlesCaptured = hookAllAxlesCaptured || capturedAxles.length === totalAxles;

  // Required field validation for decision actions
  const validationResult = useMemo(() => validateRequiredFields({
    driverId: selectedDriverId,
    transporterId: selectedTransporterId,
    originId: selectedOriginId,
    destinationId: selectedDestinationId,
  }), [selectedDriverId, selectedTransporterId, selectedOriginId, selectedDestinationId]);

  // Missing fields warning modal state
  const [isMissingFieldsModalOpen, setIsMissingFieldsModalOpen] = useState(false);

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

  const handleNextStep = () => {
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
      // Sync axle capture to middleware for autoweigh tracking
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

  // ANPR scan handler
  const handleScanPlate = () => {
    toast.info('ANPR camera not connected. Enter plate number manually.');
  };

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
    router.push('/weighing/multideck');
  }, [router]);

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

  // Handle scale test completion from modal
  // TanStack Query will automatically refetch and update the UI
  const handleScaleTestComplete = useCallback((test: ScaleTest) => {
    setCurrentScaleTest(test);

    if (test.result === 'pass') {
      toast.success('Scale test completed successfully!', {
        description: 'Weighing operations are now enabled.',
      });
    }
    // Note: TanStack Query will automatically invalidate and refetch scale test status
    // via the useCreateScaleTest mutation's onSuccess callback
  }, []);

  // Weight confirmation handlers
  const handleOpenConfirmModal = useCallback(() => {
    setIsConfirmModalOpen(true);
  }, []);

  const handleConfirmWeight = useCallback(async () => {
    setIsCapturingWeight(true);
    try {
      const result = await confirmWeight();
      if (result) {
        toast.success('Weights confirmed and submitted successfully.');
      } else {
        toast.error('Failed to submit weights. Please try again.');
      }
    } catch {
      toast.error('Failed to submit weights. Please try again.');
    } finally {
      setIsCapturingWeight(false);
      setIsConfirmModalOpen(false);
    }
  }, [confirmWeight]);

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
    const transaction = await initializeTransaction(vehiclePlate, configToUse);

    if (transaction) {
      // Sync transaction context to middleware for autoweigh tracking
      if (middleware.connected && currentStation) {
        middleware.syncTransaction({
          transactionId: transaction.id,
          vehicleRegNumber: vehiclePlate,
          axleConfigCode: configToUse,
          totalAxles: getTotalAxles(configToUse),
          stationId: currentStation.id,
          bound: currentBound,
          weighingMode: 'mobile',
        });
      }

      // Use ticket number from backend (generated by DocumentNumberService)
      setTicketNumber(transaction.ticketNumber);
      handleNextStep();
    } else {
      toast.error('Could not create transaction. Please check your connection and try again.');
    }
  };

  // Cancel weighing - confirmation state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancelWeighing = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancelWeighing = () => {
    // Reset hook session (clears backend session and localStorage)
    resetSession();

    // Reset middleware session
    if (middleware.connected) {
      middleware.resetSession();
    }

    // Reset local UI state
    setLocalCapturedWeights([]);
    setLocalCurrentAxle(1);
    setCurrentAxleWeight(0);
    setVehiclePlate('');
    setTicketNumber('');
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
    setShowCancelConfirm(false);
  };

  // Entity modal handlers - wired to backend mutations
  const handleSaveDriver = useCallback(async (data: CreateDriverRequest) => {
    setIsSavingEntity(true);
    try {
      const newDriver = await createDriverMutation.mutateAsync({
        fullNames: data.fullNames,
        surname: data.surname,
        idNumber: data.idNumber || '',
        drivingLicenseNo: data.drivingLicenseNo || '',
        phoneNumber: data.phoneNumber,
        email: data.email,
        transporterId: selectedTransporterId,
      });

      // Optimistically add to cache so dropdown immediately shows the new entry
      queryClient.setQueryData([...QUERY_KEYS.DRIVERS, ''], (old: Driver[] | undefined) =>
        old ? [...old, newDriver] : [newDriver]
      );
      // Auto-select the newly created driver
      setSelectedDriverId(newDriver.id);
      setIsDriverModalOpen(false);
      toast.success('Driver added successfully');
    } catch (error) {
      console.error('Failed to save driver:', error);
      toast.error('Failed to add driver');
      throw error;
    } finally {
      setIsSavingEntity(false);
    }
  }, [createDriverMutation, selectedTransporterId, queryClient]);

  const handleSaveTransporter = useCallback(async (data: CreateTransporterRequest) => {
    setIsSavingEntity(true);
    try {
      const newTransporter = await createTransporterMutation.mutateAsync({
        name: data.name,
        code: data.code,
        address: data.address,
        phoneNumber: data.phone,
        email: data.email,
      });

      // Optimistically add to cache so dropdown immediately shows the new entry
      queryClient.setQueryData([...QUERY_KEYS.TRANSPORTERS, ''], (old: Transporter[] | undefined) =>
        old ? [...old, newTransporter] : [newTransporter]
      );
      // Auto-select the newly created transporter
      setSelectedTransporterId(newTransporter.id);
      setIsTransporterModalOpen(false);
      toast.success('Transporter added successfully');
    } catch (error) {
      console.error('Failed to save transporter:', error);
      toast.error('Failed to add transporter');
      throw error;
    } finally {
      setIsSavingEntity(false);
    }
  }, [createTransporterMutation, queryClient]);

  const handleSaveLocation = useCallback(async (data: CreateOriginDestinationRequest) => {
    setIsSavingEntity(true);
    try {
      const newLocation = await createOriginDestinationMutation.mutateAsync({
        name: data.name,
        code: data.code,
        locationType: data.locationType,
        country: data.country,
      });

      // Optimistically add to cache so dropdown immediately shows the new entry
      queryClient.setQueryData(QUERY_KEYS.ORIGINS_DESTINATIONS, (old: OriginDestination[] | undefined) =>
        old ? [...old, newLocation] : [newLocation]
      );
      // Auto-select into the field that triggered the modal
      if (locationModalTarget === 'origin') {
        setSelectedOriginId(newLocation.id);
      } else {
        setSelectedDestinationId(newLocation.id);
      }
      setIsLocationModalOpen(false);
      toast.success('Location added successfully');
    } catch (error) {
      console.error('Failed to save location:', error);
      toast.error('Failed to add location');
      throw error;
    } finally {
      setIsSavingEntity(false);
    }
  }, [createOriginDestinationMutation, queryClient, locationModalTarget]);

  const handleSaveCargoType = useCallback(async (data: { code: string; name: string; category?: string; description?: string }) => {
    setIsSavingEntity(true);
    try {
      // Map category string to the allowed enum values, defaulting to General
      let category: 'General' | 'Hazardous' | 'Perishable' = 'General';
      if (data.category === 'Hazardous') category = 'Hazardous';
      else if (data.category === 'Perishable') category = 'Perishable';

      const newCargoType = await createCargoTypeMutation.mutateAsync({
        code: data.code,
        name: data.name,
        category,
      });

      // Optimistically add to cache so dropdown immediately shows the new entry
      queryClient.setQueryData(QUERY_KEYS.CARGO_TYPES, (old: CargoType[] | undefined) =>
        old ? [...old, newCargoType] : [newCargoType]
      );
      setSelectedCargoId(newCargoType.id);
      setIsCargoTypeModalOpen(false);
      toast.success('Cargo type added successfully');
    } catch (error) {
      console.error('Failed to save cargo type:', error);
      toast.error('Failed to add cargo type');
      throw error;
    } finally {
      setIsSavingEntity(false);
    }
  }, [createCargoTypeMutation, queryClient]);

  const handleSaveVehicleMake = useCallback(async (data: CreateVehicleMakeRequest) => {
    setIsSavingEntity(true);
    try {
      const created = await createVehicleMakeMutation.mutateAsync({
        code: data.code || data.name.toUpperCase().slice(0, 10).replace(/\s+/g, '_'),
        name: data.name,
        country: data.country,
        description: data.description,
      });
      setVehicleMake(created.name);
      setIsVehicleMakeModalOpen(false);
      toast.success('Vehicle make added successfully');
    } catch (error) {
      console.error('Failed to save vehicle make:', error);
      toast.error('Failed to add vehicle make');
      throw error;
    } finally {
      setIsSavingEntity(false);
    }
  }, [createVehicleMakeMutation]);

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

  // Send to yard - creates a yard entry for non-compliant vehicles
  const handleSendToYard = useCallback(async () => {
    if (!weighingSession?.transactionId || !currentStation?.id) {
      toast.error('No active transaction or station');
      return;
    }

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
      toast.error('Failed to create yard entry');
    }
  }, [weighingSession, currentStation, overallStatus, gvwOverload]);

  // Special release - navigates to special release workflow
  const handleSpecialRelease = useCallback(() => {
    if (!weighingSession?.transactionId) {
      toast.error('No active transaction');
      return;
    }

    // Navigate to special release page with transaction context
    router.push(`/weighing/special-release?transactionId=${weighingSession.transactionId}`);
  }, [weighingSession, router]);

  // Finish weighing and reset for next vehicle
  const handleFinishAndNew = useCallback(async () => {
    // Print ticket first
    await handlePrintTicket();

    // Reset hook session (clears backend session and localStorage)
    resetSession();

    // Reset middleware session
    if (middleware.connected) {
      middleware.resetSession();
    }

    // Reset local UI state
    setLocalCapturedWeights([]);
    setLocalCurrentAxle(1);
    setCurrentAxleWeight(0);
    setVehiclePlate('');
    setIsPlateDisabled(false);
    setTicketNumber('');
    setFrontViewImage(undefined);
    setOverviewImage(undefined);
    setPermitNo('');
    setTrailerNo('');
    setVehicleMake('');
    setComment('');
    setReliefVehicleReg('');
    setCompletedSteps([]);
    setCurrentStep('capture');

    // Reset linked entity IDs
    setSelectedDriverId(undefined);
    setSelectedTransporterId(undefined);
    setSelectedCargoId(undefined);
    setSelectedOriginId(undefined);
    setSelectedDestinationId(undefined);
    setSelectedVehicleId(undefined);

    toast.success('Weighing completed. Ready for next vehicle.');
  }, [handlePrintTicket, resetSession, middleware]);

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

  // Proceed to decision step (weights already confirmed via Take Weight flow)
  const handleProceedToDecision = () => {
    handleNextStep();
  };

  // Validation for step transitions (also disable during transaction creation to prevent double-click)
  const canProceedFromCapture = vehiclePlate.length >= 5 && isScaleTestCompleted && !isWeighingLoading;
  const canProceedFromVehicle = selectedConfig !== '' && allAxlesCaptured;

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
                <span className="text-yellow-600 text-sm">{loadError}</span>
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

          {/* Step Content */}
          <div className="min-h-[500px]">
            {/* Step 1: Capture */}
            {currentStep === 'capture' && (
              <div className="space-y-4">
                {/* Pending transactions - resume interrupted weighings */}
                <PendingTransactionCard
                  transactions={pendingTransactions}
                  onResume={handleResumeTransaction}
                />

                {/* Top Row: Scale Test + Scale Health in compact 2-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {/* Scale Test Status - Compact */}
                  <ScaleTestBanner
                    isScaleTestCompleted={isScaleTestCompleted}
                    lastTestAt={lastScaleTestAt}
                    onStartScaleTest={handleStartScaleTest}
                    compact
                  />

                  {/* Scale Health Panel - Compact */}
                  <ScaleHealthPanel
                    scales={scales}
                    isConnected={isScalesConnected}
                    onConnect={handleConnectScales}
                    onToggleScale={handleToggleScale}
                    onChangeWeighingType={handleChangeWeighingType}
                    weighingType={weighingType}
                    compact
                    showDetailedCards={false}
                    middlewareSynced={middlewareConnected}
                    simulation={isSimulationMode}
                  />
                </div>

                {/* Scale A and B Status Cards with Sync Indicator */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {scales.map((scale) => (
                    <Card key={scale.id} className={`border-2 transition-colors ${scale.status === 'connected' ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-gray-50/30'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {/* Connection bubble indicator */}
                            <div className="relative">
                              <Scale className={`h-5 w-5 ${scale.status === 'connected' ? 'text-green-600' : 'text-gray-400'}`} />
                              <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                scale.status === 'connected' && middlewareConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                              }`} />
                            </div>
                            <span className="font-semibold">{scale.name}</span>
                            {/* Sync status badge */}
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              scale.status === 'connected' && middlewareConnected
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {scale.status === 'connected' && middlewareConnected ? 'Synced' : 'Offline'}
                            </span>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            scale.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {scale.status.charAt(0).toUpperCase() + scale.status.slice(1)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-gray-500">Weight</p>
                            <p className="font-mono font-bold">{scale.weight.toLocaleString()} kg</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Battery</p>
                            <p className={`font-medium ${(scale.battery ?? 0) < 20 ? 'text-red-600' : (scale.battery ?? 0) < 50 ? 'text-yellow-600' : 'text-green-600'}`}>
                              {scale.battery ?? 0}%
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Temp</p>
                            <p className="font-medium">{scale.temperature ?? 0}°C</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Vehicle Image Capture */}
                <ImageCaptureCard
                  frontImage={frontViewImage}
                  overviewImage={overviewImage}
                  onCaptureFront={() => setFrontViewImage('/images/weighing/truckpass.jpg')}
                  onCaptureOverview={() => setOverviewImage('/images/weighing/truckcalledin.jpg')}
                  onClearFront={() => setFrontViewImage(undefined)}
                  onClearOverview={() => setOverviewImage(undefined)}
                  showANPRBadge={true}
                />

                {/* Vehicle Plate Entry Card - Redesigned with balanced layout */}
                <Card className="border-gray-200 shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    {/* Main Row: Bound Selector | Plate Input | Actions */}
                    <div className="flex items-stretch">
                      {/* Bound Selector Section */}
                      {currentStation?.supportsBidirectional && (
                        <div className="flex items-center bg-gray-50 border-r border-gray-200 px-3 min-w-[120px]">
                          <div className="flex flex-col items-center gap-1 w-full">
                            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Bound</span>
                            <select
                              value={currentBound || currentStation?.boundACode || 'A'}
                              onChange={(e) => handleBoundChange(e.target.value)}
                              className="w-full px-2 py-1.5 text-sm font-bold bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                            >
                              <option value={currentStation?.boundACode || 'A'}>
                                A ({currentStation?.boundACode || 'A'})
                              </option>
                              <option value={currentStation?.boundBCode || 'B'}>
                                B ({currentStation?.boundBCode || 'B'})
                              </option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Plate Input Section - Central and prominent */}
                      <div className="flex-1 flex items-center justify-center px-4 py-4 bg-white">
                        <div className="relative w-full max-w-md">
                          <input
                            value={vehiclePlate}
                            onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                            disabled={isPlateDisabled}
                            placeholder="KAA 123A"
                            className="w-full font-mono text-2xl md:text-3xl uppercase tracking-[0.2em] px-4 py-3 border-2 border-gray-300 rounded-lg disabled:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-bold shadow-inner"
                          />
                          {isPlateDisabled && vehiclePlate && (
                            <span className="absolute -top-2 left-3 px-2 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 rounded-full">
                              ✓ Locked
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons Section */}
                      <div className="flex items-center gap-2 px-3 py-3 bg-gray-50 border-l border-gray-200">
                        <Button
                          onClick={handleScanPlate}
                          size="icon"
                          className="h-11 w-11 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm"
                          title="ANPR Scan"
                        >
                          <ScanLine className="h-5 w-5" />
                        </Button>
                        {isPlateDisabled && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={handleEditPlate}
                            className="h-11 w-11 border-amber-400 text-amber-700 hover:bg-amber-50 rounded-lg"
                            title="Edit Plate"
                          >
                            <Edit3 className="h-5 w-5" />
                          </Button>
                        )}
                        <Button
                          onClick={handleProceedToVehicle}
                          disabled={!canProceedFromCapture}
                          size="lg"
                          className="h-11 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                          <ChevronRight className="h-5 w-5 ml-1" />
                        </Button>
                      </div>
                    </div>

                    {/* Validation Footer - Only shows when validation fails */}
                    {!canProceedFromCapture && (
                      <div className="px-4 py-2 bg-amber-50 border-t border-amber-200">
                        <p className="text-xs text-amber-700 text-center font-medium">
                          {!isScaleTestCompleted && '⚠ Complete scale test'}
                          {!isScaleTestCompleted && vehiclePlate.length < 5 && ' • '}
                          {vehiclePlate.length < 5 && '⚠ Enter vehicle plate (min 5 chars)'}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 2: Vehicle Details + Axle Capture + Compliance */}
            {currentStep === 'vehicle' && (
              <div className="space-y-4">
                {/* Top Row: Ticket Info */}
                <Card className="border-gray-200">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-bold text-lg">{ticketNumber}</span>
                      <span className="text-gray-400">|</span>
                      <span className="font-mono text-xl font-bold text-blue-600">{vehiclePlate}</span>
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleCancelWeighing}>
                      CANCEL WEIGHING
                    </Button>
                  </CardContent>
                </Card>

                {/* Main Content Grid */}
                <div className="grid grid-cols-12 gap-4">
                  {/* Left Column: Axle Config + Weight Capture + Compliance */}
                  <div className="col-span-7 space-y-4">
                    {/* Axle Configuration Card */}
                    <AxleConfigurationCard
                      selectedConfig={selectedConfig}
                      axleConfigurations={axleConfigurations}
                      onConfigChange={(config) => {
                        setSelectedConfig(config);
                        setAxleConfig(getDefaultAxleConfig(config));
                        // Reset local weight capture state
                        setLocalCapturedWeights([]);
                        setCurrentAxle(1);
                      }}
                      vehiclePlate={vehiclePlate}
                      ticketNumber={ticketNumber}
                      capturedAxles={capturedAxles}
                      currentAxle={currentAxle}
                      onAxleSelect={setCurrentAxle}
                    />

                    {/* Weight Capture Card */}
                    <WeightCaptureCard
                      currentWeight={currentAxleWeight}
                      currentAxle={currentAxle}
                      totalAxles={totalAxles}
                      capturedAxles={capturedAxles}
                      capturedWeights={capturedWeights}
                      onCaptureAxle={handleCaptureAxle}
                      scaleAStatus={scales[0]?.status === 'connected' ? 'connected' : 'disconnected'}
                      scaleBStatus={scales[1]?.status === 'connected' ? 'connected' : 'disconnected'}
                    />

                    {/* Compliance Table */}
                    <ComplianceTable
                      groupResults={groupResults}
                      gvwPermissible={gvwPermissible}
                      gvwMeasured={gvwMeasured}
                      gvwOverload={gvwOverload}
                      overallStatus={overallStatus}
                    />
                  </div>

                  {/* Right Column: Vehicle Details + Compliance Banner */}
                  <div className="col-span-5 space-y-4">
                    {/* Vehicle Details Card */}
                    <VehicleDetailsCard
                      vehiclePlate={vehiclePlate}
                      onVehiclePlateChange={() => {}} // Read-only in step 2
                      selectedVehicleId={selectedVehicleId}
                      onVehicleIdChange={setSelectedVehicleId}
                      selectedConfig={selectedConfig}
                      onConfigChange={(config) => {
                        setSelectedConfig(config);
                        setAxleConfig(getDefaultAxleConfig(config));
                        setLocalCapturedWeights([]);
                        setLocalCurrentAxle(1);
                      }}
                      axleConfigurations={axleConfigurations}
                      // Driver linking
                      selectedDriverId={selectedDriverId}
                      onDriverIdChange={setSelectedDriverId}
                      drivers={drivers}
                      // Transporter linking
                      selectedTransporterId={selectedTransporterId}
                      onTransporterIdChange={setSelectedTransporterId}
                      transporters={transporters}
                      // Cargo type linking
                      selectedCargoId={selectedCargoId}
                      onCargoIdChange={setSelectedCargoId}
                      cargoTypes={cargoTypes}
                      // Origin/Destination linking
                      selectedOriginId={selectedOriginId}
                      onOriginIdChange={setSelectedOriginId}
                      selectedDestinationId={selectedDestinationId}
                      onDestinationIdChange={setSelectedDestinationId}
                      locations={locations}
                      // Permit section
                      showExtendedDetails={true}
                      showPermitSection={true}
                      permitNo={permitNo}
                      onPermitNoChange={setPermitNo}
                      onViewPermit={() => toast.info('Permit viewer coming soon')}
                      trailerNo={trailerNo}
                      onTrailerNoChange={setTrailerNo}
                      vehicleMake={vehicleMake}
                      onVehicleMakeChange={setVehicleMake}
                      // Relief vehicle and comment
                      reliefVehicleReg={reliefVehicleReg}
                      onReliefVehicleRegChange={setReliefVehicleReg}
                      comment={comment}
                      onCommentChange={setComment}
                      // Modal handlers
                      onAddDriver={() => setIsDriverModalOpen(true)}
                      onAddTransporter={() => setIsTransporterModalOpen(true)}
                      onAddOriginLocation={() => { setLocationModalTarget('origin'); setIsLocationModalOpen(true); }}
                      onAddDestinationLocation={() => { setLocationModalTarget('destination'); setIsLocationModalOpen(true); }}
                      onAddVehicleMake={() => setIsVehicleMakeModalOpen(true)}
                      vehicleMakes={vehicleMakesData}
                      onRefreshVehicleMakes={() => refetchVehicleMakes()}
                      onAddCargoType={() => setIsCargoTypeModalOpen(true)}
                      // Refresh handlers for manual refetch
                      onRefreshDrivers={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DRIVERS })}
                      onRefreshTransporters={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSPORTERS })}
                      onRefreshCargoTypes={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CARGO_TYPES })}
                      onRefreshLocations={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORIGINS_DESTINATIONS })}
                      isReadOnly={false}
                    />

                    {/* Compliance Banner */}
                    <ComplianceBanner
                      status={allAxlesCaptured ? overallStatus : 'PENDING'}
                      gvwMeasured={gvwMeasured}
                      gvwOverload={gvwOverload}
                      reweighCount={reweighCycleNo}
                    />
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handlePrevStep}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Capture
                  </Button>

                  {/* Two-state flow: Take Weight → Proceed to Decision */}
                  {allAxlesCaptured && !isWeightConfirmed ? (
                    <Button
                      onClick={handleOpenConfirmModal}
                      disabled={!canProceedFromVehicle || isWeighingLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Scale className="mr-2 h-4 w-4" />
                      Take Weight
                    </Button>
                  ) : isWeightConfirmed ? (
                    <Button onClick={handleProceedToDecision} disabled={isWeighingLoading}>
                      Proceed to Decision
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button disabled>
                      Capture All Axles First
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
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
                currentWeight: middleware.weights.weight || middleware.weights.currentWeight,
                // Individual scale weights - PAW: derived from combined, Haenni: may be direct
                scaleA: middleware.weights.scaleA,
                scaleB: middleware.weights.scaleB,
                scaleWeightMode: middleware.weights.scaleWeightMode,
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
              axleGroups={groupResults.map(g => ({
                group: g.groupLabel,
                permissible: g.permissibleKg,
                tolerance: g.axleCount === 1 ? 5 : 0,
                actual: g.measuredKg,
                overload: g.overloadKg,
                result: g.status === 'LEGAL' ? 'Legal' as const : 'Overload' as const,
              }))}
              gvw={{
                permissible: gvwPermissible,
                tolerance: 0,
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
              onSave={handleSaveVehicleMake}
              isSaving={isSavingEntity}
            />

            <CargoTypeModal
              open={isCargoTypeModalOpen}
              onOpenChange={setIsCargoTypeModalOpen}
              mode="create"
              onSave={handleSaveCargoType}
              isSaving={isSavingEntity}
            />

            {/* Step 3: Decision */}
            {currentStep === 'decision' && (
              <div className="space-y-4">
                {/* Vehicle Summary */}
                <Card className="border border-gray-200 rounded-xl">
                  <CardContent className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">Vehicle:</span>
                      <span className="font-mono font-bold text-lg">{vehiclePlate}</span>
                      <span className="text-sm text-gray-400">|</span>
                      <span className="text-sm text-gray-500">GVW:</span>
                      <span className="font-mono font-bold">
                        {gvwMeasured.toLocaleString()} kg
                      </span>
                    </div>
                    {reweighCycleNo > 0 && (
                      <span className="text-xs bg-gray-800 text-white px-2 py-1 rounded">
                        Re-weigh: {reweighCycleNo}
                      </span>
                    )}
                  </CardContent>
                </Card>

                {/* Decision Panel - 3 clear options */}
                <DecisionPanel
                  overallStatus={overallStatus}
                  totalFeeUsd={complianceResult?.totalFeeUsd ?? 0}
                  demeritPoints={0}
                  reweighCycleNo={reweighCycleNo}
                  requiredFieldsValid={validationResult.isValid}
                  missingFields={validationResult.missingFields}
                  onFinishExit={handleFinishAndNew}
                  onSendToYard={handleSendToYard}
                  onSpecialRelease={handleSpecialRelease}
                  onReweigh={handleReweigh}
                  onPrintTicket={handlePrintTicket}
                  canPrint={canPrint}
                  canSendToYard={canSendToYard}
                  canSpecialRelease={canSpecialRelease}
                  canReweigh={reweighCycleNo < 8}
                />

                {/* Navigation */}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handlePrevStep}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Vehicle
                  </Button>
                </div>
              </div>
            )}
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
