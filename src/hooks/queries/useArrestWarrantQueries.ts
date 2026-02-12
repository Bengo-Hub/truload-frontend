import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as warrantApi from '@/lib/api/arrestWarrant';
import { QUERY_OPTIONS } from '@/lib/query/config';

export const ARREST_WARRANT_QUERY_KEYS = {
  warrantsByCase: (caseId: string) => ['arrest-warrants', 'by-case', caseId] as const,
  warrantById: (id: string) => ['arrest-warrants', 'detail', id] as const,
};

// ============================================================================
// Queries
// ============================================================================

export function useWarrantsByCaseId(caseId?: string) {
  return useQuery({
    queryKey: ARREST_WARRANT_QUERY_KEYS.warrantsByCase(caseId ?? ''),
    queryFn: () => warrantApi.getWarrantsByCaseId(caseId!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!caseId,
  });
}

// ============================================================================
// Mutations
// ============================================================================

export function useCreateWarrant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: warrantApi.CreateArrestWarrantRequest) =>
      warrantApi.createWarrant(request),
    onSuccess: (newWarrant) => {
      queryClient.invalidateQueries({
        queryKey: ARREST_WARRANT_QUERY_KEYS.warrantsByCase(newWarrant.caseRegisterId),
      });
      queryClient.setQueryData(
        ARREST_WARRANT_QUERY_KEYS.warrantById(newWarrant.id),
        newWarrant
      );
    },
  });
}

export function useExecuteWarrant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: string;
      request: warrantApi.ExecuteWarrantRequest;
    }) => warrantApi.executeWarrant(id, request),
    onSuccess: (executedWarrant, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ARREST_WARRANT_QUERY_KEYS.warrantsByCase(executedWarrant.caseRegisterId),
      });
      queryClient.setQueryData(ARREST_WARRANT_QUERY_KEYS.warrantById(id), executedWarrant);
    },
  });
}

export function useDropWarrant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: string;
      request: warrantApi.DropWarrantRequest;
    }) => warrantApi.dropWarrant(id, request),
    onSuccess: (droppedWarrant, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ARREST_WARRANT_QUERY_KEYS.warrantsByCase(droppedWarrant.caseRegisterId),
      });
      queryClient.setQueryData(ARREST_WARRANT_QUERY_KEYS.warrantById(id), droppedWarrant);
    },
  });
}
