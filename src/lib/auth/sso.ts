/**
 * SSO PKCE helpers for commercial tenant authentication via auth-api (OIDC/PKCE flow).
 * Used by the login page when tenantType === 'CommercialWeighing'.
 *
 * Flow:
 * 1. generateCodeVerifier() + generateCodeChallenge() → PKCE pair
 * 2. buildAuthorizeUrl() → redirect to auth-api /authorize
 * 3. On callback: exchangeCodeForSSOToken() → SSO access token
 * 4. POST /api/v1/auth/sso-exchange → ssoExchangeToken
 * 5. Station selection → POST /api/v1/auth/select-station → full truload JWT
 */

const SSO_CODE_VERIFIER_KEY = 'sso_code_verifier';
const SSO_STATE_KEY = 'sso_state';
const SSO_EXCHANGE_TOKEN_KEY = 'sso_exchange_token';
const SSO_RETURN_TO_KEY = 'sso_return_to';

/** Generates a cryptographically random base64url-encoded code verifier (43-128 chars). */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
}

/** Generates the code challenge (S256) from a code verifier. */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64urlEncode(new Uint8Array(digest));
}

/** Generates a random state string for CSRF protection. */
export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Builds the auth-api PKCE authorize URL.
 * @param ssoTenantSlug - The SSO tenant slug from auth-api (e.g. "truload"), NOT the TruLoad org code.
 *   This must match a tenant slug registered in auth-api. Use TenantInfo.ssoTenantSlug.
 */
export function buildAuthorizeUrl(
  ssoTenantSlug: string,
  codeChallenge: string,
  state: string,
  redirectUri: string
): string {
  const authApiBase = process.env.NEXT_PUBLIC_AUTH_API_URL ?? 'https://sso.codevertexitsolutions.com';
  const clientId = process.env.NEXT_PUBLIC_SSO_CLIENT_ID ?? 'truload-ui';

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile email offline_access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    tenant: ssoTenantSlug,
  });

  // Per SSO integration guide: correct path is /api/v1/authorize
  return `${authApiBase}/api/v1/authorize?${params.toString()}`;
}

/** Exchanges an authorization code for an SSO access token via the auth-api token endpoint. */
export async function exchangeCodeForSSOToken(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<{ accessToken: string }> {
  const authApiBase = process.env.NEXT_PUBLIC_AUTH_API_URL ?? 'https://sso.codevertexitsolutions.com';
  const clientId = process.env.NEXT_PUBLIC_SSO_CLIENT_ID ?? 'truload-ui';

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  });

  const response = await fetch(`${authApiBase}/api/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SSO token exchange failed (${response.status}): ${text}`);
  }

  const json = await response.json();
  const accessToken = json.access_token ?? json.accessToken;
  if (!accessToken) {
    throw new Error('SSO token exchange: no access_token in response');
  }
  return { accessToken };
}

// ── Session storage helpers ───────────────────────────────────────────────────

export function storePkceVerifier(verifier: string): void {
  sessionStorage.setItem(SSO_CODE_VERIFIER_KEY, verifier);
}

export function getPkceVerifier(): string | null {
  return sessionStorage.getItem(SSO_CODE_VERIFIER_KEY);
}

export function storeSsoState(state: string): void {
  sessionStorage.setItem(SSO_STATE_KEY, state);
}

export function getSsoState(): string | null {
  return sessionStorage.getItem(SSO_STATE_KEY);
}

export function storeSsoExchangeToken(token: string): void {
  sessionStorage.setItem(SSO_EXCHANGE_TOKEN_KEY, token);
}

export function getSsoExchangeToken(): string | null {
  return sessionStorage.getItem(SSO_EXCHANGE_TOKEN_KEY);
}

export function clearSsoExchangeToken(): void {
  sessionStorage.removeItem(SSO_EXCHANGE_TOKEN_KEY);
}

export function storeSsoReturnTo(url: string): void {
  sessionStorage.setItem(SSO_RETURN_TO_KEY, url);
}

export function getSsoReturnTo(): string | null {
  return sessionStorage.getItem(SSO_RETURN_TO_KEY);
}

export function clearSsoPkceSession(): void {
  sessionStorage.removeItem(SSO_CODE_VERIFIER_KEY);
  sessionStorage.removeItem(SSO_STATE_KEY);
  sessionStorage.removeItem(SSO_RETURN_TO_KEY);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function base64urlEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
