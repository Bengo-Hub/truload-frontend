/**
 * TanStack Query hooks for settings management.
 * Uses centralized QUERY_OPTIONS for consistent caching.
 * Settings are semi-static - rarely change, cached for 5 minutes.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_OPTIONS } from '@/lib/query/config';
import * as settingsApi from '@/lib/api/settings';

// Query keys
export const SETTINGS_QUERY_KEYS = {
  ALL: ['settings'] as const,
  CATEGORY: (category: string) => ['settings', 'category', category] as const,
  PASSWORD_POLICY: ['settings', 'password-policy'] as const,
  SHIFT_SETTINGS: ['settings', 'shifts'] as const,
  BACKUP_SETTINGS: ['settings', 'backup'] as const,
  SECURITY_OVERVIEW: ['settings', 'security'] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get all settings
 */
export function useAllSettings() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.ALL,
    queryFn: settingsApi.getAllSettings,
    ...QUERY_OPTIONS.semiStatic,
  });
}

/**
 * Get settings by category
 */
export function useSettingsByCategory(category: string) {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.CATEGORY(category),
    queryFn: () => settingsApi.getSettingsByCategory(category),
    enabled: !!category,
    ...QUERY_OPTIONS.semiStatic,
  });
}

/**
 * Get password policy settings
 */
export function usePasswordPolicy() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.PASSWORD_POLICY,
    queryFn: settingsApi.getPasswordPolicy,
    ...QUERY_OPTIONS.semiStatic,
  });
}

/**
 * Get shift settings
 */
export function useShiftSettings() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.SHIFT_SETTINGS,
    queryFn: settingsApi.getShiftSettings,
    ...QUERY_OPTIONS.semiStatic,
  });
}

/**
 * Get backup settings
 */
export function useBackupSettings() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.BACKUP_SETTINGS,
    queryFn: settingsApi.getBackupSettings,
    ...QUERY_OPTIONS.semiStatic,
  });
}

/**
 * Get security overview
 */
export function useSecurityOverview() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.SECURITY_OVERVIEW,
    queryFn: settingsApi.getSecurityOverview,
    ...QUERY_OPTIONS.semiStatic,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Update password policy
 */
export function useUpdatePasswordPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.updatePasswordPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEYS.PASSWORD_POLICY });
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEYS.SECURITY_OVERVIEW });
    },
  });
}

/**
 * Update shift settings
 */
export function useUpdateShiftSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.updateShiftSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEYS.SHIFT_SETTINGS });
    },
  });
}

/**
 * Update multiple settings at once (batch)
 */
export function useUpdateSettingsBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.updateSettingsBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEYS.ALL });
    },
  });
}

/**
 * Restore all settings in a category to their defaults
 */
export function useRestoreCategoryDefaults() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.restoreCategoryDefaults,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEYS.ALL });
    },
  });
}

/**
 * Reload rate limit settings (applies DB values to runtime)
 */
export function useReloadRateLimits() {
  return useMutation({
    mutationFn: settingsApi.reloadRateLimits,
  });
}
