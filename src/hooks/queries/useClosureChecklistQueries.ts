import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as checklistApi from '@/lib/api/closureChecklist';
import { QUERY_OPTIONS } from '@/lib/query/config';

export const CLOSURE_CHECKLIST_QUERY_KEYS = {
  checklistByCase: (caseId: string) => ['closure-checklist', 'by-case', caseId] as const,
  closureTypes: ['closure-types'] as const,
};

// ============================================================================
// Queries
// ============================================================================

export function useClosureChecklist(caseId?: string) {
  return useQuery({
    queryKey: CLOSURE_CHECKLIST_QUERY_KEYS.checklistByCase(caseId ?? ''),
    queryFn: () => checklistApi.getChecklist(caseId!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!caseId,
  });
}

export function useClosureTypes() {
  return useQuery({
    queryKey: CLOSURE_CHECKLIST_QUERY_KEYS.closureTypes,
    queryFn: checklistApi.fetchClosureTypes,
    ...QUERY_OPTIONS.static,
  });
}

// ============================================================================
// Mutations
// ============================================================================

export function useUpdateChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      caseId,
      request,
    }: {
      caseId: string;
      request: checklistApi.UpdateChecklistRequest;
    }) => checklistApi.updateChecklist(caseId, request),
    onSuccess: (updatedChecklist) => {
      queryClient.setQueryData(
        CLOSURE_CHECKLIST_QUERY_KEYS.checklistByCase(updatedChecklist.caseRegisterId),
        updatedChecklist
      );
    },
  });
}

export function useRequestChecklistReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      caseId,
      request,
    }: {
      caseId: string;
      request: checklistApi.RequestReviewRequest;
    }) => checklistApi.requestReview(caseId, request),
    onSuccess: (updatedChecklist) => {
      queryClient.setQueryData(
        CLOSURE_CHECKLIST_QUERY_KEYS.checklistByCase(updatedChecklist.caseRegisterId),
        updatedChecklist
      );
    },
  });
}

export function useApproveChecklistReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      caseId,
      request,
    }: {
      caseId: string;
      request: checklistApi.ReviewDecisionRequest;
    }) => checklistApi.approveReview(caseId, request),
    onSuccess: (updatedChecklist) => {
      queryClient.setQueryData(
        CLOSURE_CHECKLIST_QUERY_KEYS.checklistByCase(updatedChecklist.caseRegisterId),
        updatedChecklist
      );
    },
  });
}

export function useRejectChecklistReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      caseId,
      request,
    }: {
      caseId: string;
      request: checklistApi.ReviewDecisionRequest;
    }) => checklistApi.rejectReview(caseId, request),
    onSuccess: (updatedChecklist) => {
      queryClient.setQueryData(
        CLOSURE_CHECKLIST_QUERY_KEYS.checklistByCase(updatedChecklist.caseRegisterId),
        updatedChecklist
      );
    },
  });
}
