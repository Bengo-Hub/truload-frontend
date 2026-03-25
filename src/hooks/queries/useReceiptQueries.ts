/**
 * TanStack Query hooks for Receipt/Payment operations
 *
 * These hooks provide cached data fetching for receipts,
 * payment recording, and related financial data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as receiptApi from '@/lib/api/receipt';
import { QUERY_OPTIONS } from '@/lib/query/config';
import { INVOICE_QUERY_KEYS } from './useInvoiceQueries';
import { PROSECUTION_QUERY_KEYS } from './useProsecutionQueries';

// Query key constants
export const RECEIPT_QUERY_KEYS = {
  receipts: ['receipts'] as const,
  receiptById: (id: string) => ['receipts', 'detail', id] as const,
  receiptsByInvoice: (invoiceId: string) => ['receipts', 'by-invoice', invoiceId] as const,
  receiptStatistics: (stationId?: string) => ['receipts', 'statistics', stationId ?? 'all'] as const,
};

// ============================================================================
// Receipt Queries
// ============================================================================

/**
 * Get receipt by ID
 */
export function useReceiptById(id?: string) {
  return useQuery({
    queryKey: RECEIPT_QUERY_KEYS.receiptById(id ?? ''),
    queryFn: () => receiptApi.getReceiptById(id!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!id,
  });
}

/**
 * Get receipts by invoice ID
 */
export function useReceiptsByInvoiceId(invoiceId?: string) {
  return useQuery({
    queryKey: RECEIPT_QUERY_KEYS.receiptsByInvoice(invoiceId ?? ''),
    queryFn: () => receiptApi.getReceiptsByInvoiceId(invoiceId!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!invoiceId,
  });
}

/**
 * Search receipts
 */
export function useReceiptSearch(criteria: receiptApi.ReceiptSearchCriteria) {
  return useQuery({
    queryKey: [...RECEIPT_QUERY_KEYS.receipts, 'search', criteria],
    queryFn: () => receiptApi.searchReceipts(criteria),
    ...QUERY_OPTIONS.dynamic,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Get receipt statistics
 */
export function useReceiptStatistics(stationId?: string) {
  return useQuery({
    queryKey: RECEIPT_QUERY_KEYS.receiptStatistics(stationId),
    queryFn: () => receiptApi.getReceiptStatistics(stationId),
    ...QUERY_OPTIONS.semiStatic,
  });
}

// ============================================================================
// Receipt Mutations
// ============================================================================

/**
 * Record payment for invoice
 */
export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      request,
    }: {
      invoiceId: string;
      request: receiptApi.RecordPaymentRequest;
    }) => receiptApi.recordPayment(invoiceId, request),
    onSuccess: (newReceipt, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: RECEIPT_QUERY_KEYS.receipts });
      queryClient.invalidateQueries({ queryKey: ['receipts', 'statistics'] });
      queryClient.invalidateQueries({
        queryKey: RECEIPT_QUERY_KEYS.receiptsByInvoice(invoiceId),
      });
      // Invalidate invoice to update paid status
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.invoiceById(invoiceId) });
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.invoices });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'statistics'] });
      // Invalidate prosecution statistics
      queryClient.invalidateQueries({ queryKey: ['prosecutions', 'statistics'] });
      queryClient.setQueryData(RECEIPT_QUERY_KEYS.receiptById(newReceipt.id), newReceipt);
    },
  });
}

/**
 * Void receipt
 */
export function useVoidReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      receiptApi.voidReceipt(id, reason),
    onSuccess: (voidedReceipt, { id }) => {
      queryClient.invalidateQueries({ queryKey: RECEIPT_QUERY_KEYS.receipts });
      queryClient.invalidateQueries({ queryKey: ['receipts', 'statistics'] });
      // Invalidate invoice to update paid status
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.invoices });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'statistics'] });
      queryClient.invalidateQueries({ queryKey: ['prosecutions', 'statistics'] });
      queryClient.setQueryData(RECEIPT_QUERY_KEYS.receiptById(id), voidedReceipt);
    },
  });
}

/**
 * Download receipt PDF
 */
export function useDownloadReceipt() {
  return useMutation({
    mutationFn: async (receiptId: string) => {
      const blob = await receiptApi.downloadReceiptPdf(receiptId);
      return { blob, receiptId };
    },
    onSuccess: ({ blob, receiptId }) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${receiptId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}
