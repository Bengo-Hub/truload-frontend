/**
 * Dashboard page with real-time analytics organized by module tabs.
 * Each tab component fetches only its own data to avoid overwhelming
 * the backend with too many concurrent requests.
 * Default currency: KES (Kenyan Shillings) per Traffic Act requirements.
 */

'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ChartWrapper, DashboardFilters, StatCard } from '@/components/charts';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardFilterProvider, useDashboardFilters } from '@/contexts/DashboardFilterContext';
import {
  DASHBOARD_QUERY_KEYS,
  useAxleViolations,
  useCaseDisposition,
  useCaseTrend,
  useComplianceTrend,
  useDashboardCaseStats,
  useDashboardHearingOutcomes,
  useDashboardInvoiceStats,
  useDashboardProsecutionStats,
  useDashboardReceiptStats,
  useDashboardTagStats,
  useDashboardWeighingStats,
  useDashboardYardStats,
  useInvoiceAging,
  useMonthlyRevenueData,
  useOverloadDistribution,
  usePaymentMethods,
  useProsecutionByStatus,
  useProsecutionTrend,
  useRevenueByStation,
  useStationPerformance,
  useTagTrend,
  useTagsByCategory,
  useTopOffenders,
  useUserStatistics,
  useUsersByStation,
  useVehicleDistributionData,
  useYardProcessingTrend,
} from '@/hooks/queries';
import { useHasPermission, useUser } from '@/hooks/useAuth';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useCurrency } from '@/hooks/useCurrency';
import type { DashboardFilterParams } from '@/lib/api/dashboard';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Banknote,
  CheckCircle,
  FileText,
  Gavel,
  LayoutDashboard,
  Percent,
  RefreshCcw,
  Scale,
  Tag,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

const formatNumber = (value: number) => value.toLocaleString();

// ============================================================================
// Loading Skeleton Components
// ============================================================================

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full" style={{ height }} />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Permission-Gated Section Component
// ============================================================================

