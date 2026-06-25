/**
 * Background Sync Manager
 *
 * When the app comes back online it drains, in dependency order and with
 * exactly-once semantics:
 *   1. the typed workflow stores — weighings → cases → prosecutions → invoices
 *      (children resolve their parent's freshly-synced server id), then
 *   2. the generic mutation queue (oldest-first).
 *
 * Every POST carries an `Idempotency-Key` header (the row's stable localId), so a
 * replay returns the existing server record instead of creating a duplicate
 * (backed by the Phase 1 backend get-or-create). Failures use exponential backoff
 * + jitter; terminal 4xx (except 408/429) dead-letter for manual review.
 */

import { apiClient } from '@/lib/api/client';
import {
  offlineDb,
  nextRetryState,
  pendingReady,
  getSyncStatusCounts,
  type QueuedMutation,
  type SyncState,
} from './db';

let isSyncing = false;

/** A 4xx (except 408 timeout / 429 rate-limit) is a permanent failure → dead-letter. */
function isTerminal(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return typeof status === 'number' && status >= 400 && status < 500 && status !== 408 && status !== 429;
}

function errMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || 'Unknown sync error';
}

function idem(key: string) {
  return { headers: { 'Idempotency-Key': key } };
}

// ── Typed workflow drain (weighings → cases → prosecutions → invoices) ────────

async function syncWeighings(nowMs: number): Promise<number> {
  let n = 0;
  const ready = pendingReady(await offlineDb.offlineWeighings.toArray(), nowMs);
  for (const w of ready) {
    try {
      const res = await apiClient.post('/weighing-transactions', JSON.parse(w.payload), idem(w.localId));
      await offlineDb.offlineWeighings.update(w.localId, {
        synced: true, serverId: (res.data as { id: string }).id, syncedAt: new Date(nowMs).toISOString(),
      } as Partial<typeof w>);
      n++;
    } catch (err) {
      await offlineDb.offlineWeighings.update(w.localId, nextRetryState(w, errMessage(err), isTerminal(err), nowMs) as Partial<typeof w>);
    }
  }
  return n;
}

async function syncCases(nowMs: number): Promise<number> {
  let n = 0;
  const ready = pendingReady(await offlineDb.offlineCases.toArray(), nowMs);
  for (const c of ready) {
    // Resolve the parent weighing's server id; skip this pass if not synced yet.
    let serverWeighingId = c.serverWeighingId;
    if (!serverWeighingId && c.localWeighingId) {
      const w = await offlineDb.offlineWeighings.get(c.localWeighingId);
      serverWeighingId = w?.serverId;
      if (!serverWeighingId) continue;
      await offlineDb.offlineCases.update(c.localId, { serverWeighingId } as Partial<typeof c>);
    }
    try {
      const res = await apiClient.post(`/case/cases/from-weighing/${serverWeighingId}`, {}, idem(c.localId));
      await offlineDb.offlineCases.update(c.localId, {
        synced: true, serverId: (res.data as { id: string }).id, syncedAt: new Date(nowMs).toISOString(),
      } as Partial<typeof c>);
      n++;
    } catch (err) {
      await offlineDb.offlineCases.update(c.localId, nextRetryState(c, errMessage(err), isTerminal(err), nowMs) as Partial<typeof c>);
    }
  }
  return n;
}

async function syncProsecutions(nowMs: number): Promise<number> {
  let n = 0;
  const ready = pendingReady(await offlineDb.offlineProsecutions.toArray(), nowMs);
  for (const p of ready) {
    let serverCaseId = p.serverCaseId;
    if (!serverCaseId && p.localCaseId) {
      const c = await offlineDb.offlineCases.get(p.localCaseId);
      serverCaseId = c?.serverId;
      if (!serverCaseId) continue;
      await offlineDb.offlineProsecutions.update(p.localId, { serverCaseId } as Partial<typeof p>);
    }
    try {
      const res = await apiClient.post(`/cases/${serverCaseId}/prosecution`, JSON.parse(p.payload), idem(p.localId));
      await offlineDb.offlineProsecutions.update(p.localId, {
        synced: true, serverId: (res.data as { id: string }).id, syncedAt: new Date(nowMs).toISOString(),
      } as Partial<typeof p>);
      n++;
    } catch (err) {
      await offlineDb.offlineProsecutions.update(p.localId, nextRetryState(p, errMessage(err), isTerminal(err), nowMs) as Partial<typeof p>);
    }
  }
  return n;
}

