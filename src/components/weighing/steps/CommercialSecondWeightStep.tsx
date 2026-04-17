"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CommercialNetWeightDisplay } from '@/components/weighing/CommercialNetWeightDisplay';
import { cn } from '@/lib/utils';
import { formatWeight } from '@/lib/weighing-utils';
import type { CommercialWeighingResult } from '@/types/weighing';
import { Database, Scale } from 'lucide-react';

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
  /** Callback when user captures the second weight from scale */
  onCaptureSecondWeight: () => void;
  /** Callback when user opts to use stored tare weight */
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
  const isAlreadyCaptured = result?.secondWeightKg != null || result?.netWeightKg != null;
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
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <div className="text-green-700 font-medium mb-1">Second weight captured - Net weight calculated</div>
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
      ) : (
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
                  SECOND WEIGHT ({secondWeightType.toUpperCase()})
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
                Capture {secondWeightType === 'tare' ? 'Tare' : 'Gross'} Weight
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">
                {secondWeightType === 'tare'
                  ? 'Weigh the empty vehicle to determine tare weight, or use a stored tare value.'
                  : 'Weigh the loaded vehicle to determine gross weight.'}
              </p>

              <div className={cn('grid gap-3', canUseStoredTare ? 'grid-cols-2' : 'grid-cols-1')}>
                {/* Capture from scale */}
                <Button
                  size="lg"
                  className={cn(
                    'h-16 flex-col gap-1',
                    secondWeightType === 'tare'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  )}
                  disabled={isCapturing || liveWeightKg <= 0 || !isConnected}
                  onClick={onCaptureSecondWeight}
                >
                  <Scale className="h-5 w-5" />
                  <span className="text-sm font-semibold">
                    Capture from Scale
                  </span>
                </Button>

                {/* Use stored tare */}
                {canUseStoredTare && (
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
