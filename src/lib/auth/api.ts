/**
 * Authentication API client for TruLoad.
 * Communicates with TruLoad backend which proxies to centralized auth-service.
 */

import { apiClient } from '@/lib/api/client';
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  User,
} from '../../types/auth/types';
import { setTokenExpiry, clearToken } from './token';

/**
 * Login user with email and password.
 * Backend proxies credentials to auth-service, syncs user, returns JWT in httpOnly cookie.
 * 
 * @param email - User email address
 * @param password - User password
 * @param tenantSlug - Tenant slug (default: 'codevertex')
 * @returns LoginResponse with user details and token expiry
 */
export async function login(
  email: string,
  password: string,
  tenantSlug: string = 'codevertex'
): Promise<LoginResponse> {
  const payload: LoginRequest = {
    email,
    password,
    tenant_slug: tenantSlug,
  };

  const { data } = await apiClient.post<LoginResponse>(
    '/api/v1/auth/login',
    payload,
    {
      withCredentials: true, // Include cookies in request
    }
  );

  // Check for authentication errors
  if (data.error) {
    throw new Error(data.error_description || 'Authentication failed');
  }

  // Store token expiry timestamp (token is in httpOnly cookie)
  setTokenExpiry(data.expires_at);

  return data;
}

/**
 * Refresh authentication token before expiry.
 * Backend validates existing token and issues new token in httpOnly cookie.
 * 
 * @returns RefreshTokenResponse with new token expiry
 */
export async function refreshToken(): Promise<RefreshTokenResponse> {
  const { data } = await apiClient.post<RefreshTokenResponse>(
    '/api/v1/auth/refresh',
    {},
    {
      withCredentials: true,
    }
  );

  // Update token expiry
  setTokenExpiry(data.expires_at);

  return data;
}

/**
 * Logout user and clear authentication state.
 * Backend invalidates token and clears httpOnly cookie.
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post(
      '/api/v1/auth/logout',
      {},
      {
        withCredentials: true,
      }
    );
  } finally {
    // Clear local token expiry regardless of API response
    clearToken();
  }
}

/**
 * Fetch current user profile from backend.
 * Requires valid authentication token.
 * 
 * @returns User profile data
 */
export async function getCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>('/api/v1/auth/me', {
    withCredentials: true,
  });

  return data;
}
