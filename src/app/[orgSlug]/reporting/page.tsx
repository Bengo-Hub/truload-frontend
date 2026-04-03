'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ChartWrapper } from '@/components/charts';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModuleReportSelector } from '@/components/reporting/ModuleReportSelector';
import { SupersetDashboard } from '@/components/reporting/SupersetDashboard';
import { NaturalLanguageQuery } from '@/components/reporting/NaturalLanguageQuery';
import {
  useComplianceTrend,
  useRevenueByStation,
  useMonthlyRevenueData,
  useCaseTrend,
} from '@/hooks/queries';
import { getIsHqUser, getStationId } from '@/lib/auth/token';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useOrgSlug } from '@/hooks/useOrgSlug';

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
  const orgSlug = useOrgSlug();
  const { formatAmount } = useCurrency();
  const formatKES = useCallback((v: number) => formatAmount(v, 'KES'), [formatAmount]);
  const [activeTab, setActiveTab] = useState('general');
  const { isEnforcement } = useModuleAccess();

  const defaultRange = useMemo(() => getDefaultReportDateRange(), []);
  const defaultStation = useMemo(() => getDefaultReportStationId(), []);

  const filters = useMemo(
    () => ({
      dateFrom: defaultRange.dateFrom,
      dateTo: defaultRange.dateTo,
      stationId: defaultStation,
      weighingType: 'all',
      controlStatus: 'all',
    }),
    [defaultRange, defaultStation]
  );

  // Chart data for analytics charts
  const { data: complianceTrend, isLoading: loadingCompliance } = useComplianceTrend(filters);
  const { data: revenueByStation, isLoading: loadingRevenue } = useRevenueByStation(filters);
  const { data: monthlyRevenue, isLoading: loadingMonthly } = useMonthlyRevenueData(filters);
  const { data: caseTrend, isLoading: loadingCaseTrend } = useCaseTrend(filters);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
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

          {/* Quick access to specialized reports */}
          {isEnforcement && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Specialized Reports</CardTitle>
                <CardDescription>In-depth analytical reports for prosecution and enforcement</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/${orgSlug}/reporting/habitual-offenders`}>
                  <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium">Habitual Offenders Report</p>
                        <p className="text-sm text-muted-foreground">
                          Vehicles with multiple prosecutions, conviction ladders, and fine totals
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Charts Section */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-lg">Analytics Charts</CardTitle>
                <CardDescription>Visual data insights across all modules</CardDescription>
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
                {isEnforcement && (
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
                )}
              </div>
              {isEnforcement && (
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
              )}
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
