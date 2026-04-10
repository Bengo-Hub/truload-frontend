/**
 * Centralized hook for act-specific currency handling.
 *
 * All fees and charges are in Kenya Shillings (KES).
 *
 * Usage:
 *   const { primaryCurrency, formatFee } = useActCurrency();
 *   // formatFee(amount) — formats in KES
 */

import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useCurrency } from '@/hooks/useCurrency';

export function useActCurrency() {
  const { isCommercial } = useModuleAccess();
  const { formatAmount } = useCurrency();

  return {
    primaryCurrency: 'KES' as const,
    showUsd: false,
    showKes: true,
    formatFee: (amount: number) => formatAmount(amount, 'KES'),
    formatPrimary: (amountKes: number, _amountUsd: number) => formatAmount(amountKes, 'KES'),
    formatReference: (_amountKes: number, _amountUsd: number) => null as string | null,
    isCommercial,
  };
}

/**
 * Primary currency is always KES.
 */
export function getActPrimaryCurrency(_chargingCurrency?: string | null): 'KES' {
  return 'KES';
}

/**
 * Always pick the KES amount.
 */
export function pickFeeByActCurrency(
  _chargingCurrency: string | null | undefined,
  amountKes: number,
  _amountUsd: number
): number {
  return amountKes;
}
