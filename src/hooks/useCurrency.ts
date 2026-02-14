/**
 * Hook for currency conversion and formatting.
 * Uses live exchange rates from the backend CurrencyService.
 */

import { useCurrentExchangeRate } from '@/hooks/queries/useExchangeRateQueries';

const CURRENCY_SYMBOLS: Record<string, string> = {
  KES: 'KES',
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
};

const CURRENCY_LOCALE: Record<string, string> = {
  KES: 'en-KE',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

export function useCurrency() {
  const { data: currentRate, isLoading } = useCurrentExchangeRate();

  /** Convert amount between currencies using the current rate */
  const convert = (amount: number, from: string, to: string): number => {
    if (from === to) return amount;
    const rate = currentRate?.rate ?? 130;

    if (from === 'USD' && to === 'KES') return amount * rate;
    if (from === 'KES' && to === 'USD') return amount / rate;

    // Fallback: no conversion
    return amount;
  };

  /** Format amount with currency symbol */
  const formatAmount = (amount: number, currency: string): string => {
    const locale = CURRENCY_LOCALE[currency] ?? 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  /** Get currency symbol string */
  const getCurrencySymbol = (currency: string): string => {
    return CURRENCY_SYMBOLS[currency] ?? currency;
  };

  return {
    convert,
    formatAmount,
    getCurrencySymbol,
    currentRate: currentRate?.rate ?? null,
    isLoading,
  };
}
