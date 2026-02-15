import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as documentConventionsApi from '@/lib/api/documentConventions';
import { QUERY_OPTIONS } from '@/lib/query/config';

const CONVENTION_KEYS = {
  all: ['document-conventions'] as const,
  preview: (documentType: string, stationCode?: string, bound?: string, vehicleReg?: string) =>
    ['document-conventions', 'preview', documentType, stationCode, bound, vehicleReg] as const,
};

export function useDocumentConventions() {
  return useQuery({
    queryKey: CONVENTION_KEYS.all,
    queryFn: documentConventionsApi.fetchDocumentConventions,
    ...QUERY_OPTIONS.semiStatic,
  });
}

export function useUpdateDocumentConvention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: documentConventionsApi.UpdateDocumentConventionRequest;
    }) => documentConventionsApi.updateDocumentConvention(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONVENTION_KEYS.all });
    },
  });
}

export function useDocumentNumberPreview(params: {
  documentType: string;
  stationCode?: string;
  bound?: string;
  vehicleReg?: string;
}) {
  return useQuery({
    queryKey: CONVENTION_KEYS.preview(
      params.documentType,
      params.stationCode,
      params.bound,
      params.vehicleReg
    ),
    queryFn: () => documentConventionsApi.previewDocumentNumber(params),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!params.documentType,
  });
}
