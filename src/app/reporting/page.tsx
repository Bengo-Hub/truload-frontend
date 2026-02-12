'use client';

import { exportArrayToCSV } from '@/lib/utils/export';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ChartWrapper, StatCard } from '@/components/charts';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModuleReportSelector } from '@/components/reporting/ModuleReportSelector';
import { SupersetDashboard } from '@/components/reporting/SupersetDashboard';
import { NaturalLanguageQuery } from '@/components/reporting/NaturalLanguageQuery';
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
  Brain,
  FileText,
  Gavel,
  RefreshCcw,
  Scale,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const formatKES = (value: number) => `KES ${value.toLocaleString()}`;
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
  const [activeTab, setActiveTab] = useState('general');

  const filters = {};

  const {
    caseStats,
    yardStats,
    prosecutionStats,
    weighingStats,
    isLoading,
    refetch,
  } = useDashboardStatistics(filters);

  // Chart data for general reports
  const { data: complianceTrend } = useComplianceTrend(filters);
  const { data: revenueByStation } = useRevenueByStation(filters);
  const { data: monthlyRevenue } = useMonthlyRevenueData(filters);
  const { data: caseTrend } = useCaseTrend(filters);
  const { data: paymentMethods } = usePaymentMethods(filters);
  const { data: topOffenders } = useTopOffenders(filters);
  const { data: stationPerf } = useStationPerformance(filters);
  const { data: prosecutionTrend } = useProsecutionTrend(filters);

  const getStatValue = (stats: unknown, key: string, defaultValue = 0): number => {
    if (stats && typeof stats === 'object' && key in stats) {
      return Number((stats as Record<string, unknown>)[key]) || defaultValue;
    }
    return defaultValue;
  };

  // Export handler for ModuleReportSelector
  const handleExport = (reportId: string, dateFrom?: string, dateTo?: string) => {
    const dataMap: Record<string, { data: unknown[] | undefined; filename: string }> = {
      'daily-weighing': { data: complianceTrend as unknown[] | undefined, filename: 'weighing_summary' },
      'weighing-compliance': { data: complianceTrend as unknown[] | undefined, filename: 'compliance_trend' },
      'axle-overload': { data: complianceTrend as unknown[] | undefined, filename: 'axle_overload' },
      'revenue-report': { data: monthlyRevenue as unknown[] | undefined, filename: 'revenue_report' },
      'invoice-aging': { data: monthlyRevenue as unknown[] | undefined, filename: 'invoice_aging' },
      'payment-reconciliation': { data: paymentMethods as unknown[] | undefined, filename: 'payment_reconciliation' },
      'prosecution-report': { data: prosecutionTrend as unknown[] | undefined, filename: 'prosecution_report' },
      'court-calendar': { data: prosecutionTrend as unknown[] | undefined, filename: 'court_calendar' },
      'repeat-offenders': { data: topOffenders as unknown[] | undefined, filename: 'repeat_offenders' },
      'case-register': { data: caseTrend as unknown[] | undefined, filename: 'case_register' },
      'station-performance': { data: stationPerf as unknown[] | undefined, filename: 'station_performance' },
      'yard-occupancy': { data: revenueByStation as unknown[] | undefined, filename: 'yard_occupancy' },
      'system-audit-log': { data: undefined, filename: 'audit_log' },
    };

    const entry = dataMap[reportId];
    if (!entry?.data || !Array.isArray(entry.data) || entry.data.length === 0) {
      toast.error('No data available to export. Try adjusting the date range.');
      return;
    }

    const suffix = dateFrom && dateTo ? `_${dateFrom}_to_${dateTo}` : '';
    exportArrayToCSV(entry.data as Record<string, unknown>[], `${entry.filename}${suffix}`);
    toast.success('Report exported successfully');
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
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
          <ModuleReportSelector onExport={handleExport} />

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
                  isLoading={isLoading}
                />
                <ChartWrapper
                  title="Revenue by Station"
                  subtitle="Fee collection performance"
                  data={revenueByStation ?? []}
                  series={[{ dataKey: 'revenue', name: 'Revenue (KES)', color: '#3b82f6' }]}
                  defaultChartType="bar"
                  allowedChartTypes={['bar', 'pie']}
                  valueFormatter={formatKES}
                  isLoading={isLoading}
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
                  isLoading={isLoading}
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
                  isLoading={isLoading}
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
