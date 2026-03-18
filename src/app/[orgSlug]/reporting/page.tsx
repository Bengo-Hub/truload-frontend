'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ChartWrapper, StatCard } from '@/components/charts';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModuleReportSelector } from '@/components/reporting/ModuleReportSelector';
import { SupersetDashboard } from '@/components/reporting/SupersetDashboard';
import { NaturalLanguageQuery } from '@/components/reporting/NaturalLanguageQuery';
import { StationSelectFilter } from '@/components/filters/StationSelectFilter';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useDashboardStatistics,
  useComplianceTrend,
  useRevenueByStation,
  useMonthlyRevenueData,
  useCaseTrend,
} from '@/hooks/queries';
import { getIsHqUser, getStationId } from '@/lib/auth/token';
import {
  Brain,
  FileText,
  Gavel,
  RefreshCcw,
  Scale,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useCurrency } from '@/hooks/useCurrency';

function getDefaultReportDateRange() {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  return {
    dateFrom: thirtyDaysAgo.toISOString().split('T')[0],
    dateTo: today.toISOString().split('T')[0],
  };
}

function getDefaultReportStationId(): string {
  if (typeof window === 'undefined') return 'all';
  return getIsHqUser() ? 'all' : (getStationId() || 'all');
}

const formatNumber = (value: number) => value.toLocaleString();

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
  const { formatAmount } = useCurrency();
  const formatKES = useCallback((v: number) => formatAmount(v, 'KES'), [formatAmount]);
  const [activeTab, setActiveTab] = useState('general');

  const defaultRange = useMemo(() => getDefaultReportDateRange(), []);
  const defaultStation = useMemo(() => getDefaultReportStationId(), []);
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);
  const [stationId, setStationId] = useState(defaultStation);

  const filters = useMemo(
    () => ({
      dateFrom,
      dateTo,
      stationId,
      weighingType: 'all',
      controlStatus: 'all',
    }),
    [dateFrom, dateTo, stationId]
  );

  const {
    caseStats,
    yardStats,
    prosecutionStats,
    weighingStats,
    isLoading,
    refetch,
  } = useDashboardStatistics(filters);

  // Chart data for analytics charts
  const { data: complianceTrend, isLoading: loadingCompliance } = useComplianceTrend(filters);
  const { data: revenueByStation, isLoading: loadingRevenue } = useRevenueByStation(filters);
  const { data: monthlyRevenue, isLoading: loadingMonthly } = useMonthlyRevenueData(filters);
  const { data: caseTrend, isLoading: loadingCaseTrend } = useCaseTrend(filters);

  const getStatValue = (stats: unknown, key: string, defaultValue = 0): number => {
    if (stats && typeof stats === 'object' && key in stats) {
      return Number((stats as Record<string, unknown>)[key]) || defaultValue;
    }
    return defaultValue;
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Filters for key metrics and charts (date range + station) */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="report-dateFrom">From Date</Label>
              <Input
                id="report-dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-dateTo">To Date</Label>
              <Input
                id="report-dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <StationSelectFilter
                label="Station"
                value={stationId === 'all' ? undefined : stationId}
                onValueChange={(v) => setStationId(v ?? 'all')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Summary */}
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
              value={formatNumber(getStatValue(caseStats, 'totalCases'))}
              icon={FileText}
              color="bg-amber-500"
            />
            <StatCard
              title="Prosecutions"
              value={formatNumber(getStatValue(prosecutionStats, 'totalCases'))}
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
              value={formatKES(getStatValue(prosecutionStats, 'totalFeesKes'))}
              icon={TrendingUp}
              color="bg-emerald-600"
            />
          </>
        )}
      </div>

      {/* Two-Tab Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">General Reports</span>
            <span className="sm:hidden">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="bi" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">BI & AI Custom Reports</span>
            <span className="sm:hidden">BI & AI</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: General Reports */}
        <TabsContent value="general" className="space-y-6">
          {/* Module-filtered predefined reports */}
          <ModuleReportSelector />

          {/* Charts Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Analytics Charts</CardTitle>
                  <CardDescription>Visual data insights across all modules</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                  <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
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
                  isLoading={loadingRevenue}
                />
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ChartWrapper
                  title="Monthly Revenue Trend"
                  subtitle="Fee collection over time (KES)"
                  data={monthlyRevenue ?? []}
                  series={[{ dataKey: 'revenue', name: 'Revenue', color: '#10b981' }]}
                  defaultChartType="line"
                  allowedChartTypes={['line', 'bar']}
                  valueFormatter={formatKES}
                  isLoading={loadingMonthly}
                />
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: BI & AI Custom Reports */}
        <TabsContent value="bi" className="space-y-6">
          {/* Superset Dashboards */}
          <SupersetDashboard />

          {/* Natural Language Query */}
          <NaturalLanguageQuery />
        </TabsContent>
      </Tabs>
    </div>
  );
}
