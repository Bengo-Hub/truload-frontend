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
  CompactMultideckWeights,
  ComplianceBanner,
  ComplianceTable,
  DecisionPanel,
  DriverModal,
  getDefaultAxleConfig,
  ImageCaptureCard,
  MultideckWeightsCard,
  OriginDestinationModal,
  TransporterModal,
  VehicleDetailsCard,
  VehicleMakeModal,
  WeighingPageHeader,
  WeighingStepper,
} from '@/components/weighing';
import { BoundSelector } from '@/components/weighing/BoundSelector';
import { MissingFieldsWarningModal } from '@/components/weighing/MissingFieldsWarningModal';
import { PendingTransactionCard } from '@/components/weighing/PendingTransactionCard';
import { ScaleHealthPanel, ScaleInfo } from '@/components/weighing/ScaleHealthPanel';
import { ScaleTestBanner } from '@/components/weighing/ScaleTestBanner';
import { ScaleTestModal } from '@/components/weighing/ScaleTestModal';
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
  useWeighingAxleConfigurations,
} from '@/hooks/queries';
import { useHasPermission } from '@/hooks/useAuth';
import { useMiddleware } from '@/hooks/useMiddleware';
import { useWeighing } from '@/hooks/useWeighing';
import {
  CargoType,
  downloadAndSavePdf,
  downloadWeightTicketPdf,
  Driver,
  OriginDestination,
  ScaleTest,
  Transporter,
  WeighingTransaction,
} from '@/lib/api/weighing';
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
  DeckWeight,
  ScaleStatus,
  WeighingStep,
} from '@/types/weighing';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Edit3, Loader2, RefreshCcw, Scale, ScanLine, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

  // Fetch pending transactions for resume (only multideck type)
  const { data: pendingWeighings } = usePendingWeighings(currentStation?.id, 'multideck');
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

  // Bound state for bidirectional stations
  const [currentBoundState, setCurrentBoundState] = useState<string | undefined>();

  // Derive bound from station data
  const currentBound = currentBoundState ?? (currentStation?.supportsBidirectional ? currentStation.boundACode : undefined);

  // Indicator health state - MUST be declared before useMiddleware hook
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

  // Live deck weights state (updated from WebSocket)
  const [liveDeckWeights, setLiveDeckWeights] = useState<{ deck: number; weight: number; status: 'stable' | 'unstable' }[]>([
    { deck: 1, weight: 0, status: 'stable' },
    { deck: 2, weight: 0, status: 'stable' },
    { deck: 3, weight: 0, status: 'stable' },
    { deck: 4, weight: 0, status: 'stable' },
  ]);

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
    confirmWeight: _confirmWeight,
    initiateReweigh,
    updateVehicleDetails,
    resetSession,
    session: weighingSession,
    complianceResult,
    reweighCycleNo,
    isWeightConfirmed: _isWeightConfirmed,
    isLoading: isWeighingLoading,
    error: weighingError,
  } = weighingHook;

  // useMiddleware hook for real-time WebSocket connection to TruConnect middleware
  const middleware = useMiddleware({
    stationCode: currentStation?.code || 'DEFAULT',
    bound: (currentBound as 'A' | 'B') || 'A',
    mode: 'multideck',
    autoConnect: true,
    clientName: `TruLoad Frontend - ${currentStation?.name || 'Multideck'}`,
    clientType: 'truload-frontend',
    onWeightUpdate: (weight) => {
      // Update deck weights from middleware for multideck mode
      if (weight.mode === 'multideck') {
        setLiveDeckWeights([
          { deck: 1, weight: weight.deck1 || 0, status: weight.stable ? 'stable' : 'unstable' },
          { deck: 2, weight: weight.deck2 || 0, status: weight.stable ? 'stable' : 'unstable' },
          { deck: 3, weight: weight.deck3 || 0, status: weight.stable ? 'stable' : 'unstable' },
          { deck: 4, weight: weight.deck4 || 0, status: weight.stable ? 'stable' : 'unstable' },
        ]);
      }
      // Update simulation mode from weight data
      setIsSimulationMode(weight.simulation || false);
      // Update connection status from weight data
      if (weight.connection?.connected !== undefined) {
        setIsIndicatorConnected(weight.connection.connected);
      }
      console.log('[Multideck] Weight update from middleware:', weight);
    },
    onScaleStatusChange: (status) => {
      console.log('[Multideck] Scale status from middleware:', status);
      setIsIndicatorConnected(status.connected);
      setIsSimulationMode(status.simulation || false);
    },
    onConnectionModeChange: (mode, url) => {
      console.log(`[Multideck] Connection mode changed: ${mode} (${url})`);
      setMiddlewareConnected(mode !== 'disconnected');
    },
  });

  // Sync middleware hook state with component state
  useEffect(() => {
    setMiddlewareConnected(middleware.connected);

    // Update deck weights from middleware if available
    if (middleware.weights?.mode === 'multideck') {
      setLiveDeckWeights([
        { deck: 1, weight: middleware.weights.deck1 || 0, status: middleware.weights.stable ? 'stable' : 'unstable' },
        { deck: 2, weight: middleware.weights.deck2 || 0, status: middleware.weights.stable ? 'stable' : 'unstable' },
        { deck: 3, weight: middleware.weights.deck3 || 0, status: middleware.weights.stable ? 'stable' : 'unstable' },
        { deck: 4, weight: middleware.weights.deck4 || 0, status: middleware.weights.stable ? 'stable' : 'unstable' },
      ]);

      // Sync simulation mode
      setIsSimulationMode(middleware.weights.simulation || false);

      // Sync connection status from weight data
      if (middleware.weights.connection?.connected !== undefined) {
        setIsIndicatorConnected(middleware.weights.connection.connected);
      }
    }
  }, [middleware.connected, middleware.weights]);

  // Update scale test from query result
  useEffect(() => {
    if (scaleTestStatus?.latestTest) {
      setCurrentScaleTest(scaleTestStatus.latestTest);
    }
  }, [scaleTestStatus]);

  // Vehicle state - declared before useEffects that reference them
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [debouncedPlate, setDebouncedPlate] = useState('');
  const [isPlateDisabled, setIsPlateDisabled] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [_axleConfig, setAxleConfig] = useState(getDefaultAxleConfig(''));
  const [ticketNumber, setTicketNumber] = useState('');

  // Debounce vehicle plate for lookup
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPlate(vehiclePlate);
    }, 500);
    return () => clearTimeout(timer);
  }, [vehiclePlate]);

  // Set bound when station loads
  useEffect(() => {
    if (currentStation?.supportsBidirectional && currentStation.boundACode && !currentBoundState) {
      setCurrentBoundState(currentStation.boundACode);
    }
  }, [currentStation, currentBoundState]);

  // Set default axle config when data loads
  useEffect(() => {
    if (axleConfigurations.length > 0 && !selectedConfig) {
      // Prefer 6C as default if available, otherwise use first config
      const defaultConfig = axleConfigurations.find(c => c.axleCode === '6C') || axleConfigurations[0];
      if (defaultConfig) {
        setSelectedConfig(defaultConfig.axleCode);
        setAxleConfig(getDefaultAxleConfig(defaultConfig.axleCode));
      }
    }
  }, [axleConfigurations, selectedConfig]);

  // Derive selected configuration ID for weight references lookup
  const selectedConfigId = useMemo(() => {
    if (!selectedConfig || axleConfigurations.length === 0) return undefined;
    const config = axleConfigurations.find(c => c.axleCode === selectedConfig);
    return config?.id;
  }, [selectedConfig, axleConfigurations]);

  // Fetch weight references for the selected configuration
  const { data: weightReferences = [] } = useAxleWeightReferences(selectedConfigId);

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

  // Auto-lookup vehicle by registration number (using debounced value)
  const { data: existingVehicle } = useVehicleByRegNo(debouncedPlate.length >= 5 ? debouncedPlate : undefined);

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
    if (!weighingSession?.transactionId) return;

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
        updateVehicleDetails(updates).catch((err) => {
          console.warn('Failed to sync vehicle details to backend:', err);
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    weighingSession?.transactionId,
    selectedDriverId,
    selectedTransporterId,
    selectedOriginId,
    selectedDestinationId,
    selectedCargoId,
    updateVehicleDetails,
  ]);

  // Image state
  const [frontViewImage, setFrontViewImage] = useState<string | undefined>();
  const [overviewImage, setOverviewImage] = useState<string | undefined>();

  // Capture state
  const [isCaptured, setIsCaptured] = useState(false);

  // Electron IPC fallback for indicator sync (only used when running in Electron app)
  // WebSocket connection is handled by useMiddleware hook for PWA/browser mode
  useEffect(() => {
    // Check if we're in an Electron environment
    const electronAPI = (window as {
      electronAPI?: {
        getScaleStatus: () => Promise<{
          success: boolean; scales: {
            scaleA: { connected: boolean; weight: number; signalStrength: number };
            anyConnected: boolean;
          }
        }>;
        onScaleStatusChanged: (callback: (data: {
          allScales: {
            scaleA: { connected: boolean; weight: number; signalStrength: number };
            anyConnected: boolean;
          };
        }) => void) => () => void;
      }
    }).electronAPI;

    // If not in Electron, the useMiddleware hook handles WebSocket connection
    // No need for direct API fetch here - it would duplicate the connection
    if (!electronAPI) {
      console.log('[Multideck] Running in browser/PWA mode - WebSocket handled by useMiddleware');
      return;
    }

    // Get initial status from middleware (Electron only)
    electronAPI.getScaleStatus().then(result => {
      if (result.success && result.scales) {
        setIndicators(prev => prev.map(ind => ({
          ...ind,
          status: result.scales.anyConnected ? 'connected' : 'disconnected',
          signalStrength: result.scales.scaleA?.signalStrength || 0,
          weight: result.scales.scaleA?.weight || 0,
          isActive: result.scales.anyConnected,
          lastReading: new Date(),
        })));
        setIsIndicatorConnected(result.scales.anyConnected);
        setMiddlewareConnected(true);
      }
    }).catch(err => {
      console.error('[Multideck] Failed to get scale status:', err);
    });

    // Listen for scale status changes (Electron only)
    const unsubscribeStatus = electronAPI.onScaleStatusChanged?.((data) => {
      console.log('[Multideck] Scale status changed:', data);
      setIndicators(prev => prev.map(ind => ({
        ...ind,
        status: data.allScales?.anyConnected ? 'connected' : 'disconnected',
        signalStrength: data.allScales?.scaleA?.signalStrength || 0,
        weight: data.allScales?.scaleA?.weight || 0,
        isActive: data.allScales?.anyConnected || false,
        lastReading: new Date(),
      })));
      setIsIndicatorConnected(data.allScales?.anyConnected || false);
      setMiddlewareConnected(true);
    });

    return () => {
      unsubscribeStatus?.();
    };
  }, []);

  // Scale test modal state
  const [isScaleTestModalOpen, setIsScaleTestModalOpen] = useState(false);

  // Entity Modal States
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isTransporterModalOpen, setIsTransporterModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationModalTarget, setLocationModalTarget] = useState<'origin' | 'destination'>('origin');
  const [isVehicleMakeModalOpen, setIsVehicleMakeModalOpen] = useState(false);
  const [isCargoTypeModalOpen, setIsCargoTypeModalOpen] = useState(false);
  const [isSavingEntity, setIsSavingEntity] = useState(false);

  // Permissions
  const canCapture = useHasPermission('weighing.create');
  const canPrint = useHasPermission('weighing.export');
  const _canTag = useHasPermission('tag.create');
  const canSendToYard = useHasPermission('weighing.send_to_yard');
  const canSpecialRelease = useHasPermission('case.special_release');

  const scaleStatus: ScaleStatus = middlewareConnected ? 'connected' : 'disconnected';

  // Deck weights from middleware - show zeros when not connected (no mock data)
  const deckWeights: DeckWeight[] = liveDeckWeights;
  const totalGVW = middleware.weights?.gvw || deckWeights.reduce((sum, d) => sum + d.weight, 0);

  // Build compliance group results from weight references and deck weights
  // In multideck mode: Deck 1→Group A, Deck 2→Group B, Deck 3→Group C, Deck 4→Group D
  const groupResults: AxleGroupResult[] = useMemo(() => {
    // Map deck weights by group label (deck 1=A, deck 2=B, etc.)
    const deckToGroup: Record<number, string> = { 1: 'A', 2: 'B', 3: 'C', 4: 'D' };
    const deckWeightMap = new Map<string, number>();
    deckWeights.forEach(dw => {
      const group = deckToGroup[dw.deck];
      if (group) {
        deckWeightMap.set(group, dw.weight);
      }
    });

    // If no weight references, return a basic fallback
    if (weightReferences.length === 0) {
      // Fallback groups based on deck weights
      const groups = ['A', 'B', 'C', 'D'];
      return groups.map((groupLabel, index) => {
        const deckNum = index + 1;
        const measuredKg = isCaptured ? (deckWeightMap.get(groupLabel) || 0) : 0;
        const permissibleKg = groupLabel === 'A' ? 8000 : 16000;
        const toleranceKg = groupLabel === 'A' ? Math.round(permissibleKg * 0.05) : 0;
        const effectiveLimitKg = permissibleKg + toleranceKg;
        const overloadKg = Math.max(0, measuredKg - effectiveLimitKg);
        let status: ComplianceStatus = 'LEGAL';
        if (measuredKg > effectiveLimitKg) status = 'OVERLOAD';
        else if (measuredKg > permissibleKg) status = 'WARNING';

        return {
          groupLabel,
          axleType: groupLabel === 'A' ? 'Steering' : 'Tandem',
          axleCount: groupLabel === 'A' ? 1 : 2,
          permissibleKg,
          toleranceKg,
          effectiveLimitKg,
          measuredKg,
          overloadKg,
          pavementDamageFactor: permissibleKg > 0 ? Math.round(Math.pow(measuredKg / permissibleKg, 4) * 100) / 100 : 0,
          status,
          axles: [{ axleNumber: deckNum, measuredKg, permissibleKg }],
        };
      });
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

      // Apply tolerance: 5% for steering axle (group A with 1 axle), 0% for others
      const isSteering = groupLabel === 'A' && sortedRefs.length === 1;
      const tolerancePercent = isSteering ? 5 : 0;
      const toleranceKg = Math.round(permissibleKg * tolerancePercent / 100);
      const effectiveLimitKg = permissibleKg + toleranceKg;

      // Get measured weight from deck (group A=deck 1, B=deck 2, etc.)
      const measuredKg = isCaptured ? (deckWeightMap.get(groupLabel) || 0) : 0;
      const overloadKg = Math.max(0, measuredKg - effectiveLimitKg);

      // Build axle details - distribute deck weight proportionally across axles
      const axles = sortedRefs.map(ref => {
        const axlePermissible = ref.axleLegalWeightKg;
        // Distribute measured weight proportionally based on permissible weight
        const axleMeasured = permissibleKg > 0
          ? Math.round(measuredKg * (axlePermissible / permissibleKg))
          : 0;
        return {
          axleNumber: ref.axlePosition,
          measuredKg: axleMeasured,
          permissibleKg: axlePermissible,
        };
      });

      // Determine status
      let status: ComplianceStatus = 'LEGAL';
      if (measuredKg > effectiveLimitKg) {
        status = 'OVERLOAD';
      } else if (measuredKg > permissibleKg && measuredKg <= effectiveLimitKg) {
        status = 'WARNING';
      }

      // Calculate pavement damage factor (Fourth Power Law)
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
  }, [weightReferences, deckWeights, isCaptured]);

  // Use compliance data from hook if available, otherwise calculate from deck weights
  const gvwPermissible = complianceResult?.gvwPermissibleKg || groupResults.reduce((sum, g) => sum + g.permissibleKg, 0) || 56000;
  const gvwMeasured = complianceResult?.gvwMeasuredKg || (isCaptured ? totalGVW : 0);
  const gvwOverload = complianceResult?.gvwOverloadKg || Math.max(0, gvwMeasured - gvwPermissible);
  const overallStatus: ComplianceStatus = complianceResult?.overallStatus as ComplianceStatus || (isCaptured
    ? calculateOverallStatus(groupResults, gvwOverload)
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

    // Notify middleware that vehicle weighing is complete (triggers autoweigh submission)
    if (middleware.connected && weighingSession?.transactionId) {
      middleware.completeVehicle({
        transactionId: weighingSession.transactionId,
        totalAxles: axleWeights.length,
        axleWeights: axleWeights.map(a => a.weight),
        gvw: axleWeights.reduce((sum, a) => sum + a.weight, 0),
        axleConfigurationCode: selectedConfig,
      });
    }

    setIsCaptured(true);
  }, [deckWeights, captureAxleWeight, middleware, weighingSession, selectedConfig]);

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
    const stationCode = currentStation?.code || 'MUL';

    // Add bound if bidirectional station
    const boundSuffix = currentBound || '';

    // Generate sequence (in production, this should come from backend)
    const timestamp = Date.now().toString().slice(-6);
    const sequence = timestamp.padStart(6, '0');

    return `${stationCode}${boundSuffix}-${dateStr}${sequence}`;
  }, [currentStation, currentBound]);

  // ANPR scan handler
  const handleScanPlate = () => {
    toast.info('ANPR camera not connected. Enter plate number manually.');
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

  // Handle bound change - updates local state, notifies middleware, and syncs backend
  const handleBoundChange = useCallback((newBound: string) => {
    // Update local state
    setCurrentBoundState(newBound);

    // Notify middleware via WebSocket (if connected)
    if (middleware.connected) {
      middleware.switchBound(newBound as 'A' | 'B');
      console.log(`[Multideck] Bound switched to ${newBound}, notified middleware`);
    }

    // TODO: Update backend API when endpoint is available
    toast.info(`Switched to Bound ${newBound}`, {
      description: currentStation?.supportsBidirectional
        ? `Now weighing on direction ${newBound}`
        : undefined,
    });
  }, [middleware, currentStation]);

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

  // Resume a pending transaction — reset capture state so user can weigh fresh
  const handleResumeTransaction = useCallback((txn: WeighingTransaction) => {
    // Reset weighing session so captured weights are cleared for fresh capture
    resetSession();
    setIsCaptured(false);

    setVehiclePlate(txn.vehicleRegNumber || '');
    setIsPlateDisabled(true);
    if (txn.driverId) setSelectedDriverId(txn.driverId);
    if (txn.transporterId) setSelectedTransporterId(txn.transporterId);
    if (txn.originId) setSelectedOriginId(txn.originId);
    if (txn.destinationId) setSelectedDestinationId(txn.destinationId);
    setCurrentStep('vehicle');
    toast.info(`Resuming weighing for ${txn.vehicleRegNumber}`);
  }, [resetSession]);

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
    const configToUse = selectedConfig || '7A';
    const transaction = await initializeTransaction(vehiclePlate, configToUse);

    if (transaction) {
      // Sync transaction context to middleware for autoweigh tracking
      if (middleware.connected && currentStation) {
        const axleCountMap: Record<string, number> = {
          '2A': 2, '3A': 3, '4A': 4, '5A': 5, '6C': 6, '7A': 7,
        };
        middleware.syncTransaction({
          transactionId: transaction.id,
          vehicleRegNumber: vehiclePlate,
          axleConfigCode: configToUse,
          totalAxles: axleCountMap[configToUse] || 7,
          stationId: currentStation.id,
          bound: currentBound,
          weighingMode: 'multideck',
        });
      }

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
    await handlePrintTicket();
    resetSession();

    // Reset middleware session
    if (middleware.connected) {
      middleware.resetSession();
    }

    setIsCaptured(false);
    setVehiclePlate('');
    setIsPlateDisabled(false);
    setTicketNumber('');
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
    setPermitNo('');
    setTrailerNo('');
    setVehicleMake('');
    setComment('');
    setReliefVehicleReg('');
    hasShownSentToYardToast.current = false;
    toast.success('Weighing completed. Ready for next vehicle.');
  }, [handlePrintTicket, resetSession, middleware]);

  // Initiate a reweigh
  const handleReweigh = useCallback(async () => {
    const newTransaction = await initiateReweigh();
    if (newTransaction) {
      setIsCaptured(false);
      setCurrentStep('vehicle');
      toast.success(`Re-weigh initiated (Cycle ${newTransaction.reweighCycleNo ?? reweighCycleNo + 1})`);
    } else {
      toast.error('Failed to initiate re-weigh.');
    }
  }, [initiateReweigh, reweighCycleNo]);

  // Required field validation for decision actions
  const validationResult = useMemo(() => validateRequiredFields({
    driverId: selectedDriverId,
    transporterId: selectedTransporterId,
    originId: selectedOriginId,
    destinationId: selectedDestinationId,
  }), [selectedDriverId, selectedTransporterId, selectedOriginId, selectedDestinationId]);

  const [isMissingFieldsModalOpen, setIsMissingFieldsModalOpen] = useState(false);
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
                {/* Pending transactions - resume interrupted weighings */}
                <PendingTransactionCard
                  transactions={pendingTransactions}
                  onResume={handleResumeTransaction}
                />

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

                {/* Indicator Health Panel - Ultra compact status bar with sync indicator */}
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
                  middlewareSynced={middlewareConnected}
                  simulation={isSimulationMode}
                />

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

                {/* Vehicle Plate Entry Card */}
                <Card className="border border-gray-200 shadow-sm rounded-xl overflow-hidden">
                  <CardContent className="p-6">
                    {/* Vehicle Plate Entry */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Truck className="h-4 w-4 text-blue-600" />
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
                      {reweighCycleNo > 0 && (
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">RE-WEIGH: {reweighCycleNo}</span>
                      )}
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
                      groupResults={groupResults}
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
                      onVehiclePlateChange={() => { }}
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
                      onViewPermit={() => toast.info('Permit viewer coming soon')}
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
                      onAddOriginLocation={() => { setLocationModalTarget('origin'); setIsLocationModalOpen(true); }}
                      onAddDestinationLocation={() => { setLocationModalTarget('destination'); setIsLocationModalOpen(true); }}
                      onAddVehicleMake={() => setIsVehicleMakeModalOpen(true)}
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
                      status={isCaptured ? overallStatus : 'PENDING'}
                      gvwMeasured={gvwMeasured}
                      gvwOverload={gvwOverload}
                      reweighCount={reweighCycleNo}
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

            {/* Scale Test Modal - Connected to middleware for live weight readings */}
            <ScaleTestModal
              open={isScaleTestModalOpen}
              onOpenChange={setIsScaleTestModalOpen}
              station={currentStation ?? null}
              bound={currentBound}
              onTestComplete={handleScaleTestComplete}
              weighingMode="multideck"
              middlewareConnected={middleware.connected}
              middlewareWeights={middleware.weights ? {
                deck1: middleware.weights.deck1,
                deck2: middleware.weights.deck2,
                deck3: middleware.weights.deck3,
                deck4: middleware.weights.deck4,
                gvw: middleware.weights.gvw,
              } : null}
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
                  isSentToYard={complianceResult?.isSentToYard ?? false}
                />

                {/* Missing Fields Warning Modal */}
                <MissingFieldsWarningModal
                  isOpen={isMissingFieldsModalOpen}
                  onClose={() => setIsMissingFieldsModalOpen(false)}
                  missingFields={validationResult.missingFields}
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
