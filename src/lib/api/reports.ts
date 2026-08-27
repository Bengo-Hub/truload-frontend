import { apiClient } from './client';

// ============================================================================
// Types
// ============================================================================

export interface ReportColumnDefinition {
  key: string;
  label: string;
  defaultSelected: boolean;
}

export interface ReportChartOption {
  key: string;
  label: string;
}

export interface ReportFilterOption {
  value: string;
  label: string;
}

export interface ReportFilterDefinition {
  key: string;
  label: string;
  /** Which control to render: 'station' | 'county' | 'subcounty' | 'select' | 'text' | 'date'. */
  kind: string;
  /** Fixed option list, present when kind === 'select'. */
  options?: ReportFilterOption[];
}

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  module: string;
  supportedFormats: string[];
  /** Present only on report types that opted into the structured custom-report builder. */
  columns?: ReportColumnDefinition[];
  chartOptions?: ReportChartOption[];
  /** Present only on report types that opted into the structured filter catalog - shows only the filters this report actually supports. */
  filters?: ReportFilterDefinition[];
  /**
   * Permission code required to see/generate this report (e.g. 'analytics.read'), when the
   * report catalog restricts it beyond the general `analytics.read` gate on the reporting page
   * as a whole. Absent means no extra restriction — every user with page-level access sees it.
   */
  requiredPermission?: string;
  /** Role name required to see/generate this report, when restricted by role rather than permission. */
  requiredRole?: string;
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
  countyId?: string;
  subcountyId?: string;
  roadId?: string;
  status?: string;
  weighingType?: string;
  controlStatus?: string;
  format?: 'pdf' | 'csv' | 'xlsx';
  /** Structured custom-report-builder column selection (header/key values). Ignored server-side
   *  unless `useDefaults` is explicitly false. */
  columns?: string[];
  /** Structured custom-report-builder chart-option selection. */
  chartType?: string;
  /** true (default) reproduces the report's normal fixed output; false applies columns/chartType. */
  useDefaults?: boolean;
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
  const {
    format = 'pdf', dateFrom, dateTo, stationId, countyId, subcountyId, roadId, status, weighingType, controlStatus,
    columns, chartType, useDefaults,
  } = filters;

  const response = await apiClient.get(`/reports/${module}/${reportType}`, {
    params: {
      format, dateFrom, dateTo, stationId, countyId, subcountyId, roadId, status, weighingType, controlStatus,
      columns: columns?.length ? columns.join(',') : undefined,
      chartType,
      useDefaults,
    },
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
