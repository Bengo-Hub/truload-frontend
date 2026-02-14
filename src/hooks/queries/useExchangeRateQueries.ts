/**
 * TanStack Query hooks for exchange rate data.
 * Current rate is semi-static (5 min cache), history is dynamic.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, QUERY_OPTIONS } from '@/lib/query/config';
import * as exchangeRateApi from '@/lib/api/exchangeRate';

export const EXCHANGE_RATE_QUERY_KEYS = {
  CURRENT: (from: string, to: string) => [...QUERY_KEYS.EXCHANGE_RATES, 'current', from, to] as const,
  HISTORY: (from: string, to: string) => [...QUERY_KEYS.EXCHANGE_RATES, 'history', from, to] as const,
  API_SETTINGS: [...QUERY_KEYS.EXCHANGE_RATES, 'api-settings'] as const,
};

export function useCurrentExchangeRate(from = 'USD', to = 'KES') {
  return useQuery({
    queryKey: EXCHANGE_RATE_QUERY_KEYS.CURRENT(from, to),
    queryFn: () => exchangeRateApi.getCurrentRate(from, to),
    ...QUERY_OPTIONS.semiStatic,
  });
}

export function useRateHistory(from = 'USD', to = 'KES', days = 30) {
  return useQuery({
    queryKey: EXCHANGE_RATE_QUERY_KEYS.HISTORY(from, to),
    queryFn: () => exchangeRateApi.getRateHistory(from, to, days),
    ...QUERY_OPTIONS.dynamic,
  });
}

export function useExchangeRateApiSettings() {
  return useQuery({
    queryKey: EXCHANGE_RATE_QUERY_KEYS.API_SETTINGS,
    queryFn: exchangeRateApi.getApiSettings,
    ...QUERY_OPTIONS.semiStatic,
    retry: false,
  });
}

export function useSetManualRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: exchangeRateApi.setManualRate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EXCHANGE_RATES });
    },
  });
}

export function useUpdateApiSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: exchangeRateApi.updateApiSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXCHANGE_RATE_QUERY_KEYS.API_SETTINGS });
    },
  });
}

export function useFetchRatesNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: exchangeRateApi.fetchRatesNow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EXCHANGE_RATES });
    },
  });
}
