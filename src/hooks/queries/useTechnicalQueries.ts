import { useQuery } from '@tanstack/react-query';
import { getHealthStatus } from '@/lib/api/health';
import { QUERY_OPTIONS } from '@/lib/query/config';

const TECHNICAL_KEYS = {
  HEALTH: ['technical', 'health'] as const,
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
