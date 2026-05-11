'use client';

/**
 * SSO callback page — handles the redirect back from auth-api after PKCE flow.
 * Exchanges the authorization code for an SSO access token, then calls sso-exchange
 * to get a short-lived truload exchange token, then redirects to station selection.
 */

import { ssoExchange } from '@/lib/auth/api';
import {
  clearSsoPkceSession,
  exchangeCodeForSSOToken,
  getPkceVerifier,
  getSsoState,
  storeSsoExchangeToken,
} from '@/lib/auth/sso';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

const SSO_BASE_URL = process.env.NEXT_PUBLIC_AUTH_API_URL ?? 'https://sso.codevertexitsolutions.com';

type ErrorKind = 'org_mismatch' | 'general';

function SsoCallbackContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orgSlug = typeof params?.orgSlug === 'string' ? params.orgSlug : '';

  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind>('general');

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

        // 2. Exchange SSO token for truload exchange token
        const { ssoExchangeToken } = await ssoExchange(accessToken);

        // 3. Store exchange token and clear PKCE session data
        storeSsoExchangeToken(ssoExchangeToken);
        clearSsoPkceSession();

        // 4. Redirect to station selection
        router.replace(`/${orgSlug}/auth`);
      } catch (err: any) {
        clearSsoPkceSession();

        if (err?.status === 403 || err?.code === 'org_mismatch') {
          // org_mismatch: user's email exists in TruLoad under a different organisation.
          // Do NOT redirect to /auth/login — for commercial tenants that immediately
          // re-triggers the SSO flow, causing an infinite redirect loop.
          // Instead show an error with a SSO-logout link so the user can switch accounts.
          setErrorKind('org_mismatch');
          setError(
            err.message ||
              'Your account is registered under a different organisation. Contact your administrator or sign in with a different account.'
          );
          return;
        }
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
