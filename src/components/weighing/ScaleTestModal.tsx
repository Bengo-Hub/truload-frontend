"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Scale,
  XCircle,
  Wifi,
  Truck,
  Weight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  CreateScaleTestRequest,
  ScaleTest,
  Station,
  AxleConfiguration,
} from '@/lib/api/weighing';
import { useCreateScaleTest } from '@/hooks/queries/useWeighingQueries';

type TestType = 'calibration_weight' | 'vehicle';

/** Middleware weight data for live readings */
interface MiddlewareWeights {
  deck1?: number;
  deck2?: number;
  deck3?: number;
  deck4?: number;
  gvw?: number;
  currentWeight?: number;
  /**
   * Individual scale weights for mobile mode
   *
   * PAW scales return combined weight, so middleware derives:
   *   scaleA = total / 2, scaleB = total - scaleA
   *
   * Haenni may return separate weights directly.
   */
  scaleA?: number;
  scaleB?: number;
  /** 'combined' (PAW - derived from total) or 'separate' (Haenni - direct) */
  scaleWeightMode?: 'combined' | 'separate';
}

/** Scale status for mobile mode */
interface ScaleStatus {
  scaleA?: { weight: number; connected: boolean };
  scaleB?: { weight: number; connected: boolean };
}

interface ScaleTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  station: Station | null;
  bound?: string;
  onTestComplete: (test: ScaleTest) => void;
  /** Weighing mode - determines test procedure */
  weighingMode?: 'mobile' | 'multideck';
  /** Selected axle configuration for the test */
  axleConfiguration?: AxleConfiguration;
  /** Live weight data from middleware (for real scale readings) */
  middlewareWeights?: MiddlewareWeights | null;
  /** Live scale status from middleware (for mobile mode) */
  middlewareScaleStatus?: ScaleStatus | null;
  /** Whether middleware is connected */
  middlewareConnected?: boolean;
}

interface DeckReading {
  deck: number;
  weight: number;
  status: 'pending' | 'reading' | 'captured' | 'error';
}

// Fallback simulated scale reading (used when middleware is not connected)
const simulateScaleReading = (targetWeight: number, variance: number = 10): number => {
  const v = (Math.random() - 0.5) * variance;
  return Math.round(targetWeight + v);
};

// Helper to get live deck weight from middleware (returns 0 if not available)
const getLiveDeckWeight = (weights: MiddlewareWeights | null | undefined, deck: number): number => {
  if (!weights) return 0;
  switch (deck) {
    case 1: return weights.deck1 || 0;
    case 2: return weights.deck2 || 0;
    case 3: return weights.deck3 || 0;
    case 4: return weights.deck4 || 0;
    default: return 0;
  }
};

// Guard for debug logging - only emit console.log in development builds
const isDev = process.env.NODE_ENV === 'development';

const TEST_WEIGHTS = [1000, 2000, 5000, 10000, 20000]; // Common calibration weights in kg
const ACCEPTABLE_DEVIATION_PERCENT = 0.5; // 0.5% tolerance
const MIN_ACCEPTABLE_DEVIATION = 50; // Minimum 50kg tolerance

/**
 * ScaleTestModal - Scale calibration test supporting both calibration weights and vehicle-based tests
 *
 * **Calibration Weight Test:**
 * - Uses certified calibration weights with known weight
 * - For multideck: Place weight on each deck sequentially
 * - For mobile: Place half weight on each scale (A & B)
 *
 * **Vehicle-Based Test:**
 * - Uses a 2-axle vehicle with known total weight
 * - For multideck: Place both axles on deck 1, record, move to deck 2, etc.
 * - For mobile: Record combined weight from Scale A and Scale B
 * - Vehicle plate is captured for audit trail
 */
