/**
 * Public (unauthenticated) API for login page: organizations and stations for branding.
 */

import { apiClient } from '@/lib/api/client';

export interface PublicOrganization {
  id: string;
  code: string;
  name: string;
  /** Organisation logo (overlay on login page right panel). */
  logoUrl?: string | null;
  /** Tenant platform logo (on login form left panel, e.g. KURA Weigh). */
  platformLogoUrl?: string | null;
  /** Login page background image (right panel). */
  loginPageImageUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

export interface PublicStation {
  id: string;
  code: string;
  name: string;
  isHq?: boolean;
}

export async function fetchPublicOrganizations(): Promise<PublicOrganization[]> {
  const { data } = await apiClient.get<PublicOrganization[]>('/public/organizations');
  return data ?? [];
}

/** Fetch single org by code (slug) for branding on org-scoped pages. */
export async function fetchOrganizationByCode(code: string): Promise<PublicOrganization | null> {
  try {
    const { data } = await apiClient.get<PublicOrganization>(`/public/organizations/by-code/${encodeURIComponent(code)}`);
    return data ?? null;
  } catch {
    return null;
  }
}

export async function fetchPublicStationsByOrg(organizationId: string): Promise<PublicStation[]> {
  const { data } = await apiClient.get<PublicStation[]>('/public/stations', {
    params: { organizationId },
  });
  return data ?? [];
}
