/**
 * Authentication types for TruLoad frontend.
 * Aligned with backend DTOs from AuthController and centralized auth-service.
 */

export interface LoginRequest {
  email: string;
  password: string;
  tenant_slug: string;
}

export interface LoginResponse {
  token: string;
  expires_at: number;
  user: User;
  error?: string;
  error_description?: string;
}

export interface User {
  id: string;
  auth_service_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id: string;
  role_name: string;
  tenant_id: string;
  tenant_name: string;
  station_id?: string;
  station_name?: string;
  is_active: boolean;
}

export interface RefreshTokenResponse {
  token: string;
  expires_at: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
}
