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
import {
  useDashboardStatistics,
  useComplianceTrend,
  useRevenueByStation,
  useMonthlyRevenueData,
  useCaseTrend,
} from '@/hooks/queries';
import {
  Brain,
  FileText,
  Gavel,
  RefreshCcw,
  Scale,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { useCurrency } from '@/hooks/useCurrency';

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

  const filters = {};

  const {
    caseStats,
    yardStats,
    prosecutionStats,
    weighingStats,
    isLoading,
    refetch,
  } = useDashboardStatistics(filters);

  // Chart data for analytics charts
  const { data: complianceTrend } = useComplianceTrend(filters);
  const { data: revenueByStation } = useRevenueByStation(filters);
  const { data: monthlyRevenue } = useMonthlyRevenueData(filters);
  const { data: caseTrend } = useCaseTrend(filters);

  const getStatValue = (stats: unknown, key: string, defaultValue = 0): number => {
    if (stats && typeof stats === 'object' && key in stats) {
      return Number((stats as Record<string, unknown>)[key]) || defaultValue;
    }
    return defaultValue;
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
