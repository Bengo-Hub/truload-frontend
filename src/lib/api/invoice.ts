import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface InvoiceDto {
  id: string;
  invoiceNo: string;
  caseRegisterId?: string;
  caseNo?: string;
  prosecutionCaseId?: string;
  prosecutionCertificateNo?: string;
  weighingId?: string;
  weighingTicketNo?: string;
  vehicleRegNumber?: string;
  amountDue: number;
  currency: string;
  status: string;
  /** "enforcement_fine" | "commercial_weighing_fee" */
  invoiceType?: string;
  generatedAt: string;
  dueDate?: string;
  pesaflowInvoiceNumber?: string;
  pesaflowPaymentReference?: string;
  pesaflowPaymentLink?: string;
  pesaflowGatewayFee?: number;
  pesaflowAmountNet?: number;
  pesaflowTotalAmount?: number;
  pesaflowSyncStatus?: string;
  /** Treasury intent ID for commercial invoices */
  treasuryIntentId?: string;
  /** Treasury intent status (e.g. "pending", "succeeded") */
  treasuryIntentStatus?: string;
  /** Pre-built treasury pay URL (books.codevertexitsolutions.com/pay?intent_id=...) */
  treasuryPaymentUrl?: string;
  amountPaid: number;
  balanceRemaining: number;
  paidAt?: string;
  voidedAt?: string;
  voidReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceSearchCriteria {
  invoiceNo?: string;
  caseNo?: string;
  vehicleRegNumber?: string;
  stationId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  pageNumber?: number;
  pageSize?: number;
}

export interface InvoiceSearchResult {
  items: InvoiceDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface InvoiceStatistics {
  totalInvoices: number;
  pendingInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalAmountDue: number;
  totalAmountPaid: number;
  totalBalance: number;
  totalAmountDueKes?: number;
  totalAmountDueUsd?: number;
  totalAmountPaidKes?: number;
  totalAmountPaidUsd?: number;
  totalBalanceKes?: number;
  totalBalanceUsd?: number;
}

// ============================================================================
// Invoice API
// ============================================================================

/**
 * Get invoice by ID
 */
export async function getInvoiceById(id: string): Promise<InvoiceDto> {
  const { data } = await apiClient.get<InvoiceDto>(`/invoices/${id}`);
  return data;
}

/**
 * Get invoices by prosecution case ID
 */
export async function getInvoicesByProsecutionId(prosecutionId: string): Promise<InvoiceDto[]> {
  const { data } = await apiClient.get<InvoiceDto[]>(`/prosecutions/${prosecutionId}/invoices`);
  return data;
}

/**
 * Search invoices
 */
export async function searchInvoices(criteria: InvoiceSearchCriteria): Promise<InvoiceSearchResult> {
  const { data } = await apiClient.post<InvoiceSearchResult>('/invoices/search', criteria);
  return data;
}

/**
 * Generate invoice for prosecution case
 */
export async function generateInvoice(prosecutionId: string): Promise<InvoiceDto> {
  const { data } = await apiClient.post<InvoiceDto>(`/prosecutions/${prosecutionId}/invoices`);
  return data;
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(id: string, status: string): Promise<InvoiceDto> {
  const { data } = await apiClient.put<InvoiceDto>(`/invoices/${id}/status`, { status });
  return data;
}

/**
 * Void invoice
 */
export async function voidInvoice(id: string, reason: string): Promise<InvoiceDto> {
  const { data } = await apiClient.post<InvoiceDto>(`/invoices/${id}/void`, { reason });
  return data;
}

/**
 * Get invoice statistics
 */
export async function getInvoiceStatistics(stationId?: string): Promise<InvoiceStatistics> {
  const { data } = await apiClient.get<InvoiceStatistics>('/invoices/statistics', {
    params: stationId ? { stationId } : undefined,
  });
  return data;
}

/**
 * Download invoice PDF
 */
export async function downloadInvoicePdf(id: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/invoices/${id}/pdf`, {
    responseType: 'blob',
  });
  return data;
}

/**
 * Manually reconcile a commercial invoice (cash / offline payment).
 * Records the payment reference and marks the invoice as paid.
 */
export async function manualReconcileInvoice(
  id: string,
  payload: { amountPaid: number; channel: string; reference?: string; notes?: string }
): Promise<InvoiceDto> {
  const { data } = await apiClient.post<InvoiceDto>(`/invoices/${id}/reconcile`, payload);
  return data;
}
