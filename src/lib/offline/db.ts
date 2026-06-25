/**
 * Offline Database (Dexie/IndexedDB)
 *
 * Stores offline records for the weighing → case → prosecution → invoice workflow,
 * reference data for offline charge calculation, and a generic mutation queue.
 *
 * Every queued entity carries a SyncState so the sync engine (see ./sync.ts) can
 * drain in dependency order with exactly-once semantics: each row has a stable
 * `localId` (UUID) sent to the backend as the idempotency key (ClientLocalId /
 * Idempotency-Key), and resolved `server*Id` links so children can reference the
 * parent's server id once it syncs. Mirrors the proven pos-ui pattern.
 */

import Dexie, { type EntityTable } from 'dexie';

/** Shared sync bookkeeping carried by every queued record. */
export interface SyncState {
  synced: boolean;
  attempts: number;
  /** ISO timestamp; the row is eligible for a retry once now >= nextAttemptAt. */
  nextAttemptAt?: string;
  /** Terminal failure (e.g. validation 4xx) — needs manual review, not auto-retried. */
  deadLetter?: boolean;
  syncError?: string;
}

export interface OfflineWeighing extends SyncState {
  localId: string;
  serverId?: string; // server weighing-transaction id once synced
  stationId: string;
  vehicleRegNumber: string;
  vehicleType: string;
  gvw: number;
  axleWeights: string; // JSON stringified array
  driverName?: string;
  driverLicense?: string;
  transporterName?: string;
  payload: string; // JSON of the full CreateWeighingRequest
  createdAt: string;
  syncedAt?: string;
}

export interface OfflineCase extends SyncState {
  localId: string;
  serverId?: string; // server case id once synced
  localWeighingId?: string; // link to the offline weighing that spawned it
  serverWeighingId?: string; // resolved server weighing id (drain dependency)
  caseNo?: string;
  vehicleRegNumber: string;
  violationType: string;
  officerId: string;
  notes?: string;
  payload: string;
  createdAt: string;
  syncedAt?: string;
}

export interface OfflineProsecution extends SyncState {
  localId: string;
  serverId?: string; // server prosecution id once synced
  localCaseId?: string;
  serverCaseId?: string; // resolved server case id (drain dependency)
  payload: string;
  createdAt: string;
  syncedAt?: string;
}

export interface OfflineInvoice extends SyncState {
  localId: string;
  serverId?: string; // server invoice id once synced
  localProsecutionId?: string;
  serverProsecutionId?: string; // resolved server prosecution id (drain dependency)
  caseId?: string;
  caseNo?: string;
  invoiceNo?: string;
  amount?: number;
  currency?: string;
  pesaflowInvoiceNumber?: string;
  pesaflowPaymentLink?: string;
  payload: string;
  createdAt: string;
  syncedAt?: string;
}

export interface ReferenceDataEntry {
  key: string; // e.g. 'acts', 'violationTypes', 'stations', 'officers', 'toleranceConfig'
  data: string; // JSON stringified
  fetchedAt: string;
  expiresAt: string;
}

/** Cold-start snapshot (me, station, shift) so the shell is usable offline from cold. */
export interface SnapshotEntry {
  key: string;
  data: string;
  fetchedAt: string;
}

export type MutationType =
  | 'CREATE_INVOICE'
  | 'RECORD_PAYMENT'
  | 'RECONCILE'
  | 'CREATE_WEIGHING'
  | 'CREATE_CASE'
  | 'CREATE_PROSECUTION'
  | 'UPDATE_CASE';

export interface QueuedMutation extends SyncState {
  id?: number;
  type: MutationType;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH';
  payload: string; // JSON stringified
  idempotencyKey: string; // sent as Idempotency-Key header
  createdAt: string;
}

// ── Retry policy (mirrors pos-ui) ────────────────────────────────────────────
export const MAX_SYNC_ATTEMPTS = 8;

