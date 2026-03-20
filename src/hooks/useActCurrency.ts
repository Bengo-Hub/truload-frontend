/**
 * Centralized hook for act-specific currency handling.
 *
 * Traffic Act Cap 403 → KES (primary currency, no USD needed)
 * EAC Vehicle Load Control Act 2016 → USD (primary, KES as reference)
 * Commercial tenants → KES (no act-based charges)
 *
 * Usage:
 *   const { primaryCurrency, showUsd, showKes, formatFee } = useActCurrency();
 *   // formatFee(amount) — formats in the act's primary currency
 */

import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useCurrency } from '@/hooks/useCurrency';

/** Default act for enforcement tenants (Traffic Act = KES) */
const DEFAULT_ENFORCEMENT_CURRENCY = 'KES';

export function useActCurrency() {
  const { isCommercial } = useModuleAccess();
  const { formatAmount } = useCurrency();

  // Commercial tenants always use KES, no act-based charges
  if (isCommercial) {
    return {
      primaryCurrency: 'KES' as const,
      showUsd: false,
      showKes: true,
      formatFee: (amount: number) => formatAmount(amount, 'KES'),
      formatPrimary: (amountKes: number, _amountUsd: number) => formatAmount(amountKes, 'KES'),
      formatReference: (_amountKes: number, _amountUsd: number) => null as string | null,
    };
  }

  // Enforcement: Traffic Act → KES primary; EAC Act → USD primary
  // For now, default to Traffic Act (KES) since most Kenyan enforcement uses it.
  // When a specific prosecution case or weighing has a chargingCurrency, use that.
  const primaryCurrency = DEFAULT_ENFORCEMENT_CURRENCY;

  return {
    primaryCurrency,
    showUsd: primaryCurrency === 'USD',
    showKes: primaryCurrency === 'KES',

    /** Format a fee in the act's primary currency */
    formatFee: (amount: number) => formatAmount(amount, primaryCurrency),

    /** Format the primary amount from a dual-currency field pair */
    formatPrimary: (amountKes: number, amountUsd: number) =>
      formatAmount(primaryCurrency === 'KES' ? amountKes : amountUsd, primaryCurrency),

    /** Format the reference (secondary) amount, or null if not needed */
    formatReference: (amountKes: number, amountUsd: number) => {
      if (primaryCurrency === 'KES' && amountUsd > 0) return formatAmount(amountUsd, 'USD');
      if (primaryCurrency === 'USD' && amountKes > 0) return formatAmount(amountKes, 'KES');
      return null;
    },
  };
}

/**
 * Determine primary currency from a specific prosecution case or act.
 * Use when you have the case's chargingCurrency field.
 */
export function getActPrimaryCurrency(chargingCurrency?: string | null): 'KES' | 'USD' {
  if (chargingCurrency === 'USD') return 'USD';
  return 'KES'; // Default to KES (Traffic Act)
}

/**
 * Pick the correct fee amount based on charging currency.
 */
export function pickFeeByActCurrency(
  chargingCurrency: string | null | undefined,
  amountKes: number,
  amountUsd: number
): number {
  return chargingCurrency === 'USD' ? amountUsd : amountKes;
}
