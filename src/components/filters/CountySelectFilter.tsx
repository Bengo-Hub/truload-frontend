'use client';

/**
 * County filter for report/list pages - simple dropdown, no role gating (unlike StationSelectFilter,
 * every user can see every county). Selecting "All counties" clears the filter.
 */

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCounties } from '@/hooks/queries/useGeographicQueries';

export interface CountySelectFilterProps {
  value?: string;
  onValueChange: (countyId: string | undefined) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

const ALL_COUNTIES_VALUE = 'all';

export function CountySelectFilter({
  value,
  onValueChange,
  label = 'County',
  placeholder = 'All counties',
  className,
}: CountySelectFilterProps) {
  const { data: counties = [] } = useCounties();

  return (
    <div className={className}>
      {label && <Label className="text-xs text-gray-500">{label}</Label>}
      <Select
        value={value ?? ALL_COUNTIES_VALUE}
        onValueChange={(v) => onValueChange(v === ALL_COUNTIES_VALUE ? undefined : v)}
      >
        <SelectTrigger className="h-10">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_COUNTIES_VALUE}>{placeholder}</SelectItem>
          {counties.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
