/**
 * TanStack Query hooks for analytics and Superset integration.
 * Uses centralized QUERY_OPTIONS for consistent caching.
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { QUERY_OPTIONS } from '@/lib/query/config';
import * as analyticsApi from '@/lib/api/analytics';

// Query keys
export const ANALYTICS_QUERY_KEYS = {
  DASHBOARDS: ['analytics', 'dashboards'] as const,
  DASHBOARD: (id: number) => ['analytics', 'dashboard', id] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get list of available Superset dashboards
 */
export function useSupersetDashboards() {
  return useQuery({
    queryKey: ANALYTICS_QUERY_KEYS.DASHBOARDS,
    queryFn: analyticsApi.getDashboards,
    ...QUERY_OPTIONS.semiStatic,
  });
}

/**
 * Get a specific Superset dashboard
 */
export function useSupersetDashboard(id: number) {
  return useQuery({
    queryKey: ANALYTICS_QUERY_KEYS.DASHBOARD(id),
    queryFn: () => analyticsApi.getDashboard(id),
    enabled: !!id,
    ...QUERY_OPTIONS.semiStatic,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Get a guest token for embedding Superset dashboards
 */
export function useGetSupersetGuestToken() {
  return useMutation({
    mutationFn: analyticsApi.getGuestToken,
  });
}

/**
 * Execute a natural language query
 */
export function useNaturalLanguageQuery() {
  return useMutation({
    mutationFn: analyticsApi.executeNaturalLanguageQuery,
  });
}
