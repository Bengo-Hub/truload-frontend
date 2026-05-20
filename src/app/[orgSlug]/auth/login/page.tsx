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
  const [ssoAvailable, setSsoAvailable] = useState(false);
  const [ssoSlug, setSsoSlug] = useState('');

  useEffect(() => {
    if (!orgSlug) {
      setSsoChecking(false);
      return;
    }

    let cancelled = false;

    async function checkTenant() {
      try {
        const [orgData, tenantInfo] = await Promise.all([
          fetchOrganizationByCode(orgSlug).catch(() => null),
          getTenantInfo(orgSlug),
        ]);

        if (cancelled) return;
        if (orgData) setOrg(orgData);

        if (tenantInfo?.tenantType === 'CommercialWeighing') {
          // Commercial tenant — offer SSO as an option (not auto-redirect)
          setSsoAvailable(true);
          setSsoSlug(tenantInfo.ssoTenantSlug || orgSlug);
        }
      } catch {
        // Ignore errors — fall through to show local login form
      } finally {
        if (!cancelled) setSsoChecking(false);
      }
    }

    checkTenant();
    return () => {
      cancelled = true;
    };
  }, [orgSlug, router]);

  const handleSsoLogin = async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state = generateState();
    const callbackUrl = `${window.location.origin}/${orgSlug}/auth/callback`;

    storePkceVerifier(verifier);
    storeSsoState(state);
    storeSsoReturnTo(`/${orgSlug}/dashboard`);

    const authorizeUrl = buildAuthorizeUrl(ssoSlug, challenge, state, callbackUrl);
    window.location.href = authorizeUrl;
  };

  const primaryColor = org?.primaryColor || '#5B1C4D';
  const orgDisplayName = org?.name ?? (orgSlug ? formatOrgDisplay(orgSlug) : 'Truload');
  const subtitle = orgDisplayName ? (
    <p className="text-sm font-medium text-gray-600">
      Sign in to {orgDisplayName}
      {stationCode && ` · ${stationCode}`}
    </p>
  ) : null;

  // Show spinner while checking tenant type
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

      {ssoAvailable && (
        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">or</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSsoLogin}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Login with SSO
          </button>
        </div>
      )}

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
        <LoginPageLayout org={null} primaryColor="#5B1C4D">
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
