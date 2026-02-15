import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface DashboardFilterParams {
  dateFrom?: string;
  dateTo?: string;
  stationId?: string;
  weighingType?: string;
  controlStatus?: string;
}

// Statistics Types
export interface CaseStatistics {
  totalCases: number;
  openCases: number;
  escalatedCases: number;
  closedCases: number;
}

export interface HearingStatistics {
  total: number;
  scheduled: number;
  completed: number;
  adjourned: number;
  pendingVerdict: number;
  convictionRate: number;
}

export interface ProsecutionStatistics {
  totalCases: number;
  pendingCases: number;
  invoicedCases: number;
  paidCases: number;
  courtCases: number;
  totalFeesKes: number;
  totalFeesUsd: number;
  collectedFeesKes: number;
  collectedFeesUsd: number;
}

export interface InvoiceStatistics {
  totalInvoices: number;
  pendingInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalAmountDue: number;
  totalAmountPaid: number;
  totalBalance: number;
  // Per-currency breakdown
  totalAmountDueKes: number;
  totalAmountDueUsd: number;
  totalAmountPaidKes: number;
  totalAmountPaidUsd: number;
  totalBalanceKes: number;
  totalBalanceUsd: number;
}

export interface ReceiptStatistics {
  total: number;
  todayCount: number;
  todayAmount: number;
  totalCollected: number;
  byPaymentMethod: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
  // Per-currency breakdown
  todayAmountKes: number;
  todayAmountUsd: number;
  totalCollectedKes: number;
  totalCollectedUsd: number;
}

export interface YardStatistics {
  totalPending: number;
  releasedToday: number;
  totalEntriesToday: number;
  escalated: number;
  avgProcessingHours: number;
}

export interface VehicleTagStatistics {
  total: number;
  totalOpen: number;
  closedToday: number;
  createdToday: number;
  byCategory: Record<string, number>;
}

export interface WeighingStatistics {
  totalWeighings: number;
  legalCount: number;
  overloadedCount: number;
  warningCount: number;
  complianceRate: number;
  totalFeesKes: number;
  avgOverloadKg: number;
}

// Chart Data Types
export interface TimeSeriesDataPoint {
  name: string;
  [key: string]: string | number;
}

export interface ComplianceTrendData {
  name: string;
  compliant: number;
  overloaded: number;
  warning: number;
}

export interface RevenueByStationData {
  name: string;
  revenue: number;
  transactions: number;
}

export interface OverloadDistributionData {
  name: string;
  count: number;
  percentage: number;
}

export interface CaseDispositionData {
  name: string;
  value: number;
}

export interface PaymentMethodData {
  name: string;
  value: number;
  amount: number;
}

export interface DriverDemeritData {
  name: string;
  points: number;
  violations: number;
}

export interface StationPerformanceData {
  name: string;
  weighings: number;
  compliance: number;
  revenue: number;
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
}

export interface UsersByStationData {
  name: string;
  count: number;
}

export interface TagTrendData {
  name: string;
  created: number;
  closed: number;
}

export interface TagsByCategoryData {
  name: string;
  value: number;
}

export interface ProsecutionTrendData {
  name: string;
  newCases: number;
  paid: number;
}

export interface ProsecutionByStatusData {
  name: string;
  value: number;
}

// ============================================================================
// Helper to build query params
// ============================================================================

function buildParams(filters?: DashboardFilterParams): Record<string, string> {
  if (!filters) return {};

  const params: Record<string, string> = {};

  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.stationId && filters.stationId !== 'all') params.stationId = filters.stationId;
  if (filters.weighingType && filters.weighingType !== 'all') params.weighingType = filters.weighingType;
  if (filters.controlStatus && filters.controlStatus !== 'all') params.controlStatus = filters.controlStatus;

  return params;
}

// ============================================================================
// Core Statistics API Functions
// ============================================================================

export async function getCaseStatistics(filters?: DashboardFilterParams) {
  const response = await apiClient.get<CaseStatistics>('/case/cases/statistics', {
    params: buildParams(filters),
  });
  return response.data;
}

export async function getHearingStatistics(filters?: DashboardFilterParams) {
  const response = await apiClient.get<HearingStatistics>('/hearings/statistics', {
    params: buildParams(filters),
  });
  return response.data;
}

export async function getProsecutionStatistics(filters?: DashboardFilterParams) {
  const response = await apiClient.get<ProsecutionStatistics>('/prosecutions/statistics', {
    params: buildParams(filters),
  });
  return response.data;
}

