'use client';

/**
 * Tenant login page under [orgSlug]. Figma-style two-column layout: form left, image right.
 * User selects station on [orgSlug]/auth, then lands here with ?station=CODE.
 */

import { LoginForm } from '@/components/forms/auth/LoginForm';
import { LoginPageLayout } from '@/components/layout/LoginPageLayout';
import type { PublicOrganization } from '@/lib/api/public';
import { fetchOrganizationByCode } from '@/lib/api/public';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function formatOrgDisplay(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1).toLowerCase();
}

function TenantAuthLoginContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgSlug = typeof params?.orgSlug === 'string' ? params.orgSlug : '';
  const stationCode = searchParams?.get('station') ?? 'Truload';
  const [org, setOrg] = useState<PublicOrganization | null>(null);

  useEffect(() => {
    if (!orgSlug) return;
    fetchOrganizationByCode(orgSlug)
      .then((o) => setOrg(o ?? null))
      .catch(() => setOrg(null));
  }, [orgSlug]);

  const primaryColor = org?.primaryColor || '#0a9f3d';
  const orgDisplayName = org?.name ?? (orgSlug ? formatOrgDisplay(orgSlug) : 'Truload');
  const subtitle = orgDisplayName ? (
    <p className="text-sm font-medium text-gray-600">
      Sign in to {orgDisplayName}
      {stationCode && ` · ${stationCode}`}
    </p>
  ) : null;

  return (
    <LoginPageLayout org={org} subtitle={subtitle} primaryColor={primaryColor}>
      <LoginForm
        mode="tenant"
        orgSlugOverride={orgSlug.toLowerCase()}
        stationCode={stationCode}
        primaryColor={primaryColor}
      />
      <p className="mt-4 text-center text-xs text-gray-500">
        <Link href={`/${orgSlug}/auth`} className="font-large text-lg hover:underline" style={{ color: primaryColor }}>
          Choose a different station
        </Link>
        {' · '}
      </p>
    </LoginPageLayout>
  );
}

export default function TenantAuthLoginPage() {
  return (
    <Suspense
      fallback={
        <LoginPageLayout org={null} primaryColor="#0a9f3d">
          <div className="animate-pulse space-y-4">
            <div className="h-10 rounded bg-muted" />
            <div className="h-10 rounded bg-muted" />
            <div className="h-10 rounded bg-muted" />
          </div>
        </LoginPageLayout>
      }
    >
      <TenantAuthLoginContent />
    </Suspense>
  );
}