interface PermissionGateProps {
  permissions: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function PermissionGate({ permissions, children, fallback = null }: PermissionGateProps) {
  const hasPermission = useHasPermission(permissions, 'any');
  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getStatValue(stats: unknown, key: string, defaultValue = 0): number {
  if (stats && typeof stats === 'object' && key in stats) {
    return Number((stats as Record<string, unknown>)[key]) || defaultValue;
  }
  return defaultValue;
}

// ============================================================================
// Tab Props Interface
// ============================================================================

interface TabProps {
  filters?: DashboardFilterParams;
  isCommercial?: boolean;
}

// ============================================================================
// Overview Tab - Fetches summary stats + key charts
// ============================================================================

function OverviewTab({ filters, isCommercial }: TabProps) {
  const { formatAmount } = useCurrency();
  const formatKES = useCallback((v: number) => formatAmount(v, 'KES'), [formatAmount]);
  const isEnforcement = !isCommercial;

  // Commercial: only weighing stats + revenue. Enforcement: full suite.
  // Passing undefined disables the query entirely (enabled: !!filters in hook).
  const { data: weighingStats, isLoading: loadingWeighing } = useDashboardWeighingStats(filters);
  const { data: caseStats } = useDashboardCaseStats(isEnforcement ? filters : undefined);
  const { data: yardStats } = useDashboardYardStats(isEnforcement ? filters : undefined);
  const { data: userStats, isLoading: loadingUserStats } = useUserStatistics();
  const { data: complianceTrend, isLoading: loadingCompliance } = useComplianceTrend(isEnforcement ? filters : undefined);
  const { data: revenueByStation, isLoading: loadingRevStation } = useRevenueByStation(filters);
  // Station performance has compliance rates — enforcement only
  const { data: stationPerf, isLoading: loadingStations } = useStationPerformance(isEnforcement ? filters : undefined);
  const { data: usersByStation, isLoading: loadingUsersByStation } = useUsersByStation();

  const isLoading = loadingWeighing;

  return (
    <div className="space-y-6">
      {/* Row 1: KPI stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading || loadingUserStats ? (
          Array.from({ length: isCommercial ? 4 : 6 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <PermissionGate permissions="weighing.read">
              <StatCard title="Today's Weighings" value={formatNumber(getStatValue(weighingStats, 'totalWeighings'))} icon={Scale} color="bg-blue-500" />
            </PermissionGate>
            {isEnforcement && (
              <PermissionGate permissions="weighing.read">
                <StatCard title="Compliance Rate" value={`${getStatValue(weighingStats, 'complianceRate')}%`} icon={Percent} color="bg-green-500" />
              </PermissionGate>
            )}
            <PermissionGate permissions="weighing.read">
              <StatCard title="Total Fees (KES)" value={formatKES(getStatValue(weighingStats, 'totalFeesKes'))} rawValue={getStatValue(weighingStats, 'totalFeesKes')} icon={Banknote} color="bg-emerald-600" />
            </PermissionGate>
            {isEnforcement && (
              <PermissionGate permissions="case.read">
                <StatCard title="Open Cases" value={formatNumber(getStatValue(caseStats, 'openCases'))} icon={FileText} color="bg-amber-500" />
              </PermissionGate>
            )}
            {isEnforcement && (
              <PermissionGate permissions="yard.read">
                <StatCard title="Vehicles in Yard" value={formatNumber(getStatValue(yardStats, 'totalPending'))} icon={Truck} color="bg-orange-500" />
              </PermissionGate>
            )}
            {isCommercial && (
              <PermissionGate permissions="weighing.read">
                <StatCard title="Transporters Served" value={formatNumber(getStatValue(weighingStats, 'totalWeighings'))} icon={Truck} color="bg-amber-500" />
              </PermissionGate>
            )}
            <PermissionGate permissions="user.read">
              <StatCard title="Active Users" value={formatNumber(userStats?.activeUsers ?? 0)} icon={Users} color="bg-purple-500" />
            </PermissionGate>
          </>
        )}
      </div>

      {/* Row 2: Charts — enforcement: compliance trend + revenue; commercial: revenue only */}
      <div className="grid grid-cols-1 gap-6">
        {isEnforcement && (
          <PermissionGate permissions="weighing.read">
            <ChartWrapper title="Compliance Trend" subtitle="Daily compliance vs overload distribution" data={complianceTrend ?? []} series={[{ dataKey: 'compliant', name: 'Compliant', color: '#10b981' }, { dataKey: 'overloaded', name: 'Overloaded', color: '#ef4444' }]} defaultChartType="line" allowedChartTypes={['line', 'bar']} isLoading={loadingCompliance} />
          </PermissionGate>
        )}
        <PermissionGate permissions={isCommercial ? 'weighing.read' : 'receipt.read'}>
          <ChartWrapper title="Revenue by Station" subtitle="Fee collection performance by weighbridge" data={revenueByStation ?? []} series={[{ dataKey: 'revenue', name: 'Revenue (KES)', color: '#3b82f6' }]} defaultChartType="bar" allowedChartTypes={['bar', 'pie']} valueFormatter={formatKES} isLoading={loadingRevStation} />
        </PermissionGate>
      </div>

      {/* Row 3: Station Performance (enforcement only — has compliance rates) and Users by Station */}
      <div className={`grid grid-cols-1 gap-6 ${isEnforcement ? 'lg:grid-cols-2' : ''}`}>
        {isEnforcement && (
          <PermissionGate permissions="weighing.read">
            <ChartWrapper title="Station Performance" subtitle="Weighings and compliance rates across stations" data={stationPerf ?? []} series={[{ dataKey: 'weighings', name: 'Weighings', color: '#3b82f6' }, { dataKey: 'compliance', name: 'Compliance %', color: '#10b981' }]} defaultChartType="bar" allowedChartTypes={['bar', 'line']} isLoading={loadingStations} />
          </PermissionGate>
        )}
        <PermissionGate permissions="user.read">
          <ChartWrapper title="Users by Station" subtitle="Staff distribution across weighbridges" data={usersByStation ?? []} series={[{ dataKey: 'count', name: 'Users', color: '#8b5cf6' }]} defaultChartType="bar" allowedChartTypes={['bar', 'pie', 'donut']} isLoading={loadingUsersByStation} />
        </PermissionGate>
      </div>
    </div>
  );
}

// ============================================================================
// Weighing Tab
// ============================================================================

function WeighingTab({ filters, isCommercial }: TabProps) {
  const isEnforcement = !isCommercial;
  const { data: weighingStats, isLoading } = useDashboardWeighingStats(filters);
  // Enforcement-only queries — disabled for commercial (enabled: !!filters guards in hooks)
  const { data: complianceTrend, isLoading: loadingCompliance } = useComplianceTrend(isEnforcement ? filters : undefined);
  const { data: overloadDist, isLoading: loadingOverload } = useOverloadDistribution(isEnforcement ? filters : undefined);
  const { data: axleViolations, isLoading: loadingAxle } = useAxleViolations(isEnforcement ? filters : undefined);
  const { data: vehicleDist, isLoading: loadingVehicles } = useVehicleDistributionData(filters); // relevant to both
  const { data: topOffenders, isLoading: loadingOffenders } = useTopOffenders(isEnforcement ? filters : undefined);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: isCommercial ? 2 : 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Total Weighings" value={formatNumber(getStatValue(weighingStats, 'totalWeighings'))} icon={Scale} color="bg-blue-500" />
            {isEnforcement && (
              <>
                <StatCard title="Compliance Rate" value={`${getStatValue(weighingStats, 'complianceRate')}%`} icon={CheckCircle} color="bg-green-500" />
                <StatCard title="Overloaded Vehicles" value={formatNumber(getStatValue(weighingStats, 'overloadedCount'))} icon={AlertTriangle} color="bg-red-500" />
                <StatCard title="Avg. Overload (kg)" value={formatNumber(getStatValue(weighingStats, 'avgOverloadKg'))} icon={TrendingUp} color="bg-amber-500" />
              </>
            )}
            {isCommercial && (
              <StatCard title="Total Fees (KES)" value={formatNumber(getStatValue(weighingStats, 'totalFeesKes'))} icon={Banknote} color="bg-emerald-500" />
            )}
          </>
        )}
      </div>

