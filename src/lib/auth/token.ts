/**
 * Token management utilities for SPA authentication.
 * Tokens are stored in client cookies (non-HTTPOnly) so they can be attached as Authorization headers.
 */

const TOKEN_EXPIRY_KEY = 'truload_token_expiry';
const ACCESS_TOKEN_KEY = 'truload_access_token';
const REFRESH_TOKEN_KEY = 'truload_refresh_token';
const ORG_ID_KEY = 'truload_org_id';
const STATION_ID_KEY = 'truload_station_id';
const IS_HQ_USER_KEY = 'truload_is_hq_user';
const SELECTED_STATION_ID_KEY = 'truload_selected_station_id';
const IS_PLATFORM_OWNER_KEY = 'truload_is_platform_owner';

/** Platform owner org code — users in this org don't send tenant headers */
export const PLATFORM_OWNER_ORG_CODE = 'CODEVERTEX';

interface TokenBundle {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface TenantContext {
  organizationId?: string;
  stationId?: string;
  isHqUser?: boolean;
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
  localStorage.removeItem(ORG_ID_KEY);
  localStorage.removeItem(STATION_ID_KEY);
  localStorage.removeItem(IS_HQ_USER_KEY);
  localStorage.removeItem(SELECTED_STATION_ID_KEY);
  localStorage.removeItem(IS_PLATFORM_OWNER_KEY);

  // Clear scale test caches (all keys starting with truload_scale_test_)
  const scaleTestKeysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('truload_scale_test_')) {
      scaleTestKeysToRemove.push(key);
    }
  }
  scaleTestKeysToRemove.forEach((key) => localStorage.removeItem(key));

  // Clear weighing session
  localStorage.removeItem('truload_weighing_session');

  // Clear SSO session storage keys
  sessionStorage.removeItem('sso_code_verifier');
  sessionStorage.removeItem('sso_state');
  sessionStorage.removeItem('sso_exchange_token');
  sessionStorage.removeItem('sso_return_to');

  // Clear cookies
  const now = new Date(0).toUTCString();
  document.cookie = `${ACCESS_TOKEN_KEY}=; path=/; expires=${now}; SameSite=Strict`;
  document.cookie = `${REFRESH_TOKEN_KEY}=; path=/; expires=${now}; SameSite=Strict`;
  document.cookie = `${TOKEN_EXPIRY_KEY}=; path=/; expires=${now}; SameSite=Strict`;
}

/**
 * Store tenant context (organization and station IDs) from logged-in user.
 * These are sent as X-Org-ID and X-Station-ID headers on all API requests.
 * When isHqUser is true, we do not store stationId so backend does not filter by station; HQ users can set a selected station for drill-down via setSelectedStationId.
 */
export function setTenantContext({ organizationId, stationId, isHqUser }: TenantContext): void {
  if (typeof window === 'undefined') return;

  if (organizationId) {
    localStorage.setItem(ORG_ID_KEY, organizationId);
  }
  if (isHqUser !== undefined) {
    if (isHqUser) {
      localStorage.setItem(IS_HQ_USER_KEY, '1');
      localStorage.removeItem(STATION_ID_KEY);
    } else {
      localStorage.removeItem(IS_HQ_USER_KEY);
      if (stationId) localStorage.setItem(STATION_ID_KEY, stationId);
    }
  } else if (stationId) {
    localStorage.setItem(STATION_ID_KEY, stationId);
  } else {
    localStorage.removeItem(STATION_ID_KEY);
  }
}

/** Mark current user as platform owner (CODEVERTEX org) — skips tenant headers on API requests. */
export function setIsPlatformOwner(isPlatformOwner: boolean): void {
  if (typeof window === 'undefined') return;
  if (isPlatformOwner) localStorage.setItem(IS_PLATFORM_OWNER_KEY, '1');
  else localStorage.removeItem(IS_PLATFORM_OWNER_KEY);
}

/** True when the current user is a platform owner (CODEVERTEX org) — should not send X-Org-ID/X-Station-ID headers. */
export function getIsPlatformOwner(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(IS_PLATFORM_OWNER_KEY) === '1';
}

/** True when the current user is an HQ user (can access all stations; station filter is for drill-down only). */
export function getIsHqUser(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(IS_HQ_USER_KEY) === '1';
}

/** HQ users: set the selected station for drill-down (sent as X-Station-ID). Pass null to clear (view all stations). */
export function setSelectedStationId(stationId: string | null): void {
  if (typeof window === 'undefined') return;
  if (stationId) {
    localStorage.setItem(SELECTED_STATION_ID_KEY, stationId);
  } else {
    localStorage.removeItem(SELECTED_STATION_ID_KEY);
  }
}

/** HQ users: get the currently selected station for drill-down. */
export function getSelectedStationId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SELECTED_STATION_ID_KEY);
}

/**
 * Station ID to send in X-Station-ID header. For HQ users: selected station (or null = all stations). For non-HQ: their assigned station.
 */
export function getEffectiveStationId(): string | null {
  if (typeof window === 'undefined') return null;
  if (getIsHqUser()) {
    return getSelectedStationId();
  }
  return localStorage.getItem(STATION_ID_KEY);
}

/**
 * Get current organization ID for API headers.
 */
export function getOrganizationId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ORG_ID_KEY);
  } catch {
    return null;
  }
}

/** Get stored station ID (assigned station for non-HQ users). */
export function getStationId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STATION_ID_KEY);
  } catch {
    return null;
  }
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
