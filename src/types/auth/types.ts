/**
 * Authentication-related TypeScript types and interfaces.
 * These correspond to the backend DTOs defined in TruLoad.Backend.DTOs.Auth.
 */

/**
 * Login request payload.
 * Sent to backend /api/v1/auth/login endpoint.
 */
export interface LoginRequest {
  /** User email address (e.g., admin@codevertexitsolutions.com) */
  email: string;
  /** User password */
  password: string;
  /** Tenant slug from SSO (e.g., "codevertex"), defaults to 'codevertex' */
  tenant_slug: string;
}

/**
 * User information returned in login response.
 * Synced from centralized SSO service.
 */
export interface LoginResponseUser {
  /** Local database user ID (UUID) */
  id: string;
  /** Email from SSO */
  email: string;
  /** User's full name from SSO */
  fullName?: string;
  /** Tenant ID assigned in local database (UUID) */
  tenantId: string;
  /** Tenant slug from SSO */
  tenantSlug: string;
  /** Role ID assigned to user (UUID) */
  roleId: string;
  /** Role name assigned to user (e.g., "Super Admin", "Operator") */
  roleName: string;
  /** Whether user is superuser from SSO */
  isSuperUser: boolean;
}

/**
 * Successful login response.
 * Contains JWT token (in httpOnly cookie) and user information.
 */
export interface LoginResponse {
  /** JWT token for authenticated API requests (stored in httpOnly cookie by backend) */
  token?: string;
  /** When the token expires (Unix timestamp in seconds) */
  expires_at: number;
  /** User information synced from SSO */
  user: LoginResponseUser;
  /** Error code if authentication failed */
  error?: string;
  /** Error description if authentication failed */
  error_description?: string;
}

/**
 * Token refresh response.
 * Contains new token expiry after successful refresh.
 */
export interface RefreshTokenResponse {
  /** When the new token expires (Unix timestamp in seconds) */
  expires_at: number;
  /** Refreshed JWT token for authenticated API requests (stored in httpOnly cookie) */
  token?: string;
  /** Error code if refresh failed */
  error?: string;
  /** Error description if refresh failed */
  error_description?: string;
}

/**
 * Current user profile.
 * Returned by /api/v1/auth/me endpoint.
 * Subset of LoginResponseUser, containing only non-sensitive user data.
 */
export interface User {
  /** Local database user ID (UUID) */
  id: string;
  /** Email address */
  email: string;
  /** User's full name */
  fullName?: string;
  /** Tenant ID (UUID) */
  tenantId: string;
  /** Tenant slug */
  tenantSlug: string;
  /** Role ID (UUID) */
  roleId: string;
  /** Role name */
  roleName: string;
  /** Whether user is superuser */
  isSuperUser: boolean;
}

/**
 * Standardized error response from authentication endpoints.
 * Used when login, refresh, or other auth operations fail.
 */
export interface AuthError {
  /** Error code (e.g., "invalid_credentials", "user_not_found") */
  error: string;
  /** Detailed error message for debugging */
  error_description: string;
  /** HTTP status code */
  statusCode?: number;
}

/**
 * JWT token payload structure.
 * Decoded from token claims (for reference, tokens are read-only).
 */
export interface JwtPayload {
  /** Subject (user ID) */
  sub: string;
  /** Email claim */
  email: string;
  /** Tenant slug claim */
  tenant_slug: string;
  /** Role name claim */
  role: string;
  /** Is superuser claim */
  is_superuser: boolean;
  /** Issued at (Unix timestamp) */
  iat: number;
  /** Expires at (Unix timestamp) */
  exp: number;
  /** JWT ID (for tracking) */
  jti?: string;
}
