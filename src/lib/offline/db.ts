/**
 * Offline Database (Dexie/IndexedDB)
 *
 * Stores offline records for invoices, weighings, cases, reference data,
 * and queued mutations for sync when back online.
 */

import Dexie, { type EntityTable } from 'dexie';

export interface OfflineInvoice {
  id: string;
  localId: string;
  caseId: string;
  caseNo: string;
  invoiceNo: string;
  amount: number;
  currency: string;
  status: 'PENDING_RECONCILE' | 'PAID' | 'RECONCILED';
  pesaflowInvoiceNumber?: string;
  pesaflowPaymentLink?: string;
  createdAt: string;
  syncedAt?: string;
}

export interface OfflineWeighing {
  localId: string;
  id?: string;
  stationId: string;
  vehicleRegNumber: string;
  vehicleType: string;
  gvw: number;
  axleWeights: string; // JSON stringified array
  driverName?: string;
  driverLicense?: string;
  transporterName?: string;
  createdAt: string;
  syncedAt?: string;
}

export interface OfflineCase {
  localId: string;
  id?: string;
  caseNo?: string;
  weighingId?: string;
  vehicleRegNumber: string;
  violationType: string;
  officerId: string;
  notes?: string;
  createdAt: string;
  syncedAt?: string;
}

export interface ReferenceDataEntry {
  key: string; // e.g., 'vehicleTypes', 'stations', 'offenceCodes', 'officers'
  data: string; // JSON stringified
  fetchedAt: string;
  expiresAt: string;
}

export type MutationType =
  | 'CREATE_INVOICE'
  | 'RECORD_PAYMENT'
  | 'RECONCILE'
  | 'CREATE_WEIGHING'
  | 'CREATE_CASE'
  | 'UPDATE_CASE';

export interface QueuedMutation {
  id?: number;
  type: MutationType;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH';
  payload: string; // JSON stringified
  createdAt: string;
  retries: number;
  lastError?: string;
}

class TruLoadOfflineDB extends Dexie {
  offlineInvoices!: EntityTable<OfflineInvoice, 'localId'>;
  offlineWeighings!: EntityTable<OfflineWeighing, 'localId'>;
  offlineCases!: EntityTable<OfflineCase, 'localId'>;
  referenceDataCache!: EntityTable<ReferenceDataEntry, 'key'>;
  mutationQueue!: EntityTable<QueuedMutation, 'id'>;

  constructor() {
    super('TruLoadOffline');

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
  }
}

export const offlineDb = new TruLoadOfflineDB();
