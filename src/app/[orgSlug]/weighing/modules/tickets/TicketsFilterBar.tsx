"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StationSelectFilter } from '@/components/filters/StationSelectFilter';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchInput } from '@/components/weighing';
import type { AxleConfiguration, Station } from '@/lib/api/weighing';
import { cn } from '@/lib/utils';
import { Download, LayoutGrid, List, RefreshCcw, Rows3, Search, X } from 'lucide-react';

export type ViewMode = 'list' | 'line' | 'images';

interface TicketsFilterBarProps {
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onTimeFromChange: (v: string) => void;
  onTimeToChange: (v: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  stateFilter: string;
  onStateFilterChange: (v: string) => void;
  stationFilter: string;
  onStationFilterChange: (v: string) => void;
  axleTypeFilter: string;
  onAxleTypeFilterChange: (v: string) => void;
  searchReg: string;
  onSearchRegChange: (v: string) => void;
  searchTicketNo: string;
  onSearchTicketNoChange: (v: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onRefresh: () => void;
  onExport: () => void;
  stations: Station[];
  axleConfigurations: AxleConfiguration[];
  isFetching: boolean;
  canExport: boolean;
  hasActiveFilters: boolean;
  isCommercial?: boolean;
}

const VIEW_MODES: { value: ViewMode; icon: typeof List; label: string }[] = [
  { value: 'list', icon: List, label: 'List' },
  { value: 'line', icon: Rows3, label: 'Line' },
  { value: 'images', icon: LayoutGrid, label: 'Image' },
];

export default function TicketsFilterBar({
  dateFrom, dateTo, timeFrom, timeTo,
  onDateFromChange, onDateToChange, onTimeFromChange, onTimeToChange,
  viewMode, onViewModeChange,
  statusFilter, onStatusFilterChange,
  stateFilter, onStateFilterChange,
  stationFilter, onStationFilterChange,
  axleTypeFilter, onAxleTypeFilterChange,
  searchReg, onSearchRegChange,
  searchTicketNo, onSearchTicketNoChange,
  onSearch, onClear, onRefresh, onExport,
  stations, axleConfigurations,
  isFetching, canExport, hasActiveFilters,
  isCommercial = false,
}: TicketsFilterBarProps) {
  const statusOptions = isCommercial
    ? [
        { value: 'all', label: 'All Status' },
        { value: 'Pending', label: 'Pending' },
        { value: 'FirstWeightCaptured', label: 'First Weight Done' },
        { value: 'Complete', label: 'Complete' },
        { value: 'ToleranceExceeded', label: 'Tolerance Exceeded' },
      ]
    : [
        { value: 'all', label: 'All Status' },
        { value: 'Pending', label: 'Pending' },
        { value: 'Compliant', label: 'Compliant' },
        { value: 'Overload', label: 'Overload' },
        { value: 'Charged', label: 'Charged' },
        { value: 'Released', label: 'Released' },
      ];
  return (
    <Card className="border border-gray-200 rounded-xl">
      <CardContent className="p-4 space-y-3">
        {/* Row 1: Date/Time + View Mode Toggle */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Date From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="w-[140px] h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Date To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="w-[140px] h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Time From</Label>
            <Input
              type="time"
              value={timeFrom}
              onChange={(e) => onTimeFromChange(e.target.value)}
              className="w-[120px] h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Time To</Label>
            <Input
              type="time"
              value={timeTo}
              onChange={(e) => onTimeToChange(e.target.value)}
              className="w-[120px] h-9"
            />
          </div>
          <div className="ml-auto space-y-1">
            <Label className="text-xs text-gray-500">View</Label>
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
              {VIEW_MODES.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => onViewModeChange(value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                    viewMode === value
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  )}
                  title={label}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Dropdown Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={stateFilter} onValueChange={onStateFilterChange}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All State</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Recent">Recent Tickets</SelectItem>
            </SelectContent>
          </Select>

          <StationSelectFilter
            value={stationFilter === 'all' ? undefined : stationFilter}
            onValueChange={(v) => onStationFilterChange(v ?? 'all')}
            label="Station"
            placeholder="All stations"
            className="w-[160px]"
          />

          {!isCommercial && (
            <Select value={axleTypeFilter} onValueChange={onAxleTypeFilterChange}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Axle Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Axle</SelectItem>
                {axleConfigurations.map((ac) => (
                  <SelectItem key={ac.id} value={ac.axleCode}>
                    {ac.axleCode} - {ac.axleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Row 3: Search + Actions */}
        <div className="flex flex-wrap gap-3 items-end">
          <SearchInput
            placeholder="Search vehicle reg..."
            value={searchReg}
            onChange={onSearchRegChange}
            className="flex-1 max-w-[200px]"
          />
          <SearchInput
            placeholder="Search ticket no..."
            value={searchTicketNo}
            onChange={onSearchTicketNoChange}
            className="flex-1 max-w-[200px]"
          />
          <Button size="sm" onClick={onSearch} className="h-9">
            <Search className="mr-1.5 h-3.5 w-3.5" />
            Search
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClear} className="h-9">
              <X className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            {canExport && (
              <Button variant="outline" size="sm" onClick={onExport} className="h-9">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={onRefresh} disabled={isFetching} className="h-9 w-9">
              <RefreshCcw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
