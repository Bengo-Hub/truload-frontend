'use client';

import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Returns true only when the current user is a platform superuser AND the
 * current route is under /platform/*. Tenant admins and station users never
 * see destructive delete actions; deletion is a platform-admin-only capability.
 *
 * Use in tenant pages to gate the render of destructive UI:
 *
 *   const canDelete = useCanDelete();
 *   ...
 *   {canDelete && <DeleteButton />}
 */
export function useCanDelete(): boolean {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  if (!user?.isSuperUser) return false;
  return (pathname ?? '').startsWith('/platform');
}