/** Exponential backoff (cap 5 min) with deterministic jitter (no Math.random in SSR). */
export function computeNextAttemptAt(attempts: number, nowMs: number): string {
  const baseMs = Math.min(2 ** attempts * 1000, 5 * 60_000);
  const jitter = baseMs * (0.8 + ((37 * attempts) % 40) / 100);
  return new Date(nowMs + jitter).toISOString();
}

/** Compute the next sync-state after a failed attempt. `terminal` => dead-letter now. */
export function nextRetryState(
  current: SyncState,
  error: string,
  terminal: boolean,
  nowMs: number,
): SyncState {
  const attempts = (current.attempts ?? 0) + 1;
  const deadLetter = terminal || attempts >= MAX_SYNC_ATTEMPTS;
  return {
    synced: false,
    attempts,
    syncError: error,
    deadLetter,
    nextAttemptAt: deadLetter ? undefined : computeNextAttemptAt(attempts, nowMs),
  };
}

/** Rows that are unsynced, not dead-lettered, and past their backoff window. */
export function pendingReady<T extends SyncState>(rows: T[], nowMs: number): T[] {
  return rows.filter(
    (r) =>
      !r.synced &&
      !r.deadLetter &&
      (!r.nextAttemptAt || new Date(r.nextAttemptAt).getTime() <= nowMs),
  );
}

class TruLoadOfflineDB extends Dexie {
  offlineWeighings!: EntityTable<OfflineWeighing, 'localId'>;
  offlineCases!: EntityTable<OfflineCase, 'localId'>;
  offlineProsecutions!: EntityTable<OfflineProsecution, 'localId'>;
  offlineInvoices!: EntityTable<OfflineInvoice, 'localId'>;
  referenceDataCache!: EntityTable<ReferenceDataEntry, 'key'>;
  snapshots!: EntityTable<SnapshotEntry, 'key'>;
  mutationQueue!: EntityTable<QueuedMutation, 'id'>;

  constructor() {
    super('TruLoadOffline');

    // v1/v2: legacy generic queue (kept so existing data upgrades cleanly).
    this.version(1).stores({
      offlineInvoices: 'localId, id, caseId, status, createdAt',
      mutationQueue: '++id, type, createdAt',
    });
    this.version(2).stores({
      offlineInvoices: 'localId, id, caseId, status, createdAt',
      offlineWeighings: 'localId, id, stationId, vehicleRegNumber, createdAt',
      offlineCases: 'localId, id, vehicleRegNumber, createdAt',
      referenceDataCache: 'key, expiresAt',
      mutationQueue: '++id, type, createdAt',
    });

    // v3: workflow-aware stores with sync-state + dependency links.
    this.version(3).stores({
      offlineWeighings: 'localId, serverId, synced, deadLetter, stationId, createdAt',
      offlineCases: 'localId, serverId, localWeighingId, synced, deadLetter, createdAt',
      offlineProsecutions: 'localId, serverId, localCaseId, synced, deadLetter, createdAt',
      offlineInvoices: 'localId, serverId, localProsecutionId, synced, deadLetter, createdAt',
      referenceDataCache: 'key, expiresAt',
      snapshots: 'key',
      mutationQueue: '++id, type, synced, deadLetter, createdAt',
    });
  }
}

export const offlineDb = new TruLoadOfflineDB();

/** Aggregate counts for the OfflineBar (pending vs dead-letter needing review). */
export async function getSyncStatusCounts(): Promise<{ pending: number; deadLetter: number }> {
  const nowMs = Date.now();
  const [weighings, cases, prosecutions, invoices, mutations] = await Promise.all([
    offlineDb.offlineWeighings.toArray(),
    offlineDb.offlineCases.toArray(),
    offlineDb.offlineProsecutions.toArray(),
    offlineDb.offlineInvoices.toArray(),
    offlineDb.mutationQueue.toArray(),
  ]);
  const all: SyncState[] = [...weighings, ...cases, ...prosecutions, ...invoices, ...mutations];
  return {
    pending: all.filter((r) => !r.synced && !r.deadLetter).length,
    deadLetter: all.filter((r) => r.deadLetter).length,
  };
}
