/**
 * Registers Background Sync so the browser wakes the service worker to drain the offline queue
 * when connectivity returns — even if the app tab/PWA was closed. Best-effort: silently no-ops
 * where the API is unsupported (the in-app `online`-event drain remains the fallback).
 */
const SYNC_TAG = 'truload-sync';

export async function registerBackgroundSync(): Promise<void> {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sync = (reg as unknown as { sync?: { register(tag: string): Promise<void> } }).sync;
    if (sync) await sync.register(SYNC_TAG);
  } catch {
    /* unsupported / not permitted — fall back to the online-event drain */
  }
}

/** Opt-in periodic background sync (Chrome, installed PWA, permission granted). */
export async function registerPeriodicSync(): Promise<void> {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const status = await navigator.permissions
      .query({ name: 'periodic-background-sync' as PermissionName })
      .catch(() => null);
    if (status?.state !== 'granted') return;
    const reg = await navigator.serviceWorker.ready;
    const periodic = (reg as unknown as {
      periodicSync?: { register(tag: string, opts: { minInterval: number }): Promise<void> };
    }).periodicSync;
    if (periodic) await periodic.register(SYNC_TAG, { minInterval: 15 * 60 * 1000 });
  } catch {
    /* unsupported / not permitted */
  }
}