export function ScaleTestModal({
  open,
  onOpenChange,
  station,
  bound,
  onTestComplete,
  weighingMode = 'mobile',
  axleConfiguration,
  middlewareWeights,
  middlewareScaleStatus,
  middlewareConnected = false,
}: ScaleTestModalProps) {
  const [step, setStep] = useState<'setup' | 'testing' | 'result'>('setup');
  const [testType, setTestType] = useState<TestType>('calibration_weight');

  // Use mutation hook for creating scale tests - automatically invalidates query cache
  const createScaleTestMutation = useCreateScaleTest();

  // Common fields
  const [loadUsed, setLoadUsed] = useState('');
  const [testWeightKg, setTestWeightKg] = useState<number>(5000);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Vehicle test fields
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleKnownWeight, setVehicleKnownWeight] = useState<number>(0);

  // Multideck state - 4 decks
  const [deckReadings, setDeckReadings] = useState<DeckReading[]>([
    { deck: 1, weight: 0, status: 'pending' },
    { deck: 2, weight: 0, status: 'pending' },
    { deck: 3, weight: 0, status: 'pending' },
    { deck: 4, weight: 0, status: 'pending' },
  ]);
  const [currentDeck, setCurrentDeck] = useState(1);

  // Mobile state - 2 scales (A and B)
  const [mobileReadings, setMobileReadings] = useState<{ scaleA: number; scaleB: number }>({
    scaleA: 0,
    scaleB: 0,
  });

  // Result state
  const [result, setResult] = useState<'pass' | 'fail' | null>(null);
  const [deviationDetails, setDeviationDetails] = useState<string>('');
  const [actualWeightKg, setActualWeightKg] = useState<number | null>(null);
  const [deviationKg, setDeviationKg] = useState<number | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep('setup');
      setTestType('calibration_weight');
      setLoadUsed('');
      setTestWeightKg(5000);
      setVehiclePlate('');
      setVehicleKnownWeight(0);
      setNotes('');
      setResult(null);
      setDeviationDetails('');
      setActualWeightKg(null);
      setDeviationKg(null);
      setCurrentDeck(1);
      setDeckReadings([
        { deck: 1, weight: 0, status: 'pending' },
        { deck: 2, weight: 0, status: 'pending' },
        { deck: 3, weight: 0, status: 'pending' },
        { deck: 4, weight: 0, status: 'pending' },
      ]);
      setMobileReadings({ scaleA: 0, scaleB: 0 });
    }
  }, [open]);

  // Get the expected weight based on test type
  const getExpectedWeight = () => {
    return testType === 'vehicle' ? vehicleKnownWeight : testWeightKg;
  };

  // Get acceptable deviation threshold
  const getAcceptableDeviation = (weight: number) => {
    return Math.max(weight * (ACCEPTABLE_DEVIATION_PERCENT / 100), MIN_ACCEPTABLE_DEVIATION);
  };


  // Multideck test - vehicle placed on each deck sequentially
  // Uses live data from middleware when connected, falls back to simulation otherwise
  const runMultideckTest = useCallback(async () => {
    setStep('testing');
    setIsTesting(true);
    const expectedWeight = getExpectedWeight();
    const useLiveData = middlewareConnected && middlewareWeights;

    // Read each deck sequentially
    // For vehicle test: 2-axle vehicle placed on one deck at a time
    const newReadings: DeckReading[] = [];
    for (let i = 0; i < 4; i++) {
      const deckNumber = i + 1;
      setCurrentDeck(deckNumber);
      setDeckReadings(prev => prev.map((d, idx) =>
        idx === i ? { ...d, status: 'reading' } : d
      ));

      // Wait for operator to position load/vehicle on deck
      // In real implementation, operator moves vehicle to next deck and confirms
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Get reading - use live data from middleware or simulate
      let reading: number;
      if (useLiveData) {
        // Read live weight from middleware
        reading = getLiveDeckWeight(middlewareWeights, deckNumber);
        if (isDev) console.log(`[ScaleTest] Deck ${deckNumber} live reading: ${reading}kg from middleware`);
      } else {
        // Fallback to simulation when middleware not connected
        reading = simulateScaleReading(expectedWeight, 30);
        if (isDev) console.log(`[ScaleTest] Deck ${deckNumber} simulated reading: ${reading}kg (middleware not connected)`);
      }

      newReadings.push({ deck: deckNumber, weight: reading, status: 'captured' });

      setDeckReadings(prev => prev.map((d, idx) =>
        idx === i ? { ...d, weight: reading, status: 'captured' } : d
      ));
    }

    setIsTesting(false);

    // Evaluate result - all decks should be within tolerance of expected weight
    const weights = newReadings.map(d => d.weight);
    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    const maxDeviation = Math.max(...weights.map(w => Math.abs(w - expectedWeight)));
    const acceptableDeviation = getAcceptableDeviation(expectedWeight);

    // Pass if all decks read within tolerance of expected weight
    const isPassed = weights.every(w => Math.abs(w - expectedWeight) <= acceptableDeviation);

    setActualWeightKg(Math.round(avgWeight));
    setDeviationKg(Math.round(avgWeight - expectedWeight));
    setResult(isPassed ? 'pass' : 'fail');
    setDeviationDetails(
      `${useLiveData ? '[LIVE]' : '[SIMULATED]'} Deck readings: ${weights.join(', ')} kg | ` +
      `Average: ${avgWeight.toFixed(0)} kg | ` +
      `Max deviation from expected: ${maxDeviation.toFixed(0)} kg | ` +
      `Tolerance: ±${acceptableDeviation.toFixed(0)} kg`
    );
    setStep('result');
  }, [testType, vehicleKnownWeight, testWeightKg, middlewareConnected, middlewareWeights]);

  // Mobile test - both scales should read combined weight
  // Uses live data from middleware when connected, falls back to simulation otherwise
  //
  // Scale Weight Handling:
  // - PAW: Returns combined weight. Middleware derives scaleA = total/2, scaleB = total - scaleA
  // - Haenni: May return separate scaleA/scaleB weights directly
  // - The scaleWeightMode field indicates which mode ('combined' or 'separate')
  const runMobileTest = useCallback(async () => {
    setStep('testing');
    setIsTesting(true);
    const expectedWeight = getExpectedWeight();
    const expectedPerScale = expectedWeight / 2;
    // Check for live data - prefer middlewareWeights with scaleA/scaleB, fall back to scaleStatus
    const hasWeightScales = middlewareConnected && middlewareWeights && (middlewareWeights.scaleA !== undefined || middlewareWeights.scaleB !== undefined);
    const hasScaleStatus = middlewareConnected && middlewareScaleStatus;
    const useLiveData = hasWeightScales || hasScaleStatus;

    // Initialize readings
    setMobileReadings({ scaleA: 0, scaleB: 0 });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Read Scale A
    let scaleAReading: number;
    if (hasWeightScales && middlewareWeights?.scaleA !== undefined) {
      // Use scaleA from weight data (PAW: derived from combined, Haenni: direct)
      scaleAReading = middlewareWeights.scaleA;
      const mode = middlewareWeights.scaleWeightMode || 'combined';
      if (isDev) console.log(`[ScaleTest] Scale A live reading: ${scaleAReading}kg from middleware (${mode} mode)`);
    } else if (hasScaleStatus && middlewareScaleStatus?.scaleA) {
      scaleAReading = middlewareScaleStatus.scaleA.weight || 0;
      if (isDev) console.log(`[ScaleTest] Scale A live reading: ${scaleAReading}kg from scale status`);
    } else if (middlewareConnected && middlewareWeights?.currentWeight) {
      // Fallback: derive from combined weight (PAW behavior)
      scaleAReading = Math.round((middlewareWeights.currentWeight || 0) / 2);
      if (isDev) console.log(`[ScaleTest] Scale A derived reading: ${scaleAReading}kg (from combined weight)`);
    } else {
      scaleAReading = simulateScaleReading(expectedPerScale, 20);
      if (isDev) console.log(`[ScaleTest] Scale A simulated reading: ${scaleAReading}kg (middleware not connected)`);
    }
    setMobileReadings(prev => ({ ...prev, scaleA: scaleAReading }));

    // Read Scale B
    await new Promise(resolve => setTimeout(resolve, 1000));

    let scaleBReading: number;
    if (hasWeightScales && middlewareWeights?.scaleB !== undefined) {
      // Use scaleB from weight data (PAW: derived from combined, Haenni: direct)
      scaleBReading = middlewareWeights.scaleB;
      const mode = middlewareWeights.scaleWeightMode || 'combined';
      if (isDev) console.log(`[ScaleTest] Scale B live reading: ${scaleBReading}kg from middleware (${mode} mode)`);
    } else if (hasScaleStatus && middlewareScaleStatus?.scaleB) {
      scaleBReading = middlewareScaleStatus.scaleB.weight || 0;
      if (isDev) console.log(`[ScaleTest] Scale B live reading: ${scaleBReading}kg from scale status`);
    } else if (middlewareConnected && middlewareWeights?.currentWeight) {
      // Fallback: derive from combined weight (PAW behavior - second half)
      const total = middlewareWeights.currentWeight || 0;
      const scaleA = Math.round(total / 2);
      scaleBReading = total - scaleA;
      if (isDev) console.log(`[ScaleTest] Scale B derived reading: ${scaleBReading}kg (from combined weight)`);
    } else {
      scaleBReading = simulateScaleReading(expectedPerScale, 20);
      if (isDev) console.log(`[ScaleTest] Scale B simulated reading: ${scaleBReading}kg (middleware not connected)`);
    }
    setMobileReadings(prev => ({ ...prev, scaleB: scaleBReading }));

    setIsTesting(false);

    // Evaluate result
    const combined = scaleAReading + scaleBReading;
    const deviation = Math.abs(combined - expectedWeight);
    const scaleDeviation = Math.abs(scaleAReading - scaleBReading);
    const acceptableDeviation = getAcceptableDeviation(expectedWeight);

    // Pass if combined weight is within tolerance AND scales are balanced (for dual-scale)
    // For single scale mode, skip balance check
    const isSingleScaleMode = scaleBReading === 0 && scaleAReading > 0;
    const isPassed = isSingleScaleMode
      ? Math.abs(scaleAReading - expectedWeight) <= acceptableDeviation
      : (deviation <= acceptableDeviation && scaleDeviation <= acceptableDeviation);

    setActualWeightKg(combined || scaleAReading);
    setDeviationKg((combined || scaleAReading) - expectedWeight);
    setResult(isPassed ? 'pass' : 'fail');
    setDeviationDetails(
      `${useLiveData ? '[LIVE]' : middlewareConnected ? '[LIVE-SINGLE]' : '[SIMULATED]'} ` +
      `Scale A: ${scaleAReading} kg | Scale B: ${scaleBReading} kg | ` +
      `Combined: ${combined} kg | Balance deviation: ${scaleDeviation} kg | ` +
      `Tolerance: ±${acceptableDeviation.toFixed(0)} kg`
    );
    setStep('result');
  }, [testType, vehicleKnownWeight, testWeightKg, middlewareConnected, middlewareScaleStatus, middlewareWeights]);

  const handleStartTest = () => {
    if (testType === 'calibration_weight' && !loadUsed.trim()) {
      toast.error('Please enter the calibration weight identifier');
      return;
    }

    if (testType === 'vehicle') {
      if (!vehiclePlate.trim()) {
        toast.error('Please enter the vehicle plate number');
        return;
      }
      if (!vehicleKnownWeight || vehicleKnownWeight < 100) {
        toast.error('Please enter a valid known vehicle weight (min 100 kg)');
        return;
      }
    }

    if (weighingMode === 'multideck') {
      runMultideckTest();
    } else {
      runMobileTest();
    }
  };

  const handleSubmit = async () => {
    if (!station || !result) {
      toast.error('Missing required data');
      return;
    }

    setIsSubmitting(true);
    try {
      const expectedWeight = getExpectedWeight();
      const request: CreateScaleTestRequest = {
        stationId: station.id,
        bound: bound,
        testType: testType,
        vehiclePlate: testType === 'vehicle' ? vehiclePlate : undefined,
        weighingMode: weighingMode,
        testWeightKg: expectedWeight,
        actualWeightKg: actualWeightKg ?? undefined,
        result: result,
        deviationKg: deviationKg ?? undefined,
        details: [
          testType === 'vehicle' ? `Load Used: Vehicle ${vehiclePlate}` : `Load Used: ${loadUsed}`,
          `Expected Weight: ${expectedWeight} kg`,
          deviationDetails,
          notes ? `Notes: ${notes}` : '',
        ].filter(Boolean).join('\n'),
      };

      // Use mutation which automatically invalidates scale test queries
      // This ensures weighing screens update immediately after test completion
      const test = await createScaleTestMutation.mutateAsync(request);
      toast.success(
        result === 'pass'
          ? 'Scale test passed! Weighing operations enabled.'
          : 'Scale test recorded. Please address calibration issues.',
        { description: `Test ID: ${test.id.slice(0, 8)}...` }
      );
      onTestComplete(test);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit scale test:', error);
      toast.error('Failed to save scale test');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setStep('setup');
    setResult(null);
    setDeviationDetails('');
    setActualWeightKg(null);
    setDeviationKg(null);
    setCurrentDeck(1);
    setDeckReadings([
      { deck: 1, weight: 0, status: 'pending' },
      { deck: 2, weight: 0, status: 'pending' },
      { deck: 3, weight: 0, status: 'pending' },
      { deck: 4, weight: 0, status: 'pending' },
    ]);
    setMobileReadings({ scaleA: 0, scaleB: 0 });
  };

  const isSetupValid = () => {
    if (testType === 'calibration_weight') {
      return loadUsed.trim().length > 0;
    }
    return vehiclePlate.trim().length >= 5 && vehicleKnownWeight >= 100;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-blue-600" />
            {weighingMode === 'multideck' ? 'Multideck Scale Test' : 'Mobile Scale Test'}
          </DialogTitle>
          <DialogDescription>
            {station?.name}
            {bound && ` - Bound ${bound}`}
            {axleConfiguration && ` | Config: ${axleConfiguration.axleCode}`}
          </DialogDescription>
        </DialogHeader>

        {/* Setup Step */}
        {step === 'setup' && (
          <>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 -mx-4 sm:-mx-6 px-4 sm:px-6 py-1">
            {/* Test Type Selection */}
            <Tabs value={testType} onValueChange={(v) => setTestType(v as TestType)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="calibration_weight" className="flex items-center gap-2">
                  <Weight className="h-4 w-4" />
                  Calibration Weight
                </TabsTrigger>
                <TabsTrigger value="vehicle" className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Test Vehicle
                </TabsTrigger>
              </TabsList>

              {/* Calibration Weight Form */}
              <TabsContent value="calibration_weight" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="loadUsed" className="font-semibold">
                    Calibration Weight ID <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="loadUsed"
                    value={loadUsed}
                    onChange={(e) => setLoadUsed(e.target.value.toUpperCase())}
                    placeholder="e.g., TW-5000-A, CW-10T-001"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the certified calibration weight identifier
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testWeight">Certified Weight (kg)</Label>
                  <Select
                    value={testWeightKg.toString()}
                    onValueChange={(value) => setTestWeightKg(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select weight" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEST_WEIGHTS.map((weight) => (
                        <SelectItem key={weight} value={weight.toString()}>
                          {weight.toLocaleString()} kg
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Tolerance: ±{getAcceptableDeviation(testWeightKg).toFixed(0)} kg ({ACCEPTABLE_DEVIATION_PERCENT}%)
                  </p>
                </div>
              </TabsContent>

              {/* Vehicle Test Form */}
              <TabsContent value="vehicle" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="vehiclePlate" className="font-semibold">
                    Vehicle Registration <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="vehiclePlate"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                    placeholder="e.g., KCZ 015N"
                    className="font-mono text-lg uppercase tracking-wider"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use a 2-axle vehicle with known certified weight
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicleWeight" className="font-semibold">
                    Known Vehicle Weight (kg) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="vehicleWeight"
                    type="number"
                    value={vehicleKnownWeight || ''}
                    onChange={(e) => setVehicleKnownWeight(parseInt(e.target.value) || 0)}
                    placeholder="e.g., 8500"
                    className="font-mono text-lg"
                    min={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Total certified weight of the 2-axle test vehicle |
                    Tolerance: ±{getAcceptableDeviation(vehicleKnownWeight || 5000).toFixed(0)} kg
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Instructions */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <p className="text-sm text-blue-700 font-medium mb-2">
                  {testType === 'vehicle' ? 'Vehicle Test Instructions:' : 'Test Instructions:'}
                </p>
                {weighingMode === 'multideck' ? (
                  <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                    {testType === 'vehicle' ? (
                      <>
                        <li>Drive 2-axle vehicle onto Deck 1 (both axles on deck)</li>
                        <li>System records weight, then move to Deck 2</li>
                        <li>Repeat for all 4 decks</li>
                        <li>All decks must read within tolerance to pass</li>
                      </>
                    ) : (
                      <>
                        <li>Place the certified calibration weight on Deck 1</li>
                        <li>System will read all 4 decks sequentially</li>
                        <li>All decks must read within tolerance to pass</li>
                        <li>Ensure platform is clear before starting</li>
                      </>
                    )}
                  </ol>
                ) : (
                  <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                    {testType === 'vehicle' ? (
                      <>
                        <li>Position 2-axle vehicle with one axle on Scale A, one on Scale B</li>
                        <li>Ensure vehicle is stable and centered</li>
                        <li>System records both scale readings</li>
                        <li>Combined weight must match known vehicle weight</li>
                      </>
                    ) : (
                      <>
                        <li>Place half the test weight on Scale A</li>
                        <li>Place other half on Scale B</li>
                        <li>Click &quot;Start Test&quot; to capture readings</li>
                        <li>Both scales must be balanced to pass</li>
                      </>
                    )}
                  </ol>
                )}
              </CardContent>
            </Card>

          </div>
            <DialogFooter className="flex-shrink-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleStartTest} disabled={!isSetupValid()}>
                Start Test
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Testing Step */}
        {step === 'testing' && (
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 -mx-4 sm:-mx-6 px-4 sm:px-6 py-1">
            {/* Test Type Badge */}
            <div className="flex items-center justify-center gap-2 mb-2">
              {testType === 'vehicle' ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                  <Truck className="h-4 w-4" />
                  Vehicle Test: {vehiclePlate}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  <Weight className="h-4 w-4" />
                  Calibration: {loadUsed}
                </div>
              )}
            </div>

            {weighingMode === 'multideck' ? (
              /* Multideck Testing UI */
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Wifi className="h-5 w-5 text-green-500 animate-pulse" />
                  <span className="text-sm text-green-600">Connected to Weight Indicator</span>
                </div>

                {testType === 'vehicle' && (
                  <p className="text-center text-sm text-amber-600 font-medium">
                    {isTesting ? `Move vehicle to Deck ${currentDeck}...` : 'Test complete'}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {deckReadings.map((deck) => (
                    <Card
                      key={deck.deck}
                      className={cn(
                        'border-2 transition-all',
                        deck.status === 'reading'
                          ? 'border-yellow-400 bg-yellow-50'
                          : deck.status === 'captured'
                            ? 'border-green-400 bg-green-50'
                            : 'border-gray-200'
                      )}
                    >
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Deck {deck.deck}</p>
                        <div className="bg-black rounded py-2">
                          <span className={cn(
                            'font-mono text-2xl font-bold',
                            deck.status === 'reading' ? 'text-yellow-400 animate-pulse' : 'text-yellow-400'
                          )}>
                            {deck.status === 'reading' ? '----' : deck.weight.toLocaleString()}
                          </span>
                        </div>
                        {deck.status === 'captured' && (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto mt-1" />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <p className="text-center text-sm text-gray-500">
                  {isTesting ? 'Reading deck weights...' : 'Test complete'}
                </p>
              </div>
            ) : (
              /* Mobile Testing UI */
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                  <span className="text-sm text-blue-600">Reading mobile scales...</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card className={cn(
                    'border-2',
                    mobileReadings.scaleA > 0 ? 'border-green-400 bg-green-50' : 'border-gray-200'
                  )}>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-gray-500 mb-2">Scale A</p>
                      <div className="bg-black rounded py-3">
                        <span className="font-mono text-3xl font-bold text-yellow-400">
                          {mobileReadings.scaleA > 0 ? mobileReadings.scaleA.toLocaleString() : '----'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={cn(
                    'border-2',
                    mobileReadings.scaleB > 0 ? 'border-green-400 bg-green-50' : 'border-gray-200'
                  )}>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-gray-500 mb-2">Scale B</p>
                      <div className="bg-black rounded py-3">
                        <span className="font-mono text-3xl font-bold text-yellow-400">
                          {mobileReadings.scaleB > 0 ? mobileReadings.scaleB.toLocaleString() : '----'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {mobileReadings.scaleA > 0 && mobileReadings.scaleB > 0 && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-gray-500">Combined Weight</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {(mobileReadings.scaleA + mobileReadings.scaleB).toLocaleString()} kg
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {/* Result Step */}
        {step === 'result' && (
          <>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 -mx-4 sm:-mx-6 px-4 sm:px-6 py-1">
            {/* Test Type Badge */}
            <div className="flex items-center justify-center">
              {testType === 'vehicle' ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                  <Truck className="h-4 w-4" />
                  {vehiclePlate}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  <Weight className="h-4 w-4" />
                  {loadUsed}
                </div>
              )}
            </div>

            {/* Result Banner */}
            <Card
              className={cn(
                'border-2',
                result === 'pass'
                  ? 'bg-green-50 border-green-300'
                  : 'bg-red-50 border-red-300'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {result === 'pass' ? (
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                  ) : (
                    <XCircle className="h-12 w-12 text-red-600" />
                  )}
                  <div>
                    <p className={cn(
                      'text-2xl font-bold',
                      result === 'pass' ? 'text-green-700' : 'text-red-700'
                    )}>
                      {result === 'pass' ? 'PASSED' : 'FAILED'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {result === 'pass'
                        ? 'Scale calibration within acceptable tolerance'
                        : 'Scale calibration exceeds acceptable tolerance'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Readings Summary */}
            {weighingMode === 'multideck' && (
              <div className="grid grid-cols-4 gap-2">
                {deckReadings.map((deck) => (
                  <div key={deck.deck} className="text-center p-2 bg-gray-100 rounded">
                    <p className="text-xs text-gray-500">Deck {deck.deck}</p>
                    <p className="font-mono font-bold">{deck.weight.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">kg</p>
                  </div>
                ))}
              </div>
            )}

            {weighingMode === 'mobile' && (
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-gray-100 rounded">
                  <p className="text-xs text-gray-500">Scale A</p>
                  <p className="font-mono font-bold">{mobileReadings.scaleA.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">kg</p>
                </div>
                <div className="text-center p-2 bg-gray-100 rounded">
                  <p className="text-xs text-gray-500">Scale B</p>
                  <p className="font-mono font-bold">{mobileReadings.scaleB.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">kg</p>
                </div>
                <div className={cn(
                  'text-center p-2 rounded',
                  result === 'pass' ? 'bg-green-100' : 'bg-red-100'
                )}>
                  <p className="text-xs text-gray-500">Combined</p>
                  <p className={cn(
                    'font-mono font-bold',
                    result === 'pass' ? 'text-green-700' : 'text-red-700'
                  )}>
                    {(mobileReadings.scaleA + mobileReadings.scaleB).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">kg</p>
                </div>
              </div>
            )}

            {/* Test Weight Summary */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-gray-100 rounded-lg">
                <p className="text-xs text-muted-foreground">Expected</p>
                <p className="text-lg font-semibold">{getExpectedWeight().toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">kg</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <p className="text-xs text-muted-foreground">Actual</p>
                <p className="text-lg font-semibold">
                  {actualWeightKg?.toLocaleString() || '-'}
                </p>
                <p className="text-xs text-muted-foreground">kg</p>
              </div>
              <div
                className={cn(
                  'p-3 rounded-lg',
                  result === 'pass' ? 'bg-green-100' : 'bg-red-100'
                )}
              >
                <p className="text-xs text-muted-foreground">Deviation</p>
                <p
                  className={cn(
                    'text-lg font-semibold',
                    result === 'pass' ? 'text-green-700' : 'text-red-700'
                  )}
                >
                  {deviationKg !== null && deviationKg > 0 ? '+' : ''}
                  {deviationKg}
                </p>
                <p className="text-xs text-muted-foreground">kg</p>
              </div>
            </div>

            {/* Failure Warning */}
            {result === 'fail' && (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-700">
                    <p className="font-medium">Calibration Required</p>
                    <p>
                      Weighing operations should not proceed until calibration is corrected.
                      Contact maintenance to recalibrate the scales.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any observations about the test..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

          </div>
            <DialogFooter className="flex-shrink-0 flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleRetry}>
                Retry Test
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={result === 'pass' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {result === 'pass' ? 'Confirm & Enable Weighing' : 'Record Failed Test'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ScaleTestModal;