export async function getInvoiceStatistics(filters?: DashboardFilterParams) {
  const response = await apiClient.get<InvoiceStatistics>('/invoices/statistics', {
    params: buildParams(filters),
  });
  return response.data;
}

export async function getReceiptStatistics(filters?: DashboardFilterParams) {
  const response = await apiClient.get<ReceiptStatistics>('/receipts/statistics', {
    params: buildParams(filters),
  });
  return response.data;
}

export async function getYardStatistics(filters?: DashboardFilterParams) {
  const response = await apiClient.get<YardStatistics>('/yard-entries/statistics', {
    params: buildParams(filters),
  });
  return response.data;
}

export async function getVehicleTagStatistics(filters?: DashboardFilterParams) {
  const response = await apiClient.get<VehicleTagStatistics>('/vehicle-tags/statistics', {
    params: buildParams(filters),
  });
  return response.data;
}

export async function getWeighingStatistics(filters?: DashboardFilterParams) {
  const response = await apiClient.get<WeighingStatistics>('/weighing-transactions/statistics', {
    params: buildParams(filters),
  });
  return response.data;
}

// ============================================================================
// Chart Data API Functions
// ============================================================================

/**
 * Get compliance trend over time (daily/weekly/monthly)
 */
export async function getComplianceTrend(filters?: DashboardFilterParams) {
  const response = await apiClient.get<ComplianceTrendData[]>(
    '/weighing-transactions/compliance-trend',
    { params: buildParams(filters) }
  );
  return response.data;
}

/**
 * Get overload distribution by severity bands
 */
export async function getOverloadDistribution(filters?: DashboardFilterParams) {
  const response = await apiClient.get<OverloadDistributionData[]>(
    '/weighing-transactions/overload-distribution',
    { params: buildParams(filters) }
  );
  return response.data;
}

/**
 * Get revenue by station
 */
export async function getRevenueByStation(filters?: DashboardFilterParams) {
  const response = await apiClient.get<RevenueByStationData[]>(
    '/receipts/revenue-by-station',
    { params: buildParams(filters) }
  );
  return response.data;
}

/**
 * Get monthly revenue trend
 */
export async function getMonthlyRevenue(filters?: DashboardFilterParams) {
  const response = await apiClient.get<TimeSeriesDataPoint[]>(
    '/receipts/monthly-revenue',
    { params: buildParams(filters) }
  );
  return response.data;
}

/**
 * Get case disposition breakdown
 */
export async function getCaseDisposition(filters?: DashboardFilterParams) {
  const response = await apiClient.get<CaseDispositionData[]>(
    '/case/cases/disposition-breakdown',
    { params: buildParams(filters) }
  );
  return response.data;
}

/**
 * Get case trend over time
 */
export async function getCaseTrend(filters?: DashboardFilterParams) {
  const response = await apiClient.get<TimeSeriesDataPoint[]>(
    '/case/cases/trend',
    { params: buildParams(filters) }
  );
  return response.data;
}

/**
 * Get payment methods breakdown
 */
export async function getPaymentMethods(filters?: DashboardFilterParams) {
  const response = await apiClient.get<PaymentMethodData[]>(
    '/receipts/payment-methods',
    { params: buildParams(filters) }
  );
  return response.data;
}

/**
 * Get top repeat offenders by demerit points
 */
export async function getTopOffenders(filters?: DashboardFilterParams) {
  const response = await apiClient.get<DriverDemeritData[]>(
    '/drivers/top-offenders',
    { params: { ...buildParams(filters), limit: '10' } }
  );
  return response.data;
}

/**
 * Get station performance comparison
 */
export async function getStationPerformance(filters?: DashboardFilterParams) {
  const response = await apiClient.get<StationPerformanceData[]>(
    '/stations/performance',
    { params: buildParams(filters) }
  );
  return response.data;
}

/**
 * Get yard processing time trends
 */
export async function getYardProcessingTrend(filters?: DashboardFilterParams) {
  const response = await apiClient.get<TimeSeriesDataPoint[]>(
    '/yard-entries/processing-trend',
    { params: buildParams(filters) }
  );
  return response.data;
}

/**
 * Get hearing outcome breakdown
 */
export async function getHearingOutcomes(filters?: DashboardFilterParams) {
  const response = await apiClient.get<CaseDispositionData[]>(
    '/hearings/outcomes',
    { params: buildParams(filters) }
  );
  return response.data;
}

