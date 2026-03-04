/**
 * Redirect legacy /change-expired-password to /auth/change-expired-password (preserves query params).
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

function RedirectContent() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const token = searchParams?.get('token') ?? '';
    const q = token ? `token=${encodeURIComponent(token)}` : '';
    window.location.href = `/kura/auth/change-expired-password${q ? `?${q}` : ''}`;
  }, [searchParams]);
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
    </div>
  );
}

export default function ChangeExpiredPasswordRedirectPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    }>
      <RedirectContent />
    </Suspense>
  );
}
