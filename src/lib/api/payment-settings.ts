import { apiClient } from '@/lib/api/client';

export interface PaymentSettingsDto {
  bankName?: string;
  bankBranch?: string;
  bankAccountNumber?: string;
  mpesaPaybillNumber?: string;
  mpesaTillNumber?: string;
}

export async function getOrgPaymentSettings(): Promise<PaymentSettingsDto> {
  const { data } = await apiClient.get<PaymentSettingsDto>('/organization/payment-settings');
  return data;
}

export async function updateOrgPaymentSettings(settings: PaymentSettingsDto): Promise<PaymentSettingsDto> {
  const { data } = await apiClient.put<PaymentSettingsDto>('/organization/payment-settings', settings);
  return data;
}
