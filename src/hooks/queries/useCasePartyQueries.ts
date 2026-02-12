import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as casePartyApi from '@/lib/api/caseParty';
import { QUERY_OPTIONS } from '@/lib/query/config';

export const CASE_PARTY_QUERY_KEYS = {
  partiesByCase: (caseId: string) => ['case-parties', 'by-case', caseId] as const,
};

// ============================================================================
// Queries
// ============================================================================

export function usePartiesByCaseId(caseId?: string) {
  return useQuery({
    queryKey: CASE_PARTY_QUERY_KEYS.partiesByCase(caseId ?? ''),
    queryFn: () => casePartyApi.getPartiesByCaseId(caseId!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!caseId,
  });
}

// ============================================================================
// Mutations
// ============================================================================

export function useAddParty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      caseId,
      request,
    }: {
      caseId: string;
      request: casePartyApi.AddCasePartyRequest;
    }) => casePartyApi.addParty(caseId, request),
    onSuccess: (newParty) => {
      queryClient.invalidateQueries({
        queryKey: CASE_PARTY_QUERY_KEYS.partiesByCase(newParty.caseRegisterId),
      });
    },
  });
}

export function useUpdateParty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      caseId,
      partyId,
      request,
    }: {
      caseId: string;
      partyId: string;
      request: casePartyApi.UpdateCasePartyRequest;
    }) => casePartyApi.updateParty(caseId, partyId, request),
    onSuccess: (updatedParty) => {
      queryClient.invalidateQueries({
        queryKey: CASE_PARTY_QUERY_KEYS.partiesByCase(updatedParty.caseRegisterId),
      });
    },
  });
}

export function useRemoveParty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ caseId, partyId }: { caseId: string; partyId: string }) =>
      casePartyApi.removeParty(caseId, partyId),
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({
        queryKey: CASE_PARTY_QUERY_KEYS.partiesByCase(caseId),
      });
    },
  });
}
