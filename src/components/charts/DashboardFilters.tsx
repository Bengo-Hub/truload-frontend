/**
 * Dashboard Filters Component
 * Displays filter controls for dashboard data with backend-loaded options
 */

'use client';

import { useDashboardFilters } from '@/contexts/DashboardFilterContext';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StationSelectFilter } from '@/components/filters/StationSelectFilter';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw } from 'lucide-react';

// Values MUST match ControlStatus exactly as persisted by the backend (verified 2026-08-12 via
// WeighingService.cs/CommercialWeighingService.cs/AxleGroupAggregationService.cs). The backend's
// WeighingQueryHelpers.ApplyControlStatusFilter now also accepts the old all-caps aliases
// defensively, but sending the real canonical value here is the correct fix, not a workaround.
const ENFORCEMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Compliant', label: 'Legal' },
  { value: 'Warning', label: 'Warning (axle overload)' },
  { value: 'Overloaded', label: 'Overloaded (GVW)' },
];

const COMMERCIAL_STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Complete', label: 'Complete' },
  { value: 'ToleranceExceeded', label: 'Tolerance Exceeded' },
  { value: 'Voided', label: 'Voided' },
];

const WEIGHING_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'multideck', label: 'Multideck' },
  { value: 'mobile', label: 'Mobile' },
];

export function DashboardFilters() {
  const { filters, setFilter, setFilters, resetFilters } = useDashboardFilters();
  const { isCommercial } = useModuleAccess();
  const statusOptions = isCommercial ? COMMERCIAL_STATUS_OPTIONS : ENFORCEMENT_STATUS_OPTIONS;

  return (
    <Card className="w-full">
      <CardContent className="pt-4 space-y-4">
        {/* Quick date range: Today/This Week/This Month/This Quarter, plus the custom from/to below */}
        <DateRangePicker
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onDateFromChange={(v) => setFilter('dateFrom', v)}
          onDateToChange={(v) => setFilter('dateTo', v)}
          onRangeChange={(from, to) => setFilters({ dateFrom: from, dateTo: to })}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Station - centralized: HQ/superuser get All + stations; others see only assigned station (disabled) */}
          <div className="space-y-2">
            <StationSelectFilter
              label="Station"
              value={filters.stationId === 'all' ? undefined : filters.stationId}
              onValueChange={(v) => setFilter('stationId', v ?? 'all')}
            />
          </div>

          {/* Weighing Type */}
          <div className="space-y-2">
            <Label htmlFor="weighingType" className="text-sm font-medium">
              Weighing Type
            </Label>
            <Select
              value={filters.weighingType}
              onValueChange={(value) => setFilter('weighingType', value)}
            >
              <SelectTrigger id="weighingType" className="h-9">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {WEIGHING_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Control Status */}
          <div className="space-y-2">
            <Label htmlFor="controlStatus" className="text-sm font-medium">
              Status
            </Label>
            <Select
              value={filters.controlStatus}
              onValueChange={(value) => setFilter('controlStatus', value)}
            >
              <SelectTrigger id="controlStatus" className="h-9">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reset Button */}
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="h-9 w-full"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
