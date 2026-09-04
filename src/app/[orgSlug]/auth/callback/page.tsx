'use client';

/**
 * SSO callback page — handles the redirect back from auth-api after PKCE flow.
 * Exchanges the authorization code for an SSO access token, then calls sso-exchange
 * to get a short-lived truload exchange token, then redirects to station selection.
 */

import { getSsoPlatformOrganizations, ssoExchange, type SsoPlatformOrganization } from '@/lib/auth/api';
import {
  clearSsoPkceSession,
  exchangeCodeForSSOToken,
  getPkceVerifier,
  getSsoState,
  storeSsoExchangeToken,
} from '@/lib/auth/sso';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

const SSO_BASE_URL = process.env.NEXT_PUBLIC_AUTH_API_URL ?? 'https://sso.codevertexafrica.com';

type ErrorKind = 'org_mismatch' | 'general';

function SsoCallbackContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orgSlug = typeof params?.orgSlug === 'string' ? params.orgSlug : '';

  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind>('general');
  // Platform-owner org picker: set once getSsoPlatformOrganizations confirms is_platform_owner.
  // Holds the raw SSO access token so the picker can call ssoExchange itself once a choice is made.
  const [platformOrgPicker, setPlatformOrgPicker] = useState<{
    accessToken: string;
    organizations: SsoPlatformOrganization[];
  } | null>(null);
  const [pickerBusy, setPickerBusy] = useState(false);

  // Shared by the normal single-org path and the platform-owner picker's "select" handler.
  const finishSsoExchange = useCallback(
    async (accessToken: string, targetOrgCode?: string) => {
      try {
        const { ssoExchangeToken } = await ssoExchange(accessToken, targetOrgCode);
        storeSsoExchangeToken(ssoExchangeToken);
        clearSsoPkceSession();
        router.replace(`/${orgSlug}/auth`);
      } catch (err: any) {
        clearSsoPkceSession();
        if (err?.status === 403 || err?.code === 'org_mismatch') {
          setErrorKind('org_mismatch');
          setError(
            err.message ||
              'Your account is registered under a different organisation. Contact your administrator or sign in with a different account.'
          );
          return;
        }
        setError(err instanceof Error ? err.message : 'SSO login failed');
      }
    },
    [orgSlug, router]
  );

  async function handleSelectPlatformOrg(code: string) {
    if (!platformOrgPicker) return;
    setPickerBusy(true);
    await finishSsoExchange(platformOrgPicker.accessToken, code);
    setPickerBusy(false);
  }

  useEffect(() => {
    if (!orgSlug) return;

    const code = searchParams?.get('code');
    const state = searchParams?.get('state');
    const errorParam = searchParams?.get('error');

    if (errorParam) {
      setError(`SSO authorization denied: ${errorParam}`);
      return;
    }

    if (!code || !state) {
      setError('Missing authorization code or state');
      return;
    }

    const savedState = getSsoState();
    if (state !== savedState) {
      setError('State mismatch — possible CSRF attack. Please try logging in again.');
      return;
    }

    const verifier = getPkceVerifier();
    if (!verifier) {
      setError('Missing PKCE session — please try logging in again.');
      return;
    }

    const callbackUrl = `${window.location.origin}/${orgSlug}/auth/callback`;

    async function completeSSO() {
      try {
        // 1. Exchange authorization code for SSO access token
        const { accessToken } = await exchangeCodeForSSOToken(code!, verifier!, callbackUrl);

        // 2. Platform-owner check: if this SSO token carries is_platform_owner, show an org
        // picker instead of exchanging immediately — the platform owner may want a DIFFERENT
        // org than the one this login page's URL happens to belong to (e.g. a real enforcement
        // org like KURA, which has no SsoTenantSlug of its own and can only be reached via an
        // explicit targetOrgCode on ssoExchange). A non-platform-owner token gets null back and
        // falls straight through to the existing single-org flow, unchanged.
        const platformOrgs = await getSsoPlatformOrganizations(accessToken);
        if (platformOrgs && platformOrgs.length > 0) {
          setPlatformOrgPicker({ accessToken, organizations: platformOrgs });
          return;
        }

        await finishSsoExchange(accessToken);
      } catch (err: any) {
        // exchangeCodeForSSOToken / getSsoPlatformOrganizations failures land here — org_mismatch
        // specifically only ever comes from ssoExchange itself, handled inside finishSsoExchange.
        clearSsoPkceSession();
        setError(err instanceof Error ? err.message : 'SSO login failed');
      }
    }

    completeSSO();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug]);

  // SSO logout URL: clears the SSO session cookie, then redirects back to the login page.
  // This lets the user sign in with a different account and breaks any re-entry loop.
  const ssoLogoutUrl = `${SSO_BASE_URL}/api/v1/auth/logout?post_logout_redirect_uri=${encodeURIComponent(
    `${typeof window !== 'undefined' ? window.location.origin : ''}/${orgSlug}/auth/login`
  )}`;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md w-full rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center space-y-4">
          <h2 className="text-lg font-semibold text-destructive">Sign-in Failed</h2>
          <p className="text-sm text-muted-foreground">{error}</p>

          {errorKind === 'org_mismatch' ? (
            <div className="flex flex-col gap-2">
              <a
                href={ssoLogoutUrl}
                className="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                Sign out &amp; try a different account
              </a>
              <a href={`/${orgSlug}/auth`} className="text-sm text-muted-foreground underline">
                Back to station select
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <a
                href={`/${orgSlug}/auth/login`}
                className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Try again
              </a>
              <a href={`/${orgSlug}/auth`} className="text-sm text-muted-foreground underline">
                Back to station select
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (platformOrgPicker) {
    const grouped = platformOrgPicker.organizations.reduce<Record<string, SsoPlatformOrganization[]>>((acc, org) => {
      const key = org.tenantType || 'Other';
      (acc[key] ||= []).push(org);
      return acc;
    }, {});

    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md w-full rounded-lg border p-6 space-y-4">
          <div className="space-y-1 text-center">
            <h2 className="text-lg font-semibold">Choose Organisation</h2>
            <p className="text-sm text-muted-foreground">
              This account has access to more than one organisation. Select which one to enter.
            </p>
          </div>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {Object.entries(grouped).map(([tenantType, orgs]) => (
              <div key={tenantType} className="space-y-1">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {tenantType === 'CommercialWeighing' ? 'Commercial Weighing' : tenantType === 'AxleLoadEnforcement' ? 'Axle Load Enforcement' : tenantType}
                </p>
                {orgs.map((org) => (
                  <button
                    key={org.code}
                    disabled={pickerBusy}
                    onClick={() => handleSelectPlatformOrg(org.code)}
                    className="w-full flex items-center justify-between rounded-md border px-3 py-2 text-sm text-left hover:bg-muted disabled:opacity-50"
                  >
                    <span>{org.name}</span>
                    <span className="text-xs text-muted-foreground">{org.code}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          {pickerBusy && <p className="text-center text-xs text-muted-foreground">Signing in…</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Completing sign-in...</p>
      </div>
    </div>
  );
}

export default function SsoCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <SsoCallbackContent />
    </Suspense>
  );
}
