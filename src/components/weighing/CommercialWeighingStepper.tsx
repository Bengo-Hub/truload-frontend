"use client";

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WeighingPageHeader } from '@/components/weighing/WeighingPageHeader';
import { WeighingStepperNav } from '@/components/weighing/WeighingStepperNav';
import type { ScaleInfo } from '@/components/weighing/ScaleHealthPanel';
import { WeighingCaptureStep } from '@/components/weighing/steps/WeighingCaptureStep';
import { WeightCaptureCard } from '@/components/weighing/WeightCaptureCard';
import { CommercialFirstWeightStep } from '@/components/weighing/steps/CommercialFirstWeightStep';
import { CommercialSecondWeightStep } from '@/components/weighing/steps/CommercialSecondWeightStep';
import {
  CargoDetailsForm,
  CommercialTicketStep,
} from '@/components/weighing/steps/CommercialTicketStep';
import { CommercialEntitySelectors } from '@/components/weighing/CommercialEntitySelectors';
import { CargoTypeModal } from '@/components/weighing/modals/CargoTypeModal';
import { DriverModal } from '@/components/weighing/modals/DriverModal';
import { OriginDestinationModal } from '@/components/weighing/modals/OriginDestinationModal';
import { TransporterModal } from '@/components/weighing/modals/TransporterModal';
import {
  useCreateVehicle,
  useMyScaleTestStatus,
  useMyStation,
  useVehicleByRegNo,
} from '@/hooks/queries';
import { useMiddleware, WeightData } from '@/hooks/useMiddleware';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { useWeighingUI } from '@/hooks/useWeighingUI';
import { useHasPermission } from '@/hooks/useAuth';
import {
  approveToleranceException,
  captureFirstWeight,
  captureSecondWeight,
  downloadAndSavePdf,
  getCommercialResult,
  getCommercialTicketPdf,
  getInterimTicketPdf,
  getVehicleTareHistory,
  initiateCommercialWeighing,
  updateQualityDeduction,
  useStoredTare,
} from '@/lib/api/weighing';
import { getCurrentOrganization } from '@/lib/api/setup';
import { TreasuryCheckoutDialog } from '@/components/payments/TreasuryCheckoutDialog';
import type {
  CommercialWeighingResult,
  CommercialWeighingStep,
  VehicleTareHistory,
} from '@/types/weighing';
import { cn } from '@/lib/utils';
import { formatWeight } from '@/lib/weighing-utils';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Clock, Loader2, ShieldCheck } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const COMMERCIAL_STEPS: { id: CommercialWeighingStep; title: string; description: string }[] = [
  { id: 'capture', title: 'Capture', description: 'Plate & middleware' },
  { id: 'first-weight', title: 'First Weight', description: 'Tare or gross' },
  { id: 'second-weight', title: 'Second Weight', description: 'Net calculation' },
  { id: 'ticket', title: 'Ticket', description: 'Details & print' },
];

interface CommercialWeighingStepperProps {
  /** 'multideck' = platform scale showing per-deck weights + GVW; 'mobile' = axle-by-axle capture */
  mode?: 'multideck' | 'mobile';
  className?: string;
}

