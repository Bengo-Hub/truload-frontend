/**
 * TanStack Query hooks for audit log data.
 * Uses centralized QUERY_OPTIONS for consistent caching.
 */

import { useQuery } from '@tanstack/react-query';
import { QUERY_OPTIONS } from '@/lib/query/config';
import * as auditLogApi from '@/lib/api/auditLog';

// Query keys
export const AUDIT_LOG_QUERY_KEYS = {
  AUDIT_LOGS: ['audit-logs'] as const,
  AUDIT_LOG_SUMMARY: ['audit-logs', 'summary'] as const,
  AUDIT_LOG_FAILED: ['audit-logs', 'failed'] as const,
};

// ============================================================================
// Audit Log Hooks
// ============================================================================

/**
 * Get paginated audit logs with optional filters
 */
export function useAuditLogs(params?: auditLogApi.AuditLogQueryParams) {
  return useQuery({
    queryKey: [...AUDIT_LOG_QUERY_KEYS.AUDIT_LOGS, 'search', params],
    queryFn: () => auditLogApi.getAuditLogs(params),
    ...QUERY_OPTIONS.dynamic,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Get a single audit log by ID
 */
export function useAuditLog(id?: string) {
  return useQuery({
    queryKey: [...AUDIT_LOG_QUERY_KEYS.AUDIT_LOGS, id],
    queryFn: () => auditLogApi.getAuditLogById(id!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!id,
  });
}

/**
 * Get audit logs for a specific resource
 */
export function useAuditLogsByResource(resourceType?: string, resourceId?: string) {
  return useQuery({
    queryKey: [...AUDIT_LOG_QUERY_KEYS.AUDIT_LOGS, 'resource', resourceType, resourceId],
    queryFn: () => auditLogApi.getAuditLogsByResource(resourceType!, resourceId!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!resourceType && !!resourceId,
  });
}

/**
 * Get audit logs for a specific user
 */
export function useAuditLogsByUser(userId?: string, limit = 100) {
  return useQuery({
    queryKey: [...AUDIT_LOG_QUERY_KEYS.AUDIT_LOGS, 'user', userId, limit],
    queryFn: () => auditLogApi.getAuditLogsByUser(userId!, limit),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!userId,
  });
}

/**
 * Get audit log summary statistics
 */
export function useAuditLogSummary(fromDate?: string, toDate?: string) {
  return useQuery({
    queryKey: [...AUDIT_LOG_QUERY_KEYS.AUDIT_LOG_SUMMARY, fromDate, toDate],
    queryFn: () => auditLogApi.getAuditLogSummary(fromDate, toDate),
    ...QUERY_OPTIONS.semiStatic,
  });
}

/**
 * Get failed audit entries (for security monitoring)
 */
export function useFailedAuditEntries(userId?: string, hours = 24) {
  return useQuery({
    queryKey: [...AUDIT_LOG_QUERY_KEYS.AUDIT_LOG_FAILED, userId, hours],
    queryFn: () => auditLogApi.getFailedAuditEntries(userId, hours),
    ...QUERY_OPTIONS.dynamic,
  });
}
