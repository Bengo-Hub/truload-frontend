import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface TwoFactorStatusResponse {
  isEnabled: boolean;
  hasAuthenticator: boolean;
  recoveryCodesRemaining: number;
  isMachineRemembered: boolean;
}

export interface TwoFactorSetupResponse {
  sharedKey: string;
  authenticatorUri: string;
  qrCodeDataUrl: string;
}

export interface Enable2FARequest {
  verificationCode: string;
}

export interface Enable2FAResponse {
  success: boolean;
  recoveryCodes: string[];
}

export interface Disable2FARequest {
  password: string;
}

export interface Verify2FARequest {
  code: string;
  useRecoveryCode: boolean;
  rememberDevice: boolean;
}

export interface RecoveryCodesResponse {
  recoveryCodes: string[];
  remainingCodes: number;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get 2FA status for current user
 */
export async function get2FAStatus() {
  const response = await apiClient.get<TwoFactorStatusResponse>('/auth/2fa/status');
  return response.data;
}

/**
 * Generate 2FA setup (authenticator key and QR code)
 */
export async function generate2FASetup() {
  const response = await apiClient.post<TwoFactorSetupResponse>('/auth/2fa/setup');
  return response.data;
}

/**
 * Enable 2FA by verifying authenticator code
 */
export async function enable2FA(data: Enable2FARequest) {
  const response = await apiClient.post<Enable2FAResponse>('/auth/2fa/enable', data);
  return response.data;
}

/**
 * Disable 2FA
 */
export async function disable2FA(data: Disable2FARequest) {
  const response = await apiClient.post('/auth/2fa/disable', data);
  return response.data;
}

/**
 * Verify 2FA code during login
 */
export async function verify2FA(data: Verify2FARequest) {
  const response = await apiClient.post('/auth/2fa/verify', data);
  return response.data;
}

/**
 * Regenerate recovery codes
 */
export async function regenerateRecoveryCodes() {
  const response = await apiClient.post<RecoveryCodesResponse>('/auth/2fa/recovery-codes/regenerate');
  return response.data;
}

/**
 * Reset authenticator
 */
export async function resetAuthenticator() {
  const response = await apiClient.post('/auth/2fa/reset');
  return response.data;
}

// ============================================================================
// Exported API Object
// ============================================================================

export const twoFactorApi = {
  getStatus: get2FAStatus,
  generateSetup: generate2FASetup,
  enable: enable2FA,
  disable: disable2FA,
  verify: verify2FA,
  regenerateRecoveryCodes,
  resetAuthenticator,
};
