/**
 * Authentication-related TypeScript types matching current TruLoad backend.
 */

export interface LoginRequest {
  email: string;
  password: string;
  /** Organisation code (e.g. from tenant URL) for validation. */
  organizationCode?: string;
  /** Station code from pre-login station selection. */
  stationCode?: string;
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
  /** Organization code (slug) for routing, e.g. "kura" */
  organizationCode?: string;
  /** Tenant type: CommercialWeighing | AxleLoadEnforcement */
  tenantType?: string;
  /** Module keys enabled for the user's org (sidebar filtering). Empty/missing = all modules. */
  enabledModules?: string[];
  stationId?: string;
  /** True when user's assigned station is HQ; can access all stations (no station filter unless they select one). */
  isHqUser?: boolean;
  departmentId?: string;
  lastLoginAt?: string;
}

export interface LoginResponse {
  accessToken?: string;
  refreshToken?: string;
  /** Token lifetime in seconds */
  expiresIn?: number;
  user?: User;
  /** When true, client must call login/2fa-verify with twoFactorToken and code */
  requires2FA?: boolean;
  twoFactorToken?: string;
  /** When true, user must enable 2FA from profile (org policy); frontend should redirect to profile and show 2FA setup */
  requires2FASetup?: boolean;
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
