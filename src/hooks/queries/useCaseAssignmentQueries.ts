import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as assignmentApi from '@/lib/api/caseAssignment';
import { QUERY_OPTIONS } from '@/lib/query/config';

export const CASE_ASSIGNMENT_QUERY_KEYS = {
  assignmentsByCase: (caseId: string) => ['case-assignments', 'by-case', caseId] as const,
  currentAssignment: (caseId: string) => ['case-assignments', 'current', caseId] as const,
};

// ============================================================================
// Queries
// ============================================================================

export function useAssignmentsByCaseId(caseId?: string) {
  return useQuery({
    queryKey: CASE_ASSIGNMENT_QUERY_KEYS.assignmentsByCase(caseId ?? ''),
    queryFn: () => assignmentApi.getAssignmentsByCaseId(caseId!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!caseId,
  });
}

export function useCurrentAssignment(caseId?: string) {
  return useQuery({
    queryKey: CASE_ASSIGNMENT_QUERY_KEYS.currentAssignment(caseId ?? ''),
    queryFn: () => assignmentApi.getCurrentAssignment(caseId!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!caseId,
  });
}

// ============================================================================
// Mutations
// ============================================================================

export function useLogAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      caseId,
      request,
    }: {
      caseId: string;
      request: assignmentApi.LogAssignmentRequest;
    }) => assignmentApi.logAssignment(caseId, request),
    onSuccess: (newAssignment) => {
      queryClient.invalidateQueries({
        queryKey: CASE_ASSIGNMENT_QUERY_KEYS.assignmentsByCase(newAssignment.caseRegisterId),
      });
      queryClient.invalidateQueries({
        queryKey: CASE_ASSIGNMENT_QUERY_KEYS.currentAssignment(newAssignment.caseRegisterId),
      });
    },
  });
}
