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
  tenantType?: 'CommercialWeighing' | 'AxleLoadEnforcement' | string;
  /** Use case corresponding to the tenant (Commercial | Enforcement) */
  tenantUseCase?: string;
  /** True when the tenant is a commercial weighing operator (not enforcement). */
  isCommercialTenant?: boolean;
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
  /** When true (SSO exchange), user must select a station before getting a full session. */
  requiresStationSelection?: boolean;
  /** Short-lived exchange token used only for the /auth/select-station call (SSO path). */
  ssoExchangeToken?: string;
}

/** Public tenant info returned by GET /api/v1/auth/tenant-info?code={orgSlug} */
export interface TenantInfo {
  tenantType: 'CommercialWeighing' | 'AxleLoadEnforcement';
  name: string;
  logoUrl?: string;
  ssoTenantSlug?: string;
  organizationCode: string;
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
