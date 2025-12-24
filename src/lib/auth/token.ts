/**
 * Token management utilities for SPA authentication.
 * Tokens are stored in client cookies (non-HTTPOnly) so they can be attached as Authorization headers.
 */

const TOKEN_EXPIRY_KEY = 'truload_token_expiry';
const ACCESS_TOKEN_KEY = 'truload_access_token';
const REFRESH_TOKEN_KEY = 'truload_refresh_token';

interface TokenBundle {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export function setTokens({ accessToken, refreshToken, expiresIn }: TokenBundle): void {
  if (typeof window === 'undefined') return;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = nowSeconds + expiresIn;
  const cookieExpiry = new Date((expiresAt + 3600) * 1000); // add 1h buffer

  // Store tokens in localStorage for easy access via Authorization header
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());

  // Also store as cookies for same-site requests
  document.cookie = `${ACCESS_TOKEN_KEY}=${accessToken}; path=/; expires=${cookieExpiry.toUTCString()}; SameSite=Strict`;
  document.cookie = `${REFRESH_TOKEN_KEY}=${refreshToken}; path=/; expires=${cookieExpiry.toUTCString()}; SameSite=Strict`;
  document.cookie = `${TOKEN_EXPIRY_KEY}=${expiresAt}; path=/; expires=${cookieExpiry.toUTCString()}; SameSite=Strict`;
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;

  // Clear localStorage
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);

  // Clear cookies
  const now = new Date(0).toUTCString();
  document.cookie = `${ACCESS_TOKEN_KEY}=; path=/; expires=${now}; SameSite=Strict`;
  document.cookie = `${REFRESH_TOKEN_KEY}=; path=/; expires=${now}; SameSite=Strict`;
  document.cookie = `${TOKEN_EXPIRY_KEY}=; path=/; expires=${now}; SameSite=Strict`;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Try localStorage first
  try {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) return token;
  } catch {
    // Fall through to cookie method
  }
  
  return getCookie(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Try localStorage first
  try {
    const token = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (token) return token;
  } catch {
    // Fall through to cookie method
  }
  
  return getCookie(REFRESH_TOKEN_KEY);
}

export function getTokenExpiry(): number | null {
  const expiry = getCookie(TOKEN_EXPIRY_KEY);
  return expiry ? parseInt(expiry, 10) : null;
}

export function hasValidToken(): boolean {
  const expiry = getTokenExpiry();
  if (!expiry) return false;

  const now = Math.floor(Date.now() / 1000);
  return expiry > now + 300; // at least 5 minutes remaining
}

export function shouldRefreshToken(): boolean {
  const expiry = getTokenExpiry();
  if (!expiry) return false;

  const now = Math.floor(Date.now() / 1000);
  return expiry - now < 300;
}

function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null;

  const nameEq = `${name}=`;
  const cookies = document.cookie.split(';');

  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(nameEq)) {
      return trimmed.substring(nameEq.length);
    }
  }

  return null;
}
