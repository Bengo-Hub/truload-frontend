'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ChartWrapper } from '@/components/charts';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModuleReportSelector } from '@/components/reporting/ModuleReportSelector';
import { CustomReportBuilder } from '@/components/reporting/CustomReportBuilder';
import { SupersetDashboard } from '@/components/reporting/SupersetDashboard';
import { NaturalLanguageQuery } from '@/components/reporting/NaturalLanguageQuery';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import {
  useComplianceTrend,
  useRevenueByStation,
  useMonthlyRevenueData,
  useCaseTrend,
  useCommercialThroughput,
  useTopTransporters,
  useCargoVolumeByType,
  useTonnageTrend,
  useToleranceTrend,
  useStationPerformance,
} from '@/hooks/queries';
import { getIsHqUser, getStationId } from '@/lib/auth/token';
import { getEatQuickRange } from '@/lib/utils/dateRange';
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

// EAT-anchored (not `new Date().toISOString()`, which shifts the calendar day near EAT midnight
// depending on the viewer's timezone — see src/lib/utils/dateRange.ts).
function getDefaultReportDateRange() {
  const { from, to } = getEatQuickRange('thisMonth');
  return { dateFrom: from, dateTo: to };
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
  const { isEnforcement, isCommercial } = useModuleAccess();

  const defaultRange = useMemo(() => getDefaultReportDateRange(), []);
  const defaultStation = useMemo(() => getDefaultReportStationId(), []);
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);

  const filters = useMemo(
    () => ({
      dateFrom,
      dateTo,
      stationId: defaultStation,
      weighingType: 'all',
      controlStatus: 'all',
    }),
    [dateFrom, dateTo, defaultStation]
  );

  // Chart data for analytics charts — enforcement-only queries are skipped (passed undefined) for
  // commercial tenants rather than fetched and then hidden, matching the Dashboard page's pattern.
  const { data: complianceTrend, isLoading: loadingCompliance } = useComplianceTrend(isEnforcement ? filters : undefined);
  const { data: revenueByStation, isLoading: loadingRevenue } = useRevenueByStation(filters);
  const { data: monthlyRevenue, isLoading: loadingMonthly } = useMonthlyRevenueData(isEnforcement ? filters : undefined);
  const { data: caseTrend, isLoading: loadingCaseTrend } = useCaseTrend(isEnforcement ? filters : undefined);
  const { data: throughputData, isLoading: loadingThroughput } = useCommercialThroughput(isCommercial ? filters : undefined);
  const { data: topTransporters, isLoading: loadingTransporters } = useTopTransporters(isCommercial ? filters : undefined);
  const { data: cargoVolume, isLoading: loadingCargo } = useCargoVolumeByType(isCommercial ? filters : undefined);
  const { data: tonnageTrend, isLoading: loadingTonnageTrend } = useTonnageTrend(isCommercial ? filters : undefined, 'Day');
  const { data: toleranceTrend, isLoading: loadingToleranceTrend } = useToleranceTrend(isCommercial ? filters : undefined);
  const { data: stationPerf, isLoading: loadingStationPerf } = useStationPerformance(isCommercial ? filters : undefined);

  const stationUtilizationDisplay = useMemo(() =>
    (stationPerf ?? []).map(s => ({
      name: s.stationName,
      weighings: s.totalWeighings,
      avgProcessingMinutes: Math.round((s.avgProcessingTime / 60) * 10) / 10,
    })),
    [stationPerf]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <Card>
        <CardContent className="pt-4">
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onRangeChange={(from, to) => { setDateFrom(from); setDateTo(to); }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:max-w-md"
          />
        </CardContent>
      </Card>

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
          {/* Quick Reports (catalog-driven, fixed layout) vs. Custom Builder (curated
              column/chart selection per report type) - the builder is a variant of this same
              catalog-driven flow, not a different tool (that's "BI & AI" below). */}
          <Tabs defaultValue="quick" className="w-full">
            <TabsList>
              <TabsTrigger value="quick">Quick Reports</TabsTrigger>
              <TabsTrigger value="builder">Custom Builder</TabsTrigger>
            </TabsList>
            <TabsContent value="quick" className="mt-4">
              <ModuleReportSelector />
            </TabsContent>
            <TabsContent value="builder" className="mt-4">
              <CustomReportBuilder />
            </TabsContent>
          </Tabs>

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
                {isEnforcement && (
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
                )}
                {isCommercial && (
                  <ChartWrapper
                    title="Top Transporters"
                    subtitle="Transporters by trip count"
                    data={topTransporters ?? []}
                    series={[
                      { dataKey: 'trips', name: 'Trips', color: '#3b82f6' },
                      { dataKey: 'totalNetWeightKg', name: 'Net Weight (kg)', color: '#10b981' },
                    ]}
                    defaultChartType="bar"
                    allowedChartTypes={['bar']}
                    isLoading={loadingTransporters}
                  />
                )}
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
              {isCommercial && (
                <ChartWrapper
                  title="Tonnage Trend"
                  subtitle="Net weight captured per day (kg) — the rollup a tonnage-billed tenant invoices off"
                  data={(tonnageTrend ?? []).map(t => ({ ...t, totalNetWeightTons: Math.round(t.totalNetWeightKg / 1000) }))}
                  series={[{ dataKey: 'totalNetWeightTons', name: 'Net Weight (tons)', color: '#0891b2' }]}
                  defaultChartType="line"
                  allowedChartTypes={['line', 'bar']}
                  isLoading={loadingTonnageTrend}
                />
              )}
              {isCommercial && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <ChartWrapper
                    title="Cargo Volume by Type"
                    subtitle="Weight distribution across cargo types"
                    data={cargoVolume ?? []}
                    series={[{ dataKey: 'volumeKg', name: 'Volume (kg)', color: '#8b5cf6' }]}
                    defaultChartType="donut"
                    allowedChartTypes={['donut', 'pie', 'bar']}
                    isLoading={loadingCargo}
                  />
                  <ChartWrapper
                    title="Throughput Trend"
                    subtitle="Vehicles processed per hour over time"
                    data={throughputData ?? []}
                    series={[{ dataKey: 'vehiclesPerHour', name: 'Vehicles/Hour', color: '#06b6d4' }]}
                    defaultChartType="line"
                    allowedChartTypes={['line', 'bar']}
                    isLoading={loadingThroughput}
                  />
                </div>
              )}
              {isCommercial && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <ChartWrapper
                    title="Tolerance Exception Trend"
                    subtitle="Declared-vs-measured weight discrepancy rate over time"
                    data={toleranceTrend ?? []}
                    series={[
                      { dataKey: 'toleranceExceptionRate', name: 'Exception Rate (%)', color: '#f43f5e' },
                      { dataKey: 'toleranceExceededCount', name: 'Exceptions', color: '#f97316' },
                    ]}
                    defaultChartType="line"
                    allowedChartTypes={['line', 'bar']}
                    isLoading={loadingToleranceTrend}
                  />
                  <ChartWrapper
                    title="Station Utilization"
                    subtitle="Weighings processed and avg. turnaround (min) per station"
                    data={stationUtilizationDisplay}
                    series={[
                      { dataKey: 'weighings', name: 'Weighings', color: '#3b82f6' },
                      { dataKey: 'avgProcessingMinutes', name: 'Avg. Turnaround (min)', color: '#f59e0b' },
                    ]}
                    defaultChartType="bar"
                    allowedChartTypes={['bar', 'line']}
                    isLoading={loadingStationPerf}
                  />
                </div>
              )}
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
