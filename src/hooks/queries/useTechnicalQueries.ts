import { useQuery } from '@tanstack/react-query';
import { getHealthStatus } from '@/lib/api/health';
import { QUERY_OPTIONS, CACHE_TIMES, GC_TIMES } from '@/lib/query/config';

const TECHNICAL_KEYS = {
  HEALTH: ['technical', 'health'] as const,
  SYSTEM_VERSION: ['technical', 'system-version'] as const,
};

/**
 * Fetch backend health status with real-time polling (30s)
 */
export function useHealthStatus() {
  return useQuery({
    queryKey: TECHNICAL_KEYS.HEALTH,
    queryFn: getHealthStatus,
    ...QUERY_OPTIONS.realTime,
    retry: 1,
  });
}

/**
 * Fetch system version from health endpoint, cached for 24 hours.
 * Use this in footers, login pages, and anywhere the version needs to be shown.
 */
export function useSystemVersion() {
  return useQuery({
    queryKey: TECHNICAL_KEYS.SYSTEM_VERSION,
    queryFn: async () => {
      const health = await getHealthStatus();
      return health.version ?? null;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 25 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}
