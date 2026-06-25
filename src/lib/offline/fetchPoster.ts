/**
 * Service-worker-safe HTTP poster for HEADLESS background sync.
 *
 * Runs inside the service worker (no window/localStorage/axios), so it reads the auth token +
 * tenant ids from cookies via the Cookie Store API and POSTs with plain fetch. It mirrors the
 * headers the axios interceptor attaches (Authorization, X-Org-ID, X-Station-ID) and throws
 * errors shaped `{ response: { status, data } }` so sync.ts's terminal-4xx/backoff logic is
 * identical to the page path. Used only when no app window is open to drain the queue itself.
 */
import type { Poster } from './sync';

const API_PREFIX = '/api/v1';

declare const self: { location: { origin: string }; cookieStore?: { get(name: string): Promise<{ value: string } | null> } };

const COOKIE = {
  token: 'truload_access_token',
  orgId: 'truload_org_id',
  stationId: 'truload_station_id',
  selectedStationId: 'truload_selected_station_id',
};

async function cookie(name: string): Promise<string | null> {
  try {
    const c = await self.cookieStore?.get(name);
    return c?.value ?? null;
  } catch {
    return null;
  }
}

function baseUrl(): string {
  const override = process.env.NEXT_PUBLIC_API_URL;
  return `${override && override.length ? override : self.location.origin}${API_PREFIX}`;
}

async function buildHeaders(idempotencyKey?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = await cookie(COOKIE.token);
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const orgId = await cookie(COOKIE.orgId);
  if (orgId) headers['X-Org-ID'] = orgId;
  // Effective station = explicitly-selected station, else the user's assigned station.
  const stationId = (await cookie(COOKIE.selectedStationId)) ?? (await cookie(COOKIE.stationId));
  if (stationId) headers['X-Station-ID'] = stationId;
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  return headers;
}

async function send(
  method: string,
  endpoint: string,
  body: unknown,
  idempotencyKey?: string,
): Promise<{ data: unknown }> {
  const res = await fetch(`${baseUrl()}${endpoint}`, {
    method,
    headers: await buildHeaders(idempotencyKey),
    body: JSON.stringify(body ?? {}),
    credentials: 'include',
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    // Match axios' error shape so isTerminal()/errMessage() behave identically.
    throw { response: { status: res.status, data }, message: `HTTP ${res.status}` };
  }
  return { data };
}

export const fetchPoster: Poster = {
  post: (e, b, k) => send('POST', e, b, k),
  put: (e, b, k) => send('PUT', e, b, k),
  patch: (e, b, k) => send('PATCH', e, b, k),
};
