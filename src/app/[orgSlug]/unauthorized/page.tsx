'use client';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { ShieldX } from 'lucide-react';
import Link from 'next/link';

/**
 * Unauthorized page: shown when user accesses a route they don't have permission for.
 * Redirects to dashboard are handled by ProtectedRoute; this page is the destination.
 * Menu items are hidden when user lacks read permission, so they should not normally
 * land here unless they bookmarked or typed a URL.
 */
export default function UnauthorizedPage() {
  const orgSlug = useOrgSlug();

  return (
    <AppShell>
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-amber-200/60 bg-gradient-to-b from-amber-50/80 to-white p-8 shadow-lg shadow-amber-900/5 dark:border-amber-800/40 dark:from-amber-950/20 dark:to-background">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
              <ShieldX className="h-8 w-8 text-amber-600 dark:text-amber-400" aria-hidden />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Access not allowed
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              You don’t have permission to view this page. If you believe you should have access, contact your administrator.
            </p>
            <Button asChild className="mt-8">
              <Link href={orgSlug ? `/${orgSlug}/dashboard` : '/dashboard'}>
                Return to dashboard
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
