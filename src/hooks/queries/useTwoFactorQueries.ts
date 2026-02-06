/**
 * TanStack Query hooks for two-factor authentication.
 * Uses centralized QUERY_OPTIONS for consistent caching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_OPTIONS } from '@/lib/query/config';
import * as twoFactorApi from '@/lib/api/twoFactor';

// Query keys
export const TWO_FACTOR_QUERY_KEYS = {
  STATUS: ['2fa', 'status'] as const,
  SETUP: ['2fa', 'setup'] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get 2FA status for current user
 */
export function use2FAStatus() {
  return useQuery({
    queryKey: TWO_FACTOR_QUERY_KEYS.STATUS,
    queryFn: twoFactorApi.get2FAStatus,
    ...QUERY_OPTIONS.dynamic,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Generate 2FA setup (authenticator key and QR code)
 */
export function useGenerate2FASetup() {
  return useMutation({
    mutationFn: twoFactorApi.generate2FASetup,
  });
}

/**
 * Enable 2FA by verifying authenticator code
 */
export function useEnable2FA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: twoFactorApi.enable2FA,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TWO_FACTOR_QUERY_KEYS.STATUS });
    },
  });
}

/**
 * Disable 2FA
 */
export function useDisable2FA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: twoFactorApi.disable2FA,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TWO_FACTOR_QUERY_KEYS.STATUS });
    },
  });
}

/**
 * Verify 2FA code during login
 */
export function useVerify2FA() {
  return useMutation({
    mutationFn: twoFactorApi.verify2FA,
  });
}

/**
 * Regenerate recovery codes
 */
export function useRegenerateRecoveryCodes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: twoFactorApi.regenerateRecoveryCodes,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TWO_FACTOR_QUERY_KEYS.STATUS });
    },
  });
}

/**
 * Reset authenticator
 */
export function useResetAuthenticator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: twoFactorApi.resetAuthenticator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TWO_FACTOR_QUERY_KEYS.STATUS });
    },
  });
}
