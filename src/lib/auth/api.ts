/**
 * Authentication API client for TruLoad.
 * Communicates with TruLoad backend which proxies to centralized auth-service.
 */

import { apiClient } from '@/lib/api/client';
import type { LoginRequest, LoginResponse, RefreshTokenResponse, TenantInfo, User } from '../../types/auth/types';
import { clearTokens, setTenantContext, setTokens } from './token';

/**
 * Login user with email and password.
 * If backend returns requires2FA, do NOT set tokens; caller must show 2FA step and call loginVerify2FA.
 * Optional org/station for tenant login with pre-login station selection.
 */
export async function login(
  email: string,
  password: string,
  options?: { organizationCode?: string; stationCode?: string }
): Promise<LoginResponse> {
  const payload: LoginRequest = {
    email,
    password,
    organizationCode: options?.organizationCode,
    stationCode: options?.stationCode,
  };

  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);

  // If 2FA required, do not set tokens; return challenge to caller
  if (data.requires2FA && data.twoFactorToken) {
    return data;
  }

  // Store tokens if provided (full login success)
  if (data.accessToken && data.refreshToken && data.expiresIn) {
    setTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    });
  }

  if (data.user) {
    const isHqUser = !!data.user.isHqUser;
    setTenantContext({
      organizationId: data.user.organizationId,
      stationId: data.user.stationId,
      isHqUser,
    });
  }

  return data;
}

/**
 * Complete login after 2FA: verify TOTP or recovery code and receive tokens.
 */
export async function loginVerify2FA(twoFactorToken: string, code: string, useRecoveryCode = false): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login/2fa-verify', {
    twoFactorToken,
    code: code.replace(/\s/g, '').replace(/-/g, ''),
    useRecoveryCode,
  });

  if (!data.accessToken || !data.refreshToken) {
    throw new Error('Invalid verification code');
  }

  setTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn ?? 3600,
  });

  if (data.user) {
    const isHqUser = !!data.user.isHqUser;
    setTenantContext({
      organizationId: data.user.organizationId,
      stationId: data.user.stationId,
      isHqUser,
    });
  }

  return data;
}

/**
 * Refresh authentication token before expiry.
 * Backend validates existing token and issues new token in httpOnly cookie.
 *
 * @returns RefreshTokenResponse with new token expiry
 */
export async function refreshToken(): Promise<RefreshTokenResponse> {
  const { data } = await apiClient.post<RefreshTokenResponse>('/auth/refresh', {});

  // Store new tokens if provided
  if (data.accessToken && data.refreshToken && data.expiresIn) {
    setTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    });
  }

  return data;
}

/**
 * Logout user and clear authentication state.
 * Backend invalidates token and clears httpOnly cookie.
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout', {});
  } finally {
    clearTokens();
  }
}

/**
 * Fetch current user profile from backend.
 * Requires valid authentication token in httpOnly cookie or Authorization header.
 *
 * @returns User profile data with roles and permissions
 */
export async function getCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/profile');
  return data;
}

/**
 * Change current user's password.
 */
export async function changePassword(currentPassword: string, newPassword: string, confirmNewPassword: string): Promise<void> {
  await apiClient.post('/auth/change-password', {
    currentPassword,
    newPassword,
    confirmNewPassword,
  });
}

/** Password policy shape returned by public GET /auth/password-policy (for login, register, reset, change-expired flows). */
export interface PublicPasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireSpecial: boolean;
  lockoutThreshold: number;
  lockoutMinutes: number;
  passwordExpiryDays?: number;
}

/**
 * Get password policy (public, no auth). Use on login, register, forgot-password, reset-password, change-expired-password pages.
 */
export async function getPasswordPolicyPublic(): Promise<PublicPasswordPolicy> {
  const { data } = await apiClient.get<PublicPasswordPolicy>('/auth/password-policy');
  return data ?? { minLength: 8, requireUppercase: true, requireLowercase: true, requireDigit: true, requireSpecial: false, lockoutThreshold: 5, lockoutMinutes: 15, passwordExpiryDays: 0 };
}

/**
 * Change expired password (public). Token comes from login 401 response when password has expired.
 */
export async function changeExpiredPassword(changePasswordToken: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/change-expired-password', {
    changePasswordToken,
    newPassword,
  });
}

// ── Commercial Tenant / SSO Endpoints ────────────────────────────────────────

/**
 * Returns public tenant info for a given org slug.
 * No auth required. Used by login page to detect SSO vs local login.
 */
export async function getTenantInfo(orgCode: string): Promise<TenantInfo | null> {
  try {
    const { data } = await apiClient.get<TenantInfo>(`/auth/tenant-info?code=${encodeURIComponent(orgCode)}`);
    return data;
  } catch {
    return null;
  }
}

/**
 * Exchanges an SSO access token (from auth-api PKCE flow) for a truload SSO exchange token.
 * Returns { requiresStationSelection: true, ssoExchangeToken } on success.
 */
export async function ssoExchange(accessToken: string): Promise<{ requiresStationSelection: boolean; ssoExchangeToken: string }> {
  const { data } = await apiClient.post<{ requiresStationSelection: boolean; ssoExchangeToken: string }>(
    '/auth/sso-exchange',
    { accessToken }
  );
  return data;
}

/**
 * Selects a station and issues a full truload JWT session.
 * For SSO path: provide ssoExchangeToken.
 * For local path (station switch): provide the current accessToken.
 */
export async function selectStation(
  stationCode: string,
  options: { ssoExchangeToken?: string; accessToken?: string }
): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/select-station', {
    stationCode,
    ssoExchangeToken: options.ssoExchangeToken,
    accessToken: options.accessToken,
  });

  if (data.accessToken && data.refreshToken && data.expiresIn) {
    setTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    });
  }

  if (data.user) {
    setTenantContext({
      organizationId: data.user.organizationId,
      stationId: data.user.stationId,
      isHqUser: !!data.user.isHqUser,
    });
  }

  return data;
}
