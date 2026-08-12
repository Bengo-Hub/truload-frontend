'use client';

/**
 * Sub-county filter for report/list pages - depends on the selected county (fetches all
 * sub-counties when no county is chosen). Selecting "All sub-counties" clears the filter.
 */

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSubcounties } from '@/hooks/queries/useGeographicQueries';

export interface SubcountySelectFilterProps {
  value?: string;
  onValueChange: (subcountyId: string | undefined) => void;
  /** Narrows the list to sub-counties within this county; omit to show all. */
  countyId?: string;
  label?: string;
  placeholder?: string;
  className?: string;
}

const ALL_SUBCOUNTIES_VALUE = 'all';

export function SubcountySelectFilter({
  value,
  onValueChange,
  countyId,
  label = 'Sub County',
  placeholder = 'All sub-counties',
  className,
}: SubcountySelectFilterProps) {
  const { data: subcounties = [] } = useSubcounties(countyId);
  // useSubcounties only fetches once a county is chosen (same gating other consumers of this
  // hook already rely on) - prompt for that instead of silently showing an empty list.
  const effectivePlaceholder = countyId ? placeholder : 'Select a county first';

  return (
    <div className={className}>
      {label && <Label className="text-xs text-gray-500">{label}</Label>}
      <Select
        value={value ?? ALL_SUBCOUNTIES_VALUE}
        onValueChange={(v) => onValueChange(v === ALL_SUBCOUNTIES_VALUE ? undefined : v)}
        disabled={!countyId}
      >
        <SelectTrigger className="h-10">
          <SelectValue placeholder={effectivePlaceholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_SUBCOUNTIES_VALUE}>{placeholder}</SelectItem>
          {subcounties.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
