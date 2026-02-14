import { useQuery, useMutation } from '@tanstack/react-query';
import {
  fetchReportCatalog,
  downloadReport,
  triggerBlobDownload,
  type ReportFilterParams,
} from '@/lib/api/reports';
import { QUERY_OPTIONS } from '@/lib/query/config';

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch the full report catalog or filter by module.
 */
export function useReportCatalog(module?: string) {
  return useQuery({
    queryKey: ['reports', 'catalog', module],
    queryFn: () => fetchReportCatalog(module),
    ...QUERY_OPTIONS.static,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Generate and download a report. Returns the blob for preview or triggers download.
 */
export function useDownloadReport() {
  return useMutation({
    mutationFn: async ({
      module,
      reportType,
      filters,
    }: {
      module: string;
      reportType: string;
      filters: ReportFilterParams;
    }) => {
      const result = await downloadReport(module, reportType, filters);
      return result;
    },
  });
}

/**
 * Generate and immediately trigger browser download.
 */
export function useGenerateAndDownloadReport() {
  return useMutation({
    mutationFn: async ({
      module,
      reportType,
      filters,
    }: {
      module: string;
      reportType: string;
      filters: ReportFilterParams;
    }) => {
      const { blob, fileName } = await downloadReport(module, reportType, filters);
      triggerBlobDownload(blob, fileName);
      return { fileName };
    },
  });
}
