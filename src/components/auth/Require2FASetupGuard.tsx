'use client';

/**
 * When admin has enabled "require 2FA for all users", users who have not set up 2FA
 * get requires2FASetup=true on login. This guard redirects them to profile (Security tab)
 * until they complete 2FA setup; they cannot access dashboard or other app routes.
 */

import { useAuthStore } from '@/stores/auth.store';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

export function Require2FASetupGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) ?? 'kura';
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const requires2FASetup = useAuthStore((s) => s.requires2FASetup);

  useEffect(() => {
    if (!isAuthenticated || !requires2FASetup) return;

    const isAuthRoute = pathname?.includes('/auth/');
    const isProfilePage = pathname === `/${orgSlug}/profile` || pathname?.endsWith('/profile');
    if (isAuthRoute || isProfilePage) return;

    router.replace(`/${orgSlug}/profile`);
  }, [isAuthenticated, requires2FASetup, orgSlug, pathname, router]);

  return <>{children}</>;
}