export function CommercialWeighingStepper({ mode = 'multideck', className }: CommercialWeighingStepperProps) {
  const orgSlug = useOrgSlug();
  const canApproveException = useHasPermission('weighing.override');

  const { data: currentStation, isLoading: isLoadingStation } = useMyStation();

  // Workflow state
  const [currentStep, setCurrentStep] = useState<CommercialWeighingStep>('capture');
  const [completedSteps, setCompletedSteps] = useState<CommercialWeighingStep[]>([]);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [result, setResult] = useState<CommercialWeighingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showToleranceDialog, setShowToleranceDialog] = useState(false);

  // Live weight from middleware
  const [liveWeightKg, setLiveWeightKg] = useState(0);
  const [isStable, setIsStable] = useState(false);
  const [middlewareConnected, setMiddlewareConnected] = useState(false);

  // Multideck: individual deck readings
  const [deckWeights, setDeckWeights] = useState<{ deck: number; weight: number }[]>([]);

  // Mobile axle-by-axle: track per-axle captures
  const [totalAxles, setTotalAxles] = useState(2);
  const [capturedAxleWeights, setCapturedAxleWeights] = useState<number[]>([]); // index = axle-1
  const [currentAxle, setCurrentAxle] = useState(1);

  // Stored tare + tare expiry
  const [storedTareWeightKg, setStoredTareWeightKg] = useState<number | undefined>();
  const [isTareExpired, setIsTareExpired] = useState(false);
  const [tareExpiryDaysLeft, setTareExpiryDaysLeft] = useState<number | null>(null);

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Quality deduction
  const [qualityDeductionKg, setQualityDeductionKg] = useState(0);
  const [qualityDeductionReason, setQualityDeductionReason] = useState('');
  const [isApplyingDeduction, setIsApplyingDeduction] = useState(false);

  // Cargo details form
  const [cargoDetails, setCargoDetails] = useState<CargoDetailsForm>({
    consignmentNo: '',
    orderReference: '',
    cargoType: '',
    origin: '',
    destination: '',
    sealNumbers: '',
    trailerRegNo: '',
    expectedNetWeightKg: '',
    remarks: '',
  });

  // Org info — needed to check if fee charging is configured
  const { data: orgData } = useQuery({
    queryKey: ['organization', 'current'],
    queryFn: getCurrentOrganization,
    staleTime: 5 * 60 * 1000,
  });
  const feeIsConfigured = (orgData?.commercialWeighingFeeKes ?? 0) > 0 && !!orgData?.paymentGateway;
  const tenantSlug = orgData?.ssoTenantSlug ?? '';

  const weighingUI = useWeighingUI({ stationId: currentStation?.id });
  const {
    vehiclePlate, setVehiclePlate, debouncedPlate,
    isPlateDisabled, setIsPlateDisabled,
    handleScanPlate, handleCaptureFront, handleCaptureOverview,
    frontViewImage, setFrontViewImage,
    overviewImage, setOverviewImage,
    selectedDriverId, setSelectedDriverId,
    selectedTransporterId, setSelectedTransporterId,
    selectedCargoId, setSelectedCargoId,
    selectedOriginId, setSelectedOriginId,
    selectedDestinationId, setSelectedDestinationId,
    drivers, transporters, cargoTypes, locations,
    isDriverModalOpen, setIsDriverModalOpen,
    isTransporterModalOpen, setIsTransporterModalOpen,
    isCargoTypeModalOpen, setIsCargoTypeModalOpen,
    isLocationModalOpen, setIsLocationModalOpen,
    locationModalTarget, setLocationModalTarget,
    isSavingEntity,
    handleSaveDriver, handleSaveTransporter, handleSaveCargoType, handleSaveLocation,
  } = weighingUI;

  const createVehicleMutation = useCreateVehicle();
  const { data: existingVehicle } = useVehicleByRegNo(debouncedPlate.length >= 5 ? debouncedPlate : undefined);

  const middleware = useMiddleware({
    stationCode: currentStation?.code || 'DEFAULT',
    bound: 'A',
    mode,
    autoConnect: true,
    clientName: `TruLoad Frontend - Commercial - ${currentStation?.name || ''}`,
    clientType: 'truload-frontend',
    onWeightUpdate: (weight: WeightData) => {
      const gvw = weight.gvw ?? weight.weight ?? 0;
      setLiveWeightKg(gvw);
      setIsStable(weight.stable);
      // Track per-deck weights for multideck display
      if (mode === 'multideck') {
        const decks: { deck: number; weight: number }[] = [];
        if (weight.deck1 != null) decks.push({ deck: 1, weight: weight.deck1 });
        if (weight.deck2 != null) decks.push({ deck: 2, weight: weight.deck2 });
        if (weight.deck3 != null) decks.push({ deck: 3, weight: weight.deck3 });
        if (weight.deck4 != null) decks.push({ deck: 4, weight: weight.deck4 });
        if (decks.length > 0) setDeckWeights(decks);
        // In mobile axle-by-axle, live weight is the current axle reading
      } else {
        setLiveWeightKg(weight.weight ?? 0);
      }
    },
    onConnectionModeChange: (connMode) => {
      setMiddlewareConnected(connMode !== 'disconnected');
    },
  });

  useEffect(() => {
    setMiddlewareConnected(middleware.connected);
  }, [middleware.connected]);

  // Scale test status — used by the shared capture step
  const { data: scaleTestStatus } = useMyScaleTestStatus();
  const isScaleTestCompleted = !!scaleTestStatus?.latestTest;
  const lastScaleTestAt = scaleTestStatus?.latestTest?.carriedAt
    ? new Date(scaleTestStatus.latestTest.carriedAt)
    : undefined;

  // Derive a single scale entry from middleware connection state for the capture step
  const captureStepScales = useMemo<ScaleInfo[]>(() => [{
    id: 'platform-scale',
    name: mode === 'multideck' ? 'Platform Scale' : 'Portable Scale',
    status: middlewareConnected ? ('connected' as const) : ('disconnected' as const),
    weight: liveWeightKg,
    temperature: 0,
    battery: 100,
    signalStrength: 100,
    capacity: mode === 'multideck' ? 100000 : 30000,
    lastReading: new Date(),
    isActive: middlewareConnected,
    make: '',
    model: '',
    syncType: 'API' as const,
  }], [middlewareConnected, liveWeightKg, mode]);

  // Tare expiry computation
  useEffect(() => {
    if (!existingVehicle) {
      setStoredTareWeightKg(undefined);
      setIsTareExpired(false);
      setTareExpiryDaysLeft(null);
      return;
    }
    const tare = existingVehicle.lastTareWeightKg ?? existingVehicle.defaultTareWeightKg;
    if (tare && tare > 0) {
      setStoredTareWeightKg(tare);
    }
    // Compute tare expiry
    if (existingVehicle.lastTareWeighedAt) {
      const expiryDays = existingVehicle.tareExpiryDays ?? 90;
      const lastWeighed = new Date(existingVehicle.lastTareWeighedAt);
      const expiryDate = new Date(lastWeighed);
      expiryDate.setDate(expiryDate.getDate() + expiryDays);
      const now = new Date();
      const daysLeft = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      setIsTareExpired(daysLeft < 0);
      setTareExpiryDaysLeft(daysLeft);
    }
    // Fall back to tare history
    if (!existingVehicle.lastTareWeightKg && existingVehicle.id) {
      getVehicleTareHistory(existingVehicle.id)
        .then((history: VehicleTareHistory[]) => {
          if (history.length > 0 && !storedTareWeightKg) {
            setStoredTareWeightKg(history[0].tareWeightKg);
          }
        })
        .catch(() => {});
    }
  }, [existingVehicle?.id, existingVehicle?.lastTareWeightKg, existingVehicle?.lastTareWeighedAt]);

  // Prefill cargo details from result
  useEffect(() => {
    if (result) {
      setCargoDetails((prev) => ({
        ...prev,
        consignmentNo: result.consignmentNo || prev.consignmentNo,
        orderReference: result.orderReference || prev.orderReference,
        sealNumbers: result.sealNumbers || prev.sealNumbers,
        trailerRegNo: result.trailerRegNo || prev.trailerRegNo,
        expectedNetWeightKg: result.expectedNetWeightKg?.toString() || prev.expectedNetWeightKg,
        remarks: result.remarks || prev.remarks,
      }));
      // Show tolerance dialog when net weight calculation is done and tolerance exceeded
      if (result.toleranceExceeded && !result.toleranceExceptionApproved && result.netWeightKg != null) {
        setShowToleranceDialog(true);
      }
    }
  }, [result?.id, result?.toleranceExceeded, result?.netWeightKg]);

  // ── Step navigation ──────────────────────────────────────────────────────────
  const completeStep = (step: CommercialWeighingStep) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps((prev) => [...prev, step]);
    }
  };

  const goToNextStep = () => {
    completeStep(currentStep);
    const idx = COMMERCIAL_STEPS.findIndex((s) => s.id === currentStep);
    if (idx < COMMERCIAL_STEPS.length - 1) setCurrentStep(COMMERCIAL_STEPS[idx + 1].id);
  };

  const goToPrevStep = () => {
    const idx = COMMERCIAL_STEPS.findIndex((s) => s.id === currentStep);
    if (idx > 0) setCurrentStep(COMMERCIAL_STEPS[idx - 1].id);
  };

  // ── Mobile axle-by-axle helpers ──────────────────────────────────────────────
  const axleGvw = useMemo(() => capturedAxleWeights.reduce((sum, w) => sum + w, 0), [capturedAxleWeights]);
  const allAxlesCaptured = capturedAxleWeights.length >= totalAxles;

  const handleCaptureAxle = useCallback(() => {
    if (liveWeightKg <= 0) return;
    setCapturedAxleWeights((prev) => {
      const updated = [...prev, liveWeightKg];
      return updated;
    });
    setCurrentAxle((prev) => prev + 1);
  }, [liveWeightKg]);

  const handleResetAxles = useCallback(() => {
    setCapturedAxleWeights([]);
    setCurrentAxle(1);
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleProceedToFirstWeight = useCallback(async () => {
    if (!currentStation?.id) { toast.error('No station assigned.'); return; }
    if (vehiclePlate.length < 5) { toast.error('Enter a valid plate number (at least 5 characters).'); return; }

    setIsLoading(true);
    try {
      if (!existingVehicle && vehiclePlate.length >= 5) {
        try { await createVehicleMutation.mutateAsync({ regNo: vehiclePlate }); }
        catch { /* Vehicle creation is best-effort */ }
      }
      if (middleware.connected) middleware.sendPlate(vehiclePlate);

      const txnResult = await initiateCommercialWeighing({
        stationId: currentStation.id,
        vehicleRegNo: vehiclePlate.trim().toUpperCase(),
        driverId: selectedDriverId || undefined,
        transporterId: selectedTransporterId || undefined,
        cargoId: selectedCargoId || undefined,
        originId: selectedOriginId || undefined,
        destinationId: selectedDestinationId || undefined,
        weighingScaleType: mode,
      });

      setTransactionId(txnResult.id);
      setResult(txnResult);
      goToNextStep();
    } catch (err) {
      console.error('Failed to initiate commercial weighing:', err);
      toast.error('Failed to create transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentStation, vehiclePlate, existingVehicle, createVehicleMutation, middleware,
      selectedDriverId, selectedTransporterId, selectedCargoId, selectedOriginId, selectedDestinationId]);

  const handleCaptureFirstWeight = useCallback(async (weightType: 'tare' | 'gross') => {
    if (!transactionId) return;
    const weightKg = mode === 'mobile' ? axleGvw : liveWeightKg;
    if (weightKg <= 0) { toast.error('No weight to capture.'); return; }

    setIsLoading(true);
    try {
      const axleWeights = mode === 'mobile'
        ? capturedAxleWeights
        : deckWeights.length > 0 ? deckWeights.map((d) => d.weight) : undefined;

      const updated = await captureFirstWeight(transactionId, { weightKg, weightType, axleWeights });
      setResult(updated);
      toast.success(`First weight captured: ${formatWeight(weightKg)} kg (${weightType})`);
      if (mode === 'mobile') { setCapturedAxleWeights([]); setCurrentAxle(1); }
      goToNextStep();
    } catch (err) {
      console.error('Failed to capture first weight:', err);
      toast.error('Failed to capture weight. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [transactionId, mode, axleGvw, liveWeightKg, capturedAxleWeights, deckWeights]);

  const handleCaptureSecondWeight = useCallback(async () => {
    if (!transactionId) return;
    const weightKg = mode === 'mobile' ? axleGvw : liveWeightKg;
    if (weightKg <= 0) { toast.error('No weight to capture.'); return; }

    setIsLoading(true);
    try {
      const axleWeights = mode === 'mobile'
        ? capturedAxleWeights
        : deckWeights.length > 0 ? deckWeights.map((d) => d.weight) : undefined;

      const updated = await captureSecondWeight(transactionId, { weightKg, axleWeights });
      setResult(updated);
      toast.success(`Second weight captured. Net weight: ${formatWeight(updated.netWeightKg ?? 0)} kg`);
      if (mode === 'mobile') { setCapturedAxleWeights([]); setCurrentAxle(1); }
      goToNextStep();
    } catch (err) {
      console.error('Failed to capture second weight:', err);
      toast.error('Failed to capture weight. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [transactionId, mode, axleGvw, liveWeightKg, capturedAxleWeights, deckWeights]);

  const handleUseStoredTare = useCallback(async (overrideTareKg?: number) => {
    if (!transactionId) return;
    if (isTareExpired && !overrideTareKg) {
      toast.error('Stored tare has expired. Please re-weigh the vehicle or enter a manual tare weight.');
      return;
    }
    setIsLoading(true);
    try {
      const updated = await useStoredTare(transactionId, { overrideTareWeightKg: overrideTareKg });
      setResult(updated);
      toast.success(`Stored tare used. Net weight: ${formatWeight(updated.netWeightKg ?? 0)} kg`);
      goToNextStep();
    } catch (err) {
      console.error('Failed to use stored tare:', err);
      toast.error('Failed to use stored tare. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [transactionId, isTareExpired]);

  const handleApproveToleranceException = useCallback(async () => {
    if (!transactionId) return;
    setIsLoading(true);
    try {
      const updated = await approveToleranceException(transactionId);
      setResult(updated);
      setShowToleranceDialog(false);
      toast.success('Tolerance exception approved. Proceed to print ticket.');
    } catch (err) {
      console.error('Failed to approve tolerance exception:', err);
      toast.error('Failed to approve tolerance exception.');
    } finally {
      setIsLoading(false);
    }
  }, [transactionId]);

  const handleApplyQualityDeduction = useCallback(async () => {
    if (!transactionId || qualityDeductionKg <= 0) return;
    setIsApplyingDeduction(true);
    try {
      const updated = await updateQualityDeduction(transactionId, { qualityDeductionKg, reason: qualityDeductionReason || undefined });
      setResult(updated);
      toast.success('Quality deduction applied.');
    } catch (err) {
      toast.error('Failed to apply quality deduction.');
    } finally {
      setIsApplyingDeduction(false);
    }
  }, [transactionId, qualityDeductionKg, qualityDeductionReason]);

  const handlePrintTicket = useCallback(async () => {
    if (!transactionId) return;
    try {
      toast.info('Generating weight ticket PDF...');
      const blob = await getCommercialTicketPdf(transactionId);
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) { printWindow.focus(); toast.success('Weight ticket generated.'); }
      else {
        await downloadAndSavePdf(() => Promise.resolve(blob), `WeightTicket_${result?.ticketNumber || transactionId}.pdf`);
        toast.success('Weight ticket downloaded.');
      }
    } catch (err) {
      toast.error('Failed to generate weight ticket.');
    }
  }, [transactionId, result?.ticketNumber]);

  const handlePrintInterimTicket = useCallback(async () => {
    if (!transactionId || !result?.firstWeightKg) return;
    try {
      toast.info('Generating interim ticket...');
      const blob = await getInterimTicketPdf(transactionId);
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) { printWindow.focus(); toast.success('Interim ticket generated.'); }
      else {
        await downloadAndSavePdf(() => Promise.resolve(blob), `InterimTicket_${result.ticketNumber}.pdf`);
        toast.success('Interim ticket downloaded.');
      }
    } catch (err) {
      toast.error('Failed to generate interim ticket.');
    }
  }, [transactionId, result?.firstWeightKg, result?.ticketNumber]);

  const handleComplete = useCallback(async () => {
    await handlePrintTicket();
    resetSession();
    toast.success('Transaction completed. Ready for next vehicle.');
  }, [handlePrintTicket]);

  const resetSession = useCallback(() => {
    setTransactionId(null); setResult(null);
    setCurrentStep('capture'); setCompletedSteps([]);
    setVehiclePlate(''); setIsPlateDisabled(false);
    setFrontViewImage(undefined); setOverviewImage(undefined);
    setSelectedDriverId(undefined); setSelectedTransporterId(undefined);
    setSelectedCargoId(undefined); setSelectedOriginId(undefined); setSelectedDestinationId(undefined);
    setQualityDeductionKg(0); setQualityDeductionReason('');
    setDeckWeights([]); setCapturedAxleWeights([]); setCurrentAxle(1);
    setCargoDetails({ consignmentNo: '', orderReference: '', cargoType: '', origin: '', destination: '', sealNumbers: '', trailerRegNo: '', expectedNetWeightKg: '', remarks: '' });
    setLiveWeightKg(0);
    if (middleware.connected) middleware.resetSession();
  }, [middleware, setVehiclePlate, setIsPlateDisabled, setFrontViewImage, setOverviewImage,
      setSelectedDriverId, setSelectedTransporterId, setSelectedCargoId, setSelectedOriginId, setSelectedDestinationId]);

  const confirmCancelWeighing = useCallback(() => {
    setShowCancelConfirm(false);
    resetSession();
    toast.success('Weighing cancelled.');
  }, [resetSession]);

  const stationDisplayName = currentStation?.name ?? 'Loading...';
  const canProceedFromCapture = vehiclePlate.length >= 5;

  if (isLoadingStation) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className={cn('space-y-5 pb-6', className)}>
      <WeighingPageHeader
        title={`Commercial Weighing — ${mode === 'mobile' ? 'Axle-by-Axle' : 'Multideck'}`}
        subtitle={`${stationDisplayName} | ${currentStation?.code || ''}`}
        scaleStatus={middlewareConnected ? 'connected' : 'disconnected'}
      />

      <WeighingStepperNav
        steps={COMMERCIAL_STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={(id) => setCurrentStep(id as CommercialWeighingStep)}
        label="Commercial weighing progress"
      />

      {/* Tolerance exception banner */}
      {result?.toleranceExceeded && !result.toleranceExceptionApproved && result.netWeightKg != null && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-red-800 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Weight discrepancy exceeds tolerance ({result.toleranceDisplay}).
                {canApproveException ? ' Supervisor approval required to complete.' : ' Contact a supervisor to approve.'}
              </span>
            </div>
            {canApproveException && (
              <Button size="sm" variant="destructive" onClick={() => setShowToleranceDialog(true)}>
                <ShieldCheck className="h-4 w-4 mr-1" /> Approve Exception
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {result?.toleranceExceptionApproved && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-3 flex items-center gap-2 text-green-800 text-sm">
            <ShieldCheck className="h-4 w-4" />
            Tolerance exception approved. Ticket can be issued.
          </CardContent>
        </Card>
      )}

      {/* Tare expiry warning */}
      {currentStep === 'second-weight' && isTareExpired && storedTareWeightKg && (
        <Card className="border-orange-300 bg-orange-50">
          <CardContent className="p-3 flex items-center gap-2 text-orange-800 text-sm">
            <Clock className="h-4 w-4 shrink-0" />
            Stored tare weight has expired. Re-weigh the vehicle or enter a manual tare override.
          </CardContent>
        </Card>
      )}
      {currentStep === 'second-weight' && !isTareExpired && tareExpiryDaysLeft !== null && tareExpiryDaysLeft <= 7 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-3 flex items-center gap-2 text-yellow-800 text-sm">
            <Clock className="h-4 w-4 shrink-0" />
            Stored tare expires in {tareExpiryDaysLeft} day{tareExpiryDaysLeft !== 1 ? 's' : ''}.
          </CardContent>
        </Card>
      )}

      {/* Active transaction bar */}
      {transactionId && currentStep !== 'capture' && (
        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-mono font-bold text-lg">{result?.ticketNumber || 'PENDING'}</span>
              <span className="text-gray-400">|</span>
              <span className="font-mono text-xl font-bold text-blue-600">{vehiclePlate}</span>
              <Badge variant="outline" className="text-xs">{mode === 'mobile' ? 'Axle-by-Axle' : 'Multideck'}</Badge>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setShowCancelConfirm(true)}>
              CANCEL WEIGHING
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step content */}
      <div className="min-h-[480px]">

        {/* ── CAPTURE STEP ─────────────────────────────────────────────────── */}
        {currentStep === 'capture' && (
          <WeighingCaptureStep
            isCommercial
            stationId={currentStation?.id}
            middlewareConnected={middlewareConnected}
            scales={captureStepScales}
            isScalesConnected={middlewareConnected}
            isScaleTestCompleted={isScaleTestCompleted}
            lastScaleTestAt={lastScaleTestAt}
            weighingType={mode}
            isSimulationMode={false}
            handleConnectScales={() => middleware.connect()}
            handleStartScaleTest={() => {}}
            handleToggleScale={() => {}}
            handleChangeWeighingType={() => {}}
            frontViewImage={frontViewImage}
            overviewImage={overviewImage}
            setFrontViewImage={setFrontViewImage}
            setOverviewImage={setOverviewImage}
            handleCaptureFront={handleCaptureFront}
            handleCaptureOverview={handleCaptureOverview}
            vehiclePlate={vehiclePlate}
            setVehiclePlate={setVehiclePlate}
            isPlateDisabled={isPlateDisabled}
            handleScanPlate={handleScanPlate}
            handleEditPlate={() => setIsPlateDisabled(false)}
            handleProceedToVehicle={handleProceedToFirstWeight}
            canProceedFromCapture={canProceedFromCapture && !isLoading}
            pendingTransactions={[]}
            handleResumeTransaction={() => {}}
            onEnter={middleware.sendEnter}
            onMoveForward={middleware.sendMoveForward}
            onMoveBack={middleware.sendMoveBack}
            onStop={middleware.sendStop}
          >
            {/* Entity selectors: driver, transporter, cargo type, origin, destination */}
            <CommercialEntitySelectors
              drivers={drivers.map((d) => ({ id: d.id, label: d.fullNames ?? d.id }))}
              selectedDriverId={selectedDriverId}
              onDriverIdChange={setSelectedDriverId}
              onAddDriver={() => setIsDriverModalOpen(true)}
              transporters={transporters.map((t) => ({ id: t.id, label: t.name ?? t.id }))}
              selectedTransporterId={selectedTransporterId}
              onTransporterIdChange={setSelectedTransporterId}
              onAddTransporter={() => setIsTransporterModalOpen(true)}
              cargoTypes={cargoTypes.map((c) => ({ id: c.id, label: c.name ?? c.id }))}
              selectedCargoId={selectedCargoId}
              onCargoIdChange={setSelectedCargoId}
              onAddCargoType={() => setIsCargoTypeModalOpen(true)}
              locations={locations.map((l) => ({ id: l.id, label: l.name ?? l.id }))}
              selectedOriginId={selectedOriginId}
              onOriginIdChange={setSelectedOriginId}
              selectedDestinationId={selectedDestinationId}
              onDestinationIdChange={setSelectedDestinationId}
              onAddOrigin={() => { setLocationModalTarget('origin'); setIsLocationModalOpen(true); }}
              onAddDestination={() => { setLocationModalTarget('destination'); setIsLocationModalOpen(true); }}
            />

            {/* Vehicle tare info shown beneath the entity selectors */}
            {existingVehicle && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-3 text-xs space-y-1">
                  <div className="font-medium text-gray-800">{existingVehicle.make} {existingVehicle.model}</div>
                  {storedTareWeightKg && (
                    <div className={cn('flex items-center gap-1', isTareExpired ? 'text-orange-600' : 'text-green-600')}>
                      {isTareExpired ? <Clock className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                      Stored tare: {formatWeight(storedTareWeightKg)} kg
                      {isTareExpired ? ' (EXPIRED)' : tareExpiryDaysLeft !== null ? ` (${tareExpiryDaysLeft}d left)` : ''}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </WeighingCaptureStep>
        )}

        {/* ── FIRST WEIGHT STEP ────────────────────────────────────────────── */}
        {currentStep === 'first-weight' && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/30 p-4 shadow-sm md:p-5 space-y-4">

            {/* Multideck: show per-deck readings */}
            {mode === 'multideck' && deckWeights.length > 0 && (
              <Card className="bg-gray-900 text-white">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-400 tracking-wider">DECK WEIGHTS</span>
                    <Badge variant="outline" className={cn('font-medium', middlewareConnected && isStable ? 'border-green-500 text-green-400' : 'border-yellow-500 text-yellow-400')}>
                      {middlewareConnected ? (isStable ? 'STABLE' : 'READING...') : 'OFFLINE'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-4 px-4">
                  <div className={cn('grid gap-3', `grid-cols-${Math.min(deckWeights.length, 4)}`)}>
                    {deckWeights.map((d) => (
                      <div key={d.deck} className="text-center bg-black rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">DECK {d.deck}</div>
                        <div className="font-mono text-2xl font-bold text-yellow-400">{d.weight.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">kg</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-center border-t border-gray-700 pt-3">
                    <span className="text-xs text-gray-500 mr-2">TOTAL GVW</span>
                    <span className="font-mono text-3xl font-bold text-green-400">{liveWeightKg.toLocaleString()}</span>
                    <span className="text-xs text-gray-400 ml-1">kg</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mobile: axle-by-axle capture */}
            {mode === 'mobile' && !result?.firstWeightKg && (
              <div className="space-y-3">
                <Card>
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-600">Total axles:</span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setTotalAxles((n) => Math.max(2, n - 1))} disabled={totalAxles <= 2}>−</Button>
                      <span className="w-6 text-center font-bold">{totalAxles}</span>
                      <Button size="sm" variant="outline" onClick={() => setTotalAxles((n) => Math.min(8, n + 1))} disabled={totalAxles >= 8}>+</Button>
                    </div>
                  </CardContent>
                </Card>

                <WeightCaptureCard
                  currentWeight={liveWeightKg}
                  currentAxle={currentAxle}
                  totalAxles={totalAxles}
                  capturedAxles={Array.from({ length: capturedAxleWeights.length }, (_, i) => i + 1)}
                  capturedWeights={capturedAxleWeights}
                  onCaptureAxle={handleCaptureAxle}
                  scaleAStatus={middlewareConnected ? 'connected' : 'disconnected'}
                />

                {capturedAxleWeights.length > 0 && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-800">
                          {capturedAxleWeights.length}/{totalAxles} axles — GVW: <span className="font-mono font-bold">{formatWeight(axleGvw)} kg</span>
                        </span>
                        <Button size="sm" variant="ghost" className="text-red-600 h-7" onClick={handleResetAxles}>Reset</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* CommercialFirstWeightStep handles single-GVW (multideck) or shows confirm after all axles */}
            {mode === 'multideck' || result?.firstWeightKg != null ? (
              <CommercialFirstWeightStep
                liveWeightKg={liveWeightKg}
                isConnected={middlewareConnected}
                isStable={isStable}
                result={result}
                storedTareWeightKg={storedTareWeightKg}
                isCapturing={isLoading}
                onCapture={handleCaptureFirstWeight}
              />
            ) : allAxlesCaptured ? (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm text-gray-600">All {totalAxles} axles captured. GVW = <span className="font-mono font-bold">{formatWeight(axleGvw)} kg</span>.</p>
                  <p className="text-sm text-gray-500">Select whether this first pass is the tare (empty) or gross (loaded) weight:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button size="lg" variant="outline" className="h-16 flex-col gap-1 border-2 hover:border-blue-500 hover:bg-blue-50" disabled={isLoading} onClick={() => handleCaptureFirstWeight('tare')}>
                      <span className="text-base font-semibold">Tare Weight</span>
                      <span className="text-xs text-gray-500">Empty vehicle</span>
                    </Button>
                    <Button size="lg" variant="outline" className="h-16 flex-col gap-1 border-2 hover:border-amber-500 hover:bg-amber-50" disabled={isLoading} onClick={() => handleCaptureFirstWeight('gross')}>
                      <span className="text-base font-semibold">Gross Weight</span>
                      <span className="text-xs text-gray-500">Loaded vehicle</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
              <Button variant="outline" onClick={goToPrevStep} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <div className="flex items-center gap-2">
                {result?.firstWeightKg != null && (
                  <Button variant="outline" size="sm" onClick={handlePrintInterimTicket} className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50">
                    Print Interim Ticket
                  </Button>
                )}
                {result?.firstWeightKg != null && (
                  <Button onClick={goToNextStep} className="gap-2">
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── SECOND WEIGHT STEP ───────────────────────────────────────────── */}
        {currentStep === 'second-weight' && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/30 p-4 shadow-sm md:p-5 space-y-4">

            {/* Multideck: show per-deck readings */}
            {mode === 'multideck' && deckWeights.length > 0 && !(result?.secondWeightKg != null || result?.netWeightKg != null) && (
              <Card className="bg-gray-900 text-white">
                <CardHeader className="pb-2 pt-4 px-4">
                  <span className="text-sm font-medium text-gray-400 tracking-wider">DECK WEIGHTS — SECOND PASS</span>
                </CardHeader>
                <CardContent className="pb-4 px-4">
                  <div className={cn('grid gap-3', `grid-cols-${Math.min(deckWeights.length, 4)}`)}>
                    {deckWeights.map((d) => (
                      <div key={d.deck} className="text-center bg-black rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">DECK {d.deck}</div>
                        <div className="font-mono text-2xl font-bold text-yellow-400">{d.weight.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">kg</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-center border-t border-gray-700 pt-3">
                    <span className="text-xs text-gray-500 mr-2">TOTAL GVW</span>
                    <span className="font-mono text-3xl font-bold text-green-400">{liveWeightKg.toLocaleString()}</span>
                    <span className="text-xs text-gray-400 ml-1">kg</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mobile: axle-by-axle for second pass */}
            {mode === 'mobile' && !(result?.secondWeightKg != null || result?.netWeightKg != null) && (
              <div className="space-y-3">
                <WeightCaptureCard
                  currentWeight={liveWeightKg}
                  currentAxle={currentAxle}
                  totalAxles={totalAxles}
                  capturedAxles={Array.from({ length: capturedAxleWeights.length }, (_, i) => i + 1)}
                  capturedWeights={capturedAxleWeights}
                  onCaptureAxle={handleCaptureAxle}
                  scaleAStatus={middlewareConnected ? 'connected' : 'disconnected'}
                />
                {capturedAxleWeights.length > 0 && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-3 flex items-center justify-between text-sm">
                      <span className="text-blue-800">{capturedAxleWeights.length}/{totalAxles} axles — GVW: <span className="font-mono font-bold">{formatWeight(axleGvw)} kg</span></span>
                      <Button size="sm" variant="ghost" className="text-red-600 h-7" onClick={handleResetAxles}>Reset</Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <CommercialSecondWeightStep
              liveWeightKg={mode === 'mobile' ? axleGvw : liveWeightKg}
              isConnected={middlewareConnected}
              isStable={isStable}
              result={result}
              storedTareWeightKg={isTareExpired ? undefined : storedTareWeightKg}
              isCapturing={isLoading}
              onCaptureSecondWeight={mode === 'mobile' ? (allAxlesCaptured ? handleCaptureSecondWeight : () => toast.error(`Capture all ${totalAxles} axles first.`)) : handleCaptureSecondWeight}
              onUseStoredTare={handleUseStoredTare}
            />

            <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
              <Button variant="outline" onClick={goToPrevStep} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              {(result?.netWeightKg != null) && (
                <Button
                  onClick={goToNextStep}
                  disabled={result.toleranceExceeded && !result.toleranceExceptionApproved}
                  className="gap-2"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── TICKET STEP ──────────────────────────────────────────────────── */}
        {currentStep === 'ticket' && result && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/30 p-4 shadow-sm md:p-5">
            <CommercialTicketStep
              result={result}
              cargoDetails={cargoDetails}
              onCargoDetailsChange={(partial) => setCargoDetails((prev) => ({ ...prev, ...partial }))}
              qualityDeductionKg={qualityDeductionKg}
              qualityDeductionReason={qualityDeductionReason}
              onQualityDeductionChange={(kg, reason) => { setQualityDeductionKg(kg); setQualityDeductionReason(reason); }}
              onApplyQualityDeduction={handleApplyQualityDeduction}
              isApplyingDeduction={isApplyingDeduction}
              onPrintTicket={handlePrintTicket}
              onComplete={handleComplete}
              onCollectPayment={feeIsConfigured && result.treasuryPaymentUrl ? () => setShowPaymentModal(true) : undefined}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Weighing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this commercial weighing? All captured data will be lost.
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

      {/* Tolerance exception approval dialog */}
      <AlertDialog open={showToleranceDialog} onOpenChange={setShowToleranceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" /> Tolerance Exception
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                The weight discrepancy exceeds the configured tolerance band ({result?.toleranceDisplay}).
              </p>
              <p>
                Measured net: <strong>{formatWeight(result?.netWeightKg ?? 0)} kg</strong>.
                Expected: <strong>{formatWeight(result?.expectedNetWeightKg ?? 0)} kg</strong>.
                Discrepancy: <strong>{formatWeight(Math.abs(result?.weightDiscrepancyKg ?? 0))} kg</strong>.
              </p>
              <p className="text-sm">
                {canApproveException
                  ? 'As a supervisor, you can approve this exception to proceed.'
                  : 'A supervisor with weighing.override permission must approve this exception.'}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            {canApproveException && (
              <AlertDialogAction
                onClick={handleApproveToleranceException}
                disabled={isLoading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isLoading ? 'Approving...' : 'Approve Exception'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Entity CRUD modals */}
      <DriverModal
        open={isDriverModalOpen}
        onOpenChange={setIsDriverModalOpen}
        onSave={handleSaveDriver}
        isSaving={isSavingEntity}
        mode="create"
        transporters={transporters.map((t) => ({ id: t.id, name: t.name ?? t.id }))}
        defaultTransporterId={selectedTransporterId}
      />
      <TransporterModal
        open={isTransporterModalOpen}
        onOpenChange={setIsTransporterModalOpen}
        onSave={handleSaveTransporter}
        isSaving={isSavingEntity}
        mode="create"
      />
      <CargoTypeModal
        open={isCargoTypeModalOpen}
        onOpenChange={setIsCargoTypeModalOpen}
        onSave={handleSaveCargoType}
        isSaving={isSavingEntity}
        mode="create"
      />
      <OriginDestinationModal
        open={isLocationModalOpen}
        onOpenChange={setIsLocationModalOpen}
        onSave={handleSaveLocation}
        isSaving={isSavingEntity}
        mode="create"
      />

      {/* Treasury payment dialog — shown when Pay button clicked on ticket step */}
      {showPaymentModal && result?.treasuryPaymentUrl && (
        <TreasuryCheckoutDialog
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          invoiceNo={result.invoiceNo ?? result.ticketNumber ?? ''}
          amountDue={result.invoiceAmountKes ?? orgData?.commercialWeighingFeeKes ?? 0}
          currency="KES"
          treasuryPaymentUrl={result.treasuryPaymentUrl}
          paymentIntentId={result.treasuryIntentId}
          treasuryIntentStatus={result.invoiceStatus === 'paid' ? 'succeeded' : undefined}
          onPaymentConfirmed={() => {
            setShowPaymentModal(false);
            toast.success('Payment confirmed. Transaction complete.');
            if (transactionId) {
              getCommercialResult(transactionId).then((updated) => setResult(updated));
            }
          }}
        />
      )}
    </div>
  );
}

