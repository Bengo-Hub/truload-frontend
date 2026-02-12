import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as caseSubfileApi from '@/lib/api/caseSubfile';
import { QUERY_OPTIONS } from '@/lib/query/config';

export const CASE_SUBFILE_QUERY_KEYS = {
  subfilesByCase: (caseId: string) => ['case-subfiles', 'by-case', caseId] as const,
  subfileCompletion: (caseId: string) => ['case-subfiles', 'completion', caseId] as const,
  subfileTypes: ['subfile-types'] as const,
};

// ============================================================================
// Queries
// ============================================================================

export function useSubfilesByCaseId(caseId?: string) {
  return useQuery({
    queryKey: CASE_SUBFILE_QUERY_KEYS.subfilesByCase(caseId ?? ''),
    queryFn: () => caseSubfileApi.getSubfilesByCaseId(caseId!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!caseId,
  });
}

export function useSubfileCompletion(caseId?: string) {
  return useQuery({
    queryKey: CASE_SUBFILE_QUERY_KEYS.subfileCompletion(caseId ?? ''),
    queryFn: () => caseSubfileApi.getSubfileCompletion(caseId!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!caseId,
  });
}

export function useSubfileTypes() {
  return useQuery({
    queryKey: CASE_SUBFILE_QUERY_KEYS.subfileTypes,
    queryFn: caseSubfileApi.fetchSubfileTypes,
    ...QUERY_OPTIONS.static,
  });
}

// ============================================================================
// Mutations
// ============================================================================

export function useCreateSubfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: caseSubfileApi.CreateCaseSubfileRequest) =>
      caseSubfileApi.createSubfile(request),
    onSuccess: (newSubfile) => {
      queryClient.invalidateQueries({
        queryKey: CASE_SUBFILE_QUERY_KEYS.subfilesByCase(newSubfile.caseRegisterId),
      });
      queryClient.invalidateQueries({
        queryKey: CASE_SUBFILE_QUERY_KEYS.subfileCompletion(newSubfile.caseRegisterId),
      });
    },
  });
}

export function useUpdateSubfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: string;
      caseId: string;
      request: caseSubfileApi.UpdateCaseSubfileRequest;
    }) => caseSubfileApi.updateSubfile(id, request),
    onSuccess: (updatedSubfile, { caseId }) => {
      queryClient.invalidateQueries({
        queryKey: CASE_SUBFILE_QUERY_KEYS.subfilesByCase(caseId),
      });
      queryClient.invalidateQueries({
        queryKey: CASE_SUBFILE_QUERY_KEYS.subfileCompletion(caseId),
      });
    },
  });
}

export function useDeleteSubfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; caseId: string }) =>
      caseSubfileApi.deleteSubfile(id),
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({
        queryKey: CASE_SUBFILE_QUERY_KEYS.subfilesByCase(caseId),
      });
      queryClient.invalidateQueries({
        queryKey: CASE_SUBFILE_QUERY_KEYS.subfileCompletion(caseId),
      });
    },
  });
}
