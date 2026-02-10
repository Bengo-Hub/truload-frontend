import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchIntegrations,
  fetchIntegrationByProvider,
  upsertIntegration,
  testIntegrationConnectivity,
  reconcilePayments,
  createPesaflowInvoice,
  initiateCheckout,
  queryPaymentStatus,
  type UpsertIntegrationConfigRequest,
  type CreatePesaflowInvoiceRequest,
  type InitiateCheckoutRequest,
} from '@/lib/api/integration';
import { QUERY_OPTIONS } from '@/lib/query/config';
import { INVOICE_QUERY_KEYS } from './useInvoiceQueries';

// ============================================================================
// Query Keys
// ============================================================================

export const INTEGRATION_QUERY_KEYS = {
  integrations: ['integrations'] as const,
  integrationByProvider: (provider: string) =>
    ['integrations', 'provider', provider] as const,
};

// ============================================================================
// Queries
// ============================================================================

export function useIntegrations() {
  return useQuery({
    queryKey: INTEGRATION_QUERY_KEYS.integrations,
    queryFn: fetchIntegrations,
    ...QUERY_OPTIONS.semiStatic,
  });
}

export function useIntegrationByProvider(providerName: string) {
  return useQuery({
    queryKey: INTEGRATION_QUERY_KEYS.integrationByProvider(providerName),
    queryFn: () => fetchIntegrationByProvider(providerName),
    ...QUERY_OPTIONS.semiStatic,
    enabled: !!providerName,
  });
}

// ============================================================================
// Mutations
// ============================================================================

export function useUpsertIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      providerName,
      request,
    }: {
      providerName: string;
      request: UpsertIntegrationConfigRequest;
    }) => upsertIntegration(providerName, request),
    onSuccess: (_data, { providerName }) => {
      queryClient.invalidateQueries({ queryKey: INTEGRATION_QUERY_KEYS.integrations });
      queryClient.invalidateQueries({
        queryKey: INTEGRATION_QUERY_KEYS.integrationByProvider(providerName),
      });
    },
  });
}

export function useTestConnectivity() {
  return useMutation({
    mutationFn: (providerName: string) => testIntegrationConnectivity(providerName),
  });
}

export function useReconcilePayments() {
  return useMutation({
    mutationFn: reconcilePayments,
  });
}

// ============================================================================
// Pesaflow Payment Mutations
// ============================================================================

export function useCreatePesaflowInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      invoiceId,
      request,
    }: {
      invoiceId: string;
      request: CreatePesaflowInvoiceRequest;
    }) => createPesaflowInvoice(invoiceId, request),
    onSuccess: (_data, { invoiceId }) => {
      queryClient.invalidateQueries({
        queryKey: INVOICE_QUERY_KEYS.invoiceById(invoiceId),
      });
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.invoices });
    },
  });
}

export function useInitiateCheckout() {
  return useMutation({
    mutationFn: ({
      invoiceId,
      request,
    }: {
      invoiceId: string;
      request: InitiateCheckoutRequest;
    }) => initiateCheckout(invoiceId, request),
  });
}

export function useQueryPaymentStatus(invoiceId?: string, invoiceRefNo?: string) {
  return useQuery({
    queryKey: ['pesaflow', 'payment-status', invoiceId, invoiceRefNo] as const,
    queryFn: () => queryPaymentStatus(invoiceId!, invoiceRefNo!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!invoiceId && !!invoiceRefNo,
  });
}
