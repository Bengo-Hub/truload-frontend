'use client';

/**
 * Tenant root: redirect to dashboard if authenticated, else to auth/login.
 */

import { useAuthStore } from '@/stores/auth.store';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function OrgSlugRootPage() {
  const params = useParams();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const orgSlug = (params?.orgSlug as string) ?? 'kura';

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(`/${orgSlug}/dashboard`);
    } else {
      router.replace(`/auth/login?org=${encodeURIComponent(orgSlug)}`);
    }
  }, [orgSlug, isAuthenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
    </div>
  );
}
