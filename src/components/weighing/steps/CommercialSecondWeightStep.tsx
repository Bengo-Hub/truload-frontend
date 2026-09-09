"use client";

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CommercialNetWeightDisplay } from '@/components/weighing/CommercialNetWeightDisplay';
import { cn } from '@/lib/utils';
import { formatWeight } from '@/lib/weighing-utils';
import type { CommercialWeighingResult } from '@/types/weighing';
import { Database, RotateCcw, Scale } from 'lucide-react';

/** Options passed back to the parent when the operator captures a weight from the scale. */
export interface CaptureNextWeightOptions {
  expectedNetWeightKg?: number | null;
  /** true finalizes/bills the transaction now; false saves as a reweigh and keeps it open. */
  finalize: boolean;
  /** Required when finalize is false. */
  reweighReason?: string;
}

interface CommercialSecondWeightStepProps {
  /** Live weight reading from TruConnect middleware */
  liveWeightKg: number;
  /** Whether the middleware/scale is connected */
  isConnected: boolean;
  /** Whether the weight reading is stable */
  isStable: boolean;
  /** Current transaction result */
  result: CommercialWeighingResult | null;
  /** Stored tare weight for this vehicle */
  storedTareWeightKg?: number;
  /** Whether a capture is in progress */
  isCapturing: boolean;
  /** Callback when user captures the next weight from scale (2nd weight, or a reweigh) */
  onCaptureSecondWeight: (options: CaptureNextWeightOptions) => void;
  /** Callback when user opts to use stored tare weight (always finalizes) */
  onUseStoredTare: (overrideTareKg?: number) => void;
  className?: string;
}

/**
 * CommercialSecondWeightStep - Capture the second weight or use stored tare.
 *
 * If first weight was gross, this step captures tare (or uses stored tare).
 * If first weight was tare, this step captures gross.
 * Calculates and prominently displays net weight.
 */
