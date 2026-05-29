import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getOrgPaymentSettings,
  updateOrgPaymentSettings,
  type PaymentSettingsDto,
} from '@/lib/api/payment-settings';

const QUERY_KEY = ['org-payment-settings'];

export function useOrgPaymentSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getOrgPaymentSettings,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateOrgPaymentSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: PaymentSettingsDto) => updateOrgPaymentSettings(settings),
    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEY, updated);
    },
  });
}
