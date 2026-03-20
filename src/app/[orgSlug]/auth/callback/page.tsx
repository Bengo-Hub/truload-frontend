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
  getSsoReturnTo,
  getSsoState,
  storeSsoExchangeToken,
} from '@/lib/auth/sso';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';

function SsoCallbackContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orgSlug = typeof params?.orgSlug === 'string' ? params.orgSlug : '';

  const [error, setError] = useState<string | null>(null);

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
      setError('Missing code verifier — please try logging in again.');
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
        // On 403 (org mismatch), show toast, clear SSO data, and redirect to login
        if (err?.status === 403 || err?.code === 'org_mismatch') {
          clearSsoPkceSession();
          toast.error(err.message || 'You do not have access to this organisation.');
          router.replace(`/${orgSlug}/auth/login`);
          return;
        }
        setError(err instanceof Error ? err.message : 'SSO login failed');
      }
    }

    completeSSO();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="mb-2 text-lg font-semibold text-destructive">Login Failed</h2>
          <p className="mb-4 text-sm text-muted-foreground">{error}</p>
          <a href={`/${orgSlug}/auth/login`} className="text-sm underline">
            Try again
          </a>
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
