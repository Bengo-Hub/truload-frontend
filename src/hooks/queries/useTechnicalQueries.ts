import { getHealthStatus } from '@/lib/api/health';
import { QUERY_OPTIONS } from '@/lib/query/config';
import { useQuery } from '@tanstack/react-query';

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
 * Fetch system version from health endpoint.
 * Kept fresh so login/footer reflects the latest published backend version.
 */
export function useSystemVersion() {
  return useQuery({
    queryKey: TECHNICAL_KEYS.SYSTEM_VERSION,
    queryFn: async () => {
      const health = await getHealthStatus();
      return health.version ?? null;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchInterval: 15 * 60 * 1000, // 15 minutes after last fetch
    retry: 1,
  });
}
