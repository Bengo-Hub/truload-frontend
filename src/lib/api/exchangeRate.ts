import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface CurrentRateResponse {
  rate: number;
  fromCurrency: string;
  toCurrency: string;
  effectiveDate: string;
  source: string;
  lastUpdated: string | null;
}

export interface ExchangeRateDto {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: string;
  source: string;
  isActive: boolean;
  createdAt: string;
}

export interface ExchangeRateApiSettingsDto {
  id: string;
  provider: string;
  providerName: string;
  apiEndpoint: string;
  hasAccessKey: boolean;
  sourceCurrency: string;
  targetCurrenciesJson: string;
  fetchTime: string;
  lastFetchAt: string | null;
  lastFetchStatus: string | null;
  lastFetchError: string | null;
  isActive: boolean;
}

export interface SetManualRateRequest {
  rate: number;
  fromCurrency?: string;
  toCurrency?: string;
}

export interface UpdateApiSettingsRequest {
  provider?: string;
  providerName?: string;
  apiEndpoint?: string;
  accessKey?: string;
  sourceCurrency?: string;
  targetCurrenciesJson?: string;
  fetchTime?: string;
  isActive?: boolean;
}

// ============================================================================
// API Functions
// ============================================================================

export async function getCurrentRate(from = 'USD', to = 'KES') {
  const response = await apiClient.get<CurrentRateResponse>('/exchange-rates/current', {
    params: { from, to },
  });
  return response.data;
}

export async function getRateHistory(from = 'USD', to = 'KES', days = 30) {
  const response = await apiClient.get<ExchangeRateDto[]>('/exchange-rates/history', {
    params: { from, to, days },
  });
  return response.data;
}

export async function setManualRate(data: SetManualRateRequest) {
  const response = await apiClient.post<ExchangeRateDto>('/exchange-rates/manual', data);
  return response.data;
}

export async function getApiSettings() {
  const response = await apiClient.get<ExchangeRateApiSettingsDto>('/exchange-rates/api-settings');
  return response.data;
}

export async function updateApiSettings(data: UpdateApiSettingsRequest) {
  const response = await apiClient.put<ExchangeRateApiSettingsDto>('/exchange-rates/api-settings', data);
  return response.data;
}

export async function fetchRatesNow() {
  const response = await apiClient.post<{ message: string }>('/exchange-rates/fetch-now');
  return response.data;
}
