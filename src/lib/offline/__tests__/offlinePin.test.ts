/**
 * Offline PIN crypto-core tests. Verifies encrypt-at-rest, correct/wrong-PIN paths,
 * lockout-wipe, PIN validation, and that no plaintext token is persisted.
 */
import { webcrypto } from 'node:crypto';
import { TextEncoder as NodeTextEncoder, TextDecoder as NodeTextDecoder } from 'node:util';

// ── Environment shims (jsdom lacks TextEncoder/TextDecoder as globals) ─────────
if (typeof (globalThis as { TextEncoder?: unknown }).TextEncoder === 'undefined') {
  (globalThis as unknown as { TextEncoder: unknown }).TextEncoder = NodeTextEncoder;
  (globalThis as unknown as { TextDecoder: unknown }).TextDecoder = NodeTextDecoder;
}

// ── Environment shims (jsdom defines a non-writable crypto without subtle) ─────
if (!(globalThis as { crypto?: Crypto }).crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto as unknown as Crypto,
    configurable: true,
    writable: true,
  });
}
if (typeof (globalThis as { btoa?: unknown }).btoa === 'undefined') {
  (globalThis as unknown as { btoa: (s: string) => string }).btoa = (s) =>
    Buffer.from(s, 'binary').toString('base64');
  (globalThis as unknown as { atob: (s: string) => string }).atob = (s) =>
    Buffer.from(s, 'base64').toString('binary');
}
{
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  } as Storage;
}

import {
  enableOfflinePin,
  unlockWithPin,
  isOfflinePinEnabled,
  disableOfflinePin,
  getOfflinePinUserLabel,
  OFFLINE_PIN_MAX_ATTEMPTS,
  type CachedSession,
} from '../offlinePin';

const session: CachedSession = {
  accessToken: 'eyJ-SECRET-ACCESS-TOKEN-aaaa',
  refreshToken: 'SECRET-REFRESH-bbbb',
  tokenExpiry: 1782518400,
  user: { id: 'u1', email: 'gadmin@masterspace.co.ke' },
  organizationId: 'org-1',
  stationId: 'st-1',
  isHqUser: false,
};

beforeEach(() => disableOfflinePin());

describe('offline PIN crypto core', () => {
  it('enables a PIN and unlocks with the correct PIN', async () => {
    await enableOfflinePin('1234', session, 'gadmin@masterspace.co.ke');
    expect(isOfflinePinEnabled()).toBe(true);
    expect(getOfflinePinUserLabel()).toBe('gadmin@masterspace.co.ke');

    const res = await unlockWithPin('1234');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.session.accessToken).toBe(session.accessToken);
      expect(res.session.refreshToken).toBe(session.refreshToken);
      expect((res.session.user as { email: string }).email).toBe('gadmin@masterspace.co.ke');
    }
  });

  it('does NOT persist the token in plaintext at rest', async () => {
    await enableOfflinePin('4321', session);
    const raw = localStorage.getItem('truload_offline_pin_v1') ?? '';
    expect(raw).not.toContain(session.accessToken);
    expect(raw).not.toContain(session.refreshToken);
  });

  it('rejects a wrong PIN and decrements remaining attempts', async () => {
    await enableOfflinePin('1234', session);
    const res = await unlockWithPin('9999');
    expect(res.ok).toBe(false);
    if (!res.ok && res.reason === 'wrong') {
      expect(res.attemptsRemaining).toBe(OFFLINE_PIN_MAX_ATTEMPTS - 1);
    } else {
      throw new Error('expected wrong-PIN result');
    }
    // A correct PIN still works and resets the counter.
    expect((await unlockWithPin('1234')).ok).toBe(true);
  });

  it('wipes the blob after MAX_ATTEMPTS wrong PINs (lockout)', async () => {
    await enableOfflinePin('1234', session);
    let last;
    for (let i = 0; i < OFFLINE_PIN_MAX_ATTEMPTS; i++) last = await unlockWithPin('0000');
    expect(last && last.ok === false && last.reason === 'locked').toBe(true);
    expect(isOfflinePinEnabled()).toBe(false); // wiped — online login required
    expect(await unlockWithPin('1234')).toEqual({ ok: false, reason: 'not-enabled' });
  });

  it('rejects malformed PINs', async () => {
    await expect(enableOfflinePin('12', session)).rejects.toThrow();
    await expect(enableOfflinePin('abcd', session)).rejects.toThrow();
    await expect(enableOfflinePin('123456789', session)).rejects.toThrow();
  });
});