/**
 * Get axle type violation distribution
 */
export async function getAxleViolations(filters?: DashboardFilterParams) {
  const response = await apiClient.get<OverloadDistributionData[]>(
    '/weighing-transactions/axle-violations',
    { params: buildParams(filters) }
  );
  return response.data;
}

/**
 * Get vehicle type distribution
 */
export async function getVehicleTypeDistribution(filters?: DashboardFilterParams) {
  const response = await apiClient.get<CaseDispositionData[]>(
    '/weighing-transactions/vehicle-distribution',
    { params: buildParams(filters) }
  );
  return response.data;
}

/**
 * Get daily weighing volume
 */
export async function getDailyWeighingVolume(filters?: DashboardFilterParams) {
  const response = await apiClient.get<TimeSeriesDataPoint[]>(
    '/weighing-transactions/daily-volume',
    { params: buildParams(filters) }
  );
  return response.data;
}

/**
 * Get invoice aging breakdown
 */
export async function getInvoiceAging(filters?: DashboardFilterParams) {
  const response = await apiClient.get<CaseDispositionData[]>(
    '/invoices/aging',
    { params: buildParams(filters) }
  );
  return response.data;
}

/**
 * Get user statistics (active users count)
 */
export async function getUserStatistics(): Promise<UserStatistics> {
  const response = await apiClient.get<{ totalCount: number; items: { id: string }[] }>(
    '/user-management/users',
    { params: { pageSize: 1, isActive: true } }
  );
  const activeResponse = await apiClient.get<{ totalCount: number }>(
    '/user-management/users',
    { params: { pageSize: 1, isActive: true } }
  );
  const inactiveResponse = await apiClient.get<{ totalCount: number }>(
    '/user-management/users',
    { params: { pageSize: 1, isActive: false } }
  );
  return {
    totalUsers: response.data.totalCount,
    activeUsers: activeResponse.data.totalCount,
    inactiveUsers: inactiveResponse.data.totalCount,
  };
}

/**
 * Get users grouped by station
 */
export async function getUsersByStation(): Promise<UsersByStationData[]> {
  const response = await apiClient.get<UsersByStationData[]>(
    '/user-management/users/by-station'
  );
  return response.data;
}

/**
 * Get tag trend over time
 */
export async function getTagTrend(filters?: DashboardFilterParams) {
  const response = await apiClient.get<TagTrendData[]>(
    '/vehicle-tags/trend',
    { params: buildParams(filters) }
  );
  return response.data;
}

/**
 * Get tags by category for pie chart
 */
export async function getTagsByCategory(filters?: DashboardFilterParams) {
  const response = await apiClient.get<TagsByCategoryData[]>(
    '/vehicle-tags/by-category',
    { params: buildParams(filters) }
  );
  return response.data;
}

/**
 * Get prosecution trend over time
 */
export async function getProsecutionTrend(filters?: DashboardFilterParams) {
  const response = await apiClient.get<ProsecutionTrendData[]>(
    '/prosecutions/trend',
    { params: buildParams(filters) }
  );
  return response.data;
}

/**
 * Get prosecution cases by status
 */
export async function getProsecutionByStatus(filters?: DashboardFilterParams) {
  const response = await apiClient.get<ProsecutionByStatusData[]>(
    '/prosecutions/by-status',
    { params: buildParams(filters) }
  );
  return response.data;
}

// ============================================================================
// Exported API Object
// ============================================================================

export const dashboardApi = {
  // Core statistics
  getCaseStatistics,
  getHearingStatistics,
  getProsecutionStatistics,
  getInvoiceStatistics,
  getReceiptStatistics,
  getYardStatistics,
  getVehicleTagStatistics,
  getWeighingStatistics,
  getUserStatistics,
  // Chart data
  getComplianceTrend,
  getOverloadDistribution,
  getRevenueByStation,
  getMonthlyRevenue,
  getCaseDisposition,
  getCaseTrend,
  getPaymentMethods,
  getTopOffenders,
  getStationPerformance,
  getYardProcessingTrend,
  getHearingOutcomes,
  getAxleViolations,
  getVehicleTypeDistribution,
  getDailyWeighingVolume,
  getInvoiceAging,
  getUsersByStation,
  getTagTrend,
  getTagsByCategory,
  getProsecutionTrend,
  getProsecutionByStatus,
};
