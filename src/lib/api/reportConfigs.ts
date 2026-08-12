import { apiClient } from './client';

// ============================================================================
// Types
// ============================================================================

export interface SavedReportConfig {
  id: string;
  name: string;
  module: string;
  reportType: string;
  columns: string[];
  chartType?: string | null;
  filtersJson?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaveReportConfigRequest {
  name: string;
  module: string;
  reportType: string;
  columns: string[];
  chartType?: string | null;
  filtersJson?: string | null;
  isDefault: boolean;
}

// ============================================================================
// API Functions
// ============================================================================

export async function fetchReportConfigs(module?: string, reportType?: string): Promise<SavedReportConfig[]> {
  const { data } = await apiClient.get<SavedReportConfig[]>('/reports/configs', {
    params: { module, reportType },
  });
  return data;
}

export async function createReportConfig(request: SaveReportConfigRequest): Promise<SavedReportConfig> {
  const { data } = await apiClient.post<SavedReportConfig>('/reports/configs', request);
  return data;
}

export async function updateReportConfig(id: string, request: SaveReportConfigRequest): Promise<SavedReportConfig> {
  const { data } = await apiClient.put<SavedReportConfig>(`/reports/configs/${id}`, request);
  return data;
}

export async function deleteReportConfig(id: string): Promise<void> {
  await apiClient.delete(`/reports/configs/${id}`);
}
