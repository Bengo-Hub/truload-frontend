import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchReportConfigs,
  createReportConfig,
  updateReportConfig,
  deleteReportConfig,
  type SaveReportConfigRequest,
} from '@/lib/api/reportConfigs';
import { QUERY_OPTIONS } from '@/lib/query/config';

const REPORT_CONFIGS_KEY = ['reports', 'configs'] as const;

/** Saved custom-report-builder configs for a module/report type. */
export function useReportConfigs(module?: string, reportType?: string) {
  return useQuery({
    queryKey: [...REPORT_CONFIGS_KEY, module, reportType],
    queryFn: () => fetchReportConfigs(module, reportType),
    enabled: !!module && !!reportType,
    ...QUERY_OPTIONS.dynamic,
  });
}

export function useSaveReportConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: SaveReportConfigRequest) => createReportConfig(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REPORT_CONFIGS_KEY });
    },
  });
}

export function useUpdateReportConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: SaveReportConfigRequest }) =>
      updateReportConfig(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REPORT_CONFIGS_KEY });
    },
  });
}

export function useDeleteReportConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReportConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REPORT_CONFIGS_KEY });
    },
  });
}
