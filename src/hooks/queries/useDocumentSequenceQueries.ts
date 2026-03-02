import {
    fetchDocumentSequences,
    getDocumentSequence,
    updateDocumentSequence,
    type UpdateDocumentSequenceRequest,
} from '@/lib/api/documentSequences';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const keys = {
  all: ['document-sequences'] as const,
  list: (stationId?: string) => [...keys.all, 'list', stationId] as const,
  detail: (id: string) => [...keys.all, 'detail', id] as const,
};

export function useDocumentSequences(stationId?: string) {
  return useQuery({
    queryKey: keys.list(stationId),
    queryFn: () => fetchDocumentSequences(stationId),
  });
}

export function useDocumentSequence(id: string | null) {
  return useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getDocumentSequence(id!),
    enabled: !!id,
  });
}

export function useUpdateDocumentSequence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDocumentSequenceRequest }) =>
      updateDocumentSequence(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.all });
    },
  });
}
