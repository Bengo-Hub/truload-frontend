"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AxleConfigurationCard,
  ComplianceBanner,
  ComplianceTable,
  DecisionPanel,
  DriverModal,
  getDefaultAxleConfig,
  ImageCaptureCard,
  ModalMode,
  OriginDestinationModal,
  TransporterModal,
  VehicleDetailsCard,
  VehicleMakeModal,
  WeightCaptureCard,
  WeighingPageHeader,
  WeighingStepper,
} from '@/components/weighing';
import { BoundSelector } from '@/components/weighing/BoundSelector';
import { ScaleHealthPanel, ScaleInfo } from '@/components/weighing/ScaleHealthPanel';
import { ScaleTestBanner } from '@/components/weighing/ScaleTestBanner';
import { ScaleTestModal } from '@/components/weighing/ScaleTestModal';
import { WeightConfirmationModal } from '@/components/weighing/WeightConfirmationModal';
import { useHasPermission } from '@/hooks/useAuth';
import {
  useAxleConfigurations,
  useCargoTypes,
  useCreateVehicle,
  useDrivers,
  useMyScaleTestStatus,
  useMyStation,
  useOriginsDestinations,
  useTransporters,
  useVehicleByRegNo,
} from '@/hooks/queries';
import { useWeighing } from '@/hooks/useWeighing';
import { useMiddleware } from '@/hooks/useMiddleware';
import { ScaleTest, Station } from '@/lib/api/weighing';
import { calculateOverallStatus } from '@/lib/weighing-utils';
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
import { ChevronLeft, ChevronRight, Edit3, Loader2, Scale, ScanLine, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
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
  } = useAxleConfigurations();

  // Fetch drivers, transporters, cargo types, and locations for VehicleDetailsCard
  const { data: drivers = [] } = useDrivers();
  const { data: transporters = [] } = useTransporters();
  const { data: cargoTypes = [] } = useCargoTypes();
  const { data: locations = [] } = useOriginsDestinations();

  // Vehicle lookup mutation for auto-creating vehicles
  const createVehicleMutation = useCreateVehicle();

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
  const [weighingType, setWeighingType] = useState<'mobile' | 'multideck'>('mobile');

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
      if (weight.scaleInfo) {
        setScales(prev => [
          {
            ...prev[0],
            status: weight.connection?.connected ? 'connected' : 'disconnected',
            weight: weight.weight || 0,
            battery: weight.scaleInfo?.battery || prev[0].battery,
            temperature: weight.scaleInfo?.temperature || prev[0].temperature,
            signalStrength: weight.scaleInfo?.signalStrength || prev[0].signalStrength,
            make: weight.scaleInfo?.make || prev[0].make,
            model: weight.scaleInfo?.model || prev[0].model,
          },
          prev[1],
        ]);
      }
      console.log('[Mobile] Weight update from middleware:', weight);
    },
    onScaleStatusChange: (status) => {
      console.log('[Mobile] Scale status from middleware:', status);
      // Update simulation mode
      setIsSimulationMode(status.simulation || false);
      // Update scale connection status
      if (status.scaleA) {
        setScales(prev => [
          {
            ...prev[0],
            status: status.scaleA?.status === 'connected' ? 'connected' : 'disconnected',
            weight: status.scaleA?.weight || 0,
            battery: status.scaleA?.battery || prev[0].battery,
            temperature: status.scaleA?.temp || prev[0].temperature,
          },
          prev[1],
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
  const [currentScaleTest, setCurrentScaleTest] = useState<ScaleTest | null>(null);

  // Combined loading state
  const isLoadingData = isLoadingStation || isLoadingAxleConfigs || isLoadingScaleTest;
  const loadError = stationError || axleConfigError
    ? 'Failed to load data. The page will work with limited functionality.'
    : null;

  // Vehicle state (declared before effects that use them)
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [isPlateDisabled, setIsPlateDisabled] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [axleConfig, setAxleConfig] = useState(getDefaultAxleConfig(''));
  const [ticketNumber, setTicketNumber] = useState('');

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
  const [driverName, setDriverName] = useState('');
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

  // Use capture state from useWeighing hook (with local fallbacks for UI)
  const {
    capturedAxles: hookCapturedAxles,
    currentAxle: hookCurrentAxle,
    setCurrentAxle: setHookCurrentAxle,
    totalAxles: hookTotalAxles,
    allAxlesCaptured: hookAllAxlesCaptured,
    initializeTransaction,
    captureAxleWeight,
    submitWeights,
    resetSession,
    session: weighingSession,
    transaction: weighingTransaction,
    complianceResult,
    isLoading: isWeighingLoading,
    error: weighingError,
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
  const [isVehicleMakeModalOpen, setIsVehicleMakeModalOpen] = useState(false);
  const [isSavingEntity, setIsSavingEntity] = useState(false);

  // Scale test modal state (scale test status is now from TanStack Query)
  const [isScaleTestModalOpen, setIsScaleTestModalOpen] = useState(false);

  // Weight confirmation modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isCapturingWeight, setIsCapturingWeight] = useState(false);

  // Permissions - mapped to backend permission codes
  const canCapture = useHasPermission('weighing.create');
  const canPrint = useHasPermission('weighing.export');
  const canTag = useHasPermission('tag.create');
  const canSendToYard = useHasPermission('weighing.send_to_yard');

  // Scale status (mock)
  const scaleStatus: ScaleStatus = 'connected';

  // Get total axles based on selected config
  const getTotalAxles = (config: string): number => {
    const axleCount: Record<string, number> = {
      '2A': 2, '3A': 3, '4A': 4, '5A': 5, '6C': 6, '7A': 7,
    };
    return axleCount[config] || 6;
  };
  const totalAxles = getTotalAxles(selectedConfig);

  // Mock compliance data with real-time updates based on captured weights
  const mockGroupResults: AxleGroupResult[] = [
    {
      groupLabel: 'A',
      axleType: 'Steering',
      axleCount: 1,
      permissibleKg: 7000,
      toleranceKg: 350,
      effectiveLimitKg: 7350,
      measuredKg: capturedAxles.includes(1) ? (capturedWeights[capturedAxles.indexOf(1)] || 6800) : 0,
      overloadKg: 0,
      pavementDamageFactor: 0.88,
      status: 'LEGAL',
      axles: [{ axleNumber: 1, measuredKg: capturedAxles.includes(1) ? (capturedWeights[capturedAxles.indexOf(1)] || 6800) : 0, permissibleKg: 7000 }],
    },
    {
      groupLabel: 'B',
      axleType: 'Tandem',
      axleCount: 2,
      permissibleKg: 16000,
      toleranceKg: 0,
      effectiveLimitKg: 16000,
      measuredKg: capturedAxles.includes(2) && capturedAxles.includes(3) ? 17500 : 0,
      overloadKg: capturedAxles.includes(2) && capturedAxles.includes(3) ? 1500 : 0,
      pavementDamageFactor: 1.43,
      status: capturedAxles.includes(2) && capturedAxles.includes(3) ? 'OVERLOAD' : 'LEGAL',
      axles: [
        { axleNumber: 2, measuredKg: capturedAxles.includes(2) ? 8900 : 0, permissibleKg: 8000 },
        { axleNumber: 3, measuredKg: capturedAxles.includes(3) ? 8600 : 0, permissibleKg: 8000 },
      ],
    },
    {
      groupLabel: 'C',
      axleType: 'Tridem',
      axleCount: 3,
      permissibleKg: 24000,
      toleranceKg: 0,
      effectiveLimitKg: 24000,
      measuredKg: capturedAxles.length >= 6 ? 23800 : 0,
      overloadKg: 0,
      pavementDamageFactor: 0.97,
      status: 'LEGAL',
      axles: [
        { axleNumber: 4, measuredKg: capturedAxles.includes(4) ? 7900 : 0, permissibleKg: 8000 },
        { axleNumber: 5, measuredKg: capturedAxles.includes(5) ? 8000 : 0, permissibleKg: 8000 },
        { axleNumber: 6, measuredKg: capturedAxles.includes(6) ? 7900 : 0, permissibleKg: 8000 },
      ],
    },
  ];

  // Use compliance data from hook if available, otherwise calculate from mock
  const gvwPermissible = complianceResult?.gvwPermissibleKg || 48000;
  const gvwMeasured = complianceResult?.gvwMeasuredKg || mockGroupResults.reduce((sum, g) => sum + g.measuredKg, 0);
  const gvwOverload = complianceResult?.gvwOverloadKg || Math.max(0, gvwMeasured - gvwPermissible);
  const overallStatus: ComplianceStatus = complianceResult?.overallStatus as ComplianceStatus || calculateOverallStatus(mockGroupResults, gvwOverload);
  const allAxlesCaptured = hookAllAxlesCaptured || capturedAxles.length === totalAxles;

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

  // Capture handlers - capture weight and persist to backend via useWeighing hook
  const handleCaptureAxle = useCallback(async () => {
    if (!capturedAxles.includes(currentAxle)) {
      // Get weight from scale (for now, using mock weights - in production this comes from Bluetooth/TCP)
      const mockWeights = [6800, 8900, 8600, 7900, 8000, 7900];
      const weight = mockWeights[currentAxle - 1] || 8000;
      setCurrentAxleWeight(weight);

      // Capture via useWeighing hook to persist to backend
      const success = await captureAxleWeight(currentAxle, weight);

      if (success) {
        // Update local state for immediate UI feedback
        setLocalCapturedWeights(prev => [...prev, weight]);

        if (currentAxle < totalAxles) {
          setCurrentAxle(currentAxle + 1);
          // Reset weight display for next axle
          setTimeout(() => setCurrentAxleWeight(0), 500);
        }
      } else {
        toast.error('Failed to capture weight. Please try again.');
      }
    }
  }, [capturedAxles, captureAxleWeight, currentAxle, totalAxles]);

  // Generate ticket number when moving to vehicle step
  /**
   * Generate ticket number using configurable convention:
   * Format: {StationCode}{Bound}-{YYYYMMDD}{SequenceNumber}
   * Example: NRB-01A-202601230001
   *
   * The sequence number should ideally come from backend for uniqueness.
   * This frontend fallback uses timestamp-based random for offline support.
   */
  const generateTicketNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Use station code if available, fallback to MOB for mobile
    const stationCode = currentStation?.code || 'MOB';

    // Add bound if bidirectional station
    const boundSuffix = currentBound || '';

    // Generate sequence (in production, this should come from backend)
    // Using timestamp-based number for uniqueness in offline mode
    const timestamp = Date.now().toString().slice(-6);
    const sequence = timestamp.padStart(6, '0');

    return `${stationCode}${boundSuffix}-${dateStr}${sequence}`;
  }, [currentStation, currentBound]);

  // ANPR scan simulation
  const handleScanPlate = () => {
    setTimeout(() => {
      setVehiclePlate('KCZ015N');
      setIsPlateDisabled(true);
      setFrontViewImage('/images/weighiging/truckpass.jpg');
      setOverviewImage('/images/weighiging/truckcalledin.jpg');
    }, 1000);
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
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsCapturingWeight(false);
    setIsConfirmModalOpen(false);
    handleCaptureAxle();
  }, [handleCaptureAxle]);

  // Proceed to vehicle step - auto-create vehicle if needed and initialize transaction
  const handleProceedToVehicle = async () => {
    let vehicleId = selectedVehicleId;

    // Auto-create vehicle if it doesn't exist (first-time weighing)
    if (!existingVehicle && vehiclePlate.length >= 5) {
      try {
        const newVehicle = await createVehicleMutation.mutateAsync({
          regNo: vehiclePlate,
          // Only regNo is required - other details captured from VehicleDetailsCard later
        });
        vehicleId = newVehicle.id;
        setSelectedVehicleId(newVehicle.id);
        toast.success(`Vehicle ${vehiclePlate} created automatically.`);
      } catch (error) {
        console.warn('Could not auto-create vehicle:', error);
        // Continue without vehicle ID - transaction can still be created
      }
    }

    // Initialize transaction via useWeighing hook
    // Use selected config, or fallback to first available config from loaded configurations
    const configToUse = selectedConfig || axleConfigurations[0]?.axleCode || '6C';
    const transaction = await initializeTransaction(vehiclePlate, configToUse);

    if (transaction) {
      // Use ticket number from transaction or generate one
      setTicketNumber(transaction.ticketNumber || generateTicketNumber());
      handleNextStep();
    } else {
      // Fall back to local ticket number if backend fails
      if (!ticketNumber) {
        setTicketNumber(generateTicketNumber());
      }
      toast.warning('Could not create transaction. Working offline.');
      handleNextStep();
    }
  };

  // Cancel weighing - reset local state and hook session
  const handleCancelWeighing = () => {
    if (confirm('Are you sure you want to cancel this weighing?')) {
      // Reset hook session (clears backend session and localStorage)
      resetSession();

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
    }
  };

  // Entity modal handlers
  const handleSaveDriver = useCallback(async (data: CreateDriverRequest) => {
    setIsSavingEntity(true);
    try {
      // In production, this would call the create driver API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsDriverModalOpen(false);
      toast.success('Driver added successfully');
      // Driver query will auto-refresh via TanStack Query
    } catch (error) {
      console.error('Failed to save driver:', error);
      toast.error('Failed to add driver');
      throw error;
    } finally {
      setIsSavingEntity(false);
    }
  }, []);

  const handleSaveTransporter = useCallback(async (data: CreateTransporterRequest) => {
    setIsSavingEntity(true);
    try {
      // In production, this would call the create transporter API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsTransporterModalOpen(false);
      toast.success('Transporter added successfully');
      // Transporter query will auto-refresh via TanStack Query
    } catch (error) {
      console.error('Failed to save transporter:', error);
      toast.error('Failed to add transporter');
      throw error;
    } finally {
      setIsSavingEntity(false);
    }
  }, []);

  const handleSaveLocation = useCallback(async (data: CreateOriginDestinationRequest) => {
    setIsSavingEntity(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // For now, just close the modal - could be origin or destination
      setIsLocationModalOpen(false);
      toast.success('Location added successfully');
    } catch (error) {
      console.error('Failed to save location:', error);
      toast.error('Failed to add location');
      throw error;
    } finally {
      setIsSavingEntity(false);
    }
  }, []);

  const handleSaveVehicleMake = useCallback(async (data: CreateVehicleMakeRequest) => {
    setIsSavingEntity(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setVehicleMake(data.name);
      setIsVehicleMakeModalOpen(false);
      toast.success('Vehicle make added successfully');
    } catch (error) {
      console.error('Failed to save vehicle make:', error);
      toast.error('Failed to add vehicle make');
      throw error;
    } finally {
      setIsSavingEntity(false);
    }
  }, []);

  // Submit weights and proceed to decision step
  const handleProceedToDecision = async () => {
    // Submit all captured weights to backend
    if (allAxlesCaptured && !complianceResult) {
      const result = await submitWeights();
      if (result) {
        toast.success('Weights submitted successfully.');
      } else if (weighingError) {
        toast.warning('Could not submit weights to backend. Proceeding offline.');
      }
    }
    handleNextStep();
  };

  // Validation for step transitions
  const canProceedFromCapture = vehiclePlate.length >= 5 && isScaleTestCompleted;
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
                  onCaptureFront={() => setFrontViewImage('/images/weighiging/truckpass.jpg')}
                  onCaptureOverview={() => setOverviewImage('/images/weighiging/truckcalledin.jpg')}
                  onClearFront={() => setFrontViewImage(undefined)}
                  onClearOverview={() => setOverviewImage(undefined)}
                  showANPRBadge={true}
                />

                {/* Vehicle Plate Entry Card */}
                <Card className="border-gray-200 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-gray-700 flex items-center gap-2">
                        <Truck className="h-5 w-5 text-blue-600" />
                        Vehicle Identification
                      </h3>
                    </div>

                    {/* Bound Selector - positioned before plate input for bidirectional stations */}
                    {currentStation?.supportsBidirectional && (
                      <div className="mb-4">
                        <BoundSelector
                          station={currentStation}
                          selectedBound={currentBound}
                          onBoundChange={handleBoundChange}
                          compact={false}
                        />
                      </div>
                    )}

                    {/* Plate Input */}
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        value={vehiclePlate}
                        onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                        disabled={isPlateDisabled}
                        placeholder="KAA 123A"
                        className="font-mono text-2xl uppercase tracking-widest flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg disabled:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-bold"
                      />
                      <Button
                        onClick={handleScanPlate}
                        size="lg"
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                      >
                        <ScanLine className="h-5 w-5 mr-2" />
                        ANPR Scan
                      </Button>
                      {isPlateDisabled && (
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={handleEditPlate}
                          className="border-amber-400 text-amber-700"
                        >
                          <Edit3 className="h-5 w-5" />
                        </Button>
                      )}
                    </div>

                    {/* Continue Button */}
                    <Button
                      onClick={handleProceedToVehicle}
                      disabled={!canProceedFromCapture}
                      size="lg"
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue to Weighing
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </Button>

                    {/* Validation Message */}
                    {!canProceedFromCapture && (
                      <p className="text-sm text-gray-500 mt-3 text-center">
                        {!isScaleTestCompleted && 'Complete scale test'}
                        {!isScaleTestCompleted && vehiclePlate.length < 5 && ' & '}
                        {vehiclePlate.length < 5 && 'Enter vehicle plate'}
                      </p>
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
                      groupResults={mockGroupResults}
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
                      onViewPermit={() => alert('View permit - coming soon')}
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
                      onAddLocation={() => setIsLocationModalOpen(true)}
                      onAddVehicleMake={() => setIsVehicleMakeModalOpen(true)}
                      onAddCargoType={() => {/* TODO: Add CargoTypeModal */}}
                      isReadOnly={false}
                    />

                    {/* Compliance Banner */}
                    <ComplianceBanner
                      status={allAxlesCaptured ? overallStatus : 'PENDING'}
                      gvwMeasured={gvwMeasured}
                      gvwOverload={gvwOverload}
                      reweighCount={1}
                    />
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handlePrevStep}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Capture
                  </Button>
                  <Button onClick={handleProceedToDecision} disabled={!canProceedFromVehicle || isWeighingLoading}>
                    {isWeighingLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Continue to Decision
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
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
                scaleA: middleware.scaleStatus.scaleA,
                scaleB: middleware.scaleStatus.scaleB,
              } : undefined}
            />

            {/* Weight Confirmation Modal */}
            <WeightConfirmationModal
              isOpen={isConfirmModalOpen}
              onClose={() => setIsConfirmModalOpen(false)}
              onConfirm={handleConfirmWeight}
              vehiclePlate={vehiclePlate}
              axleType={selectedConfig}
              axleGroups={mockGroupResults.map(g => ({
                group: g.groupLabel,
                permissible: g.permissibleKg,
                tolerance: g.groupLabel === 'A' ? 5 : 0,
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

            {/* Step 3: Decision */}
            {currentStep === 'decision' && (
              <div className="space-y-4">
                {/* Vehicle Summary */}
                <Card className="border border-gray-200 rounded-xl">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">Vehicle:</span>
                      <span className="font-mono font-bold text-lg">{vehiclePlate}</span>
                      <span className="text-sm text-gray-400">|</span>
                      <span className="text-sm text-gray-500">GVW:</span>
                      <span className="font-mono font-bold">
                        {gvwMeasured.toLocaleString()} kg
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Decision Panel */}
                <DecisionPanel
                  overallStatus={overallStatus}
                  totalFeeUsd={overallStatus === 'OVERLOAD' ? 1250 : 0}
                  demeritPoints={overallStatus === 'OVERLOAD' ? 3 : 0}
                  canPrint={canPrint}
                  canTag={canTag}
                  canSendToYard={canSendToYard}
                  canSpecialRelease={overallStatus === 'WARNING'}
                  onPrintTicket={() => alert('Print ticket - coming soon')}
                  onTagVehicle={() => alert('Tag vehicle - coming soon')}
                  onSendToYard={() => alert('Send to yard - coming soon')}
                  onSpecialRelease={() => alert('Special release - coming soon')}
                />

                {/* Navigation */}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handlePrevStep}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Vehicle
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      // Submit weights to backend if not already submitted
                      if (allAxlesCaptured && !complianceResult) {
                        const result = await submitWeights();
                        if (result) {
                          toast.success('Weights submitted to backend successfully.');
                        }
                      }

                      // Reset hook session (clears backend session and localStorage)
                      resetSession();

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
                    }}
                  >
                    Finish & New
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </ProtectedRoute>
    </AppShell>
  );
}
