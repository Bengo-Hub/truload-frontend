/**
 * TanStack Query hooks for Invoice operations
 *
 * These hooks provide cached data fetching for invoices
 * and related financial data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as invoiceApi from '@/lib/api/invoice';
import { QUERY_OPTIONS } from '@/lib/query/config';
import { PROSECUTION_QUERY_KEYS } from './useProsecutionQueries';

// Query key constants
export const INVOICE_QUERY_KEYS = {
  invoices: ['invoices'] as const,
  invoiceById: (id: string) => ['invoices', 'detail', id] as const,
  invoicesByProsecution: (prosecutionId: string) =>
    ['invoices', 'by-prosecution', prosecutionId] as const,
  invoiceStatistics: (stationId?: string) => ['invoices', 'statistics', stationId ?? 'all'] as const,
};

// ============================================================================
// Invoice Queries
// ============================================================================

/**
 * Get invoice by ID
 */
export function useInvoiceById(id?: string) {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.invoiceById(id ?? ''),
    queryFn: () => invoiceApi.getInvoiceById(id!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!id,
  });
}

/**
 * Get invoices by prosecution case ID
 */
export function useInvoicesByProsecutionId(prosecutionId?: string) {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.invoicesByProsecution(prosecutionId ?? ''),
    queryFn: () => invoiceApi.getInvoicesByProsecutionId(prosecutionId!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!prosecutionId,
  });
}

/**
 * Search invoices
 */
export function useInvoiceSearch(criteria: invoiceApi.InvoiceSearchCriteria) {
  return useQuery({
    queryKey: [...INVOICE_QUERY_KEYS.invoices, 'search', criteria],
    queryFn: () => invoiceApi.searchInvoices(criteria),
    ...QUERY_OPTIONS.dynamic,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Get invoice statistics
 */
export function useInvoiceStatistics(stationId?: string) {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.invoiceStatistics(stationId),
    queryFn: () => invoiceApi.getInvoiceStatistics(stationId),
    ...QUERY_OPTIONS.semiStatic,
  });
}

// ============================================================================
// Invoice Mutations
// ============================================================================

/**
 * Generate invoice for prosecution case
 */
export function useGenerateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (prosecutionId: string) => invoiceApi.generateInvoice(prosecutionId),
    onSuccess: (newInvoice, prosecutionId) => {
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.invoices });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'statistics'] });
      queryClient.invalidateQueries({
        queryKey: INVOICE_QUERY_KEYS.invoicesByProsecution(prosecutionId),
      });
      queryClient.invalidateQueries({
        queryKey: PROSECUTION_QUERY_KEYS.prosecutionById(prosecutionId),
      });
      queryClient.setQueryData(INVOICE_QUERY_KEYS.invoiceById(newInvoice.id), newInvoice);
    },
  });
}

/**
 * Update invoice status
 */
export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      invoiceApi.updateInvoiceStatus(id, status),
    onSuccess: (updatedInvoice, { id }) => {
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.invoices });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'statistics'] });
      queryClient.setQueryData(INVOICE_QUERY_KEYS.invoiceById(id), updatedInvoice);
    },
  });
}

/**
 * Void invoice
 */
export function useVoidInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      invoiceApi.voidInvoice(id, reason),
    onSuccess: (voidedInvoice, { id }) => {
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.invoices });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'statistics'] });
      queryClient.setQueryData(INVOICE_QUERY_KEYS.invoiceById(id), voidedInvoice);
    },
  });
}

/**
 * Download invoice PDF
 */
export function useDownloadInvoice() {
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const blob = await invoiceApi.downloadInvoicePdf(invoiceId);
      return { blob, invoiceId };
    },
    onSuccess: ({ blob, invoiceId }) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}
