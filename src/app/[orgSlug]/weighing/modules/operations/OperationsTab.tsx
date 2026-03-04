"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMyStation, useRecentWeighings, useScaleTests, useTodayWeighingStats } from '@/hooks/queries';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { cn } from '@/lib/utils';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Download,
    Filter,
    Gauge,
    Loader2,
    RefreshCw,
    Scale,
    Search,
    ShieldCheck,
    Truck,
    XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

type WeighingType = 'mobile' | 'multideck';
type WeighingStatus = 'Normal' | 'Overloaded' | 'Warning';
type DateRangePreset = 'today' | 'yesterday' | 'week' | 'month';
type ResultFilter = 'all' | 'pass' | 'fail';

interface RecentWeighing {
  id: string;
  vehicleNumber: string;
  weight: number;
  weighingType: WeighingType;
  status: WeighingStatus;
  time: string;
}

/**
 * Operations Tab - Weighing Landing Screen
 *
 * Displays:
 * - Weighing type selection cards (Mobile / Multideck)
 * - Scale/Indicator status cards
 * - Scale test history
 * - Recent weighing activity table
 */
export default function OperationsTab() {
  const router = useRouter();
  const orgSlug = useOrgSlug();

  // Station data for scale tests
  const { data: currentStation, isLoading: _isLoadingStation } = useMyStation();

  // Scale test filters
  const [datePreset, setDatePreset] = useState<DateRangePreset>('today');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Get date range based on preset
  const getDateRange = useCallback(() => {
    const now = new Date();
    switch (datePreset) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
      case 'week':
        return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
      case 'month':
        return { from: startOfDay(subDays(now, 30)), to: endOfDay(now) };
      default:
        return { from: startOfDay(now), to: endOfDay(now) };
    }
  }, [datePreset]);

  const dateRange = getDateRange();

  // Fetch scale tests (only when station is available)
  const {
    data: scaleTests = [],
    isLoading: isLoadingTests,
    refetch: refetchTests,
  } = useScaleTests(
    currentStation?.id,
    dateRange.from.toISOString(),
    dateRange.to.toISOString()
  );

  // Fetch recent weighings (live tickets) - cached for 5 minutes
  const {
    data: recentWeighingsData,
    isLoading: isLoadingRecentWeighings,
    refetch: refetchRecentWeighings,
  } = useRecentWeighings(currentStation?.id, 10);

  // Fetch today's statistics - cached for 5 minutes
  const {
    data: todayStats,
    isLoading: isLoadingStats,
  } = useTodayWeighingStats(currentStation?.id);

  // Filter scale tests
  const filteredTests = scaleTests
    .filter(test => {
      if (resultFilter !== 'all' && test.result !== resultFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          test.id.toLowerCase().includes(query) ||
          test.vehiclePlate?.toLowerCase().includes(query)
        );
      }
      return true;
    });

  // Calculate scale test statistics
  const testStats = {
    total: scaleTests.length,
    passed: scaleTests.filter(t => t.result === 'pass').length,
    failed: scaleTests.filter(t => t.result === 'fail').length,
    passRate: scaleTests.length > 0
      ? Math.round((scaleTests.filter(t => t.result === 'pass').length / scaleTests.length) * 100)
      : 0,
    avgDeviation: scaleTests.length > 0
      ? Math.round(scaleTests.reduce((sum, t) => sum + Math.abs(t.deviationKg || 0), 0) / scaleTests.length)
      : 0,
  };

  // Transform recent weighings for display
  const recentWeighings: RecentWeighing[] = (recentWeighingsData?.items || []).map(w => ({
    id: w.id,
    vehicleNumber: w.vehicleRegNumber || 'Unknown',
    weight: w.gvwMeasuredKg || 0,
    weighingType: (w.weighingType?.toLowerCase() === 'mobile' ? 'mobile' : 'multideck') as WeighingType,
    status: mapControlStatus(w.controlStatus),
    time: w.weighedAt ? format(new Date(w.weighedAt), 'hh:mm a') : '-',
  }));

  // Helper function to map control status
  function mapControlStatus(status?: string): WeighingStatus {
    if (!status) return 'Normal';
    const s = status.toLowerCase();
    if (s.includes('overload')) return 'Overloaded';
    if (s.includes('warning')) return 'Warning';
    return 'Normal';
  }

  const handleWeighingTypeSelect = (type: WeighingType) => {
    router.push(`/${orgSlug}/weighing/${type}`);
  };

  const getStatusBadge = (status: WeighingStatus) => {
    switch (status) {
      case 'Normal':
        return <Badge className="bg-green-500 hover:bg-green-500 text-white font-medium rounded-md">Normal</Badge>;
      case 'Overloaded':
        return <Badge className="bg-red-500 hover:bg-red-500 text-white font-medium rounded-md">Overloaded</Badge>;
      case 'Warning':
        return <Badge className="bg-yellow-500 hover:bg-yellow-500 text-white font-medium rounded-md">Warning</Badge>;
    }
  };

  const handleExportTests = () => {
    // Export to CSV
    const headers = ['Test ID', 'Date/Time', 'Type', 'Expected (kg)', 'Actual (kg)', 'Deviation', 'Result', 'Vehicle', 'Operator'];
    const rows = filteredTests.map(test => [
      test.id,
      format(new Date(test.carriedAt), 'yyyy-MM-dd HH:mm'),
      test.testType === 'calibration_weight' ? 'Calibration' : 'Vehicle',
      test.testWeightKg || '-',
      test.actualWeightKg || '-',
      test.deviationKg ? `${test.deviationKg > 0 ? '+' : ''}${test.deviationKg} kg` : '-',
      test.result,
      test.vehiclePlate || '-',
      test.carriedByName || '-',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scale-tests-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Top Row: Weighing Type Selection + Indicator Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weighing Type Selection - spans 2 columns */}
        <Card className="lg:col-span-2 border border-gray-200 rounded-xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-gray-900">Select Weighing Type</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Mobile Weighing Card */}
              <button
                onClick={() => handleWeighingTypeSelect('mobile')}
                className="flex flex-col items-center justify-center py-6 px-4 rounded-lg border border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                <Scale className="h-8 w-8 text-emerald-600 mb-2" />
                <h3 className="text-base font-semibold text-gray-900">Mobile Weighing</h3>
                <p className="text-xs text-gray-500">Axle-by-axle portable weighing</p>
              </button>

              {/* Multideck Weighing Card */}
              <button
                onClick={() => handleWeighingTypeSelect('multideck')}
                className="flex flex-col items-center justify-center py-6 px-4 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Gauge className="h-8 w-8 text-blue-600 mb-2" />
                <h3 className="text-base font-semibold text-gray-900">Multideck Weighing</h3>
                <p className="text-xs text-gray-500">4-deck platform weighing system</p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Today's Summary Card */}
        <Card className="border border-gray-200 rounded-xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-900">Today&apos;s Summary</CardTitle>
              <Badge variant="outline" className="text-xs border-blue-500 text-blue-700 bg-blue-50">
                {format(new Date(), 'MMM dd, yyyy')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isLoadingStats ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Total Weighings */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Truck className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Weighings</p>
                      <p className="text-lg font-bold text-gray-900">{todayStats?.total || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Compliance Rate */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-green-50 border border-green-100">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Compliance Rate</p>
                      <p className="text-lg font-bold text-green-600">{todayStats?.complianceRate || 100}%</p>
                    </div>
                  </div>
                  <span className="text-xs text-green-600">{todayStats?.compliant || 0} compliant</span>
                </div>

                {/* Overloads & Warnings */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-100">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-[10px] text-gray-500">Overloads</p>
                      <p className="text-sm font-bold text-red-600">{todayStats?.overloaded || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-50 border border-yellow-100">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <div>
                      <p className="text-[10px] text-gray-500">Warnings</p>
                      <p className="text-sm font-bold text-yellow-600">{todayStats?.warnings || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scale Test History & Recent Activity Tabs */}
      <Card className="border border-gray-200 rounded-xl">
        <Tabs defaultValue="scale-tests" className="w-full">
          <CardHeader className="pb-0 pt-4 px-4">
            <TabsList className="inline-flex h-9 items-center justify-start rounded-lg bg-gray-100 p-1">
              <TabsTrigger value="scale-tests" className="rounded-md px-4 py-1.5 text-xs font-medium">
                <Scale className="h-3.5 w-3.5 mr-1.5" />
                Scale Test History
              </TabsTrigger>
              <TabsTrigger value="recent" className="rounded-md px-4 py-1.5 text-xs font-medium">
                <Activity className="h-3.5 w-3.5 mr-1.5" />
                Recent Activity
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          {/* Scale Test History Tab */}
          <TabsContent value="scale-tests" className="mt-0">
            <CardContent className="px-4 pb-4 pt-3">
              {/* Statistics Row */}
              <div className="grid grid-cols-5 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">{testStats.total}</p>
                  <p className="text-xs text-gray-500">Total Tests</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-green-600">{testStats.passed}</p>
                  <p className="text-xs text-gray-500">Passed</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-red-600">{testStats.failed}</p>
                  <p className="text-xs text-gray-500">Failed</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-blue-600">{testStats.passRate}%</p>
                  <p className="text-xs text-gray-500">Pass Rate</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-purple-600">{testStats.avgDeviation} kg</p>
                  <p className="text-xs text-gray-500">Avg Deviation</p>
                </div>
              </div>

              {/* Filters Row */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by ID or vehicle..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
                <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DateRangePreset)}>
                  <SelectTrigger className="w-32 h-9 text-sm">
                    <Calendar className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={resultFilter} onValueChange={(v) => setResultFilter(v as ResultFilter)}>
                  <SelectTrigger className="w-28 h-9 text-sm">
                    <Filter className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Results</SelectItem>
                    <SelectItem value="pass">Passed</SelectItem>
                    <SelectItem value="fail">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => refetchTests()} className="h-9">
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportTests} className="h-9">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export
                </Button>
              </div>

              {/* Scale Tests Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="font-semibold text-gray-900 h-10 text-xs">Date/Time</TableHead>
                      <TableHead className="font-semibold text-gray-900 h-10 text-xs">Type</TableHead>
                      <TableHead className="font-semibold text-gray-900 h-10 text-xs">Expected</TableHead>
                      <TableHead className="font-semibold text-gray-900 h-10 text-xs">Actual</TableHead>
                      <TableHead className="font-semibold text-gray-900 h-10 text-xs">Deviation</TableHead>
                      <TableHead className="font-semibold text-gray-900 h-10 text-xs">Result</TableHead>
                      <TableHead className="font-semibold text-gray-900 h-10 text-xs">Vehicle</TableHead>
                      <TableHead className="font-semibold text-gray-900 h-10 text-xs">Operator</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingTests ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                          <p className="text-sm text-gray-500 mt-2">Loading scale tests...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredTests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <AlertCircle className="h-5 w-5 mx-auto text-gray-400" />
                          <p className="text-sm text-gray-500 mt-2">No scale tests found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTests.map((test) => (
                        <TableRow key={test.id} className="hover:bg-gray-50">
                          <TableCell className="text-xs py-2.5">
                            {format(new Date(test.carriedAt), 'MMM dd, HH:mm')}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {test.testType === 'calibration_weight' ? 'Calibration' : 'Vehicle'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs py-2.5 font-mono">
                            {test.testWeightKg?.toLocaleString()} kg
                          </TableCell>
                          <TableCell className="text-xs py-2.5 font-mono">
                            {test.actualWeightKg?.toLocaleString()} kg
                          </TableCell>
                          <TableCell className="text-xs py-2.5">
                            <span className={cn(
                              "font-mono",
                              test.deviationKg && test.deviationKg > 0 ? "text-red-600" : "text-green-600"
                            )}>
                              {test.deviationKg ? `${test.deviationKg > 0 ? '+' : ''}${test.deviationKg}` : '0'} kg
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5">
                            {test.result === 'pass' ? (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px]">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Pass
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[10px]">
                                <XCircle className="h-3 w-3 mr-1" />
                                Fail
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-2.5">
                            {test.vehiclePlate || '-'}
                          </TableCell>
                          <TableCell className="text-xs py-2.5 text-gray-500">
                            {test.carriedByName || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </TabsContent>

          {/* Recent Activity Tab */}
          <TabsContent value="recent" className="mt-0">
            <CardContent className="p-0">
              {/* Refresh button */}
              <div className="flex justify-end px-4 pt-3 pb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchRecentWeighings()}
                  className="h-7 text-xs text-gray-500"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-gray-100">
                    <TableHead className="font-semibold text-gray-900 h-10 pl-4 text-xs">Vehicle</TableHead>
                    <TableHead className="font-semibold text-gray-900 h-10 text-xs">Weight</TableHead>
                    <TableHead className="font-semibold text-gray-900 h-10 text-xs">Type</TableHead>
                    <TableHead className="font-semibold text-gray-900 h-10 text-xs">Status</TableHead>
                    <TableHead className="font-semibold text-gray-900 h-10 pr-4 text-xs">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingRecentWeighings ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                        <p className="text-sm text-gray-500 mt-2">Loading recent activity...</p>
                      </TableCell>
                    </TableRow>
                  ) : recentWeighings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Activity className="h-5 w-5 mx-auto text-gray-400" />
                        <p className="text-sm text-gray-500 mt-2">No recent weighing activity</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentWeighings.map((weighing) => (
                      <TableRow key={weighing.id} className="hover:bg-gray-50 border-b border-gray-50">
                        <TableCell className="font-medium text-gray-900 py-3 pl-4 text-xs">{weighing.vehicleNumber}</TableCell>
                        <TableCell className="text-gray-600 py-3 text-xs font-mono">
                          {weighing.weight.toLocaleString()} kg
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="font-normal text-[10px] rounded-md border-gray-300 text-gray-700">
                            {weighing.weighingType === 'mobile' ? 'Mobile' : 'Multideck'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">{getStatusBadge(weighing.status)}</TableCell>
                        <TableCell className="text-gray-600 py-3 pr-4 text-xs">{weighing.time}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
