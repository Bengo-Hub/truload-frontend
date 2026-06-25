/**
 * Offline PIN — encrypts a cached auth session at rest with a PIN-derived key so an officer can
 * unlock TruLoad offline (e.g. after the app was closed at a no-signal bridge) WITHOUT the cached
 * tokens ever sitting in plaintext on the device.
 *
 * Threat model & design rationale:
 * - The PIN never authenticates with the server and never mints a JWT. It only DECRYPTS a session
 *   that was already established online. Real session validity is still enforced by the server's
 *   refresh flow on reconnect (7-day refresh token). So a stolen/guessed offline PIN grants only
 *   offline capture with an already-issued (and server-revocable) token — not server access.
 * - Because a plaintext token in localStorage would let a device thief bypass the PIN entirely,
 *   the session blob is AES-GCM encrypted with a key derived from the PIN via PBKDF2-SHA256
 *   (high iteration count). Without the PIN the ciphertext is useless; a wrong PIN fails GCM auth.
 * - Lockout: PBKDF2 is deliberately slow (rate-limits brute force) and after MAX_ATTEMPTS wrong
 *   PINs the encrypted blob is WIPED — the only recovery is an online login. This is the offline
 *   analogue of POS's server-side 5-attempt lockout (we can't reach the server to count offline).
 *
 * Opt-in: nothing changes unless a user explicitly enables a PIN. Mirrors the pos-ui PIN model
 * (pos-ui/src/app/[orgSlug]/pin-login) adapted from server-bcrypt to client-encrypt-at-rest.
 */

const STORAGE_KEY = 'truload_offline_pin_v1';
const PBKDF2_ITERATIONS = 210_000; // OWASP 2023 PBKDF2-SHA256 floor
const MAX_ATTEMPTS = 5;
const PIN_MIN_LEN = 4;
const PIN_MAX_LEN = 8;

/** The minimal session needed to resume offline operation after a PIN unlock. */
export interface CachedSession {
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number | null; // seconds-epoch (as returned by token.ts getTokenExpiry)
  user: unknown; // the auth-store User object (opaque here)
  organizationId?: string | null;
  stationId?: string | null;
  isHqUser?: boolean;
}

interface PinBlob {
  v: 1;
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
  iterations: number;
  attempts: number;
  userLabel?: string; // non-sensitive hint shown on the unlock screen (e.g. email/name)
  createdAt: string;
}

export type UnlockResult =
  | { ok: true; session: CachedSession }
  | { ok: false; reason: 'wrong'; attemptsRemaining: number }
  | { ok: false; reason: 'locked' } // blob wiped after too many attempts — online login required
  | { ok: false; reason: 'not-enabled' };

// ── base64 <-> bytes ──────────────────────────────────────────────────────────
const toB64 = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};
const fromB64 = (b64: string): Uint8Array => {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
};

const subtle = (): SubtleCrypto => {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.subtle) throw new Error('WebCrypto unavailable');
  return c.subtle;
};

// WebCrypto expects BufferSource; TS 5.7 narrows Uint8Array to Uint8Array<ArrayBufferLike>
// which doesn't structurally satisfy it, so cast at the boundary.
const bs = (u: Uint8Array): BufferSource => u as unknown as BufferSource;

async function deriveKey(pin: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const baseKey = await subtle().importKey('raw', bs(new TextEncoder().encode(pin)), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return subtle().deriveKey(
    { name: 'PBKDF2', salt: bs(salt), iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function readBlob(): PinBlob | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PinBlob) : null;
  } catch {
    return null;
  }
}
function writeBlob(blob: PinBlob): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
}

export function isOfflinePinEnabled(): boolean {
  return !!readBlob();
}

/** Non-sensitive label (email/name) to show on the unlock screen, if a PIN is set. */
export function getOfflinePinUserLabel(): string | null {
  return readBlob()?.userLabel ?? null;
}

export function disableOfflinePin(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

function validatePin(pin: string): void {
  if (!/^\d+$/.test(pin) || pin.length < PIN_MIN_LEN || pin.length > PIN_MAX_LEN) {
    throw new Error(`PIN must be ${PIN_MIN_LEN}-${PIN_MAX_LEN} digits`);
  }
}

/** Enable (or re-set) the offline PIN by encrypting the current session under it. */
export async function enableOfflinePin(
  pin: string,
  session: CachedSession,
  userLabel?: string,
): Promise<void> {
  validatePin(pin);
  const cryptoObj = (globalThis as { crypto?: Crypto }).crypto!;
  const salt = cryptoObj.getRandomValues(new Uint8Array(16));
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt, PBKDF2_ITERATIONS);
  const plaintext = new TextEncoder().encode(JSON.stringify(session));
  const ciphertext = await subtle().encrypt({ name: 'AES-GCM', iv: bs(iv) }, key, bs(plaintext));
  writeBlob({
    v: 1,
    salt: toB64(salt),
    iv: toB64(iv),
    ciphertext: toB64(ciphertext),
    iterations: PBKDF2_ITERATIONS,
    attempts: 0,
    userLabel,
    createdAt: new Date().toISOString(),
  });
}

/** Attempt to decrypt the cached session with the entered PIN. */
export async function unlockWithPin(pin: string): Promise<UnlockResult> {
  const blob = readBlob();
  if (!blob) return { ok: false, reason: 'not-enabled' };
  if (blob.attempts >= MAX_ATTEMPTS) {
    disableOfflinePin();
    return { ok: false, reason: 'locked' };
  }
  try {
    const key = await deriveKey(pin, fromB64(blob.salt), blob.iterations);
    const plaintext = await subtle().decrypt(
      { name: 'AES-GCM', iv: bs(fromB64(blob.iv)) },
      key,
      bs(fromB64(blob.ciphertext)),
    );
    const session = JSON.parse(new TextDecoder().decode(plaintext)) as CachedSession;
    if (blob.attempts !== 0) writeBlob({ ...blob, attempts: 0 }); // reset on success
    return { ok: true, session };
  } catch {
    // GCM auth failure = wrong PIN (or corrupted blob).
    const attempts = blob.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      disableOfflinePin(); // wipe — only an online login can restore offline access
      return { ok: false, reason: 'locked' };
    }
    writeBlob({ ...blob, attempts });
    return { ok: false, reason: 'wrong', attemptsRemaining: MAX_ATTEMPTS - attempts };
  }
}

export const OFFLINE_PIN_MAX_ATTEMPTS = MAX_ATTEMPTS;
