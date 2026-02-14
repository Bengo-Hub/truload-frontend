import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface ReceiptDto {
  id: string;
  receiptNo: string;
  invoiceId: string;
  invoiceNo?: string;
  amountPaid: number;
  currency: string;
  paymentMethod: string;
  transactionReference?: string;
  idempotencyKey?: string;
  receivedById?: string;
  receivedByName?: string;
  status: string;
  paymentDate: string;
  voidedAt?: string;
  voidReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecordPaymentRequest {
  amountPaid: number;
  currency: string;
  paymentMethod: string;
  transactionReference?: string;
  idempotencyKey: string;
}

export interface ReceiptSearchCriteria {
  invoiceId?: string;
  receiptNo?: string;
  stationId?: string;
  paymentMethod?: string;
  paymentDateFrom?: string;
  paymentDateTo?: string;
  receivedById?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface ReceiptSearchResult {
  items: ReceiptDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface ReceiptStatistics {
  total: number;
  todayCount: number;
  todayAmount: number;
  totalCollected: number;
  byPaymentMethod: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
}

// ============================================================================
// Receipt API
// ============================================================================

/**
 * Get receipt by ID
 */
export async function getReceiptById(id: string): Promise<ReceiptDto> {
  const { data } = await apiClient.get<ReceiptDto>(`/receipts/${id}`);
  return data;
}

/**
 * Get receipts by invoice ID
 */
export async function getReceiptsByInvoiceId(invoiceId: string): Promise<ReceiptDto[]> {
  const { data } = await apiClient.get<ReceiptDto[]>(`/invoices/${invoiceId}/receipts`);
  return data;
}

/**
 * Search receipts
 */
export async function searchReceipts(criteria: ReceiptSearchCriteria): Promise<ReceiptSearchResult> {
  const { data } = await apiClient.post<ReceiptSearchResult>('/receipts/search', criteria);
  return data;
}

/**
 * Record payment
 */
export async function recordPayment(
  invoiceId: string,
  request: RecordPaymentRequest
): Promise<ReceiptDto> {
  const { data } = await apiClient.post<ReceiptDto>(`/invoices/${invoiceId}/payments`, request);
  return data;
}

/**
 * Void receipt
 */
export async function voidReceipt(id: string, reason: string): Promise<ReceiptDto> {
  const { data } = await apiClient.post<ReceiptDto>(`/receipts/${id}/void`, { reason });
  return data;
}

/**
 * Get receipt statistics
 */
export async function getReceiptStatistics(): Promise<ReceiptStatistics> {
  const { data } = await apiClient.get<ReceiptStatistics>('/receipts/statistics');
  return data;
}

/**
 * Download receipt PDF
 */
export async function downloadReceiptPdf(id: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/receipts/${id}/pdf`, {
    responseType: 'blob',
  });
  return data;
}

/**
 * Generate unique idempotency key
 */
export function generateIdempotencyKey(): string {
  return `payment_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
