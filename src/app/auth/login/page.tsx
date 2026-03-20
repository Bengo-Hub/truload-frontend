'use client';

/**
 * Public login page (not under orgSlug). Figma-style two-column layout.
 * Fetches org by ?org= for branding; redirect after login by user type.
 */

import { LoginForm } from '@/components/forms/auth/LoginForm';
import { LoginPageLayout } from '@/components/layout/LoginPageLayout';
import type { PublicOrganization } from '@/lib/api/public';
import { fetchOrganizationByCode } from '@/lib/api/public';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function AuthLoginContent() {
  const searchParams = useSearchParams();
  const orgCode = searchParams?.get('org') ?? '';
  const [org, setOrg] = useState<PublicOrganization | null>(null);

  // Only fetch org branding if ?org= is provided, otherwise use TruLoad defaults
  useEffect(() => {
    if (orgCode) {
      fetchOrganizationByCode(orgCode)
        .then((o) => setOrg(o ?? null))
        .catch(() => setOrg(null));
    }
  }, [orgCode]);

  const primaryColor = org?.primaryColor || '#5B1C4D';

  return (
    <LoginPageLayout
      org={org}
      subtitle={org ? <p className="text-sm font-medium text-gray-600">Sign in to {org.name}</p> : <p className="text-sm font-medium text-gray-600">Platform sign in</p>}
      primaryColor={primaryColor}
    >
      <LoginForm mode="platform" orgSlugOverride={orgCode?.toLowerCase() || undefined} primaryColor={primaryColor} />
      <p className="mt-4 text-center text-xs text-gray-500">
        Use your organisation credentials. Contact your administrator if you need access.
      </p>
    </LoginPageLayout>
  );
}

export default function AuthLoginPage() {
  return (
    <Suspense fallback={
      <LoginPageLayout org={null} primaryColor="#5B1C4D">
        <div className="animate-pulse rounded-md bg-muted h-10 w-full max-w-sm" />
      </LoginPageLayout>
    }>
      <AuthLoginContent />
    </Suspense>
  );
}
