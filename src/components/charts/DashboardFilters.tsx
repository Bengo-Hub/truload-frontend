/**
 * Dashboard Filters Component
 * Displays filter controls for dashboard data with backend-loaded options
 */

'use client';

import { useDashboardFilters } from '@/contexts/DashboardFilterContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useStations } from '@/hooks/queries/useWeighingQueries';
import { RotateCcw } from 'lucide-react';

// Control status options
const CONTROL_STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'LEGAL', label: 'Legal' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'OVERLOAD', label: 'Overloaded' },
];

// Weighing type options
const WEIGHING_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'multideck', label: 'Multideck' },
  { value: 'mobile', label: 'Mobile' },
];

export function DashboardFilters() {
  const { filters, setFilter, resetFilters } = useDashboardFilters();
  const { data: stations, isLoading: isLoadingStations } = useStations();

  return (
    <Card className="w-full">
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {/* Date From */}
          <div className="space-y-2">
            <Label htmlFor="dateFrom" className="text-sm font-medium">
              Date From
            </Label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilter('dateFrom', e.target.value)}
              className="h-9"
            />
          </div>

          {/* Date To */}
          <div className="space-y-2">
            <Label htmlFor="dateTo" className="text-sm font-medium">
              Date To
            </Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilter('dateTo', e.target.value)}
              className="h-9"
            />
          </div>

          {/* Station */}
          <div className="space-y-2">
            <Label htmlFor="station" className="text-sm font-medium">
              Station
            </Label>
            {isLoadingStations ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select
                value={filters.stationId}
                onValueChange={(value) => setFilter('stationId', value)}
              >
                <SelectTrigger id="station" className="h-9">
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stations</SelectItem>
                  {stations?.map((station) => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
                {CONTROL_STATUS_OPTIONS.map((option) => (
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
