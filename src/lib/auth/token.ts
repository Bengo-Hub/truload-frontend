/**
 * Token management utilities for secure httpOnly cookie storage.
 * Tokens are managed via backend API endpoints (no localStorage/sessionStorage).
 */

const TOKEN_EXPIRY_KEY = 'truload_token_expiry';

/**
 * Check if token exists and is not expired.
 * Note: Token is in httpOnly cookie, this checks expiry timestamp only.
 */
export function hasValidToken(): boolean {
  if (typeof window === 'undefined') return false;
  
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiry) return false;
  
  const expiryTime = parseInt(expiry, 10);
  const now = Math.floor(Date.now() / 1000);
  
  // Check if token expires in less than 5 minutes
  return expiryTime > now + 300;
}

/**
 * Store token expiry timestamp (token itself is in httpOnly cookie).
 */
export function setTokenExpiry(expiresAt: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());
}

/**
 * Get token expiry timestamp.
 */
export function getTokenExpiry(): number | null {
  if (typeof window === 'undefined') return null;
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  return expiry ? parseInt(expiry, 10) : null;
}

/**
 * Clear token expiry timestamp (token cookie cleared by backend).
 */
export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

/**
 * Check if token needs refresh (expires in less than 5 minutes).
 */
export function shouldRefreshToken(): boolean {
  const expiry = getTokenExpiry();
  if (!expiry) return false;
  
  const now = Math.floor(Date.now() / 1000);
  const fiveMinutes = 300;
  
  return expiry - now < fiveMinutes;
}
