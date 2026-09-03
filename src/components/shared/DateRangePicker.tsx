'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getEatQuickRange, type EatQuickRangePreset } from '@/lib/utils/dateRange';

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onRangeChange?: (from: string, to: string) => void;
  className?: string;
  labelFrom?: string;
  labelTo?: string;
  /** Show the Today/This Week/This Month/This Quarter quick-select row. Default true. */
  showPresets?: boolean;
}

const PRESETS: { label: string; key: EatQuickRangePreset }[] = [
  { label: 'Today', key: 'today' },
  { label: 'This Week', key: 'thisWeek' },
  { label: 'This Month', key: 'thisMonth' },
  { label: 'This Quarter', key: 'thisQuarter' },
];

/**
 * Shared date-range picker - plain `YYYY-MM-DD` date-only values, no client-side timezone math.
 * The backend's `WeighingQueryHelpers.ResolveEatDayRange` treats a date-only value as a Nairobi
 * (EAT) calendar day, so this component deliberately does NOT construct `Date`/ISO-instant values
 * itself (that's what caused the asymmetric browser-local-timezone bug fixed on the Tickets page -
 * see `src/lib/utils/dateRange.ts` for the one place that conversion is still needed, when a
 * caller also has a time-of-day component to combine in). The quick-select presets below follow
 * the same rule: they format Dates via local getFullYear/getMonth/getDate, never toISOString().
 */
export function DateRangePicker({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onRangeChange,
  className,
  labelFrom = 'From Date',
  labelTo = 'To Date',
  showPresets = true,
}: DateRangePickerProps) {
  const applyPreset = (preset: EatQuickRangePreset) => {
    const { from, to } = getEatQuickRange(preset);
    if (onRangeChange) {
      onRangeChange(from, to);
    } else {
      onDateFromChange(from);
      onDateToChange(to);
    }
  };

  const isActivePreset = (preset: EatQuickRangePreset) => {
    const { from, to } = getEatQuickRange(preset);
    return dateFrom === from && dateTo === to;
  };

  return (
    <div className="space-y-2">
      {showPresets && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick date range">
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              size="sm"
              variant={isActivePreset(preset.key) ? 'default' : 'outline'}
              className="h-7 px-2.5 text-xs"
              onClick={() => applyPreset(preset.key)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      )}
      <div className={cn(className ?? 'grid grid-cols-2 gap-3')}>
        <div className="space-y-2">
          <Label>{labelFrom}</Label>
          <Input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{labelTo}</Label>
          <Input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
        </div>
      </div>
    </div>
  );
}
