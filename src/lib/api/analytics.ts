import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface SupersetGuestTokenRequest {
  dashboardIds: number[];
  filters?: Record<string, string>;
}

export interface SupersetGuestTokenResponse {
  token: string;
  expiresAt: string;
}

export interface SupersetDashboardDto {
  id: number;
  title: string;
  slug: string | null;
  url: string | null;
  thumbnailUrl: string | null;
  published: boolean;
  createdAt: string | null;
  changedAt: string | null;
}

export interface NaturalLanguageQueryRequest {
  question: string;
  schemaContext?: string;
}

export interface NaturalLanguageQueryResponse {
  originalQuestion: string;
  generatedSql: string;
  results: Record<string, unknown>[] | null;
  error: string | null;
  success: boolean;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get a guest token for embedding Superset dashboards
 */
export async function getGuestToken(request: SupersetGuestTokenRequest) {
  const response = await apiClient.post<SupersetGuestTokenResponse>(
    '/analytics/superset/guest-token',
    request
  );
  return response.data;
}

/**
 * List available Superset dashboards
 */
export async function getDashboards() {
  const response = await apiClient.get<SupersetDashboardDto[]>(
    '/analytics/superset/dashboards'
  );
  return response.data;
}

/**
 * Get a specific dashboard by ID
 */
export async function getDashboard(id: number) {
  const response = await apiClient.get<SupersetDashboardDto>(
    `/analytics/superset/dashboards/${id}`
  );
  return response.data;
}

/**
 * Execute a natural language query using AI-powered text-to-SQL
 */
export async function executeNaturalLanguageQuery(request: NaturalLanguageQueryRequest) {
  const response = await apiClient.post<NaturalLanguageQueryResponse>(
    '/analytics/query',
    request
  );
  return response.data;
}

// ============================================================================
// Exported API Object
// ============================================================================

export const analyticsApi = {
  getGuestToken,
  getDashboards,
  getDashboard,
  executeNaturalLanguageQuery,
};
