"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AxleConfigurationCard,
  CompactMultideckWeights,
  ComplianceBanner,
  ComplianceTable,
  DecisionPanel,
  DriverModal,
  getDefaultAxleConfig,
  ImageCaptureCard,
  ModalMode,
  MultideckWeightsCard,
  OriginDestinationModal,
  TransporterModal,
  VehicleDetailsCard,
  VehicleMakeModal,
  WeighingPageHeader,
  WeighingStepper,
} from '@/components/weighing';
import { ScaleHealthPanel, ScaleInfo } from '@/components/weighing/ScaleHealthPanel';
import { ScaleTestBanner } from '@/components/weighing/ScaleTestBanner';
import { ScaleTestModal } from '@/components/weighing/ScaleTestModal';
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
import {
  ScaleTest,
  Station,
} from '@/lib/api/weighing';
import { calculateOverallStatus } from '@/lib/weighing-utils';
import {
  AxleGroupResult,
  ComplianceStatus,
  CreateDriverRequest,
  CreateOriginDestinationRequest,
  CreateTransporterRequest,
  CreateVehicleMakeRequest,
  DeckWeight,
  ScaleStatus,
  WeighingStep,
} from '@/types/weighing';
import { ChevronLeft, ChevronRight, Edit3, Loader2, RefreshCcw, Scale, ScanLine, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

/**
 * Multideck Weighing Page
 *
 * 3-Step workflow for 4-deck platform weighing:
 * Step 1: Capture (Scale test, images, plate entry, live deck weights)
 * Step 2: Vehicle (Axle config, vehicle details, compliance - with deck weights)
 * Step 3: Decision (Final decision and actions)
 */
export default function MultideckWeighingPage() {
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

  // useWeighing hook for backend persistence
  const weighingHook = useWeighing({
    weighingMode: 'multideck',
    bound: currentBound,
    autoInitialize: true,
  });

  const {
    initializeTransaction,
    captureAxleWeight,
    submitWeights,
    resetSession,
    session: weighingSession,
    complianceResult,
    isLoading: isWeighingLoading,
    error: weighingError,
  } = weighingHook;

  // Update scale test from query result
  useEffect(() => {
    if (scaleTestStatus?.latestTest) {
      setCurrentScaleTest(scaleTestStatus.latestTest);
    }
  }, [scaleTestStatus]);

  // Vehicle state - declared before useEffects that reference them
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [isPlateDisabled, setIsPlateDisabled] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<string>('6C');
  const [axleConfig, setAxleConfig] = useState(getDefaultAxleConfig('6C'));
  const [ticketNumber, setTicketNumber] = useState('');

  // Set bound when station loads
  useEffect(() => {
    if (currentStation?.supportsBidirectional && currentStation.boundACode && !currentBoundState) {
      setCurrentBoundState(currentStation.boundACode);
    }
  }, [currentStation, currentBoundState]);

  // Set default axle config when data loads
  useEffect(() => {
    if (axleConfigurations.length > 0 && !selectedConfig) {
      const defaultConfig = axleConfigurations.find(c => c.axleCode === '6C') || axleConfigurations[0];
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

  // Image state
  const [frontViewImage, setFrontViewImage] = useState<string | undefined>();
  const [overviewImage, setOverviewImage] = useState<string | undefined>();

  // Capture state
  const [isCaptured, setIsCaptured] = useState(false);

  // Indicator health state (for multideck via TruConnect TCP/WebSocket)
  // Note: Indicators are mains-powered, so no battery field
  const [indicators, setIndicators] = useState<ScaleInfo[]>([
    {
      id: 'indicator-1',
      name: 'Weight Indicator',
      status: 'connected',
      weight: 0,
      signalStrength: 98, // Connection quality
      capacity: 80000,
      lastReading: new Date(),
      isActive: true,
      make: 'Zedem',
      model: 'ZM-400',
      syncType: 'TCP',
    },
  ]);
  const [isIndicatorConnected, setIsIndicatorConnected] = useState(true);

  // Scale test modal state
  const [isScaleTestModalOpen, setIsScaleTestModalOpen] = useState(false);

  // Entity Modal States
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isTransporterModalOpen, setIsTransporterModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isVehicleMakeModalOpen, setIsVehicleMakeModalOpen] = useState(false);
  const [isSavingEntity, setIsSavingEntity] = useState(false);

  // Permissions
  const canCapture = useHasPermission('weighing.create');
  const canPrint = useHasPermission('weighing.export');
  const canTag = useHasPermission('tag.create');
  const canSendToYard = useHasPermission('weighing.send_to_yard');

  const scaleStatus: ScaleStatus = 'connected';

  // Mock deck weights (would come from WebSocket in real implementation)
  const deckWeights: DeckWeight[] = [
    { deck: 1, weight: 8200, status: 'stable' },
    { deck: 2, weight: 10040, status: 'stable' },
    { deck: 3, weight: 8060, status: 'stable' },
    { deck: 4, weight: 9000, status: 'stable' },
  ];
  const totalGVW = deckWeights.reduce((sum, d) => sum + d.weight, 0);

  // Mock compliance data
  const mockGroupResults: AxleGroupResult[] = [
    {
      groupLabel: 'A',
      axleType: 'Steering',
      axleCount: 1,
      permissibleKg: 8000,
      toleranceKg: 400,
      effectiveLimitKg: 8400,
      measuredKg: isCaptured ? 8200 : 0,
      overloadKg: 0,
      pavementDamageFactor: 1.08,
      status: 'LEGAL',
      axles: [{ axleNumber: 1, measuredKg: isCaptured ? 8200 : 0, permissibleKg: 8000 }],
    },
    {
      groupLabel: 'B',
      axleType: 'Tandem',
      axleCount: 2,
      permissibleKg: 17000,
      toleranceKg: 0,
      effectiveLimitKg: 17000,
      measuredKg: isCaptured ? 10040 : 0,
      overloadKg: 0,
      pavementDamageFactor: 0.12,
      status: 'LEGAL',
      axles: [
        { axleNumber: 2, measuredKg: isCaptured ? 5020 : 0, permissibleKg: 8500 },
        { axleNumber: 3, measuredKg: isCaptured ? 5020 : 0, permissibleKg: 8500 },
      ],
    },
    {
      groupLabel: 'C',
      axleType: 'Tandem',
      axleCount: 2,
      permissibleKg: 16000,
      toleranceKg: 0,
      effectiveLimitKg: 16000,
      measuredKg: isCaptured ? 8060 : 0,
      overloadKg: 0,
      pavementDamageFactor: 0.06,
      status: 'LEGAL',
      axles: [
        { axleNumber: 4, measuredKg: isCaptured ? 4030 : 0, permissibleKg: 8000 },
        { axleNumber: 5, measuredKg: isCaptured ? 4030 : 0, permissibleKg: 8000 },
      ],
    },
    {
      groupLabel: 'D',
      axleType: 'Tandem',
      axleCount: 2,
      permissibleKg: 16000,
      toleranceKg: 0,
      effectiveLimitKg: 16000,
      measuredKg: isCaptured ? 9000 : 0,
      overloadKg: 0,
      pavementDamageFactor: 0.10,
      status: 'LEGAL',
      axles: [
        { axleNumber: 6, measuredKg: isCaptured ? 4500 : 0, permissibleKg: 8000 },
        { axleNumber: 7, measuredKg: isCaptured ? 4500 : 0, permissibleKg: 8000 },
      ],
    },
  ];

  // Use compliance data from hook if available, otherwise calculate from mock
  const gvwPermissible = complianceResult?.gvwPermissibleKg || 56000;
  const gvwMeasured = complianceResult?.gvwMeasuredKg || (isCaptured ? totalGVW : 0);
  const gvwOverload = complianceResult?.gvwOverloadKg || Math.max(0, gvwMeasured - gvwPermissible);
  const overallStatus: ComplianceStatus = complianceResult?.overallStatus as ComplianceStatus || (isCaptured
    ? calculateOverallStatus(mockGroupResults, gvwOverload)
    : 'LEGAL');

  // Submit weights and proceed to decision step
  const handleProceedToDecision = async () => {
    // Submit all captured weights to backend
    if (isCaptured && !complianceResult) {
      const result = await submitWeights();
      if (result) {
        toast.success('Weights submitted successfully.');
      } else if (weighingError) {
        toast.warning('Could not submit weights to backend. Proceeding offline.');
      }
    }
    handleNextStep();
  };

  // Step navigation - 3 steps
  const steps: WeighingStep[] = ['capture', 'vehicle', 'decision'];

  const goToStep = (step: WeighingStep) => setCurrentStep(step);

  const completeCurrentStep = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
  };

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

  // Capture handlers - for multideck, we capture all axle weights at once from deck readings
  const handleCapture = useCallback(async () => {
    // For multideck, the deck weights map to axle groups
    // Capture all axle weights from the deck weights
    // This is a simplification - in production, the deck-to-axle mapping would be more sophisticated
    const axleWeights = [
      { axleNumber: 1, weight: deckWeights[0]?.weight || 0 },
      { axleNumber: 2, weight: Math.floor((deckWeights[1]?.weight || 0) / 2) },
      { axleNumber: 3, weight: Math.floor((deckWeights[1]?.weight || 0) / 2) },
      { axleNumber: 4, weight: Math.floor((deckWeights[2]?.weight || 0) / 2) },
      { axleNumber: 5, weight: Math.floor((deckWeights[2]?.weight || 0) / 2) },
      { axleNumber: 6, weight: Math.floor((deckWeights[3]?.weight || 0) / 2) },
      { axleNumber: 7, weight: Math.floor((deckWeights[3]?.weight || 0) / 2) },
    ];

    // Capture each axle weight via the hook
    for (const axle of axleWeights) {
      await captureAxleWeight(axle.axleNumber, axle.weight);
    }

    setIsCaptured(true);
  }, [deckWeights, captureAxleWeight]);

  const handleResetCapture = useCallback(() => {
    setIsCaptured(false);
    // Note: This doesn't reset the backend session - call resetSession() for full reset
  }, []);

  // Generate ticket number
  /**
   * Generate ticket number using configurable convention:
   * Format: {StationCode}{Bound}-{YYYYMMDD}{SequenceNumber}
   * Example: NRB-01A-202601230001
   */
  const generateTicketNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Use station code if available, fallback to MUL for multideck
    const stationCode = currentStation?.code || currentStation?.stationCode || 'MUL';

    // Add bound if bidirectional station
    const boundSuffix = currentBound || '';

    // Generate sequence (in production, this should come from backend)
    const timestamp = Date.now().toString().slice(-6);
    const sequence = timestamp.padStart(6, '0');

    return `${stationCode}${boundSuffix}-${dateStr}${sequence}`;
  }, [currentStation, currentBound]);

  // ANPR scan simulation
  const handleScanPlate = () => {
    setTimeout(() => {
      setVehiclePlate('KCX091X');
      setIsPlateDisabled(true);
      setFrontViewImage('/images/weighiging/placeholder_front.png');
      setOverviewImage('/images/weighiging/placeholder_overview.png');
    }, 1000);
  };

  const handleEditPlate = () => {
    console.log('[AUDIT] Plate edit requested for:', vehiclePlate);
    setIsPlateDisabled(false);
  };

  // Indicator handlers
  const handleConnectIndicator = useCallback(() => {
    setIsIndicatorConnected(true);
    setIndicators(prev => prev.map(i => ({ ...i, status: 'connected' as ScaleStatus })));
  }, []);

  const handleToggleIndicator = useCallback((indicatorId: string, active: boolean) => {
    setIndicators(prev => prev.map(i =>
      i.id === indicatorId ? { ...i, isActive: active } : i
    ));
  }, []);

  // Change weighing type - navigate to mobile page
  const handleChangeWeighingType = useCallback(() => {
    router.push('/weighing/mobile');
  }, [router]);

  // Scale test handlers
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

  // Proceed to vehicle step - initialize transaction via hook
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
    const transaction = await initializeTransaction(vehiclePlate, selectedConfig || '7A');

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
      setIsCaptured(false);
      setVehiclePlate('');
      setIsPlateDisabled(false);
      setTicketNumber('');
      setFrontViewImage(undefined);
      setOverviewImage(undefined);
      setCurrentStep('capture');
      setCompletedSteps([]);

      // Reset linked entity IDs
      setSelectedDriverId(undefined);
      setSelectedTransporterId(undefined);
      setSelectedCargoId(undefined);
      setSelectedOriginId(undefined);
      setSelectedDestinationId(undefined);
      setSelectedVehicleId(undefined);

      // Reset additional fields
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsTransporterModalOpen(false);
      toast.success('Transporter added successfully');
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
      await new Promise(resolve => setTimeout(resolve, 1000));
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
      // In production, this would call the create vehicle make API
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Optionally set the newly created make as selected
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

  // Validation
  const canProceedFromCapture = vehiclePlate.length >= 5 && isScaleTestCompleted;
  const canProceedFromVehicle = selectedConfig !== '' && isCaptured;

  // Station display
  const stationDisplayName = currentStation
    ? currentStation.supportsBidirectional
      ? `${currentStation.name} (${currentStation.boundACode || 'A'})`
      : currentStation.name
    : 'Loading...';

  const stationCode = currentStation?.code || '';

  if (isLoadingData) {
    return (
      <AppShell title="Multideck Weighing" subtitle="Loading...">
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
    <AppShell title="Multideck Weighing" subtitle={stationDisplayName}>
      <ProtectedRoute requiredPermissions={['weighing.create']}>
        <div className="space-y-4">
          {/* Load Error Banner */}
          {loadError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
              <span className="text-yellow-600 text-sm">{loadError}</span>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          )}

          {/* Header */}
          <WeighingPageHeader
            title="Multideck Weighing"
            subtitle={`${stationDisplayName} | Station: ${stationCode}`}
            scaleStatus={scaleStatus}
            scaleLabel="Platform"
          />

          {/* Stepper - 3 steps */}
          <WeighingStepper
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={goToStep}
          />

          {/* Step Content */}
          <div className="min-h-[500px]">
            {/* Step 1: Capture (Scale test, images, plate, deck weights) */}
            {currentStep === 'capture' && (
              <div className="space-y-4">
                {/* Deck Weights Display - Always visible on capture screen */}
                <MultideckWeightsCard
                  platformName={stationCode || 'ROMIA'}
                  deckWeights={deckWeights}
                  totalGVW={totalGVW}
                  vehicleOnDeck={vehiclePlate.length > 0}
                />

                {/* Scale Test Banner */}
                <ScaleTestBanner
                  isScaleTestCompleted={isScaleTestCompleted}
                  lastTestAt={lastScaleTestAt}
                  onStartScaleTest={handleStartScaleTest}
                />

                {/* Indicator Health Panel - Ultra compact status bar */}
                <ScaleHealthPanel
                  scales={indicators}
                  isConnected={isIndicatorConnected}
                  onConnect={handleConnectIndicator}
                  onToggleScale={handleToggleIndicator}
                  onChangeWeighingType={handleChangeWeighingType}
                  weighingType="multideck"
                  displayMode="indicator"
                  connectionType="TCP"
                  ultraCompact={true}
                />

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
                <Card className="border border-gray-200 shadow-sm rounded-xl overflow-hidden">
                  <CardContent className="p-6">
                    {/* Vehicle Plate Entry */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <Truck className="h-4 w-4 text-blue-600" />
                        Vehicle Identification
                      </h3>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex-1 flex items-center gap-3 flex-wrap">
                          <input
                            value={vehiclePlate}
                            onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                            disabled={isPlateDisabled}
                            placeholder="KAA 123A"
                            className="font-mono text-xl uppercase tracking-widest w-[200px] px-4 py-3 border-2 border-gray-200 rounded-xl disabled:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold"
                          />
                          <Button onClick={handleScanPlate} className="bg-amber-500 hover:bg-amber-600">
                            <ScanLine className="h-5 w-5 mr-2" />
                            Scan
                          </Button>
                          {isPlateDisabled && (
                            <Button variant="outline" onClick={handleEditPlate} className="border-amber-400 text-amber-700">
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          )}
                        </div>
                        <Button
                          onClick={handleProceedToVehicle}
                          disabled={!canProceedFromCapture}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Continue
                          <ChevronRight className="h-5 w-5 ml-2" />
                        </Button>
                      </div>
                    </div>

                    {/* Scale Test Warning */}
                    {!isScaleTestCompleted && (
                      <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Scale className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="text-sm font-semibold text-red-700">Scale Test Required</p>
                            <p className="text-xs text-red-600">Complete the scale test before proceeding</p>
                          </div>
                        </div>
                        <Button onClick={handleStartScaleTest} variant="outline" className="border-red-400 text-red-700">
                          Run Test
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 2: Vehicle (Details + Compliance + Deck Weights) */}
            {currentStep === 'vehicle' && (
              <div className="space-y-4">
                {/* Top Row: Ticket Info + Compact Deck Weights */}
                <Card className="border-gray-200">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-bold text-lg">{ticketNumber}</span>
                      <span className="text-gray-400">|</span>
                      <span className="font-mono text-xl font-bold text-blue-600">{vehiclePlate}</span>
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">RE-WEIGH: 1</span>
                    </div>
                    {/* Compact Deck Weights */}
                    <CompactMultideckWeights deckWeights={deckWeights} totalGVW={totalGVW} />
                  </CardContent>
                </Card>

                {/* Main Content Grid */}
                <div className="grid grid-cols-12 gap-4">
                  {/* Left Column: Axle Config + Compliance */}
                  <div className="col-span-7 space-y-4">
                    {/* Axle Configuration Card */}
                    <AxleConfigurationCard
                      selectedConfig={selectedConfig}
                      axleConfigurations={axleConfigurations}
                      onConfigChange={(config) => {
                        setSelectedConfig(config);
                        setAxleConfig(getDefaultAxleConfig(config));
                      }}
                      vehiclePlate={vehiclePlate}
                      ticketNumber={ticketNumber}
                      capturedAxles={isCaptured ? [1, 2, 3, 4, 5, 6, 7] : []}
                      currentAxle={1}
                    />

                    {/* Take Vehicle Weight Button */}
                    <div className="flex gap-3">
                      <Button
                        className="flex-1 bg-gray-900 hover:bg-gray-800"
                        onClick={handleCapture}
                        disabled={!canCapture || isCaptured}
                      >
                        {isCaptured ? 'WEIGHTS CAPTURED' : 'TAKE VEHICLE WEIGHT'}
                      </Button>
                      <Button variant="outline" size="icon" onClick={handleResetCapture}>
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    </div>

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
                    <VehicleDetailsCard
                      vehiclePlate={vehiclePlate}
                      onVehiclePlateChange={() => {}}
                      selectedVehicleId={selectedVehicleId}
                      onVehicleIdChange={setSelectedVehicleId}
                      selectedConfig={selectedConfig}
                      onConfigChange={(config) => {
                        setSelectedConfig(config);
                        setAxleConfig(getDefaultAxleConfig(config));
                      }}
                      axleConfigurations={axleConfigurations}
                      // Driver
                      selectedDriverId={selectedDriverId}
                      onDriverIdChange={setSelectedDriverId}
                      drivers={drivers}
                      // Transporter
                      selectedTransporterId={selectedTransporterId}
                      onTransporterIdChange={setSelectedTransporterId}
                      transporters={transporters}
                      // Cargo
                      selectedCargoId={selectedCargoId}
                      onCargoIdChange={setSelectedCargoId}
                      cargoTypes={cargoTypes}
                      // Origin/Destination
                      selectedOriginId={selectedOriginId}
                      onOriginIdChange={setSelectedOriginId}
                      selectedDestinationId={selectedDestinationId}
                      onDestinationIdChange={setSelectedDestinationId}
                      locations={locations}
                      // Extended details
                      showExtendedDetails={true}
                      showPermitSection={true}
                      permitNo={permitNo}
                      onPermitNoChange={setPermitNo}
                      onViewPermit={() => alert('View permit - coming soon')}
                      trailerNo={trailerNo}
                      onTrailerNoChange={setTrailerNo}
                      vehicleMake={vehicleMake}
                      onVehicleMakeChange={setVehicleMake}
                      reliefVehicleReg={reliefVehicleReg}
                      onReliefVehicleRegChange={setReliefVehicleReg}
                      comment={comment}
                      onCommentChange={setComment}
                      // Modal handlers
                      onAddDriver={() => setIsDriverModalOpen(true)}
                      onAddTransporter={() => setIsTransporterModalOpen(true)}
                      onAddLocation={() => setIsLocationModalOpen(true)}
                      onAddVehicleMake={() => setIsVehicleMakeModalOpen(true)}
                      isReadOnly={false}
                    />

                    {/* Compliance Banner */}
                    <ComplianceBanner
                      status={isCaptured ? overallStatus : 'PENDING'}
                      gvwMeasured={gvwMeasured}
                      gvwOverload={gvwOverload}
                      reweighCount={1}
                    />

                    {/* Cancel Button */}
                    <Button variant="destructive" className="w-full" onClick={handleCancelWeighing}>
                      CANCEL WEIGHING
                    </Button>
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

            {/* Scale Test Modal */}
            <ScaleTestModal
              open={isScaleTestModalOpen}
              onOpenChange={setIsScaleTestModalOpen}
              station={currentStation ?? null}
              bound={currentBound}
              onTestComplete={handleScaleTestComplete}
              weighingMode="multideck"
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
                      <span className="font-mono font-bold">{gvwMeasured.toLocaleString()} kg</span>
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
                      if (isCaptured && !complianceResult) {
                        const result = await submitWeights();
                        if (result) {
                          toast.success('Weights submitted to backend successfully.');
                        }
                      }

                      // Reset hook session (clears backend session and localStorage)
                      resetSession();

                      // Reset local UI state
                      setIsCaptured(false);
                      setVehiclePlate('');
                      setIsPlateDisabled(false);
                      setTicketNumber('');
                      setFrontViewImage(undefined);
                      setOverviewImage(undefined);
                      setCompletedSteps([]);
                      setCurrentStep('capture');

                      // Reset linked entity IDs
                      setSelectedDriverId(undefined);
                      setSelectedTransporterId(undefined);
                      setSelectedCargoId(undefined);
                      setSelectedOriginId(undefined);
                      setSelectedDestinationId(undefined);
                      setSelectedVehicleId(undefined);

                      // Reset additional fields
                      setPermitNo('');
                      setTrailerNo('');
                      setVehicleMake('');
                      setComment('');
                      setReliefVehicleReg('');

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
