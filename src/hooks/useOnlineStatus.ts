/**
 * useOnlineStatus — reactive hook that tracks navigator.onLine.
 * Returns true when online, false when offline.
 */

'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { drainMutationQueue } from '@/lib/offline/sync';

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

  // Auto-drain mutation queue when coming back online
  useEffect(() => {
    if (isOnline) {
      drainMutationQueue().catch(console.error);
    }
  }, [isOnline]);

  return isOnline;
}
