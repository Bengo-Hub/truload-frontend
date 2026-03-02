import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface AuditLogDto {
  id: string;
  userId: string;
  userName?: string;
  userFullName?: string;
  /** User email (prefer for display over userName). */
  userEmail?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  success: boolean;
  httpMethod?: string;
  endpoint?: string;
  statusCode?: number;
  ipAddress?: string;
  userAgent?: string;
  denialReason?: string;
  requiredPermission?: string;
  organizationId?: string;
  createdAt: string;
}

export interface AuditLogPagedResponse {
  items: AuditLogDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface AuditLogSummaryDto {
  totalEntries: number;
  successfulEntries: number;
  failedEntries: number;
  uniqueUsers: number;
  actionCounts: Record<string, number>;
  resourceTypeCounts: Record<string, number>;
  successRate: number;
}

export interface AuditLogQueryParams {
  pageNumber?: number;
  pageSize?: number;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  fromDate?: string;
  toDate?: string;
  successOnly?: boolean;
  orderBy?: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get paginated audit logs with optional filters.
 */
export async function getAuditLogs(params?: AuditLogQueryParams) {
  const response = await apiClient.get<AuditLogPagedResponse>('/audit-logs', { params });
  return response.data;
}

/**
 * Get audit log by ID.
 */
export async function getAuditLogById(id: string) {
  const response = await apiClient.get<AuditLogDto>(`/audit-logs/${id}`);
  return response.data;
}

/**
 * Get audit logs for a specific resource.
 */
export async function getAuditLogsByResource(resourceType: string, resourceId: string) {
  const response = await apiClient.get<AuditLogDto[]>(`/audit-logs/resource/${resourceType}/${resourceId}`);
  return response.data;
}

/**
 * Get audit logs for a specific user.
 */
export async function getAuditLogsByUser(userId: string, limit = 100) {
  const response = await apiClient.get<AuditLogDto[]>(`/audit-logs/user/${userId}`, {
    params: { limit }
  });
  return response.data;
}

/**
 * Get audit log summary statistics.
 */
export async function getAuditLogSummary(fromDate?: string, toDate?: string) {
  const response = await apiClient.get<AuditLogSummaryDto>('/audit-logs/summary', {
    params: { fromDate, toDate }
  });
  return response.data;
}

/**
 * Get failed audit entries (for security monitoring).
 */
export async function getFailedAuditEntries(userId?: string, hours = 24) {
  const response = await apiClient.get<AuditLogDto[]>('/audit-logs/failed', {
    params: { userId, hours }
  });
  return response.data;
}

// ============================================================================
// Exported API Object
// ============================================================================

export const auditLogApi = {
  getAll: getAuditLogs,
  getById: getAuditLogById,
  getByResource: getAuditLogsByResource,
  getByUser: getAuditLogsByUser,
  getSummary: getAuditLogSummary,
  getFailed: getFailedAuditEntries,
};
