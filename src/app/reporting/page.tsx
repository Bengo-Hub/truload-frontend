'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ChartWrapper, StatCard } from '@/components/charts';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useDashboardStatistics,
  useComplianceTrend,
  useRevenueByStation,
  useMonthlyRevenueData,
  useCaseTrend,
  usePaymentMethods,
  useTopOffenders,
  useStationPerformance,
  useProsecutionTrend,
} from '@/hooks/queries';
import {
  BarChart3,
  Calendar,
  Download,
  FileText,
  Filter,
  Gavel,
  LayoutDashboard,
  Loader2,
  RefreshCcw,
  Scale,
  Search,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

// Currency formatter for KES
const formatKES = (value: number) => `KES ${value.toLocaleString()}`;
const formatNumber = (value: number) => value.toLocaleString();

/**
 * Reporting & Analytics Page
 *
 * Features:
 * - Analytics dashboard with key metrics
 * - Pre-built report templates
 * - Export functionality
 * - Date range filtering
 * - Future: Superset dashboard embedding
 * - Future: Natural language query interface
 */
export default function ReportingPage() {
  return (
    <AppShell title="Reports & Analytics" subtitle="Data insights and report generation">
      <ProtectedRoute requiredPermissions={['analytics.read']}>
        <ReportingContent />
      </ProtectedRoute>
    </AppShell>
  );
}

function ReportingContent() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedStation, setSelectedStation] = useState('all');

  const filters = {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    stationId: selectedStation !== 'all' ? selectedStation : undefined,
  };

  // Fetch statistics
  const {
    caseStats,
    yardStats,
    prosecutionStats,
    weighingStats,
    isLoading,
    refetch,
  } = useDashboardStatistics(filters);

  // Fetch chart data
  const { data: complianceTrend, isLoading: loadingCompliance } = useComplianceTrend(filters);
  const { data: revenueByStation, isLoading: loadingRevStation } = useRevenueByStation(filters);
  const { data: monthlyRevenue, isLoading: loadingMonthlyRev } = useMonthlyRevenueData(filters);
  const { data: caseTrend, isLoading: loadingCaseTrend } = useCaseTrend(filters);
  const { data: paymentMethods, isLoading: loadingPayments } = usePaymentMethods(filters);
  const { data: topOffenders, isLoading: loadingOffenders } = useTopOffenders(filters);
  const { data: stationPerf, isLoading: loadingStations } = useStationPerformance(filters);
  const { data: prosecutionTrend, isLoading: loadingProsecution } = useProsecutionTrend(filters);

  // Export to CSV
  const exportReport = (reportType: string) => {
    toast.success(`Exporting ${reportType} report...`);
    // TODO: Implement actual export logic
  };

  // Helper to get stat values
  const getStatValue = (stats: unknown, key: string, defaultValue = 0): number => {
    if (stats && typeof stats === 'object' && key in stats) {
      return Number((stats as Record<string, unknown>)[key]) || defaultValue;
    }
    return defaultValue;
  };

  // Pre-built report templates
  const reportTemplates = [
    {
      id: 'weighing-summary',
      name: 'Daily Weighing Summary',
      description: 'Compliance statistics and transaction counts by station',
      icon: Scale,
      color: 'bg-blue-500',
    },
    {
      id: 'revenue-report',
      name: 'Revenue Report',
      description: 'Fee collection and payment method breakdown',
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      id: 'prosecution-report',
      name: 'Prosecution Statistics',
      description: 'Cases by status, fines, and court outcomes',
      icon: Gavel,
      color: 'bg-purple-500',
    },
    {
      id: 'offender-report',
      name: 'Repeat Offenders',
      description: 'Drivers and transporters with multiple violations',
      icon: Truck,
      color: 'bg-red-500',
    },
    {
      id: 'station-performance',
      name: 'Station Performance',
      description: 'Weighings, compliance rates, and revenue by station',
      icon: BarChart3,
      color: 'bg-amber-500',
    },
    {
      id: 'case-register',
      name: 'Case Register Report',
      description: 'All cases by status, violation type, and resolution',
      icon: FileText,
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header with Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg">Analytics Filters</CardTitle>
              <CardDescription>Filter data by date range and station</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Station</Label>
              <Select value={selectedStation} onValueChange={setSelectedStation}>
                <SelectTrigger>
                  <SelectValue placeholder="All Stations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stations</SelectItem>
                  {/* Station options would be populated from API */}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setSelectedStation('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different report views */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Charts</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <StatCard
                  title="Total Weighings"
                  value={formatNumber(getStatValue(weighingStats, 'totalWeighings'))}
                  icon={Scale}
                  color="bg-blue-500"
                />
                <StatCard
                  title="Compliance Rate"
                  value={`${getStatValue(weighingStats, 'complianceRate')}%`}
                  icon={TrendingUp}
                  color="bg-green-500"
                />
                <StatCard
                  title="Total Cases"
                  value={formatNumber(getStatValue(caseStats, 'total'))}
                  icon={FileText}
                  color="bg-amber-500"
                />
                <StatCard
                  title="Prosecutions"
                  value={formatNumber(getStatValue(prosecutionStats, 'total'))}
                  icon={Gavel}
                  color="bg-purple-500"
                />
                <StatCard
                  title="Vehicles in Yard"
                  value={formatNumber(getStatValue(yardStats, 'totalPending'))}
                  icon={Truck}
                  color="bg-orange-500"
                />
                <StatCard
                  title="Total Fines (KES)"
                  value={formatKES(getStatValue(prosecutionStats, 'totalFinesKes'))}
                  icon={TrendingUp}
                  color="bg-emerald-600"
                />
              </>
            )}
          </div>

          {/* Main Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartWrapper
              title="Compliance Trend"
              subtitle="Legal vs overloaded vehicles over time"
              data={complianceTrend ?? []}
              series={[
                { dataKey: 'compliant', name: 'Compliant', color: '#10b981' },
                { dataKey: 'overloaded', name: 'Overloaded', color: '#ef4444' },
              ]}
              defaultChartType="line"
              allowedChartTypes={['line', 'bar']}
              isLoading={loadingCompliance}
            />
            <ChartWrapper
              title="Revenue by Station"
              subtitle="Fee collection performance"
              data={revenueByStation ?? []}
              series={[{ dataKey: 'revenue', name: 'Revenue (KES)', color: '#3b82f6' }]}
              defaultChartType="bar"
              allowedChartTypes={['bar', 'pie']}
              valueFormatter={formatKES}
              isLoading={loadingRevStation}
            />
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reportTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg ${template.color}`}>
                      <template.icon className="h-5 w-5 text-white" />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => exportReport(template.name)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="text-base mt-2">{template.name}</CardTitle>
                  <CardDescription className="text-sm">{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => exportReport(template.name)}
                  >
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Future: Superset Integration Notice */}
          <Card className="border-dashed border-2">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center text-center py-8">
                <div className="p-3 rounded-full bg-blue-100 mb-4">
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Advanced Analytics Coming Soon</h3>
                <p className="text-muted-foreground max-w-md">
                  Apache Superset integration will enable interactive BI dashboards,
                  custom visualizations, and natural language queries.
                </p>
                <Badge variant="secondary" className="mt-4">Planned for Sprint 14</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartWrapper
              title="Monthly Revenue Trend"
              subtitle="Fee collection over time (KES)"
              data={monthlyRevenue ?? []}
              series={[{ dataKey: 'revenue', name: 'Revenue', color: '#10b981' }]}
              defaultChartType="line"
              allowedChartTypes={['line', 'bar']}
              valueFormatter={formatKES}
              isLoading={loadingMonthlyRev}
            />
            <ChartWrapper
              title="Payment Methods"
              subtitle="Collection by payment type"
              data={paymentMethods ?? []}
              series={[{ dataKey: 'amount', name: 'Amount (KES)', color: '#3b82f6' }]}
              defaultChartType="donut"
              allowedChartTypes={['donut', 'pie', 'bar']}
              valueFormatter={formatKES}
              isLoading={loadingPayments}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartWrapper
              title="Case Trend"
              subtitle="New vs closed cases over time"
              data={caseTrend ?? []}
              series={[
                { dataKey: 'opened', name: 'Opened', color: '#f59e0b' },
                { dataKey: 'closed', name: 'Closed', color: '#10b981' },
              ]}
              defaultChartType="line"
              allowedChartTypes={['line', 'bar']}
              isLoading={loadingCaseTrend}
            />
            <ChartWrapper
              title="Prosecution Trend"
              subtitle="New cases vs payments"
              data={prosecutionTrend ?? []}
              series={[
                { dataKey: 'newCases', name: 'New Cases', color: '#f59e0b' },
                { dataKey: 'paid', name: 'Paid', color: '#10b981' },
              ]}
              defaultChartType="line"
              allowedChartTypes={['line', 'bar']}
              isLoading={loadingProsecution}
            />
          </div>

          <ChartWrapper
            title="Station Performance"
            subtitle="Weighings and compliance rates across stations"
            data={stationPerf ?? []}
            series={[
              { dataKey: 'weighings', name: 'Weighings', color: '#3b82f6' },
              { dataKey: 'compliance', name: 'Compliance %', color: '#10b981' },
            ]}
            defaultChartType="bar"
            allowedChartTypes={['bar', 'line']}
            isLoading={loadingStations}
          />

          <ChartWrapper
            title="Top Repeat Offenders"
            subtitle="Drivers with highest demerit points"
            data={topOffenders ?? []}
            series={[
              { dataKey: 'points', name: 'Demerit Points', color: '#ef4444' },
              { dataKey: 'violations', name: 'Violations', color: '#f59e0b' },
            ]}
            defaultChartType="bar"
            allowedChartTypes={['bar']}
            isLoading={loadingOffenders}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
