/**
 * Background Sync Manager
 *
 * Detects online/offline transitions. When the app comes back online,
 * drains the Dexie mutation queue (oldest-first), pushing each mutation
 * to the backend. Failed mutations are retried up to MAX_RETRIES before
 * being marked with lastError for manual intervention.
 */

import { apiClient } from '@/lib/api/client';
import { offlineDb, type QueuedMutation } from './db';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

let isSyncing = false;

/**
 * Process a single queued mutation against the backend.
 */
async function processMutation(mutation: QueuedMutation): Promise<boolean> {
  try {
    const payload = JSON.parse(mutation.payload);

    switch (mutation.method) {
      case 'POST':
        await apiClient.post(mutation.endpoint, payload);
        break;
      case 'PUT':
        await apiClient.put(mutation.endpoint, payload);
        break;
      case 'PATCH':
        await apiClient.patch(mutation.endpoint, payload);
        break;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Drain the mutation queue oldest-first.
 * Returns the count of successfully synced mutations.
 */
export async function drainMutationQueue(): Promise<number> {
  if (isSyncing) return 0;
  isSyncing = true;

  let synced = 0;

  try {
    const pending = await offlineDb.mutationQueue
      .orderBy('createdAt')
      .toArray();

    for (const mutation of pending) {
      const success = await processMutation(mutation);

      if (success) {
        await offlineDb.mutationQueue.delete(mutation.id!);
        synced++;
      } else {
        const retries = mutation.retries + 1;
        if (retries >= MAX_RETRIES) {
          await offlineDb.mutationQueue.update(mutation.id!, {
            retries,
            lastError: `Failed after ${MAX_RETRIES} retries`,
          });
        } else {
          await offlineDb.mutationQueue.update(mutation.id!, { retries });
          // Wait before retrying next mutation
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }
  } finally {
    isSyncing = false;
  }

  return synced;
}

/**
 * Mark all synced offline invoices with a syncedAt timestamp.
 */
export async function markOfflineInvoicesSynced(): Promise<void> {
  const unsynced = await offlineDb.offlineInvoices
    .where('syncedAt')
    .equals('')
    .toArray();

  const now = new Date().toISOString();
  for (const inv of unsynced) {
    await offlineDb.offlineInvoices.update(inv.localId, { syncedAt: now });
  }
}

/**
 * Get current queue size (for UI indicators).
 */
export async function getPendingMutationCount(): Promise<number> {
  return offlineDb.mutationQueue.count();
}

/**
 * Get failed mutations that exceeded retry limit.
 */
export async function getFailedMutations(): Promise<QueuedMutation[]> {
  return offlineDb.mutationQueue
    .filter((m) => m.retries >= MAX_RETRIES)
    .toArray();
}

/**
 * Clear a specific failed mutation (manual dismissal).
 */
export async function dismissFailedMutation(id: number): Promise<void> {
  await offlineDb.mutationQueue.delete(id);
}

/**
 * Clear expired reference data cache entries.
 */
export async function clearExpiredCache(): Promise<number> {
  const now = new Date().toISOString();
  const expired = await offlineDb.referenceDataCache
    .filter((entry) => entry.expiresAt < now)
    .toArray();

  for (const entry of expired) {
    await offlineDb.referenceDataCache.delete(entry.key);
  }

  return expired.length;
}
