'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  className?: string;
  labelFrom?: string;
  labelTo?: string;
}

/**
 * Shared date-range picker - plain `YYYY-MM-DD` date-only values, no client-side timezone math.
 * The backend's `WeighingQueryHelpers.ResolveEatDayRange` treats a date-only value as a Nairobi
 * (EAT) calendar day, so this component deliberately does NOT construct `Date`/ISO-instant values
 * itself (that's what caused the asymmetric browser-local-timezone bug fixed on the Tickets page -
 * see `src/lib/utils/dateRange.ts` for the one place that conversion is still needed, when a
 * caller also has a time-of-day component to combine in).
 */
export function DateRangePicker({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  className,
  labelFrom = 'From Date',
  labelTo = 'To Date',
}: DateRangePickerProps) {
  return (
    <div className={className ?? 'grid grid-cols-2 gap-3'}>
      <div className="space-y-2">
        <Label>{labelFrom}</Label>
        <Input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>{labelTo}</Label>
        <Input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
      </div>
    </div>
  );
}
