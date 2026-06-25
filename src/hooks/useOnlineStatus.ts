/**
 * useOnlineStatus — reactive hook that tracks navigator.onLine.
 * Returns true when online, false when offline.
 */

'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { drainMutationQueue } from '@/lib/offline/sync';
import { registerBackgroundSync } from '@/lib/offline/registerBackgroundSync';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true; // SSR assumes online
}

export function useOnlineStatus(): boolean {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Coming back online: drain immediately. Going offline: register a background-sync request so
  // the browser drains the queue when connectivity returns even if the app is later closed.
  useEffect(() => {
    if (isOnline) {
      drainMutationQueue().catch(console.error);
    } else {
      void registerBackgroundSync();
    }
  }, [isOnline]);

  return isOnline;
}
