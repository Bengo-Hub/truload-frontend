/**
 * TanStack Query hooks for Case Register operations
 *
 * These hooks provide cached data fetching for case management,
 * special releases, and related lookup data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as caseApi from '@/lib/api/caseRegister';
import { QUERY_OPTIONS } from '@/lib/query/config';

// Query key constants
export const CASE_QUERY_KEYS = {
  cases: ['cases'] as const,
  caseById: (id: string) => ['cases', 'detail', id] as const,
  caseByCaseNo: (caseNo: string) => ['cases', 'by-case-no', caseNo] as const,
  caseByWeighing: (weighingId: string) => ['cases', 'by-weighing', weighingId] as const,
  caseStatistics: (stationId?: string) => ['cases', 'statistics', stationId ?? 'all'] as const,
  violationTypes: ['violation-types'] as const,
  caseStatuses: ['case-statuses'] as const,
  dispositionTypes: ['disposition-types'] as const,
  specialReleases: ['special-releases'] as const,
  specialReleaseById: (id: string) => ['special-releases', 'detail', id] as const,
  specialReleasesByCase: (caseId: string) => ['special-releases', 'by-case', caseId] as const,
  pendingReleases: ['special-releases', 'pending'] as const,
  releaseTypes: ['release-types'] as const,
};

// ============================================================================
// Case Register Queries
// ============================================================================

/**
 * Search cases with filters and pagination
 */
export function useCaseSearch(params: caseApi.CaseSearchParams) {
  return useQuery({
    queryKey: [...CASE_QUERY_KEYS.cases, 'search', params],
    queryFn: () => caseApi.searchCases(params),
    ...QUERY_OPTIONS.dynamic,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Get case by ID
 */
export function useCaseById(id?: string) {
  return useQuery({
    queryKey: CASE_QUERY_KEYS.caseById(id ?? ''),
    queryFn: () => caseApi.getCaseById(id!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!id,
  });
}

/**
 * Get case by case number
 */
export function useCaseByCaseNo(caseNo?: string) {
  return useQuery({
    queryKey: CASE_QUERY_KEYS.caseByCaseNo(caseNo ?? ''),
    queryFn: () => caseApi.getCaseByCaseNo(caseNo!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!caseNo,
  });
}

/**
 * Get case by weighing ID
 */
export function useCaseByWeighingId(weighingId?: string) {
  return useQuery({
    queryKey: CASE_QUERY_KEYS.caseByWeighing(weighingId ?? ''),
    queryFn: () => caseApi.getCaseByWeighingId(weighingId!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!weighingId,
    retry: false,
  });
}

/**
 * Get case statistics
 */
export function useCaseStatistics(stationId?: string) {
  return useQuery({
    queryKey: CASE_QUERY_KEYS.caseStatistics(stationId),
    queryFn: () => caseApi.getCaseStatistics(stationId),
    ...QUERY_OPTIONS.semiStatic,
  });
}

// ============================================================================
// Lookup Data Queries (Static)
// ============================================================================

/**
 * Fetch violation types
 */
export function useViolationTypes() {
  return useQuery({
    queryKey: CASE_QUERY_KEYS.violationTypes,
    queryFn: caseApi.fetchViolationTypes,
    ...QUERY_OPTIONS.static,
  });
}

/**
 * Fetch case statuses
 */
export function useCaseStatuses() {
  return useQuery({
    queryKey: CASE_QUERY_KEYS.caseStatuses,
    queryFn: caseApi.fetchCaseStatuses,
    ...QUERY_OPTIONS.static,
  });
}

/**
 * Fetch disposition types
 */
export function useDispositionTypes() {
  return useQuery({
    queryKey: CASE_QUERY_KEYS.dispositionTypes,
    queryFn: caseApi.fetchDispositionTypes,
    ...QUERY_OPTIONS.static,
  });
}

// ============================================================================
// Case Register Mutations
// ============================================================================

/**
 * Create case manually
 */
export function useCreateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: caseApi.createCase,
    onSuccess: (newCase) => {
      queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.cases });
      queryClient.invalidateQueries({ queryKey: ['cases', 'statistics'] });
      queryClient.setQueryData(CASE_QUERY_KEYS.caseById(newCase.id), newCase);
    },
  });
}

/**
 * Create case from weighing violation
 */
export function useCreateCaseFromWeighing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: caseApi.createCaseFromWeighing,
    onSuccess: (newCase) => {
      queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.cases });
      queryClient.invalidateQueries({ queryKey: ['cases', 'statistics'] });
      queryClient.setQueryData(CASE_QUERY_KEYS.caseById(newCase.id), newCase);
      if (newCase.weighingId) {
        queryClient.setQueryData(CASE_QUERY_KEYS.caseByWeighing(newCase.weighingId), newCase);
      }
    },
  });
}

/**
 * Create case from prohibition order
 */
export function useCreateCaseFromProhibition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: caseApi.createCaseFromProhibition,
    onSuccess: (newCase) => {
      queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.cases });
      queryClient.invalidateQueries({ queryKey: ['cases', 'statistics'] });
      queryClient.setQueryData(CASE_QUERY_KEYS.caseById(newCase.id), newCase);
    },
  });
}

