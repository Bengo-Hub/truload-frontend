"use client";

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DeckWeight {
  deck: number;
  weight: number;
  status: 'stable' | 'unstable' | 'offline';
}

interface MultideckWeightsCardProps {
  platformName: string;
  deckWeights: DeckWeight[];
  totalGVW: number;
  vehicleOnDeck?: boolean;
  actualKg?: number;
  className?: string;
}

/**
 * MultideckWeightsCard - Displays deck weights for multideck weighbridge
 *
 * Based on KenloadV2 design showing:
 * - Platform name and status
 * - Individual deck weights (Deck 1, 2, 3, 4)
 * - Total (GVW) in yellow
 * - Real-time weight updates from indicator via WebSocket/TCP
 */
export function MultideckWeightsCard({
  platformName,
  deckWeights,
  totalGVW,
  vehicleOnDeck = false,
  actualKg,
  className,
}: MultideckWeightsCardProps) {
  return (
    <Card className={cn('bg-gray-900 border-gray-700', className)}>
      <CardContent className="p-0">
        {/* Header Row */}
        <div className="bg-yellow-500 text-black text-center py-2 font-bold text-sm">
          MULTIDECK
        </div>

        {/* Weights Display */}
        <div className="p-4">
          <div className="flex items-stretch gap-2">
            {/* Platform Info */}
            <div className="bg-gray-800 border border-gray-600 rounded p-3 min-w-[100px]">
              <div className="text-yellow-400 text-xs mb-1">Platform</div>
              <div className="text-yellow-400 text-sm font-bold">:{platformName}</div>
              <div className="mt-2">
                <div className="text-yellow-400 text-xs mb-1">Status</div>
                <div className={cn(
                  'text-xs',
                  vehicleOnDeck ? 'text-green-400' : 'text-gray-400'
                )}>
                  {vehicleOnDeck ? 'Vehicle on Deck' : 'No Vehicle'}
                </div>
              </div>
              {actualKg !== undefined && (
                <div className="mt-2">
                  <div className="text-yellow-400 text-xs mb-1">Actual (Kg)</div>
                </div>
              )}
            </div>

            {/* Deck Weight Cards */}
            {deckWeights.map((deck) => (
              <div
                key={deck.deck}
                className="bg-gray-800 border border-gray-600 rounded p-3 flex-1 min-w-[100px]"
              >
                <div className="text-yellow-400 text-xs mb-2">Deck {deck.deck}</div>
                <div className="bg-black rounded p-2">
                  <div className={cn(
                    'font-mono text-2xl md:text-3xl font-bold text-center',
                    deck.status === 'stable' ? 'text-yellow-400' :
                    deck.status === 'unstable' ? 'text-orange-400' : 'text-gray-500'
                  )}>
                    {deck.weight.toLocaleString()}
                  </div>
                </div>
                {/* Status indicator */}
                <div className="mt-1 flex justify-center">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      deck.status === 'stable' ? 'bg-green-500' :
                      deck.status === 'unstable' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                    )}
                  />
                </div>
              </div>
            ))}

            {/* Total GVW */}
            <div className="bg-gray-800 border border-yellow-500 rounded p-3 min-w-[120px]">
              <div className="text-yellow-400 text-xs mb-2">Total (GVW)</div>
              <div className="bg-black rounded p-2">
                <div className="font-mono text-2xl md:text-3xl font-bold text-center text-yellow-400">
                  {totalGVW.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * CompactMultideckWeights - Compact version for screen 2
 */
export function CompactMultideckWeights({
  deckWeights,
  totalGVW,
  className,
}: {
  deckWeights: DeckWeight[];
  totalGVW: number;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {deckWeights.map((deck) => (
        <div
          key={deck.deck}
          className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-center"
        >
          <div className="text-[10px] text-gray-400">D{deck.deck}</div>
          <div className={cn(
            'font-mono text-sm font-bold',
            deck.status === 'stable' ? 'text-yellow-400' : 'text-gray-500'
          )}>
            {deck.weight.toLocaleString()}
          </div>
        </div>
      ))}
      <div className="bg-gray-800 border border-yellow-500 rounded px-3 py-2 text-center">
        <div className="text-[10px] text-yellow-400">GVW</div>
        <div className="font-mono text-sm font-bold text-yellow-400">
          {totalGVW.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

export default MultideckWeightsCard;