export function CommercialSecondWeightStep({
  liveWeightKg,
  isConnected,
  isStable,
  result,
  storedTareWeightKg,
  isCapturing,
  onCaptureSecondWeight,
  onUseStoredTare,
  className,
}: CommercialSecondWeightStepProps) {
  const [expectedNetInput, setExpectedNetInput] = useState<string>(
    result?.expectedNetWeightKg ? String(result.expectedNetWeightKg) : ''
  );
  const [wantsReweigh, setWantsReweigh] = useState(false);
  const [reweighReason, setReweighReason] = useState('');

  // Finalized (captureStatus "captured") vs. still-open ("awaiting_reweigh") - netWeightKg/
  // secondWeightKg are populated in BOTH states now (live tolerance feedback during a reweigh
  // cycle), so only captureStatus tells us whether the transaction actually closed.
  const isFinalized = result?.captureStatus === 'captured';
  const isAwaitingReweigh = result?.captureStatus === 'awaiting_reweigh';
  const isAlreadyCaptured = isFinalized || isAwaitingReweigh;
  const nextReweighNo = (result?.captureEvents?.length ?? 0) - 1; // events beyond seq 1-2 are reweighs
  const firstWeightType = result?.firstWeightType;
  const secondWeightType = firstWeightType === 'gross' ? 'tare' : 'gross';
  const canUseStoredTare = firstWeightType === 'gross' && storedTareWeightKg != null && storedTareWeightKg > 0;

  const getWeightColor = () => {
    if (!isConnected) return 'text-red-400';
    if (!isStable) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Net weight display (always visible once we have data) */}
      {result && (
        <CommercialNetWeightDisplay
          tareWeightKg={result.tareWeightKg ?? undefined}
          grossWeightKg={result.grossWeightKg ?? undefined}
          netWeightKg={result.netWeightKg ?? undefined}
          qualityDeductionKg={result.qualityDeductionKg ?? undefined}
          adjustedNetWeightKg={result.adjustedNetWeightKg ?? undefined}
        />
      )}

      {/* Already captured */}
      {isAlreadyCaptured ? (
        <Card className={cn(isAwaitingReweigh ? 'border-amber-300 bg-amber-50' : 'border-green-200 bg-green-50')}>
          <CardContent className="p-4 text-center">
            <div className={cn('font-medium mb-1', isAwaitingReweigh ? 'text-amber-700' : 'text-green-700')}>
              {isAwaitingReweigh
                ? 'Weight saved for reweigh — transaction stays open, no invoice yet'
                : 'Second weight captured - Net weight calculated'}
            </div>
            {isAwaitingReweigh && (
              <p className="text-xs text-amber-700 mb-2">
                The vehicle can go adjust cargo and return for another reading under this same
                transaction — find it again by plate or on the Active Weighings board.
              </p>
            )}
            <div className="flex items-center justify-center gap-6 mt-2">
              <div>
                <div className="text-xs text-gray-500 uppercase">Tare</div>
                <div className="text-lg font-mono font-bold text-gray-800">
                  {formatWeight(result!.tareWeightKg ?? 0)} kg
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase">Gross</div>
                <div className="text-lg font-mono font-bold text-gray-800">
                  {formatWeight(result!.grossWeightKg ?? 0)} kg
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase">Net</div>
                <div className="text-2xl font-mono font-bold text-green-700">
                  {formatWeight(result!.netWeightKg ?? 0)} kg
                </div>
              </div>
            </div>
            {result!.tareSource && result!.tareSource !== 'measured' && (
              <div className="text-sm text-blue-600 mt-2">
                Tare source: <span className="font-medium">{result!.tareSource}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Live capture UI: shown whenever the transaction isn't finalized yet - covers both the
          first-ever capture AND every subsequent reweigh (the amber summary above shows what was
          just saved; this stays ready for the vehicle's next reading, whether that's seconds later
          or after it leaves and comes back). */}
      {!isFinalized && (
        <>
          {/* Live weight display */}
          <Card className="bg-gray-900 text-white rounded-xl">
            <CardHeader className="pb-2 pt-4 px-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400 tracking-wider">SCALE READING</span>
                <Badge
                  variant="outline"
                  className={cn(
                    'font-medium',
                    isConnected
                      ? isStable ? 'border-green-500 text-green-400' : 'border-yellow-500 text-yellow-400'
                      : 'border-red-500 text-red-400'
                  )}
                >
                  {isConnected ? (isStable ? 'STABLE' : 'READING...') : 'OFFLINE'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="py-8 px-6">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-2 tracking-widest">
                  {isAwaitingReweigh ? `REWEIGH #${nextReweighNo}` : 'SECOND WEIGHT'} ({secondWeightType.toUpperCase()})
                </div>
                <div className={cn('font-mono text-6xl sm:text-7xl font-bold tracking-tight', getWeightColor())}>
                  {formatWeight(liveWeightKg)}
                </div>
                <div className="text-sm text-gray-400 mt-2 tracking-wider">kg</div>
              </div>
            </CardContent>
          </Card>

          {/* Capture options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Capture {isAwaitingReweigh ? `Reweigh #${nextReweighNo} — ` : ''}{secondWeightType === 'tare' ? 'Tare' : 'Gross'} Weight
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">
                {secondWeightType === 'tare'
                  ? 'Weigh the empty vehicle to determine tare weight, or use a stored tare value.'
                  : 'Weigh the loaded vehicle to determine gross weight.'}
              </p>

              {/* Expected net weight (optional) */}
              <div className="space-y-1 mb-4">
                <Label htmlFor="expected-net" className="text-sm text-gray-600">
                  Expected net weight (kg) <span className="text-gray-400 font-normal">— optional</span>
                </Label>
                <Input
                  id="expected-net"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="e.g. 12000"
                  value={expectedNetInput}
                  onChange={(e) => setExpectedNetInput(e.target.value)}
                  className="max-w-[200px]"
                  disabled={isCapturing}
                />
                <p className="text-xs text-gray-400">
                  From dispatch order. Used for discrepancy &amp; tolerance check.
                </p>
              </div>

              {/* Finalize now vs. save & send back for another reweigh */}
              <div className="rounded-md border border-gray-200 p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWantsReweigh(false)}
                    disabled={isCapturing}
                    className={cn(
                      'rounded-md border px-3 py-2 text-sm font-medium text-left transition-colors',
                      !wantsReweigh ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    )}
                  >
                    Finalize now — bill &amp; print ticket
                  </button>
                  <button
                    type="button"
                    onClick={() => setWantsReweigh(true)}
                    disabled={isCapturing}
                    className={cn(
                      'rounded-md border px-3 py-2 text-sm font-medium text-left transition-colors',
                      wantsReweigh ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    )}
                  >
                    Save &amp; send back for reweigh
                  </button>
                </div>
                {wantsReweigh && (
                  <div className="space-y-1 pt-1">
                    <Label htmlFor="reweigh-reason" className="text-sm text-gray-600">
                      Reason <span className="text-gray-400 font-normal">— required</span>
                    </Label>
                    <Textarea
                      id="reweigh-reason"
                      value={reweighReason}
                      onChange={(e) => setReweighReason(e.target.value)}
                      placeholder="e.g. Over target — vehicle offloading part of the load"
                      className="text-sm"
                      rows={2}
                      disabled={isCapturing}
                    />
                  </div>
                )}
              </div>

              <div className={cn('grid gap-3', canUseStoredTare && !wantsReweigh ? 'grid-cols-2' : 'grid-cols-1')}>
                {/* Capture from scale */}
                <Button
                  size="lg"
                  className={cn(
                    'h-16 flex-col gap-1',
                    wantsReweigh
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : secondWeightType === 'tare' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'
                  )}
                  disabled={isCapturing || liveWeightKg <= 0 || !isConnected || (wantsReweigh && !reweighReason.trim())}
                  onClick={() => {
                    const parsed = expectedNetInput ? parseInt(expectedNetInput, 10) : null;
                    onCaptureSecondWeight({
                      expectedNetWeightKg: parsed && !isNaN(parsed) ? parsed : null,
                      finalize: !wantsReweigh,
                      reweighReason: wantsReweigh ? reweighReason.trim() : undefined,
                    });
                    setWantsReweigh(false);
                    setReweighReason('');
                  }}
                >
                  {wantsReweigh ? <RotateCcw className="h-5 w-5" /> : <Scale className="h-5 w-5" />}
                  <span className="text-sm font-semibold">
                    {wantsReweigh ? 'Save Reweigh' : 'Capture from Scale'}
                  </span>
                </Button>

                {/* Use stored tare - always finalizes, so hidden while "save & reweigh" is selected */}
                {canUseStoredTare && !wantsReweigh && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-16 flex-col gap-1 border-2 hover:border-blue-500 hover:bg-blue-50"
                    disabled={isCapturing}
                    onClick={() => onUseStoredTare()}
                  >
                    <Database className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-semibold">
                      Use Stored Tare ({formatWeight(storedTareWeightKg!)} kg)
                    </span>
                  </Button>
                )}
              </div>

              {liveWeightKg <= 0 && isConnected && (
                <p className="text-sm text-yellow-600 text-center mt-2">
                  Waiting for weight on scale...
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