      {/* Enforcement-only charts */}
      {isEnforcement && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartWrapper title="Compliance Trend" subtitle="Legal vs overloaded vehicles over time" data={complianceTrend ?? []} series={[{ dataKey: 'compliant', name: 'Legal', color: '#10b981' }, { dataKey: 'overloaded', name: 'Overloaded', color: '#ef4444' }, { dataKey: 'warning', name: 'Warning', color: '#f59e0b' }]} defaultChartType="line" allowedChartTypes={['line', 'bar']} isLoading={loadingCompliance} />
          <ChartWrapper title="Overload Distribution" subtitle="Violations by overload severity band" data={overloadDist ?? []} series={[{ dataKey: 'count', name: 'Vehicles', color: '#ef4444' }]} defaultChartType="bar" allowedChartTypes={['bar', 'pie', 'donut']} isLoading={loadingOverload} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {isEnforcement && (
          <ChartWrapper title="Axle Type Violations" subtitle="Overload violations by axle configuration" data={axleViolations ?? []} series={[{ dataKey: 'count', name: 'Violations', color: '#8b5cf6' }]} defaultChartType="pie" allowedChartTypes={['pie', 'donut', 'bar']} isLoading={loadingAxle} />
        )}
        <ChartWrapper title="Vehicle Type Distribution" subtitle="Weighings by vehicle category" data={vehicleDist ?? []} series={[{ dataKey: 'value', name: 'Count', color: '#06b6d4' }]} defaultChartType="donut" allowedChartTypes={['donut', 'pie', 'bar']} isLoading={loadingVehicles} />
      </div>

      {isEnforcement && (
        <ChartWrapper title="Top Repeat Offenders" subtitle="Drivers with highest demerit points (Risk Assessment)" data={topOffenders ?? []} series={[{ dataKey: 'points', name: 'Demerit Points', color: '#ef4444' }, { dataKey: 'violations', name: 'Violations', color: '#f59e0b' }]} defaultChartType="bar" allowedChartTypes={['bar']} isLoading={loadingOffenders} />
      )}
    </div>
  );
}

// ============================================================================
// Cases Tab
// ============================================================================

