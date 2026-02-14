import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface PasswordPolicyDto {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireSpecial: boolean;
  lockoutThreshold: number;
  lockoutMinutes: number;
}

export interface UpdatePasswordPolicyRequest {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireSpecial: boolean;
  lockoutThreshold: number;
  lockoutMinutes: number;
}

export interface ShiftSettingsDto {
  defaultShiftDuration: number;
  graceMinutes: number;
  enforceShiftOnLogin: boolean;
  bypassShiftCheck: boolean;
  excludedRoles: string;
  require2FA: boolean;
}

export interface UpdateShiftSettingsRequest {
  defaultShiftDuration: number;
  graceMinutes: number;
  enforceShiftOnLogin: boolean;
  bypassShiftCheck: boolean;
  excludedRoles: string;
  require2FA: boolean;
}

export interface BackupSettingsDto {
  enabled: boolean;
  scheduleCron: string;
  retentionDays: number;
  storagePath: string;
}

export interface SecurityOverviewDto {
  passwordPolicy: PasswordPolicyDto;
  twoFactorEnabled: boolean;
  twoFactorEnforcedForAdmin: boolean;
}

export interface ApplicationSettingDto {
  id: string;
  settingKey: string;
  settingValue: string;
  settingType: string;
  category: string;
  displayName: string | null;
  description: string | null;
  isEditable: boolean;
  defaultValue: string | null;
  updatedAt: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get all settings
 */
export async function getAllSettings() {
  const response = await apiClient.get<ApplicationSettingDto[]>('/settings');
  return response.data;
}

/**
 * Get settings by category
 */
export async function getSettingsByCategory(category: string) {
  const response = await apiClient.get<ApplicationSettingDto[]>(`/settings/category/${category}`);
  return response.data;
}

/**
 * Get password policy settings
 */
export async function getPasswordPolicy() {
  const response = await apiClient.get<PasswordPolicyDto>('/settings/password-policy');
  return response.data;
}

/**
 * Update password policy settings
 */
export async function updatePasswordPolicy(data: UpdatePasswordPolicyRequest) {
  const response = await apiClient.put<PasswordPolicyDto>('/settings/password-policy', data);
  return response.data;
}

/**
 * Get shift settings
 */
export async function getShiftSettings() {
  const response = await apiClient.get<ShiftSettingsDto>('/settings/shifts');
  return response.data;
}

/**
 * Update shift settings
 */
export async function updateShiftSettings(data: UpdateShiftSettingsRequest) {
  const response = await apiClient.put<ShiftSettingsDto>('/settings/shifts', data);
  return response.data;
}

/**
 * Get backup settings
 */
export async function getBackupSettings() {
  const response = await apiClient.get<BackupSettingsDto>('/settings/backup');
  return response.data;
}

/**
 * Get security overview
 */
export async function getSecurityOverview() {
  const response = await apiClient.get<SecurityOverviewDto>('/settings/security');
  return response.data;
}

export interface UpdateSettingRequest {
  settingKey: string;
  settingValue: string;
}

export interface UpdateSettingsBatchRequest {
  settings: UpdateSettingRequest[];
}

/**
 * Update multiple settings at once
 */
export async function updateSettingsBatch(data: UpdateSettingsBatchRequest) {
  const response = await apiClient.put<ApplicationSettingDto[]>('/settings/batch', data);
  return response.data;
}

/**
 * Restore a single setting to its default value
 */
export async function restoreSettingDefault(key: string) {
  const response = await apiClient.post<ApplicationSettingDto>(`/settings/key/${encodeURIComponent(key)}/restore-default`);
  return response.data;
}

/**
 * Restore all settings in a category to their defaults
 */
export async function restoreCategoryDefaults(category: string) {
  const response = await apiClient.post<ApplicationSettingDto[]>(`/settings/category/${encodeURIComponent(category)}/restore-defaults`);
  return response.data;
}

/**
 * Reload rate limit settings from database without restart
 */
export async function reloadRateLimits() {
  const response = await apiClient.post<{ message: string }>('/settings/reload-rate-limits');
  return response.data;
}

// ============================================================================
// Exported API Object
// ============================================================================

export const settingsApi = {
  getAllSettings,
  getSettingsByCategory,
  getPasswordPolicy,
  updatePasswordPolicy,
  getShiftSettings,
  updateShiftSettings,
  getBackupSettings,
  getSecurityOverview,
  updateSettingsBatch,
  restoreSettingDefault,
  restoreCategoryDefaults,
  reloadRateLimits,
};