async function syncInvoices(nowMs: number): Promise<number> {
  let n = 0;
  const ready = pendingReady(await offlineDb.offlineInvoices.toArray(), nowMs);
  for (const inv of ready) {
    let serverProsecutionId = inv.serverProsecutionId;
    if (!serverProsecutionId && inv.localProsecutionId) {
      const p = await offlineDb.offlineProsecutions.get(inv.localProsecutionId);
      serverProsecutionId = p?.serverId;
      if (!serverProsecutionId) continue;
      await offlineDb.offlineInvoices.update(inv.localId, { serverProsecutionId } as Partial<typeof inv>);
    }
    try {
      const res = await apiClient.post(`/prosecutions/${serverProsecutionId}/invoices`, {}, idem(inv.localId));
      await offlineDb.offlineInvoices.update(inv.localId, {
        synced: true, serverId: (res.data as { id: string }).id, syncedAt: new Date(nowMs).toISOString(),
      } as Partial<typeof inv>);
      n++;
    } catch (err) {
      await offlineDb.offlineInvoices.update(inv.localId, nextRetryState(inv, errMessage(err), isTerminal(err), nowMs) as Partial<typeof inv>);
    }
  }
  return n;
}

// ── Generic mutation queue (used by useOfflineMutation) ───────────────────────

async function processMutation(mutation: QueuedMutation): Promise<void> {
  const payload = JSON.parse(mutation.payload);
  const cfg = idem(mutation.idempotencyKey);
  switch (mutation.method) {
    case 'POST': await apiClient.post(mutation.endpoint, payload, cfg); break;
    case 'PUT': await apiClient.put(mutation.endpoint, payload, cfg); break;
    case 'PATCH': await apiClient.patch(mutation.endpoint, payload, cfg); break;
  }
}

async function syncMutationQueue(nowMs: number): Promise<number> {
  let n = 0;
  const all = await offlineDb.mutationQueue.orderBy('createdAt').toArray();
  for (const m of pendingReady(all, nowMs)) {
    try {
      await processMutation(m);
      await offlineDb.mutationQueue.update(m.id!, { synced: true } as Partial<QueuedMutation>);
      await offlineDb.mutationQueue.delete(m.id!); // success → remove from queue
      n++;
    } catch (err) {
      await offlineDb.mutationQueue.update(m.id!, nextRetryState(m, errMessage(err), isTerminal(err), nowMs) as Partial<QueuedMutation>);
    }
  }
  return n;
}

/** Drain everything in dependency order. Returns total rows synced this pass. */
export async function drainMutationQueue(): Promise<number> {
  if (isSyncing) return 0;
  isSyncing = true;
  const nowMs = Date.now();
  let synced = 0;
  try {
    synced += await syncWeighings(nowMs);
    synced += await syncCases(nowMs);
    synced += await syncProsecutions(nowMs);
    synced += await syncInvoices(nowMs);
    synced += await syncMutationQueue(nowMs);
  } finally {
    isSyncing = false;
  }
  return synced;
}

/** Total queued items not yet synced (across typed stores + generic queue). */
export async function getPendingMutationCount(): Promise<number> {
  return (await getSyncStatusCounts()).pending;
}

/** Dead-lettered items needing manual review. */
export async function getDeadLetterCount(): Promise<number> {
  return (await getSyncStatusCounts()).deadLetter;
}

export async function getFailedMutations(): Promise<QueuedMutation[]> {
  return offlineDb.mutationQueue.filter((m: SyncState) => !!m.deadLetter).toArray();
}

export async function dismissFailedMutation(id: number): Promise<void> {
  await offlineDb.mutationQueue.delete(id);
}

