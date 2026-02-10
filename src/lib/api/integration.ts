import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface IntegrationConfigDto {
  id: string;
  providerName: string;
  displayName: string;
  baseUrl: string;
  endpointsJson: string;
  webhookUrl?: string;
  callbackUrl?: string;
  appBaseUrl?: string;
  environment?: string;
  description?: string;
  credentialsRotatedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertIntegrationConfigRequest {
  providerName: string;
  displayName: string;
  baseUrl: string;
  credentials: Record<string, string>;
  endpointsJson: string;
  appBaseUrl?: string;
  environment?: string;
  description?: string;
}

export interface TestConnectivityResult {
  success: boolean;
  provider: string;
  baseUrl?: string;
  environment?: string;
  hasCredentials?: boolean;
  credentialKeys?: string[];
  message: string;
}

// ============================================================================
// Pesaflow Payment Types
// ============================================================================

export interface CreatePesaflowInvoiceRequest {
  clientName: string;
  clientEmail?: string;
  clientMsisdn?: string;
  clientIdNumber?: string;
}

export interface PesaflowInvoiceResponse {
  success: boolean;
  pesaflowInvoiceNumber?: string;
  message?: string;
  checkoutUrl?: string;
}

export interface InitiateCheckoutRequest {
  clientName: string;
  clientEmail?: string;
  clientMsisdn?: string;
  clientIdNumber?: string;
  sendStk: boolean;
  pictureUrl?: string;
}

export interface PesaflowCheckoutResponse {
  success: boolean;
  checkoutUrl?: string;
  iframeHtml?: string;
  message?: string;
}

export interface PesaflowPaymentStatusResponse {
  status?: string;
  amountPaid: number;
  paymentReference?: string;
  paymentChannel?: string;
  paymentDate?: string;
}

export interface ReconcileResult {
  reconciled: number;
  message: string;
}

// ============================================================================
// Integration Config API
// ============================================================================

export async function fetchIntegrations(): Promise<IntegrationConfigDto[]> {
  const { data } = await apiClient.get<IntegrationConfigDto[]>('/system/integrations');
  return data;
}

export async function fetchIntegrationByProvider(
  providerName: string
): Promise<IntegrationConfigDto> {
  const { data } = await apiClient.get<IntegrationConfigDto>(
    `/system/integrations/${providerName}`
  );
  return data;
}

export async function upsertIntegration(
  providerName: string,
  request: UpsertIntegrationConfigRequest
): Promise<IntegrationConfigDto> {
  const { data } = await apiClient.put<IntegrationConfigDto>(
    `/system/integrations/${providerName}`,
    request
  );
  return data;
}

export async function testIntegrationConnectivity(
  providerName: string
): Promise<TestConnectivityResult> {
  const { data } = await apiClient.post<TestConnectivityResult>(
    `/system/integrations/${providerName}/test`
  );
  return data;
}

// ============================================================================
// Pesaflow Payment API
// ============================================================================

export async function createPesaflowInvoice(
  invoiceId: string,
  request: CreatePesaflowInvoiceRequest
): Promise<PesaflowInvoiceResponse> {
  const { data } = await apiClient.post<PesaflowInvoiceResponse>(
    `/invoices/${invoiceId}/pesaflow`,
    request
  );
  return data;
}

export async function initiateCheckout(
  invoiceId: string,
  request: InitiateCheckoutRequest
): Promise<PesaflowCheckoutResponse> {
  const { data } = await apiClient.post<PesaflowCheckoutResponse>(
    `/invoices/${invoiceId}/checkout`,
    request
  );
  return data;
}

export async function queryPaymentStatus(
  invoiceId: string,
  invoiceRefNo: string
): Promise<PesaflowPaymentStatusResponse> {
  const { data } = await apiClient.get<PesaflowPaymentStatusResponse>(
    `/invoices/${invoiceId}/payment-status`,
    { params: { invoiceRefNo } }
  );
  return data;
}

export async function reconcilePayments(): Promise<ReconcileResult> {
  const { data } = await apiClient.post<ReconcileResult>('/payments/reconcile');
  return data;
}
