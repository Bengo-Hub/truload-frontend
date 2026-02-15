/**
 * Authentication API client for TruLoad.
 * Communicates with TruLoad backend which proxies to centralized auth-service.
 */

import { apiClient } from '@/lib/api/client';
import type { LoginRequest, LoginResponse, RefreshTokenResponse, User } from '../../types/auth/types';
import { clearTokens, setTokens, setTenantContext } from './token';

/**
 * Login user with email and password.
 * Backend proxies credentials to auth-service, syncs user, returns JWT in httpOnly cookie.
 * 
 * @param email - User email address
 * @param password - User password
 * @param tenantSlug - Tenant slug (default: 'codevertex')
 * @returns LoginResponse with user details and token expiry
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const payload: LoginRequest = { email, password };

  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);

  // Store tokens if provided
  if (data.accessToken && data.refreshToken && data.expiresIn) {
    setTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    });
  }

  // Store tenant context (organization and station) for multi-tenant API headers
  if (data.user) {
    setTenantContext({
      organizationId: data.user.organizationId,
      stationId: data.user.stationId,
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