/** Reset a dead-lettered generic mutation so it retries on the next drain. */
export async function retryFailedMutation(id: number): Promise<void> {
  await offlineDb.mutationQueue.update(id, {
    deadLetter: false, attempts: 0, nextAttemptAt: undefined, syncError: undefined,
  } as Partial<QueuedMutation>);
}

// ── Unified dead-letter review (across typed stores + generic queue) ───────────

export type DeadLetterKind = 'weighing' | 'case' | 'prosecution' | 'invoice' | 'mutation';

export interface DeadLetterItem {
  kind: DeadLetterKind;
  key: string; // localId, or stringified mutation id
  label: string;
  error?: string;
  attempts: number;
  createdAt: string;
}

/** Every dead-lettered item needing manual review, across all stores. */
export async function getDeadLetterItems(): Promise<DeadLetterItem[]> {
  const [weighings, cases, prosecutions, invoices, mutations] = await Promise.all([
    offlineDb.offlineWeighings.filter((r) => !!r.deadLetter).toArray(),
    offlineDb.offlineCases.filter((r) => !!r.deadLetter).toArray(),
    offlineDb.offlineProsecutions.filter((r) => !!r.deadLetter).toArray(),
    offlineDb.offlineInvoices.filter((r) => !!r.deadLetter).toArray(),
    offlineDb.mutationQueue.filter((r) => !!r.deadLetter).toArray(),
  ]);
  return [
    ...weighings.map((w) => ({ kind: 'weighing' as const, key: w.localId, label: `Weighing ${w.vehicleRegNumber}`, error: w.syncError, attempts: w.attempts, createdAt: w.createdAt })),
    ...cases.map((c) => ({ kind: 'case' as const, key: c.localId, label: `Case ${c.vehicleRegNumber}`, error: c.syncError, attempts: c.attempts, createdAt: c.createdAt })),
    ...prosecutions.map((p) => ({ kind: 'prosecution' as const, key: p.localId, label: `Prosecution ${p.localId.slice(0, 8)}`, error: p.syncError, attempts: p.attempts, createdAt: p.createdAt })),
    ...invoices.map((i) => ({ kind: 'invoice' as const, key: i.localId, label: `Invoice ${i.invoiceNo ?? i.localId.slice(0, 8)}`, error: i.syncError, attempts: i.attempts, createdAt: i.createdAt })),
    ...mutations.map((m) => ({ kind: 'mutation' as const, key: String(m.id), label: m.type, error: m.syncError, attempts: m.attempts, createdAt: m.createdAt })),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

const RESET: Partial<SyncState> = { deadLetter: false, attempts: 0, nextAttemptAt: undefined, syncError: undefined };

/** Re-queue a dead-lettered item for the next drain. */
export async function retryDeadLetter(kind: DeadLetterKind, key: string): Promise<void> {
  switch (kind) {
    case 'weighing': await offlineDb.offlineWeighings.update(key, RESET as never); break;
    case 'case': await offlineDb.offlineCases.update(key, RESET as never); break;
    case 'prosecution': await offlineDb.offlineProsecutions.update(key, RESET as never); break;
    case 'invoice': await offlineDb.offlineInvoices.update(key, RESET as never); break;
    case 'mutation': await offlineDb.mutationQueue.update(Number(key), RESET as never); break;
  }
}

/** Permanently discard a dead-lettered item (operator gives up on it). */
export async function dismissDeadLetter(kind: DeadLetterKind, key: string): Promise<void> {
  switch (kind) {
    case 'weighing': await offlineDb.offlineWeighings.delete(key); break;
    case 'case': await offlineDb.offlineCases.delete(key); break;
    case 'prosecution': await offlineDb.offlineProsecutions.delete(key); break;
    case 'invoice': await offlineDb.offlineInvoices.delete(key); break;
    case 'mutation': await offlineDb.mutationQueue.delete(Number(key)); break;
  }
}

export async function clearExpiredCache(): Promise<number> {
  const now = new Date().toISOString();
  const expired = await offlineDb.referenceDataCache.filter((e) => e.expiresAt < now).toArray();
  for (const entry of expired) await offlineDb.referenceDataCache.delete(entry.key);
  return expired.length;
}
