import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from '@/lib/api/setup';
import { QUERY_OPTIONS } from '@/lib/query/config';

const USER_QUERY_KEYS = {
  OFFICERS: ['users', 'officers'] as const,
};

/**
 * Fetch officers/users available for case assignment.
 * Returns all active users (first 100) — the Select dropdown handles client-side filtering.
 */
export function useOfficersList() {
  return useQuery({
    queryKey: USER_QUERY_KEYS.OFFICERS,
    queryFn: () => fetchUsers({ pageSize: 100, pageNumber: 1 }),
    ...QUERY_OPTIONS.semiStatic,
    select: (data) => data.items,
  });
}
