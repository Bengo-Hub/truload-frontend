/**
 * TanStack Query hooks for geographic data (counties, subcounties).
 * Used by prosecution settings, case forms, and setup screens.
 * Cached with semiStatic TTL to reduce repeated API calls.
 */

import * as geographicApi from '@/lib/api/geographic';
import { QUERY_KEYS, QUERY_OPTIONS } from '@/lib/query/config';
import { useQuery } from '@tanstack/react-query';

export const GEOGRAPHIC_QUERY_KEYS = {
  counties: QUERY_KEYS.COUNTIES,
  subcounties: (countyId: string) => QUERY_KEYS.SUBCOUNTIES(countyId),
};

export function useCounties() {
  return useQuery({
    queryKey: GEOGRAPHIC_QUERY_KEYS.counties,
    queryFn: geographicApi.fetchCounties,
    ...QUERY_OPTIONS.semiStatic,
  });
}

export function useSubcounties(countyId: string | undefined) {
  return useQuery({
    queryKey: GEOGRAPHIC_QUERY_KEYS.subcounties(countyId ?? ''),
    queryFn: () => geographicApi.fetchSubcounties(countyId),
    ...QUERY_OPTIONS.semiStatic,
    enabled: !!countyId,
  });
}
