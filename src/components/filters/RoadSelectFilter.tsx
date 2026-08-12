'use client';

/**
 * Road filter for report/list pages - scoped to the selected county (roads span sub-counties, so
 * county is the natural scoping level, same as the existing useRoadsByCounty hook used elsewhere
 * in the app). Selecting "All roads" clears the filter.
 */

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRoadsByCounty } from '@/hooks/queries/useWeighingQueries';

export interface RoadSelectFilterProps {
  value?: string;
  onValueChange: (roadId: string | undefined) => void;
  /** Narrows the list to roads within this county; required for the list to populate. */
  countyId?: string;
  label?: string;
  placeholder?: string;
  className?: string;
}

const ALL_ROADS_VALUE = 'all';

export function RoadSelectFilter({
  value,
  onValueChange,
  countyId,
  label = 'Road',
  placeholder = 'All roads',
  className,
}: RoadSelectFilterProps) {
  const { data: roads = [] } = useRoadsByCounty(countyId);
  const effectivePlaceholder = countyId ? placeholder : 'Select a county first';

  return (
    <div className={className}>
      {label && <Label className="text-xs text-gray-500">{label}</Label>}
      <Select
        value={value ?? ALL_ROADS_VALUE}
        onValueChange={(v) => onValueChange(v === ALL_ROADS_VALUE ? undefined : v)}
        disabled={!countyId}
      >
        <SelectTrigger className="h-10">
          <SelectValue placeholder={effectivePlaceholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_ROADS_VALUE}>{placeholder}</SelectItem>
          {roads.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
