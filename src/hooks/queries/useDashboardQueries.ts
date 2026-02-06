/**
 * TanStack Query hooks for dashboard statistics and chart data.
 * Uses centralized QUERY_OPTIONS to ensure consistent caching
 * and avoid hitting API rate limits.
 */

import { useQuery, useQueries } from '@tanstack/react-query';
import { QUERY_OPTIONS } from '@/lib/query/config';
import * as dashboardApi from '@/lib/api/dashboard';
import type { DashboardFilterParams } from '@/lib/api/dashboard';

// Query keys factory
export const DASHBOARD_QUERY_KEYS = {
  all: ['dashboard'] as const,
  // Statistics
  caseStats: (filters?: DashboardFilterParams) => ['dashboard', 'case-statistics', filters] as const,
  hearingStats: (filters?: DashboardFilterParams) => ['dashboard', 'hearing-statistics', filters] as const,
  prosecutionStats: (filters?: DashboardFilterParams) => ['dashboard', 'prosecution-statistics', filters] as const,
  invoiceStats: (filters?: DashboardFilterParams) => ['dashboard', 'invoice-statistics', filters] as const,
  receiptStats: (filters?: DashboardFilterParams) => ['dashboard', 'receipt-statistics', filters] as const,
  yardStats: (filters?: DashboardFilterParams) => ['dashboard', 'yard-statistics', filters] as const,
  tagStats: (filters?: DashboardFilterParams) => ['dashboard', 'tag-statistics', filters] as const,
  weighingStats: (filters?: DashboardFilterParams) => ['dashboard', 'weighing-statistics', filters] as const,
  userStats: () => ['dashboard', 'user-statistics'] as const,
  // Chart data
  complianceTrend: (filters?: DashboardFilterParams) => ['dashboard', 'compliance-trend', filters] as const,
  overloadDistribution: (filters?: DashboardFilterParams) => ['dashboard', 'overload-distribution', filters] as const,
  revenueByStation: (filters?: DashboardFilterParams) => ['dashboard', 'revenue-by-station', filters] as const,
  monthlyRevenue: (filters?: DashboardFilterParams) => ['dashboard', 'monthly-revenue', filters] as const,
  caseDisposition: (filters?: DashboardFilterParams) => ['dashboard', 'case-disposition', filters] as const,
  caseTrend: (filters?: DashboardFilterParams) => ['dashboard', 'case-trend', filters] as const,
  paymentMethods: (filters?: DashboardFilterParams) => ['dashboard', 'payment-methods', filters] as const,
  topOffenders: (filters?: DashboardFilterParams) => ['dashboard', 'top-offenders', filters] as const,
  stationPerformance: (filters?: DashboardFilterParams) => ['dashboard', 'station-performance', filters] as const,
  yardProcessingTrend: (filters?: DashboardFilterParams) => ['dashboard', 'yard-processing-trend', filters] as const,
  hearingOutcomes: (filters?: DashboardFilterParams) => ['dashboard', 'hearing-outcomes', filters] as const,
  axleViolations: (filters?: DashboardFilterParams) => ['dashboard', 'axle-violations', filters] as const,
  vehicleDistribution: (filters?: DashboardFilterParams) => ['dashboard', 'vehicle-distribution', filters] as const,
  dailyVolume: (filters?: DashboardFilterParams) => ['dashboard', 'daily-volume', filters] as const,
  invoiceAging: (filters?: DashboardFilterParams) => ['dashboard', 'invoice-aging', filters] as const,
  usersByStation: () => ['dashboard', 'users-by-station'] as const,
  tagTrend: (filters?: DashboardFilterParams) => ['dashboard', 'tag-trend', filters] as const,
  tagsByCategory: (filters?: DashboardFilterParams) => ['dashboard', 'tags-by-category', filters] as const,
  prosecutionTrend: (filters?: DashboardFilterParams) => ['dashboard', 'prosecution-trend', filters] as const,
  prosecutionByStatus: (filters?: DashboardFilterParams) => ['dashboard', 'prosecution-by-status', filters] as const,
};

/**
 * Dashboard query options - uses semiStatic config (5min staleTime, 15min gcTime).
 * Data is served from cache while fresh, only refetched after staleTime expires.
 * refetchOnWindowFocus disabled to prevent API rate limit hits on tab switching.
 */
const DASHBOARD_OPTIONS = {
  ...QUERY_OPTIONS.semiStatic,
  refetchOnWindowFocus: false,
  refetchOnMount: true as const,
  retry: 1,
};

// ============================================================================
// Statistics Hooks
// ============================================================================