function CasesTab({ filters }: TabProps) {
  const { data: caseStats, isLoading } = useDashboardCaseStats(filters);
  const { data: caseTrend, isLoading: loadingCaseTrend } = useCaseTrend(filters);
  const { data: caseDisposition, isLoading: loadingDisposition } = useCaseDisposition(filters);
  const { data: hearingOutcomes, isLoading: loadingHearings } = useDashboardHearingOutcomes(filters);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Total Cases" value={formatNumber(getStatValue(caseStats, 'totalCases'))} icon={FileText} color="bg-indigo-500" />
            <StatCard title="Open Cases" value={formatNumber(getStatValue(caseStats, 'openCases'))} icon={FileText} color="bg-amber-500" />
            <StatCard title="Closed Cases" value={formatNumber(getStatValue(caseStats, 'closedCases'))} icon={CheckCircle} color="bg-green-600" />
            <StatCard title="Escalated Cases" value={formatNumber(getStatValue(caseStats, 'escalatedCases'))} icon={AlertTriangle} color="bg-red-500" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartWrapper title="Case Trend" subtitle="New vs closed cases over time" data={caseTrend ?? []} series={[{ dataKey: 'opened', name: 'Opened', color: '#f59e0b' }, { dataKey: 'closed', name: 'Closed', color: '#10b981' }]} defaultChartType="line" allowedChartTypes={['line', 'bar']} isLoading={loadingCaseTrend} />
        <ChartWrapper title="Case Disposition" subtitle="Resolution method breakdown" data={caseDisposition ?? []} series={[{ dataKey: 'value', name: 'Cases', color: '#3b82f6' }]} defaultChartType="donut" allowedChartTypes={['donut', 'pie', 'bar']} isLoading={loadingDisposition} />
      </div>

      <ChartWrapper title="Court Hearing Outcomes" subtitle="Conviction rates and case outcomes" data={hearingOutcomes ?? []} series={[{ dataKey: 'value', name: 'Cases', color: '#8b5cf6' }]} defaultChartType="pie" allowedChartTypes={['pie', 'donut', 'bar']} isLoading={loadingHearings} />
    </div>
  );
}

// ============================================================================
// Yard Tab
// ============================================================================

function YardTab({ filters }: TabProps) {
  const { data: yardStats, isLoading } = useDashboardYardStats(filters);
  const { data: yardTrend, isLoading: loadingYardTrend } = useYardProcessingTrend(filters);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Vehicles in Yard" value={formatNumber(getStatValue(yardStats, 'totalPending'))} icon={Truck} color="bg-orange-500" />
            <StatCard title="Released Today" value={formatNumber(getStatValue(yardStats, 'releasedToday'))} icon={CheckCircle} color="bg-green-500" />
            <StatCard title="Escalated" value={formatNumber(getStatValue(yardStats, 'escalated'))} icon={AlertTriangle} color="bg-red-500" />
            <StatCard title="Avg. Processing (hrs)" value={formatNumber(getStatValue(yardStats, 'avgProcessingHours'))} icon={TrendingUp} color="bg-blue-500" />
          </>
        )}
      </div>

      <ChartWrapper title="Yard Processing Trend" subtitle="Vehicle inflow vs outflow over time" data={yardTrend ?? []} series={[{ dataKey: 'entries', name: 'Entries', color: '#f59e0b' }, { dataKey: 'releases', name: 'Releases', color: '#10b981' }]} defaultChartType="line" allowedChartTypes={['line', 'bar']} isLoading={loadingYardTrend} />
    </div>
  );
}

// ============================================================================
// Tags Tab
// ============================================================================

