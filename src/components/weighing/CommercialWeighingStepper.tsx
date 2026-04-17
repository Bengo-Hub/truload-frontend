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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WeighingPageHeader } from '@/components/weighing/WeighingPageHeader';
import { CommercialFirstWeightStep } from '@/components/weighing/steps/CommercialFirstWeightStep';
import { CommercialSecondWeightStep } from '@/components/weighing/steps/CommercialSecondWeightStep';
import {
  CargoDetailsForm,
  CommercialTicketStep,
} from '@/components/weighing/steps/CommercialTicketStep';
import {
  useCreateVehicle,
  useMyStation,
  useVehicleByRegNo,
} from '@/hooks/queries';
import { useMiddleware, WeightData } from '@/hooks/useMiddleware';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { useWeighingUI } from '@/hooks/useWeighingUI';
import {
  captureFirstWeight,
  captureSecondWeight,
  downloadAndSavePdf,
  getCommercialResult,
  getCommercialTicketPdf,
  getVehicleTareHistory,
  initiateCommercialWeighing,
  updateQualityDeduction,
  useStoredTare,
} from '@/lib/api/weighing';
import type {
  CommercialWeighingResult,
  CommercialWeighingStep,
  VehicleTareHistory,
} from '@/types/weighing';
import { cn } from '@/lib/utils';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// Step definitions for the commercial stepper
const COMMERCIAL_STEPS: { id: CommercialWeighingStep; title: string; description: string }[] = [
  { id: 'capture', title: 'Capture', description: 'Plate & middleware' },
  { id: 'first-weight', title: 'First Weight', description: 'Tare or gross' },
  { id: 'second-weight', title: 'Second Weight', description: 'Net calculation' },
  { id: 'ticket', title: 'Ticket', description: 'Details & print' },
];

interface CommercialWeighingStepperProps {
  className?: string;
}

/**
 * CommercialWeighingStepper - 4-step stepper for commercial weighing workflow.
 *
 * Steps:
 * 1. Capture - plate entry, middleware connection
 * 2. First Weight - tare or gross from scale
 * 3. Second Weight / Use Stored Tare - calculate net
 * 4. Ticket - cargo details, print ticket
 */
