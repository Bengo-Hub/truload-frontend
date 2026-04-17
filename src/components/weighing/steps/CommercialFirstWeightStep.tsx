"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatWeight } from '@/lib/weighing-utils';
import type { CommercialWeighingResult } from '@/types/weighing';
import { Scale, Weight } from 'lucide-react';

interface CommercialFirstWeightStepProps {
  /** Live weight reading from TruConnect middleware */
  liveWeightKg: number;
  /** Whether the middleware/scale is connected */
  isConnected: boolean;
  /** Whether the weight reading is stable */
  isStable: boolean;
  /** Current transaction result (to check if first weight already captured) */
  result: CommercialWeighingResult | null;
  /** Stored tare weight for this vehicle (from history) */
  storedTareWeightKg?: number;
  /** Whether a capture is in progress */
  isCapturing: boolean;
  /** Callback when user selects weight type and captures */
  onCapture: (weightType: 'tare' | 'gross') => void;
  className?: string;
}

/**
 * CommercialFirstWeightStep - Capture the first weight on the scale.
 *
 * The operator chooses whether this is a Tare or Gross weight,
 * then captures the live scale reading.
 */
export function CommercialFirstWeightStep({
  liveWeightKg,
  isConnected,
  isStable,
  result,
  storedTareWeightKg,
  isCapturing,
  onCapture,
  className,
}: CommercialFirstWeightStepProps) {
  const isAlreadyCaptured = result?.firstWeightKg != null;

  const getWeightColor = () => {
    if (!isConnected) return 'text-red-400';
    if (!isStable) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className={cn('space-y-4', className)}>
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
            <div className="text-xs text-gray-500 mb-2 tracking-widest">FIRST WEIGHT</div>
            <div className={cn('font-mono text-6xl sm:text-7xl font-bold tracking-tight', getWeightColor())}>
              {formatWeight(liveWeightKg)}
            </div>
            <div className="text-sm text-gray-400 mt-2 tracking-wider">kg</div>
          </div>
        </CardContent>
      </Card>

      {/* Stored tare info */}
      {storedTareWeightKg != null && storedTareWeightKg > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <Weight className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="text-blue-800">
              This vehicle has a stored tare weight of{' '}
              <span className="font-bold font-mono">{formatWeight(storedTareWeightKg)} kg</span>.
              You can use it in the next step instead of re-weighing.
            </span>
          </CardContent>
        </Card>
      )}

      {/* Already captured state */}
      {isAlreadyCaptured ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <div className="text-green-700 font-medium mb-1">First weight captured</div>
            <div className="text-2xl font-mono font-bold text-green-800">
              {formatWeight(result!.firstWeightKg!)} kg
            </div>
            <div className="text-sm text-green-600 mt-1">
              Type: <span className="font-medium capitalize">{result!.firstWeightType}</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Weight type selector and capture buttons */
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Weight Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-500 mb-4">
              Choose whether this first weight is the vehicle&apos;s tare (empty) weight or gross (loaded) weight.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                variant="outline"
                className="h-20 flex-col gap-1 border-2 hover:border-blue-500 hover:bg-blue-50"
                disabled={isCapturing || liveWeightKg <= 0 || !isConnected}
                onClick={() => onCapture('tare')}
              >
                <Scale className="h-6 w-6 text-blue-600" />
                <span className="text-base font-semibold">Tare Weight</span>
                <span className="text-xs text-gray-500">Empty vehicle</span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-20 flex-col gap-1 border-2 hover:border-amber-500 hover:bg-amber-50"
                disabled={isCapturing || liveWeightKg <= 0 || !isConnected}
                onClick={() => onCapture('gross')}
              >
                <Scale className="h-6 w-6 text-amber-600" />
                <span className="text-base font-semibold">Gross Weight</span>
                <span className="text-xs text-gray-500">Loaded vehicle</span>
              </Button>
            </div>
            {liveWeightKg <= 0 && isConnected && (
              <p className="text-sm text-yellow-600 text-center mt-2">
                Waiting for weight on scale...
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
