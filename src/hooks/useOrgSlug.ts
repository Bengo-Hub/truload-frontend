/**
 * Returns the current organization slug for tenant-scoped routes.
 * Prefer useParams() when inside [orgSlug] routes; fallback to user.organizationCode or default.
 */

import { useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

const DEFAULT_ORG_SLUG = 'truload-demo';

export function useOrgSlug(): string {
  const params = useParams();
  const user = useAuthStore((s) => s.user);
  const fromParams = params?.orgSlug;
  if (typeof fromParams === 'string' && fromParams) return fromParams;
  const fromUser = user?.organizationCode;
  if (fromUser) return fromUser.toLowerCase();
  return DEFAULT_ORG_SLUG;
}