export function CommercialWeighingStepper({ className }: CommercialWeighingStepperProps) {
  const router = useRouter();
  const orgSlug = useOrgSlug();

  // Station
  const { data: currentStation, isLoading: isLoadingStation } = useMyStation();

  // Workflow state
  const [currentStep, setCurrentStep] = useState<CommercialWeighingStep>('capture');
  const [completedSteps, setCompletedSteps] = useState<CommercialWeighingStep[]>([]);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [result, setResult] = useState<CommercialWeighingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Live weight from middleware
  const [liveWeightKg, setLiveWeightKg] = useState(0);
  const [isStable, setIsStable] = useState(false);
  const [middlewareConnected, setMiddlewareConnected] = useState(false);

  // Stored tare
  const [storedTareWeightKg, setStoredTareWeightKg] = useState<number | undefined>();

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

  // UI state from shared hook
  const weighingUI = useWeighingUI({ stationId: currentStation?.id });
  const {
    vehiclePlate, setVehiclePlate, debouncedPlate,
    isPlateDisabled, setIsPlateDisabled,
    handleScanPlate,
    frontViewImage, setFrontViewImage,
    overviewImage, setOverviewImage,
    handleCaptureFront, handleCaptureOverview,
    selectedDriverId, setSelectedDriverId,
    selectedTransporterId, setSelectedTransporterId,
    selectedCargoId, setSelectedCargoId,
    selectedOriginId, setSelectedOriginId,
    selectedDestinationId, setSelectedDestinationId,
  } = weighingUI;

  // Vehicle lookup
  const createVehicleMutation = useCreateVehicle();
  const { data: existingVehicle } = useVehicleByRegNo(debouncedPlate.length >= 5 ? debouncedPlate : undefined);

  // Middleware hook
  const middleware = useMiddleware({
    stationCode: currentStation?.code || 'DEFAULT',
    bound: 'A',
    mode: 'multideck', // Commercial uses platform scale
    autoConnect: true,
    clientName: `TruLoad Frontend - Commercial - ${currentStation?.name || ''}`,
    clientType: 'truload-frontend',
    onWeightUpdate: (weight: WeightData) => {
      // Use GVW for multideck or weight for single platform
      const w = weight.gvw ?? weight.weight ?? 0;
      setLiveWeightKg(w);
      setIsStable(weight.stable);
    },
    onConnectionModeChange: (mode) => {
      setMiddlewareConnected(mode !== 'disconnected');
    },
  });

  useEffect(() => {
    setMiddlewareConnected(middleware.connected);
  }, [middleware.connected]);

  // Fetch stored tare when vehicle is identified
  useEffect(() => {
    if (!existingVehicle?.id) {
      setStoredTareWeightKg(undefined);
      return;
    }
    // Check vehicle entity tare first
    if (existingVehicle.tareWeight && existingVehicle.tareWeight > 0) {
      setStoredTareWeightKg(existingVehicle.tareWeight);
      return;
    }
    // Then check tare history
    getVehicleTareHistory(existingVehicle.id)
      .then((history: VehicleTareHistory[]) => {
        if (history.length > 0) {
          setStoredTareWeightKg(history[0].tareWeightKg);
        }
      })
      .catch(() => {
        // Ignore - no tare history available
      });
  }, [existingVehicle?.id, existingVehicle?.tareWeight]);

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
    }
  }, [result]);

  // Step navigation
  const completeStep = (step: CommercialWeighingStep) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps((prev) => [...prev, step]);
    }
  };

  const goToNextStep = () => {
    completeStep(currentStep);
    const idx = COMMERCIAL_STEPS.findIndex((s) => s.id === currentStep);
    if (idx < COMMERCIAL_STEPS.length - 1) {
      setCurrentStep(COMMERCIAL_STEPS[idx + 1].id);
    }
  };

  const goToPrevStep = () => {
    const idx = COMMERCIAL_STEPS.findIndex((s) => s.id === currentStep);
    if (idx > 0) {
      setCurrentStep(COMMERCIAL_STEPS[idx - 1].id);
    }
  };

  // Actions
  const handleProceedToFirstWeight = useCallback(async () => {
    if (!currentStation?.id) {
      toast.error('No station assigned.');
      return;
    }
    if (vehiclePlate.length < 5) {
      toast.error('Enter a valid plate number (at least 5 characters).');
      return;
    }

    setIsLoading(true);
    try {
      // Auto-create vehicle if needed
      if (!existingVehicle && vehiclePlate.length >= 5) {
        try {
          await createVehicleMutation.mutateAsync({ regNo: vehiclePlate });
        } catch {
          console.warn('Could not auto-create vehicle');
        }
      }

      // Send plate to middleware
      if (middleware.connected) {
        middleware.sendPlate(vehiclePlate);
      }

      // Initiate commercial weighing
      const txnResult = await initiateCommercialWeighing({
        stationId: currentStation.id,
        vehicleRegNo: vehiclePlate.trim().toUpperCase(),
        driverId: selectedDriverId || undefined,
        transporterId: selectedTransporterId || undefined,
        cargoId: selectedCargoId || undefined,
        originId: selectedOriginId || undefined,
        destinationId: selectedDestinationId || undefined,
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
  }, [currentStation, vehiclePlate, existingVehicle, createVehicleMutation, middleware, selectedDriverId, selectedTransporterId, selectedCargoId, selectedOriginId, selectedDestinationId]);

  const handleCaptureFirstWeight = useCallback(async (weightType: 'tare' | 'gross') => {
    if (!transactionId || liveWeightKg <= 0) return;

    setIsLoading(true);
    try {
      const updated = await captureFirstWeight(transactionId, {
        weightKg: liveWeightKg,
        weightType,
      });
      setResult(updated);
      toast.success(`First weight captured: ${liveWeightKg.toLocaleString()} kg (${weightType})`);
      goToNextStep();
    } catch (err) {
      console.error('Failed to capture first weight:', err);
      toast.error('Failed to capture weight. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [transactionId, liveWeightKg]);

  const handleCaptureSecondWeight = useCallback(async () => {
    if (!transactionId || liveWeightKg <= 0) return;

    setIsLoading(true);
    try {
      const updated = await captureSecondWeight(transactionId, {
        weightKg: liveWeightKg,
      });
      setResult(updated);
      toast.success(`Second weight captured. Net weight: ${(updated.netWeightKg ?? 0).toLocaleString()} kg`);
      goToNextStep();
    } catch (err) {
      console.error('Failed to capture second weight:', err);
      toast.error('Failed to capture weight. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [transactionId, liveWeightKg]);

  const handleUseStoredTare = useCallback(async (overrideTareKg?: number) => {
    if (!transactionId) return;

    setIsLoading(true);
    try {
      const updated = await useStoredTare(transactionId, {
        overrideTareWeightKg: overrideTareKg,
      });
      setResult(updated);
      toast.success(`Stored tare used. Net weight: ${(updated.netWeightKg ?? 0).toLocaleString()} kg`);
      goToNextStep();
    } catch (err) {
      console.error('Failed to use stored tare:', err);
      toast.error('Failed to use stored tare. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [transactionId]);

  const handleApplyQualityDeduction = useCallback(async () => {
    if (!transactionId || qualityDeductionKg <= 0) return;

    setIsApplyingDeduction(true);
    try {
      const updated = await updateQualityDeduction(transactionId, {
        qualityDeductionKg,
        reason: qualityDeductionReason || undefined,
      });
      setResult(updated);
      toast.success('Quality deduction applied.');
    } catch (err) {
      console.error('Failed to apply quality deduction:', err);
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
      if (printWindow) {
        printWindow.focus();
        toast.success('Weight ticket generated.');
      } else {
        await downloadAndSavePdf(
          () => Promise.resolve(blob),
          `WeightTicket_${result?.ticketNumber || transactionId}.pdf`
        );
        toast.success('Weight ticket downloaded.');
      }
    } catch (err) {
      console.error('Failed to print ticket:', err);
      toast.error('Failed to generate weight ticket.');
    }
  }, [transactionId, result?.ticketNumber]);

  const handleComplete = useCallback(async () => {
    // Print first, then reset
    await handlePrintTicket();
    resetSession();
    toast.success('Transaction completed. Ready for next vehicle.');
  }, [handlePrintTicket]);

  const resetSession = useCallback(() => {
    setTransactionId(null);
    setResult(null);
    setCurrentStep('capture');
    setCompletedSteps([]);
    setVehiclePlate('');
    setIsPlateDisabled(false);
    setFrontViewImage(undefined);
    setOverviewImage(undefined);
    setSelectedDriverId(undefined);
    setSelectedTransporterId(undefined);
    setSelectedCargoId(undefined);
    setSelectedOriginId(undefined);
    setSelectedDestinationId(undefined);
    setQualityDeductionKg(0);
    setQualityDeductionReason('');
    setCargoDetails({
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
    setLiveWeightKg(0);
    if (middleware.connected) {
      middleware.resetSession();
    }
  }, [middleware, setVehiclePlate, setIsPlateDisabled, setFrontViewImage, setOverviewImage, setSelectedDriverId, setSelectedTransporterId, setSelectedCargoId, setSelectedOriginId, setSelectedDestinationId]);

  const confirmCancelWeighing = useCallback(() => {
    setShowCancelConfirm(false);
    resetSession();
    toast.success('Weighing cancelled.');
  }, [resetSession]);

  const stationDisplayName = currentStation
    ? currentStation.name
    : 'Loading...';

  const canProceedFromCapture = vehiclePlate.length >= 5;

  if (isLoadingStation) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-5 pb-6', className)}>
      <WeighingPageHeader
        title="Commercial Weighing"
        subtitle={`${stationDisplayName} | Station: ${currentStation?.code || ''}`}
        scaleStatus={middlewareConnected ? 'connected' : 'disconnected'}
      />

      {/* Stepper */}
      <CommercialStepperNav
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={setCurrentStep}
      />

      {/* Cancel bar (visible after capture step) */}
      {transactionId && currentStep !== 'capture' && (
        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-mono font-bold text-lg">{result?.ticketNumber || 'PENDING'}</span>
              <span className="text-gray-400">|</span>
              <span className="font-mono text-xl font-bold text-blue-600">{vehiclePlate}</span>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setShowCancelConfirm(true)}>
              CANCEL WEIGHING
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step content */}
      <div className="min-h-[480px]">
        {currentStep === 'capture' && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/30 p-4 shadow-sm md:p-5 space-y-4">
            {/* Plate entry */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Vehicle Plate Number</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                      disabled={isPlateDisabled}
                      placeholder="Enter plate number (e.g. KAA 123A)"
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                    <Button variant="outline" size="sm" onClick={handleScanPlate}>
                      Scan
                    </Button>
                  </div>
                </div>

                {/* Middleware status */}
                <div className="flex items-center gap-2 text-sm">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    middlewareConnected ? 'bg-green-500' : 'bg-red-500'
                  )} />
                  <span className="text-gray-600">
                    Scale: {middlewareConnected ? 'Connected' : 'Disconnected'}
                  </span>
                  {!middlewareConnected && (
                    <Button variant="ghost" size="sm" onClick={() => middleware.connect()}>
                      Connect
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Proceed button */}
            <div className="flex justify-end">
              <Button
                size="lg"
                className="gap-2"
                disabled={!canProceedFromCapture || isLoading}
                onClick={handleProceedToFirstWeight}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Proceed to Weighing
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'first-weight' && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/30 p-4 shadow-sm md:p-5">
            <CommercialFirstWeightStep
              liveWeightKg={liveWeightKg}
              isConnected={middlewareConnected}
              isStable={isStable}
              result={result}
              storedTareWeightKg={storedTareWeightKg}
              isCapturing={isLoading}
              onCapture={handleCaptureFirstWeight}
            />
            <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-4 mt-4">
              <Button variant="outline" onClick={goToPrevStep} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              {result?.firstWeightKg != null && (
                <Button onClick={goToNextStep} className="gap-2">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {currentStep === 'second-weight' && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/30 p-4 shadow-sm md:p-5">
            <CommercialSecondWeightStep
              liveWeightKg={liveWeightKg}
              isConnected={middlewareConnected}
              isStable={isStable}
              result={result}
              storedTareWeightKg={storedTareWeightKg}
              isCapturing={isLoading}
              onCaptureSecondWeight={handleCaptureSecondWeight}
              onUseStoredTare={handleUseStoredTare}
            />
            <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-4 mt-4">
              <Button variant="outline" onClick={goToPrevStep} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              {result?.netWeightKg != null && (
                <Button onClick={goToNextStep} className="gap-2">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {currentStep === 'ticket' && result && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/30 p-4 shadow-sm md:p-5">
            <CommercialTicketStep
              result={result}
              cargoDetails={cargoDetails}
              onCargoDetailsChange={(partial) => setCargoDetails((prev) => ({ ...prev, ...partial }))}
              qualityDeductionKg={qualityDeductionKg}
              qualityDeductionReason={qualityDeductionReason}
              onQualityDeductionChange={(kg, reason) => {
                setQualityDeductionKg(kg);
                setQualityDeductionReason(reason);
              }}
              onApplyQualityDeduction={handleApplyQualityDeduction}
              isApplyingDeduction={isApplyingDeduction}
              onPrintTicket={handlePrintTicket}
              onComplete={handleComplete}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>

      {/* Cancel confirmation */}
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
    </div>
  );
}

// ============================================================================
// Commercial Stepper Nav (4 steps)
// ============================================================================

function CommercialStepperNav({
  currentStep,
  completedSteps,
  onStepClick,
}: {
  currentStep: CommercialWeighingStep;
  completedSteps: CommercialWeighingStep[];
  onStepClick?: (step: CommercialWeighingStep) => void;
}) {
  const currentIndex = COMMERCIAL_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label="Commercial weighing progress">
      <ol className="flex items-center justify-between">
        {COMMERCIAL_STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isClickable = onStepClick && (isCompleted || index === currentIndex + 1);

          return (
            <li key={step.id} className="relative flex-1">
              {/* Connector line */}
              {index > 0 && (
                <div
                  className={cn(
                    'absolute left-0 right-1/2 top-4 h-0.5 -translate-y-1/2',
                    isCompleted || isCurrent ? 'bg-emerald-500' : 'bg-gray-200'
                  )}
                  aria-hidden="true"
                />
              )}
              {index < COMMERCIAL_STEPS.length - 1 && (
                <div
                  className={cn(
                    'absolute left-1/2 right-0 top-4 h-0.5 -translate-y-1/2',
                    completedSteps.includes(COMMERCIAL_STEPS[index + 1]?.id)
                      ? 'bg-emerald-500'
                      : 'bg-gray-200'
                  )}
                  aria-hidden="true"
                />
              )}

              {/* Step circle + label */}
              <div className="relative flex flex-col items-center">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onStepClick?.(step.id)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold border-2 transition-colors z-10',
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : isCurrent
                        ? 'bg-white border-emerald-500 text-emerald-600'
                        : 'bg-white border-gray-300 text-gray-400',
                    isClickable ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </button>
                <span
                  className={cn(
                    'mt-1 text-xs font-medium',
                    isCurrent ? 'text-emerald-600' : isCompleted ? 'text-emerald-500' : 'text-gray-400'
                  )}
                >
                  {step.title}
                </span>
                <span className="text-[10px] text-gray-400 hidden sm:block">{step.description}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
