import { apiClient } from './client';

// ============================================================================
// Types
// ============================================================================

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  module: string;
  supportedFormats: string[];
}

export interface ReportModuleCatalog {
  module: string;
  displayName: string;
  reports: ReportDefinition[];
}

export interface ReportCatalogResponse {
  modules: ReportModuleCatalog[];
}

export interface ReportFilterParams {
  dateFrom?: string;
  dateTo?: string;
  stationId?: string;
  status?: string;
  weighingType?: string;
  controlStatus?: string;
  format?: 'pdf' | 'csv' | 'xlsx';
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch the report catalog (available reports per module).
 * Optionally filter by a specific module.
 */
export async function fetchReportCatalog(module?: string): Promise<ReportCatalogResponse> {
  const params = module ? { module } : {};
  const { data } = await apiClient.get<ReportCatalogResponse>('/reports/catalog', { params });
  return data;
}

/**
 * Generate and download a report as a file (PDF or CSV).
 * Returns a Blob that can be used to create a download link or preview.
 */
export async function downloadReport(
  module: string,
  reportType: string,
  filters: ReportFilterParams = {}
): Promise<{ blob: Blob; fileName: string; contentType: string }> {
  const { format = 'pdf', dateFrom, dateTo, stationId, status, weighingType, controlStatus } = filters;

  const response = await apiClient.get(`/reports/${module}/${reportType}`, {
    params: { format, dateFrom, dateTo, stationId, status, weighingType, controlStatus },
    responseType: 'blob',
  });

  // Extract filename from Content-Disposition header if available
  const contentDisposition = response.headers['content-disposition'];
  let fileName = `${reportType}.${format}`;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match?.[1]) {
      fileName = match[1].replace(/['"]/g, '');
    }
  }

  const fallbackContentType = format === 'pdf' ? 'application/pdf'
    : format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/csv';
  const contentType = response.headers['content-type'] || fallbackContentType;

  return {
    blob: response.data as Blob,
    fileName,
    contentType,
  };
}

/**
 * Trigger file download in the browser from a Blob.
 */
export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Create a blob URL for PDF preview.
 */
export function createBlobUrl(blob: Blob): string {
  return window.URL.createObjectURL(blob);
}

/**
 * Revoke a blob URL to free memory.
 */
export function revokeBlobUrl(url: string): void {
  window.URL.revokeObjectURL(url);
}
