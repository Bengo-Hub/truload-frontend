"use client";

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DeckWeight, ScaleStatus } from '@/types/weighing';
import { cn } from '@/lib/utils';
import { formatWeight } from '@/lib/weighing-utils';

// ============================================================================
// Mobile Weight Display - Single Axle
// ============================================================================

interface MobileWeightDisplayProps {
  currentWeight: number;
  currentAxle: number;
  totalAxles: number;
  scaleStatus: ScaleStatus;
  isStable?: boolean;
  className?: string;
}

/**
 * MobileWeightDisplay - Digital LCD display for mobile/axle-by-axle weighing
 *
 * Features:
 * - Large digital font display (mimics KenloadV2 LCD aesthetic)
 * - Current axle indicator
 * - Scale status badge
 * - Green/Yellow/Red color based on stability
 */
export function MobileWeightDisplay({
  currentWeight,
  currentAxle,
  totalAxles,
  scaleStatus,
  isStable = true,
  className,
}: MobileWeightDisplayProps) {
  const getWeightColor = () => {
    if (scaleStatus === 'disconnected') return 'text-red-400';
    if (!isStable || scaleStatus === 'unstable') return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <Card className={cn('bg-gray-900 text-white rounded-xl', className)}>
      <CardHeader className="pb-2 pt-4 px-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-400 tracking-wider">MOBILE SCALE</span>
          <Badge
            variant="outline"
            className={cn(
              'font-medium',
              scaleStatus === 'connected'
                ? 'border-green-500 text-green-400'
                : scaleStatus === 'unstable'
                  ? 'border-yellow-500 text-yellow-400'
                  : 'border-red-500 text-red-400'
            )}
          >
            {scaleStatus === 'connected'
              ? isStable
                ? 'STABLE'
                : 'READING...'
              : scaleStatus === 'unstable'
                ? 'UNSTABLE'
                : 'OFFLINE'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="py-8 px-6">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-2 tracking-widest">
            AXLE {currentAxle} OF {totalAxles}
          </div>
          <div className={cn('font-mono text-6xl sm:text-7xl font-bold tracking-tight', getWeightColor())}>
            {formatWeight(currentWeight)}
          </div>
          <div className="text-sm text-gray-400 mt-2 tracking-wider">kg</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Multideck Weight Display - 4 Decks
// ============================================================================

interface MultideckWeightDisplayProps {
  deckWeights: DeckWeight[];
  totalGVW: number;
  scaleStatus: ScaleStatus;
  className?: string;
}

/**
 * MultideckWeightDisplay - Digital LCD display for 4-deck platform weighing
 *
 * Features:
 * - Grid display showing all 4 deck weights
 * - Total GVW highlighted
 * - Individual deck status indicators
 * - KenloadV2-style digital aesthetic
 */
export function MultideckWeightDisplay({
  deckWeights,
  totalGVW,
  scaleStatus,
  className,
}: MultideckWeightDisplayProps) {
  const allStable = deckWeights.every((d) => d.status === 'stable');

  const getDeckColor = (status: DeckWeight['status']) => {
    switch (status) {
      case 'stable':
        return 'text-green-400';
      case 'unstable':
        return 'text-yellow-400';
      case 'offline':
        return 'text-red-400';
    }
  };

  return (
    <Card className={cn('bg-gray-900 text-white rounded-xl', className)}>
      <CardHeader className="pb-2 pt-4 px-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-400 tracking-wider">MULTIDECK PLATFORM</span>
          <Badge
            variant="outline"
            className={cn(
              'font-medium',
              scaleStatus === 'connected' && allStable
                ? 'border-green-500 text-green-400'
                : scaleStatus === 'disconnected'
                  ? 'border-red-500 text-red-400'
                  : 'border-yellow-500 text-yellow-400'
            )}
          >
            {scaleStatus === 'connected'
              ? allStable
                ? 'ALL DECKS STABLE'
                : 'READING...'
              : 'OFFLINE'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="py-6 px-4">
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {/* Deck Weights */}
          {deckWeights.map((deck) => (
            <div
              key={deck.deck}
              className="text-center p-2 sm:p-3 bg-gray-800 rounded-lg"
            >
              <div className="text-xs text-gray-500 mb-1">Deck {deck.deck}</div>
              <div className={cn('font-mono text-lg sm:text-2xl font-bold', getDeckColor(deck.status))}>
                {formatWeight(deck.weight)}
              </div>
              <div className="text-xs text-gray-500">kg</div>
            </div>
          ))}

          {/* GVW Total */}
          <div className="text-center p-2 sm:p-3 bg-gray-800 rounded-lg border-2 border-yellow-500/30">
            <div className="text-xs text-gray-500 mb-1">GVW</div>
            <div className="font-mono text-lg sm:text-2xl font-bold text-yellow-400">
              {formatWeight(totalGVW)}
            </div>
            <div className="text-xs text-gray-500">kg</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Axle Progress Indicator
// ============================================================================

interface AxleProgressProps {
  totalAxles: number;
  currentAxle: number;
  capturedAxles: number[];
  onAxleSelect?: (axle: number) => void;
  className?: string;
}

/**
 * AxleProgress - Visual indicator for axle-by-axle capture progress
 *
 * Shows numbered circles for each axle:
 * - Green: Captured
 * - Blue: Current (active)
 * - Gray: Pending
 */
export function AxleProgress({
  totalAxles,
  currentAxle,
  capturedAxles,
  onAxleSelect,
  className,
}: AxleProgressProps) {
  return (
    <div className={cn('flex justify-center gap-2', className)}>
      {Array.from({ length: totalAxles }, (_, i) => i + 1).map((axle) => {
        const isCaptured = capturedAxles.includes(axle);
        const isCurrent = axle === currentAxle;
        const isClickable = onAxleSelect && !isCaptured;

        return (
          <button
            key={axle}
            onClick={() => isClickable && onAxleSelect?.(axle)}
            disabled={!isClickable}
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors',
              isCaptured
                ? 'bg-green-100 border-green-500 text-green-700'
                : isCurrent
                  ? 'bg-blue-100 border-blue-500 text-blue-700'
                  : 'bg-gray-100 border-gray-300 text-gray-500',
              isClickable && 'cursor-pointer hover:bg-gray-200'
            )}
          >
            {axle}
          </button>
        );
      })}
    </div>
  );
}
