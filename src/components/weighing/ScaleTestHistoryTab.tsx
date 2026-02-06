"use client";

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Download,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Scale,
  Search,
  Truck,
  Weight,
  XCircle,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useScaleTests } from '@/hooks/queries';
import { Station, ScaleTest } from '@/lib/api/weighing';

interface ScaleTestHistoryTabProps {
  station: Station | null;
  bound?: string;
  className?: string;
}

type DateRangePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';
type ResultFilter = 'all' | 'pass' | 'fail';

/**
 * ScaleTestHistoryTab - Display scale test history for a station
 *
 * Features:
 * - Date range filtering (presets and custom)
 * - Result filtering (Pass/Fail/All)
 * - Search by test ID or vehicle plate
 * - Export functionality
 * - Detailed view modal
 */
export function ScaleTestHistoryTab({
  station,
  bound,
  className,
}: ScaleTestHistoryTabProps) {
  // Filters
  const [datePreset, setDatePreset] = useState<DateRangePreset>('today');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Get date range based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case 'today':
        return {
          from: format(startOfDay(now), 'yyyy-MM-dd'),
          to: format(endOfDay(now), 'yyyy-MM-dd'),
        };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return {
          from: format(startOfDay(yesterday), 'yyyy-MM-dd'),
          to: format(endOfDay(yesterday), 'yyyy-MM-dd'),
        };
      case 'week':
        return {
          from: format(startOfDay(subDays(now, 7)), 'yyyy-MM-dd'),
          to: format(endOfDay(now), 'yyyy-MM-dd'),
        };
      case 'month':
        return {
          from: format(startOfDay(subDays(now, 30)), 'yyyy-MM-dd'),
          to: format(endOfDay(now), 'yyyy-MM-dd'),
        };
      case 'custom':
        return {
          from: customFromDate || format(subDays(now, 7), 'yyyy-MM-dd'),
          to: customToDate || format(now, 'yyyy-MM-dd'),
        };
      default:
        return {
          from: format(startOfDay(now), 'yyyy-MM-dd'),
          to: format(endOfDay(now), 'yyyy-MM-dd'),
        };
    }
  }, [datePreset, customFromDate, customToDate]);

  // Use TanStack Query hook for fetching scale tests
  const {
    data: tests = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useScaleTests(station?.id, dateRange.from, dateRange.to, bound);

  // Filter tests locally
  const filteredTests = useMemo(() => {
    return tests.filter((test) => {
      // Result filter
      if (resultFilter !== 'all' && test.result !== resultFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesId = test.id.toLowerCase().includes(query);
        const matchesDetails = test.details?.toLowerCase().includes(query);
        if (!matchesId && !matchesDetails) {
          return false;
        }
      }

      return true;
    });
  }, [tests, resultFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => ({
    total: tests.length,
    passed: tests.filter((t) => t.result === 'pass').length,
    failed: tests.filter((t) => t.result === 'fail').length,
  }), [tests]);

  // Export to CSV
  const handleExport = () => {
    const headers = ['Date', 'Time', 'Test Weight', 'Actual', 'Deviation', 'Result', 'Operator', 'Details'];
    const rows = filteredTests.map((test) => [
      format(new Date(test.carriedAt), 'yyyy-MM-dd'),
      format(new Date(test.carriedAt), 'HH:mm:ss'),
      test.testWeightKg?.toString() || '',
      test.actualWeightKg?.toString() || '',
      test.deviationKg?.toString() || '',
      test.result.toUpperCase(),
      test.carriedByName || '',
      test.details?.replace(/\n/g, '; ') || '',
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scale-tests-${station?.code || 'station'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Parse test type from details
  const getTestType = (details?: string): 'vehicle' | 'calibration' => {
    if (details?.toLowerCase().includes('vehicle')) {
      return 'vehicle';
    }
    return 'calibration';
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-600" />
              Scale Test History
              {station && (
                <Badge variant="outline" className="ml-2">
                  {station.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={cn('h-4 w-4 mr-1.5', isFetching && 'animate-spin')} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={filteredTests.length === 0}
              >
                <Download className="h-4 w-4 mr-1.5" />
                Export CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Tests</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
              <p className="text-xs text-green-600">Passed</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              <p className="text-xs text-red-600">Failed</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-lg">
            {/* Date Range Preset */}
            <div className="space-y-1.5">
              <Label className="text-xs">Date Range</Label>
              <Select
                value={datePreset}
                onValueChange={(v) => setDatePreset(v as DateRangePreset)}
              >
                <SelectTrigger className="w-[140px]">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {datePreset === 'custom' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">From</Label>
                  <Input
                    type="date"
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.target.value)}
                    className="w-[140px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">To</Label>
                  <Input
                    type="date"
                    value={customToDate}
                    onChange={(e) => setCustomToDate(e.target.value)}
                    className="w-[140px]"
                  />
                </div>
              </>
            )}

            {/* Result Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs">Result</Label>
              <Select
                value={resultFilter}
                onValueChange={(v) => setResultFilter(v as ResultFilter)}
              >
                <SelectTrigger className="w-[120px]">
                  <Filter className="h-4 w-4 mr-2 text-gray-500" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pass">Passed</SelectItem>
                  <SelectItem value="fail">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by ID or vehicle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-700">Failed to load scale test history</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="ml-auto"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading scale tests...</span>
        </div>
      )}

      {/* Results Table */}
      {!isLoading && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Date/Time</TableHead>
                  <TableHead className="w-[80px]">Type</TableHead>
                  <TableHead className="w-[100px]">Expected</TableHead>
                  <TableHead className="w-[100px]">Actual</TableHead>
                  <TableHead className="w-[80px]">Deviation</TableHead>
                  <TableHead className="w-[80px]">Result</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                      <Scale className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No scale tests found for the selected filters</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-mono text-sm">
                        <div>{format(new Date(test.carriedAt), 'dd/MM/yy')}</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(test.carriedAt), 'HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTestType(test.details) === 'vehicle' ? (
                          <Badge variant="outline" className="gap-1">
                            <Truck className="h-3 w-3" />
                            Vehicle
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Weight className="h-3 w-3" />
                            Calibration
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono">
                        {test.testWeightKg?.toLocaleString() || '-'} kg
                      </TableCell>
                      <TableCell className="font-mono">
                        {test.actualWeightKg?.toLocaleString() || '-'} kg
                      </TableCell>
                      <TableCell className={cn(
                        'font-mono',
                        test.result === 'pass' ? 'text-green-600' : 'text-red-600'
                      )}>
                        {test.deviationKg !== undefined ? (
                          <>
                            {test.deviationKg > 0 ? '+' : ''}
                            {test.deviationKg} kg
                          </>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {test.result === 'pass' ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            PASS
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                            <XCircle className="h-3 w-3 mr-1" />
                            FAIL
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {test.carriedByName || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination info */}
      {!isLoading && filteredTests.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Showing {filteredTests.length} of {tests.length} tests
        </div>
      )}
    </div>
  );
}

export default ScaleTestHistoryTab;
