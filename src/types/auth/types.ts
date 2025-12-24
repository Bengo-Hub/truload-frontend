/**
 * Authentication-related TypeScript types matching current TruLoad backend.
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  roles: string[];
  /** Permission codes (e.g., "user.create") embedded in JWT */
  permissions: string[];
  isSuperUser?: boolean;
  organizationId?: string;
  stationId?: string;
  departmentId?: string;
  lastLoginAt?: string;
}

export interface LoginResponse {
  accessToken?: string;
  refreshToken?: string;
  /** Token lifetime in seconds */
  expiresIn?: number;
  user: User;
}

export interface RefreshTokenRequest {
  accessToken?: string;
  refreshToken?: string;
}

export interface RefreshTokenResponse {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface AuthError {
  message: string;
}
