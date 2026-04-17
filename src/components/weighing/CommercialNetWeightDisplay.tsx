"use client";

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatWeight } from '@/lib/weighing-utils';
import { ArrowRight } from 'lucide-react';

interface CommercialNetWeightDisplayProps {
  tareWeightKg?: number;
  grossWeightKg?: number;
  netWeightKg?: number;
  qualityDeductionKg?: number;
  adjustedNetWeightKg?: number;
  unit?: 'kg' | 'tons';
  className?: string;
}

/**
 * CommercialNetWeightDisplay - Large, prominent display showing Tare -> Gross -> Net Weight
 *
 * Visual flow with arrows between weight stages.
 * Net weight is displayed in the largest font as the primary element.
 */
export function CommercialNetWeightDisplay({
  tareWeightKg,
  grossWeightKg,
  netWeightKg,
  qualityDeductionKg,
  adjustedNetWeightKg,
  unit = 'kg',
  className,
}: CommercialNetWeightDisplayProps) {
  const displayWeight = (kg: number | undefined) => {
    if (kg == null) return '--';
    if (unit === 'tons') return (kg / 1000).toFixed(2);
    return formatWeight(kg);
  };

  const displayUnit = unit === 'tons' ? 't' : 'kg';
  const finalNet = adjustedNetWeightKg ?? netWeightKg;

  return (
    <Card className={cn('bg-gray-900 text-white rounded-xl overflow-hidden', className)}>
      <CardContent className="p-6">
        {/* Top row: Tare -> Gross -> Net */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {/* Tare */}
          <div className="text-center flex-1">
            <div className="text-xs text-gray-500 tracking-widest mb-1">TARE</div>
            <div className={cn(
              'font-mono text-2xl font-bold',
              tareWeightKg != null ? 'text-blue-400' : 'text-gray-600'
            )}>
              {displayWeight(tareWeightKg)}
            </div>
            <div className="text-xs text-gray-500">{displayUnit}</div>
          </div>

          <ArrowRight className="h-5 w-5 text-gray-600 shrink-0 mt-2" />

          {/* Gross */}
          <div className="text-center flex-1">
            <div className="text-xs text-gray-500 tracking-widest mb-1">GROSS</div>
            <div className={cn(
              'font-mono text-2xl font-bold',
              grossWeightKg != null ? 'text-amber-400' : 'text-gray-600'
            )}>
              {displayWeight(grossWeightKg)}
            </div>
            <div className="text-xs text-gray-500">{displayUnit}</div>
          </div>

          <ArrowRight className="h-5 w-5 text-gray-600 shrink-0 mt-2" />

          {/* Net (largest) */}
          <div className="text-center flex-[1.5]">
            <div className="text-xs text-gray-500 tracking-widest mb-1">NET WEIGHT</div>
            <div className={cn(
              'font-mono text-4xl sm:text-5xl font-bold',
              finalNet != null ? 'text-green-400' : 'text-gray-600'
            )}>
              {displayWeight(finalNet)}
            </div>
            <div className="text-sm text-gray-400">{displayUnit}</div>
          </div>
        </div>

        {/* Quality deduction row (if applicable) */}
        {qualityDeductionKg != null && qualityDeductionKg > 0 && (
          <div className="border-t border-gray-700 pt-3 flex items-center justify-between text-sm">
            <div className="text-gray-400">
              Quality Deduction: <span className="text-red-400 font-mono">-{formatWeight(qualityDeductionKg)} {displayUnit}</span>
            </div>
            <div className="text-gray-400">
              Adjusted Net: <span className="text-green-400 font-mono font-bold">{displayWeight(adjustedNetWeightKg)} {displayUnit}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