/**
 * Update case details
 */
export function useUpdateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: caseApi.UpdateCaseRequest }) =>
      caseApi.updateCase(id, request),
    onSuccess: (updatedCase, { id }) => {
      queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.cases });
      queryClient.setQueryData(CASE_QUERY_KEYS.caseById(id), updatedCase);
    },
  });
}

/**
 * Close case
 */
export function useCloseCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: caseApi.CloseCaseRequest }) =>
      caseApi.closeCase(id, request),
    onSuccess: (closedCase, { id }) => {
      queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.cases });
      queryClient.invalidateQueries({ queryKey: ['cases', 'statistics'] });
      queryClient.setQueryData(CASE_QUERY_KEYS.caseById(id), closedCase);
    },
  });
}

/**
 * Escalate case to case manager
 */
export function useEscalateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, caseManagerId }: { id: string; caseManagerId: string }) =>
      caseApi.escalateCase(id, caseManagerId),
    onSuccess: (escalatedCase, { id }) => {
      queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.cases });
      queryClient.invalidateQueries({ queryKey: ['cases', 'statistics'] });
      queryClient.setQueryData(CASE_QUERY_KEYS.caseById(id), escalatedCase);
    },
  });
}

/**
 * Assign investigating officer
 */
export function useAssignInvestigatingOfficer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, investigatingOfficerId }: { id: string; investigatingOfficerId: string }) =>
      caseApi.assignInvestigatingOfficer(id, investigatingOfficerId),
    onSuccess: (updatedCase, { id }) => {
      queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.cases });
      queryClient.setQueryData(CASE_QUERY_KEYS.caseById(id), updatedCase);
    },
  });
}

/**
 * Delete case
 */
export function useDeleteCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: caseApi.deleteCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.cases });
      queryClient.invalidateQueries({ queryKey: ['cases', 'statistics'] });
    },
  });
}

// ============================================================================
// Special Release Queries
// ============================================================================

/**
 * Get special release by ID
 */
export function useSpecialRelease(id?: string) {
  return useQuery({
    queryKey: CASE_QUERY_KEYS.specialReleaseById(id ?? ''),
    queryFn: () => caseApi.getSpecialRelease(id!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!id,
  });
}

/**
 * Get special releases by case ID
 */
export function useSpecialReleasesByCase(caseId?: string) {
  return useQuery({
    queryKey: CASE_QUERY_KEYS.specialReleasesByCase(caseId ?? ''),
    queryFn: () => caseApi.getSpecialReleasesByCase(caseId!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!caseId,
  });
}

/**
 * Get pending special releases
 */
export function usePendingSpecialReleases() {
  return useQuery({
    queryKey: CASE_QUERY_KEYS.pendingReleases,
    queryFn: caseApi.getPendingSpecialReleases,
    ...QUERY_OPTIONS.dynamic,
  });
}

/**
 * Fetch release types
 */
export function useReleaseTypes() {
  return useQuery({
    queryKey: CASE_QUERY_KEYS.releaseTypes,
    queryFn: caseApi.fetchReleaseTypes,
    ...QUERY_OPTIONS.static,
  });
}

// ============================================================================
// Special Release Mutations
// ============================================================================

/**
 * Create special release request
 */
export function useCreateSpecialRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: caseApi.createSpecialRelease,
    onSuccess: (newRelease) => {
      queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.specialReleases });
      queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.pendingReleases });
      queryClient.invalidateQueries({
        queryKey: CASE_QUERY_KEYS.specialReleasesByCase(newRelease.caseRegisterId),
      });
      queryClient.setQueryData(CASE_QUERY_KEYS.specialReleaseById(newRelease.id), newRelease);
    },
  });
}

/**
 * Approve special release
 */
export function useApproveSpecialRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: caseApi.approveSpecialRelease,
    onSuccess: (approvedRelease) => {
      queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.specialReleases });
      queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.pendingReleases });
      queryClient.invalidateQueries({
        queryKey: CASE_QUERY_KEYS.specialReleasesByCase(approvedRelease.caseRegisterId),
      });
      queryClient.setQueryData(CASE_QUERY_KEYS.specialReleaseById(approvedRelease.id), approvedRelease);
      // Also update the case since status may have changed
      queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.cases });
    },
  });
}

/**
 * Reject special release
 */
export function useRejectSpecialRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      caseApi.rejectSpecialRelease(id, reason),
    onSuccess: (rejectedRelease) => {
      queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.specialReleases });
      queryClient.invalidateQueries({ queryKey: CASE_QUERY_KEYS.pendingReleases });
      queryClient.invalidateQueries({
        queryKey: CASE_QUERY_KEYS.specialReleasesByCase(rejectedRelease.caseRegisterId),
      });
      queryClient.setQueryData(CASE_QUERY_KEYS.specialReleaseById(rejectedRelease.id), rejectedRelease);
    },
  });
}