export function useDashboardCaseStats(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.caseStats(filters),
    queryFn: () => dashboardApi.getCaseStatistics(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useDashboardHearingStats(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.hearingStats(filters),
    queryFn: () => dashboardApi.getHearingStatistics(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useDashboardProsecutionStats(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.prosecutionStats(filters),
    queryFn: () => dashboardApi.getProsecutionStatistics(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useDashboardInvoiceStats(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.invoiceStats(filters),
    queryFn: () => dashboardApi.getInvoiceStatistics(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useDashboardReceiptStats(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.receiptStats(filters),
    queryFn: () => dashboardApi.getReceiptStatistics(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useDashboardYardStats(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.yardStats(filters),
    queryFn: () => dashboardApi.getYardStatistics(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useDashboardTagStats(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.tagStats(filters),
    queryFn: () => dashboardApi.getVehicleTagStatistics(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useDashboardWeighingStats(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.weighingStats(filters),
    queryFn: () => dashboardApi.getWeighingStatistics(filters),
    ...DASHBOARD_OPTIONS,
  });
}

// ============================================================================
// Chart Data Hooks
// ============================================================================

export function useComplianceTrend(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.complianceTrend(filters),
    queryFn: () => dashboardApi.getComplianceTrend(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useOverloadDistribution(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.overloadDistribution(filters),
    queryFn: () => dashboardApi.getOverloadDistribution(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useRevenueByStation(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.revenueByStation(filters),
    queryFn: () => dashboardApi.getRevenueByStation(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useMonthlyRevenueData(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.monthlyRevenue(filters),
    queryFn: () => dashboardApi.getMonthlyRevenue(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useCaseDisposition(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.caseDisposition(filters),
    queryFn: () => dashboardApi.getCaseDisposition(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useCaseTrend(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.caseTrend(filters),
    queryFn: () => dashboardApi.getCaseTrend(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function usePaymentMethods(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.paymentMethods(filters),
    queryFn: () => dashboardApi.getPaymentMethods(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useTopOffenders(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.topOffenders(filters),
    queryFn: () => dashboardApi.getTopOffenders(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useStationPerformance(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.stationPerformance(filters),
    queryFn: () => dashboardApi.getStationPerformance(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useYardProcessingTrend(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.yardProcessingTrend(filters),
    queryFn: () => dashboardApi.getYardProcessingTrend(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useDashboardHearingOutcomes(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.hearingOutcomes(filters),
    queryFn: () => dashboardApi.getHearingOutcomes(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useAxleViolations(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.axleViolations(filters),
    queryFn: () => dashboardApi.getAxleViolations(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useVehicleDistributionData(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.vehicleDistribution(filters),
    queryFn: () => dashboardApi.getVehicleTypeDistribution(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useDailyWeighingVolume(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.dailyVolume(filters),
    queryFn: () => dashboardApi.getDailyWeighingVolume(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useInvoiceAging(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.invoiceAging(filters),
    queryFn: () => dashboardApi.getInvoiceAging(filters),
    ...DASHBOARD_OPTIONS,
  });
}

// Legacy alias for backwards compatibility
export function useWeeklyActivityData(filters?: DashboardFilterParams) {
  return useComplianceTrend(filters);
}

export function useUserStatistics() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.userStats(),
    queryFn: () => dashboardApi.getUserStatistics(),
    ...DASHBOARD_OPTIONS,
  });
}

export function useUsersByStation() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.usersByStation(),
    queryFn: () => dashboardApi.getUsersByStation(),
    ...DASHBOARD_OPTIONS,
  });
}

export function useTagTrend(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.tagTrend(filters),
    queryFn: () => dashboardApi.getTagTrend(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useTagsByCategory(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.tagsByCategory(filters),
    queryFn: () => dashboardApi.getTagsByCategory(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useProsecutionTrend(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.prosecutionTrend(filters),
    queryFn: () => dashboardApi.getProsecutionTrend(filters),
    ...DASHBOARD_OPTIONS,
  });
}

export function useProsecutionByStatus(filters?: DashboardFilterParams) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.prosecutionByStatus(filters),
    queryFn: () => dashboardApi.getProsecutionByStatus(filters),
    ...DASHBOARD_OPTIONS,
  });
}

// ============================================================================
// Combined Dashboard Hook
// ============================================================================

export function useDashboardStatistics(filters?: DashboardFilterParams) {
  const results = useQueries({
    queries: [
      {
        queryKey: DASHBOARD_QUERY_KEYS.caseStats(filters),
        queryFn: () => dashboardApi.getCaseStatistics(filters),
        ...DASHBOARD_OPTIONS,
      },
      {
        queryKey: DASHBOARD_QUERY_KEYS.yardStats(filters),
        queryFn: () => dashboardApi.getYardStatistics(filters),
        ...DASHBOARD_OPTIONS,
      },
      {
        queryKey: DASHBOARD_QUERY_KEYS.tagStats(filters),
        queryFn: () => dashboardApi.getVehicleTagStatistics(filters),
        ...DASHBOARD_OPTIONS,
      },
      {
        queryKey: DASHBOARD_QUERY_KEYS.prosecutionStats(filters),
        queryFn: () => dashboardApi.getProsecutionStatistics(filters),
        ...DASHBOARD_OPTIONS,
      },
      {
        queryKey: DASHBOARD_QUERY_KEYS.invoiceStats(filters),
        queryFn: () => dashboardApi.getInvoiceStatistics(filters),
        ...DASHBOARD_OPTIONS,
      },
      {
        queryKey: DASHBOARD_QUERY_KEYS.receiptStats(filters),
        queryFn: () => dashboardApi.getReceiptStatistics(filters),
        ...DASHBOARD_OPTIONS,
      },
      {
        queryKey: DASHBOARD_QUERY_KEYS.weighingStats(filters),
        queryFn: () => dashboardApi.getWeighingStatistics(filters),
        ...DASHBOARD_OPTIONS,
      },
    ],
  });

  const [caseStats, yardStats, tagStats, prosecutionStats, invoiceStats, receiptStats, weighingStats] = results;

  const isLoading = results.some(r => r.isLoading);
  const isError = results.some(r => r.isError);

  return {
    caseStats: caseStats.data,
    yardStats: yardStats.data,
    tagStats: tagStats.data,
    prosecutionStats: prosecutionStats.data,
    invoiceStats: invoiceStats.data,
    receiptStats: receiptStats.data,
    weighingStats: weighingStats.data,
    isLoading,
    isError,
    refetch: () => Promise.all(results.map(r => r.refetch())),
  };
}
