/**
 * Cache last selected org + station for pre-login station screen.
 * Preselects the station next time user visits [orgSlug]/auth for the same org.
 */

const KEY = 'truload_last_login_station';

export interface LastLoginStation {
  orgSlug: string;
  stationCode: string;
}

export function getLastLoginStation(): LastLoginStation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'orgSlug' in parsed &&
      'stationCode' in parsed &&
      typeof (parsed as LastLoginStation).orgSlug === 'string' &&
      typeof (parsed as LastLoginStation).stationCode === 'string'
    ) {
      return parsed as LastLoginStation;
    }
  } catch {
    // ignore
  }
  return null;
}

export function setLastLoginStation(orgSlug: string, stationCode: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ orgSlug, stationCode }));
  } catch {
    // ignore
  }
}

/**
 * Returns the path to redirect to after tenant user logout.
 * Uses cached last login (org + station) so they land on their tenant login page.
 * @param currentOrgSlug - org slug from current route (e.g. useOrgSlug()), used when no cache
 * @returns Path like /kura/auth/login?station=XXX or /auth/login
 */
export function getPostLogoutRedirectPath(currentOrgSlug?: string | null): string {
  const cached = getLastLoginStation();
  const org = (cached?.orgSlug || currentOrgSlug || '').trim().toLowerCase();
  if (!org) return '/auth/login';
  const station = cached?.stationCode?.trim();
  const query = station ? `?station=${encodeURIComponent(station)}` : '';
  return `/${org}/auth/login${query}`;
}
