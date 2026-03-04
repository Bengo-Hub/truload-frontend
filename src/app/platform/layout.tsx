'use client';

/**
 * Platform admin layout. Superuser only; redirects others to login or tenant dashboard.
 */

import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/auth/login?from=/platform');
      return;
    }
    if (!user?.isSuperUser) {
      const orgSlug = user?.organizationCode?.toLowerCase() || 'kura';
      router.replace(`/${orgSlug}/dashboard`);
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (!isAuthenticated || !user?.isSuperUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
