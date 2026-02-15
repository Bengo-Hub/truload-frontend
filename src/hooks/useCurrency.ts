/**
 * Hook for currency conversion and formatting.
 * Uses the CurrencyContext for selected display currency
 * and live exchange rates from the backend CurrencyService.
 */

import { useSelectedCurrency } from '@/contexts/CurrencyContext';
import { useCurrentExchangeRate } from '@/hooks/queries/useExchangeRateQueries';

const CURRENCY_LOCALE: Record<string, string> = {
  KES: 'en-KE',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

export function useCurrency() {
  const { currency: selectedCurrency } = useSelectedCurrency();
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

  /** Format amount in the user's selected display currency (auto-converts from source) */
  const formatDisplay = (amount: number, sourceCurrency: string = 'KES'): string => {
    const converted = convert(amount, sourceCurrency, selectedCurrency);
    return formatAmount(converted, selectedCurrency);
  };

  return {
    convert,
    formatAmount,
    formatDisplay,
    selectedCurrency,
    currentRate: currentRate?.rate ?? null,
    isLoading,
  };
}