function TagsTab({ filters }: TabProps) {
  const { data: tagStats, isLoading } = useDashboardTagStats(filters);
  const { data: tagTrend, isLoading: loadingTagTrend } = useTagTrend(filters);
  const { data: tagsByCategory, isLoading: loadingTagsCategory } = useTagsByCategory(filters);

  const tagCategoryData = useMemo(() => {
    if (tagsByCategory && Array.isArray(tagsByCategory)) {
      return tagsByCategory;
    }
    if (tagStats?.byCategory) {
      return Object.entries(tagStats.byCategory).map(([name, value]) => ({
        name,
        value: value as number,
      }));
    }
    return [];
  }, [tagStats?.byCategory, tagsByCategory]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Open Tags" value={formatNumber(getStatValue(tagStats, 'totalOpen'))} icon={Tag} color="bg-purple-500" />
            <StatCard title="Created Today" value={formatNumber(getStatValue(tagStats, 'createdToday'))} icon={Tag} color="bg-indigo-500" />
            <StatCard title="Closed Today" value={formatNumber(getStatValue(tagStats, 'closedToday'))} icon={CheckCircle} color="bg-green-500" />
            <StatCard title="Total Tags" value={formatNumber(getStatValue(tagStats, 'total'))} icon={Tag} color="bg-blue-500" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartWrapper title="Tag Activity Trend" subtitle="Tags created vs closed over time" data={tagTrend ?? []} series={[{ dataKey: 'created', name: 'Created', color: '#8b5cf6' }, { dataKey: 'closed', name: 'Closed', color: '#10b981' }]} defaultChartType="line" allowedChartTypes={['line', 'bar']} isLoading={loadingTagTrend} />
        <ChartWrapper title="Tags by Category" subtitle="Distribution of tags across categories" data={tagCategoryData} series={[{ dataKey: 'value', name: 'Tags', color: '#8b5cf6' }]} defaultChartType="donut" allowedChartTypes={['donut', 'pie', 'bar']} isLoading={loadingTagsCategory} />
      </div>

      {tagStats?.byCategory && Object.keys(tagStats.byCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tags by Category (Summary)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Object.entries(tagStats.byCategory).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <span className="text-sm font-medium text-purple-700 capitalize">{category}</span>
                  <span className="text-lg font-bold text-purple-900">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Prosecution Tab
// ============================================================================

function ProsecutionTab({ filters }: TabProps) {
  const { formatAmount } = useCurrency();
  const formatKES = useCallback((v: number) => formatAmount(v, 'KES'), [formatAmount]);
  const { data: prosecutionStats, isLoading } = useDashboardProsecutionStats(filters);
  const { data: prosecutionTrend, isLoading: loadingProsecutionTrend } = useProsecutionTrend(filters);
  const { data: prosecutionByStatus, isLoading: loadingProsecutionStatus } = useProsecutionByStatus(filters);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 7 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Total Prosecutions" value={formatNumber(getStatValue(prosecutionStats, 'totalCases'))} icon={Gavel} color="bg-indigo-500" />
            <StatCard title="Pending" value={formatNumber(getStatValue(prosecutionStats, 'pendingCases'))} icon={FileText} color="bg-amber-500" />
            <StatCard title="Invoiced" value={formatNumber(getStatValue(prosecutionStats, 'invoicedCases'))} icon={FileText} color="bg-blue-500" />
            <StatCard title="Paid" value={formatNumber(getStatValue(prosecutionStats, 'paidCases'))} icon={CheckCircle} color="bg-green-500" />
            <StatCard title="Court Cases" value={formatNumber(getStatValue(prosecutionStats, 'courtCases'))} icon={Gavel} color="bg-purple-500" />
            <StatCard title="Total Fees (KES)" value={formatKES(getStatValue(prosecutionStats, 'totalFeesKes'))} rawValue={getStatValue(prosecutionStats, 'totalFeesKes')} icon={Banknote} color="bg-emerald-600" />
            <StatCard title="Total Fees (USD)" value={formatAmount(getStatValue(prosecutionStats, 'totalFeesUsd'), 'USD')} rawValue={getStatValue(prosecutionStats, 'totalFeesUsd')} icon={Banknote} color="bg-teal-500" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartWrapper title="Prosecution Trend" subtitle="New cases vs payments over time" data={prosecutionTrend ?? []} series={[{ dataKey: 'newCases', name: 'New Cases', color: '#f59e0b' }, { dataKey: 'paid', name: 'Paid', color: '#10b981' }]} defaultChartType="line" allowedChartTypes={['line', 'bar']} isLoading={loadingProsecutionTrend} />
        <ChartWrapper title="Cases by Status" subtitle="Prosecution case distribution" data={prosecutionByStatus ?? []} series={[{ dataKey: 'value', name: 'Cases', color: '#6366f1' }]} defaultChartType="donut" allowedChartTypes={['donut', 'pie', 'bar']} isLoading={loadingProsecutionStatus} />
      </div>
    </div>
  );
}

// ============================================================================
// Financial Tab
// ============================================================================

function FinancialTab({ filters, isCommercial }: TabProps) {
  const { formatAmount } = useCurrency();
  const formatKES = useCallback((v: number) => formatAmount(v, 'KES'), [formatAmount]);
  const { data: invoiceStats, isLoading: loadingInvoices } = useDashboardInvoiceStats(filters);
  const { data: receiptStats, isLoading: loadingReceipts } = useDashboardReceiptStats(filters);
  const { data: monthlyRevenue, isLoading: loadingMonthlyRev } = useMonthlyRevenueData(filters);
  const { data: paymentMethods, isLoading: loadingPayments } = usePaymentMethods(filters);
  const { data: invoiceAging, isLoading: loadingAging } = useInvoiceAging(filters);
  const { data: revenueByStation, isLoading: loadingRevStation } = useRevenueByStation(filters);

  const isLoading = loadingInvoices || loadingReceipts;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <PermissionGate permissions="invoice.read">
              <StatCard title="Pending Invoices" value={formatNumber(getStatValue(invoiceStats, 'pendingInvoices'))} icon={FileText} color="bg-yellow-500" />
            </PermissionGate>
            <PermissionGate permissions="invoice.read">
              <StatCard title="Overdue Invoices" value={formatNumber(getStatValue(invoiceStats, 'overdueInvoices'))} icon={AlertTriangle} color="bg-red-500" />
            </PermissionGate>
            <PermissionGate permissions="invoice.read">
              <StatCard title="Outstanding (KES)" value={formatKES(getStatValue(invoiceStats, 'totalBalanceKes'))} rawValue={getStatValue(invoiceStats, 'totalBalanceKes')} icon={Banknote} color="bg-orange-500" />
            </PermissionGate>
            {!isCommercial && (
              <PermissionGate permissions="invoice.read">
                <StatCard title="Outstanding (USD)" value={formatAmount(getStatValue(invoiceStats, 'totalBalanceUsd'), 'USD')} rawValue={getStatValue(invoiceStats, 'totalBalanceUsd')} icon={Banknote} color="bg-orange-400" />
              </PermissionGate>
            )}
            <PermissionGate permissions="receipt.read">
              <StatCard title="Collected (KES)" value={formatKES(getStatValue(receiptStats, 'totalCollectedKes'))} rawValue={getStatValue(receiptStats, 'totalCollectedKes')} icon={CheckCircle} color="bg-emerald-600" />
            </PermissionGate>
            {!isCommercial && (
              <PermissionGate permissions="receipt.read">
                <StatCard title="Collected (USD)" value={formatAmount(getStatValue(receiptStats, 'totalCollectedUsd'), 'USD')} rawValue={getStatValue(receiptStats, 'totalCollectedUsd')} icon={CheckCircle} color="bg-teal-500" />
              </PermissionGate>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PermissionGate permissions="receipt.read">
          <ChartWrapper title="Monthly Revenue Trend" subtitle="Fee collection over time (KES)" data={monthlyRevenue ?? []} series={[{ dataKey: 'revenue', name: 'Revenue', color: '#10b981' }]} defaultChartType="line" allowedChartTypes={['line', 'bar']} valueFormatter={formatKES} isLoading={loadingMonthlyRev} />
        </PermissionGate>
        <PermissionGate permissions="receipt.read">
          <ChartWrapper title="Payment Methods" subtitle="Collection breakdown by payment type" data={paymentMethods ?? []} series={[{ dataKey: 'amount', name: 'Amount (KES)', color: '#3b82f6' }]} defaultChartType="donut" allowedChartTypes={['donut', 'pie', 'bar']} valueFormatter={formatKES} isLoading={loadingPayments} />
        </PermissionGate>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PermissionGate permissions="invoice.read">
          <ChartWrapper title="Invoice Aging Analysis" subtitle="Outstanding invoices by age bracket" data={invoiceAging ?? []} series={[{ dataKey: 'value', name: 'Invoices', color: '#f59e0b' }]} defaultChartType="bar" allowedChartTypes={['bar', 'pie']} isLoading={loadingAging} />
        </PermissionGate>
        <PermissionGate permissions="receipt.read">
          <ChartWrapper title="Revenue by Station" subtitle="Collection performance by weighbridge" data={revenueByStation ?? []} series={[{ dataKey: 'revenue', name: 'Revenue (KES)', color: '#8b5cf6' }]} defaultChartType="bar" allowedChartTypes={['bar', 'pie']} valueFormatter={formatKES} isLoading={loadingRevStation} />
        </PermissionGate>
      </div>
    </div>
  );
}

// ============================================================================
// Dashboard Content Component
// ============================================================================

function DashboardContent() {
  const { filters } = useDashboardFilters();
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();
  const fetchingCount = useIsFetching({ queryKey: DASHBOARD_QUERY_KEYS.all });
  const isRefreshing = fetchingCount > 0;
  const { user: currentUser } = useUser();
  const { isCommercial, isEnforcement, showCases, showProsecution, showFinancial } = useModuleAccess();

  // Permission checks
  const canViewWeighing = useHasPermission('weighing.read');
  const canViewCases = useHasPermission('case.read');
  const canViewYard = useHasPermission('yard.read');
  const canViewTags = useHasPermission('tag.read');
  const canViewProsecution = useHasPermission('prosecution.read');
  const canViewFinancial = showFinancial;

  // Available tabs — module access gates enforcement tabs for commercial
  const availableTabs = useMemo(() => {
    const tabs = [{ value: 'overview', label: 'Overview', icon: LayoutDashboard }];
    // Weighing tab only for enforcement (commercial gets everything on overview)
    if (isEnforcement && canViewWeighing) tabs.push({ value: 'weighing', label: 'Weighing', icon: Scale });
    if (showCases && canViewCases) tabs.push({ value: 'cases', label: 'Cases', icon: FileText });
    if (isEnforcement && canViewYard) tabs.push({ value: 'yard', label: 'Yard', icon: Truck });
    if (isEnforcement && canViewTags) tabs.push({ value: 'tags', label: 'Tags', icon: Tag });
    if (showProsecution && canViewProsecution) tabs.push({ value: 'prosecution', label: 'Prosecution', icon: Gavel });
    if (canViewFinancial) tabs.push({ value: 'financial', label: 'Financial', icon: Banknote });
    return tabs;
  }, [isCommercial, isEnforcement, showCases, showProsecution, canViewWeighing, canViewCases, canViewYard, canViewTags, canViewProsecution, canViewFinancial]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.all });
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-700">Analytics Dashboard</h2>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <DashboardFilters />
      </div>

      {/* Tabbed Content - each tab component fetches only its own data */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${availableTabs.length}, minmax(0, 1fr))` }}>
          {availableTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          {activeTab === 'overview' && <OverviewTab filters={filters} isCommercial={isCommercial} />}
        </TabsContent>

        {isEnforcement && canViewWeighing && (
          <TabsContent value="weighing">
            {activeTab === 'weighing' && <WeighingTab filters={filters} isCommercial={isCommercial} />}
          </TabsContent>
        )}

        {canViewCases && (
          <TabsContent value="cases">
            {activeTab === 'cases' && <CasesTab filters={filters} />}
          </TabsContent>
        )}

        {canViewYard && (
          <TabsContent value="yard">
            {activeTab === 'yard' && <YardTab filters={filters} />}
          </TabsContent>
        )}

        {canViewTags && (
          <TabsContent value="tags">
            {activeTab === 'tags' && <TagsTab filters={filters} />}
          </TabsContent>
        )}

        {canViewProsecution && (
          <TabsContent value="prosecution">
            {activeTab === 'prosecution' && <ProsecutionTab filters={filters} />}
          </TabsContent>
        )}

        {canViewFinancial && (
          <TabsContent value="financial">
            {activeTab === 'financial' && <FinancialTab filters={filters} isCommercial={isCommercial} />}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ============================================================================
// Main Dashboard Page
// ============================================================================

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AppShell title="Dashboard" subtitle="TruLoad - Vehicle Weighing & Enforcement System">
        <DashboardFilterProvider>
          <DashboardContent />
        </DashboardFilterProvider>
      </AppShell>
    </ProtectedRoute>
  );
}
