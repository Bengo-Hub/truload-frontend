'use client';

/**
 * Tenant login page under [orgSlug]. Figma-style two-column layout: form left, image right.
 * User selects station on [orgSlug]/auth, then lands here with ?station=CODE.
 */

import { LoginForm } from '@/components/forms/auth/LoginForm';
import { LoginPageLayout } from '@/components/layout/LoginPageLayout';
import { getTenantInfo } from '@/lib/auth/api';
import {
  buildAuthorizeUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
  storePkceVerifier,
  storeSsoReturnTo,
  storeSsoState,
} from '@/lib/auth/sso';
import type { PublicOrganization } from '@/lib/api/public';
import { fetchOrganizationByCode } from '@/lib/api/public';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function formatOrgDisplay(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1).toLowerCase();
}

function TenantAuthLoginContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orgSlug = typeof params?.orgSlug === 'string' ? params.orgSlug : '';
  const stationCode = searchParams?.get('station') ?? 'Truload';
  const [org, setOrg] = useState<PublicOrganization | null>(null);
  const [ssoChecking, setSsoChecking] = useState(true);

  useEffect(() => {
    if (!orgSlug) {
      setSsoChecking(false);
      return;
    }

    let cancelled = false;

    async function checkTenantAndMaybeRedirectToSSO() {
      try {
        const [orgData, tenantInfo] = await Promise.all([
          fetchOrganizationByCode(orgSlug).catch(() => null),
          getTenantInfo(orgSlug),
        ]);

        if (cancelled) return;
        if (orgData) setOrg(orgData);

        if (tenantInfo?.tenantType === 'CommercialWeighing') {
          // Commercial tenant — redirect to SSO
          const verifier = generateCodeVerifier();
          const challenge = await generateCodeChallenge(verifier);
          const state = generateState();
          const callbackUrl = `${window.location.origin}/${orgSlug}/auth/callback`;

          storePkceVerifier(verifier);
          storeSsoState(state);
          storeSsoReturnTo(`/${orgSlug}/dashboard`);

          const authorizeUrl = buildAuthorizeUrl(orgSlug, challenge, state, callbackUrl);
          window.location.href = authorizeUrl;
          return; // navigation in progress
        }
      } catch {
        // Ignore errors — fall through to show local login form
      } finally {
        if (!cancelled) setSsoChecking(false);
      }
    }

    checkTenantAndMaybeRedirectToSSO();
    return () => {
      cancelled = true;
    };
  }, [orgSlug, router]);

  const primaryColor = org?.primaryColor || '#0a9f3d';
  const orgDisplayName = org?.name ?? (orgSlug ? formatOrgDisplay(orgSlug) : 'Truload');
  const subtitle = orgDisplayName ? (
    <p className="text-sm font-medium text-gray-600">
      Sign in to {orgDisplayName}
      {stationCode && ` · ${stationCode}`}
    </p>
  ) : null;

  // Show spinner while checking tenant type (SSO redirect may be in progress)
  if (ssoChecking) {
    return (
      <LoginPageLayout org={org} primaryColor={primaryColor}>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      </LoginPageLayout>
    );
  }

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
