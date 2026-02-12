'use client';

import { useCallback, useEffect, useState } from 'react';
import { offlineDb, type ReferenceDataEntry } from '@/lib/offline/db';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface UseOfflineCacheOptions<T> {
  key: string;
  fetchFn: () => Promise<T>;
  ttlMs?: number;
}

/**
 * Read-through cache backed by Dexie/IndexedDB.
 *
 * 1. Check Dexie for cached value by key
 * 2. If hit AND not expired, return cached immediately
 * 3. If online, fetch fresh data in background (stale-while-revalidate)
 * 4. If miss or expired and offline, return whatever is cached (even stale)
 * 5. Store fetched data in Dexie with TTL
 */
export function useOfflineCache<T>({ key, fetchFn, ttlMs = DEFAULT_TTL_MS }: UseOfflineCacheOptions<T>) {
  const isOnline = useOnlineStatus();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadFromCache = useCallback(async (): Promise<ReferenceDataEntry | undefined> => {
    try {
      return await offlineDb.referenceDataCache.get(key);
    } catch {
      return undefined;
    }
  }, [key]);

  const saveToCache = useCallback(async (value: T) => {
    const now = new Date();
    const entry: ReferenceDataEntry = {
      key,
      data: JSON.stringify(value),
      fetchedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    };
    await offlineDb.referenceDataCache.put(entry);
  }, [key, ttlMs]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // 1. Try cache first
    const cached = await loadFromCache();
    const now = new Date().toISOString();

    if (cached) {
      const parsedData = JSON.parse(cached.data) as T;
      setData(parsedData);
      setIsLoading(false);

      // If not expired and we're not forcing a refresh, we're done
      if (cached.expiresAt > now && !isOnline) {
        return;
      }
    }

    // 2. If online, fetch fresh
    if (isOnline) {
      try {
        const freshData = await fetchFn();
        setData(freshData);
        await saveToCache(freshData);
      } catch (err) {
        // If we already have cached data, keep showing it
        if (!cached) {
          setError(err instanceof Error ? err : new Error('Failed to fetch'));
        }
      }
    } else if (!cached) {
      // Offline with no cache
      setError(new Error('No cached data available offline'));
    }

    setIsLoading(false);
  }, [loadFromCache, saveToCache, fetchFn, isOnline]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}
