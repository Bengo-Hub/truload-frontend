/**
 * TanStack Query hooks for act configuration data.
 * Acts are static reference data - cached for 30 minutes.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_OPTIONS } from '@/lib/query/config';
import * as actsApi from '@/lib/api/acts';

export const ACT_QUERY_KEYS = {
  ALL: ['acts'] as const,
  DETAIL: (id: string) => ['acts', id] as const,
  CONFIGURATION: (id: string) => ['acts', id, 'configuration'] as const,
  DEFAULT: ['acts', 'default'] as const,
  SUMMARY: ['acts', 'summary'] as const,
  FEE_SCHEDULES: (framework: string) => ['acts', 'fee-schedules', framework] as const,
  AXLE_TYPE_FEES: (framework: string) => ['acts', 'axle-type-fees', framework] as const,
  TOLERANCES: (framework: string) => ['acts', 'tolerances', framework] as const,
  DEMERIT_POINTS: (framework: string) => ['acts', 'demerit-points', framework] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

export function useAllActs() {
  return useQuery({
    queryKey: ACT_QUERY_KEYS.ALL,
    queryFn: actsApi.getAllActs,
    ...QUERY_OPTIONS.static,
  });
}

export function useActById(id: string) {
  return useQuery({
    queryKey: ACT_QUERY_KEYS.DETAIL(id),
    queryFn: () => actsApi.getActById(id),
    enabled: !!id,
    ...QUERY_OPTIONS.static,
  });
}

export function useActConfiguration(id: string) {
  return useQuery({
    queryKey: ACT_QUERY_KEYS.CONFIGURATION(id),
    queryFn: () => actsApi.getActConfiguration(id),
    enabled: !!id,
    ...QUERY_OPTIONS.static,
  });
}

export function useDefaultAct() {
  return useQuery({
    queryKey: ACT_QUERY_KEYS.DEFAULT,
    queryFn: actsApi.getDefaultAct,
    ...QUERY_OPTIONS.static,
  });
}

export function useActsSummary() {
  return useQuery({
    queryKey: ACT_QUERY_KEYS.SUMMARY,
    queryFn: actsApi.getActsSummary,
    ...QUERY_OPTIONS.static,
  });
}

export function useFeeSchedules(legalFramework: string) {
  return useQuery({
    queryKey: ACT_QUERY_KEYS.FEE_SCHEDULES(legalFramework),
    queryFn: () => actsApi.getFeeSchedules(legalFramework),
    enabled: !!legalFramework,
    ...QUERY_OPTIONS.static,
  });
}

export function useAxleTypeFeeSchedules(legalFramework: string) {
  return useQuery({
    queryKey: ACT_QUERY_KEYS.AXLE_TYPE_FEES(legalFramework),
    queryFn: () => actsApi.getAxleTypeFeeSchedules(legalFramework),
    enabled: !!legalFramework,
    ...QUERY_OPTIONS.static,
  });
}

export function useToleranceSettings(legalFramework: string) {
  return useQuery({
    queryKey: ACT_QUERY_KEYS.TOLERANCES(legalFramework),
    queryFn: () => actsApi.getToleranceSettings(legalFramework),
    enabled: !!legalFramework,
    ...QUERY_OPTIONS.static,
  });
}

export function useDemeritPointSchedules(legalFramework: string) {
  return useQuery({
    queryKey: ACT_QUERY_KEYS.DEMERIT_POINTS(legalFramework),
    queryFn: () => actsApi.getDemeritPointSchedules(legalFramework),
    enabled: !!legalFramework,
    ...QUERY_OPTIONS.static,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export function useSetDefaultAct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (actId: string) => actsApi.setDefaultAct(actId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACT_QUERY_KEYS.ALL });
      queryClient.invalidateQueries({ queryKey: ACT_QUERY_KEYS.DEFAULT });
      queryClient.invalidateQueries({ queryKey: ACT_QUERY_KEYS.SUMMARY });
    },
  });
}
