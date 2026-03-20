'use client';

/**
 * Centralized station filter for list/report pages.
 * - Superuser or HQ users: dropdown with "All stations" + all org stations; selection used for drill-down and X-Station-ID.
 * - Non-superuser and non-HQ users: only their assigned station is shown, field is disabled (no "All Stations" or other stations).
 */

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStations } from '@/hooks/queries/useWeighingQueries';
import { getSelectedStationId, setSelectedStationId } from '@/lib/auth/token';
import { useAuthStore } from '@/stores/auth.store';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface StationSelectFilterProps {
  /** Current filter value (station id or 'all'). For non-HQ/non-superuser this is ignored and user's station is used. */
  value?: string | null;
  /** Called when selection changes. For HQ/superuser: new station id or undefined for "all". For others: only user's stationId. */
  onValueChange?: (stationId: string | undefined) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  /** Optional: trigger refetch when HQ user changes station (e.g. queryClient.invalidateQueries). */
  onStationChange?: () => void;
}

const ALL_STATIONS_VALUE = 'all';

export function StationSelectFilter({
  value,
  onValueChange,
  label = 'Station',
  placeholder = 'All stations',
  className,
  onStationChange,
}: StationSelectFilterProps) {
  const user = useAuthStore((s) => s.user);
  const isSuperUser = user?.isSuperUser ?? false;
  const isHqUser = user?.isHqUser ?? false;
  /** Only superuser or HQ users can change station; others see only their assigned station and field is disabled. */
  const canSelectStation = isSuperUser || isHqUser;
  const userStationId = user?.stationId ?? undefined;
  const { data: stations = [] } = useStations();

  // For HQ/superuser: keep selection in state so UI updates; sync to token for X-Station-ID header
  const [hqSelected, setHqSelected] = useState<string | null>(() => getSelectedStationId());

  const effectiveValue = canSelectStation
    ? (hqSelected ?? ALL_STATIONS_VALUE)
    : (userStationId ?? ALL_STATIONS_VALUE);

  // Sync parent filter with non-HQ/non-superuser user's station on mount (once only)
  const syncedRef = useRef(false);
  useEffect(() => {
    if (!syncedRef.current && !canSelectStation && userStationId && onValueChange) {
      syncedRef.current = true;
      onValueChange(userStationId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSelectStation, userStationId]);

  const handleChange = useCallback(
    (newValue: string) => {
      if (canSelectStation) {
        const stationId = newValue === ALL_STATIONS_VALUE ? null : newValue;
        setHqSelected(stationId);
        setSelectedStationId(stationId);
        onValueChange?.(stationId ?? undefined);
        onStationChange?.();
      } else {
        onValueChange?.(userStationId);
      }
    },
    [canSelectStation, userStationId, onValueChange, onStationChange]
  );

  const myStation = userStationId ? stations.find((s) => s.id === userStationId) : null;

  if (!canSelectStation) {
    // Non-superuser and non-HQ: show only their assigned station, disabled (no dropdown, no "All Stations")
    return (
      <div className={className}>
        {label && <Label className="text-xs text-gray-500">{label}</Label>}
        <div
          className="flex h-10 cursor-not-allowed items-center rounded-md border border-gray-200 bg-muted/60 px-3 text-sm text-gray-600 opacity-90"
          aria-disabled="true"
          title="You can only view data for your assigned station."
        >
          {myStation ? myStation.name : userStationId ? 'Your station' : '—'}
        </div>
      </div>
    );
  }

  // Superuser or HQ: full dropdown with "All stations" + all org stations
  return (
    <div className={className}>
      {label && <Label className="text-xs text-gray-500">{label}</Label>}
      <Select value={effectiveValue} onValueChange={handleChange}>
        <SelectTrigger className="h-10">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_STATIONS_VALUE}>{placeholder}</SelectItem>
          {stations.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
              {s.isHq ? ' (HQ)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
