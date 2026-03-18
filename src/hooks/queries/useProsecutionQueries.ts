/**
 * TanStack Query hooks for Prosecution operations
 *
 * These hooks provide cached data fetching for prosecution cases,
 * charge calculations, and related data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as prosecutionApi from '@/lib/api/prosecution';
import { QUERY_OPTIONS } from '@/lib/query/config';

// Query key constants
export const PROSECUTION_QUERY_KEYS = {
  prosecutions: ['prosecutions'] as const,
  prosecutionById: (id: string) => ['prosecutions', 'detail', id] as const,
  prosecutionByCase: (caseId: string) => ['prosecutions', 'by-case', caseId] as const,
  prosecutionStatistics: ['prosecutions', 'statistics'] as const,
  chargeCalculation: (weighingId: string, framework: string) =>
    ['charge-calculation', weighingId, framework] as const,
};

// ============================================================================
// Prosecution Queries
// ============================================================================

/**
 * Get prosecution case by ID
 */
export function useProsecutionById(id?: string) {
  return useQuery({
    queryKey: PROSECUTION_QUERY_KEYS.prosecutionById(id ?? ''),
    queryFn: () => prosecutionApi.getProsecutionById(id!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!id,
  });
}

/**
 * Get prosecution case by case register ID
 */
export function useProsecutionByCaseId(caseId?: string) {
  return useQuery({
    queryKey: PROSECUTION_QUERY_KEYS.prosecutionByCase(caseId ?? ''),
    queryFn: () => prosecutionApi.getProsecutionByCaseId(caseId!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!caseId,
    retry: false,
  });
}

/**
 * Search prosecution cases
 */
export function useProsecutionSearch(criteria: prosecutionApi.ProsecutionSearchCriteria) {
  return useQuery({
    queryKey: [...PROSECUTION_QUERY_KEYS.prosecutions, 'search', criteria],
    queryFn: () => prosecutionApi.searchProsecutions(criteria),
    ...QUERY_OPTIONS.dynamic,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Get prosecution statistics
 */
export function useProsecutionStatistics() {
  return useQuery({
    queryKey: PROSECUTION_QUERY_KEYS.prosecutionStatistics,
    queryFn: prosecutionApi.getProsecutionStatistics,
    ...QUERY_OPTIONS.semiStatic,
  });
}

/**
 * Calculate charges for a weighing transaction
 */
export function useChargeCalculation(weighingId?: string, legalFramework: string = 'TRAFFIC_ACT') {
  return useQuery({
    queryKey: PROSECUTION_QUERY_KEYS.chargeCalculation(weighingId ?? '', legalFramework),
    queryFn: () => prosecutionApi.calculateCharges(weighingId!, legalFramework),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!weighingId,
    retry: false,
  });
}

// ============================================================================
// Prosecution Mutations
// ============================================================================

/**
 * Create prosecution case
 */
export function useCreateProsecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      caseId,
      request,
    }: {
      caseId: string;
      request: prosecutionApi.CreateProsecutionRequest;
    }) => prosecutionApi.createProsecution(caseId, request),
    onSuccess: (newProsecution) => {
      queryClient.invalidateQueries({ queryKey: PROSECUTION_QUERY_KEYS.prosecutions });
      queryClient.invalidateQueries({ queryKey: PROSECUTION_QUERY_KEYS.prosecutionStatistics });
      queryClient.invalidateQueries({
        queryKey: PROSECUTION_QUERY_KEYS.prosecutionByCase(newProsecution.caseRegisterId),
      });
      queryClient.setQueryData(
        PROSECUTION_QUERY_KEYS.prosecutionById(newProsecution.id),
        newProsecution
      );
    },
  });
}

/**
 * Update prosecution case
 */
export function useUpdateProsecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: string;
      request: prosecutionApi.UpdateProsecutionRequest;
    }) => prosecutionApi.updateProsecution(id, request),
    onSuccess: (updatedProsecution, { id }) => {
      queryClient.invalidateQueries({ queryKey: PROSECUTION_QUERY_KEYS.prosecutions });
      queryClient.setQueryData(PROSECUTION_QUERY_KEYS.prosecutionById(id), updatedProsecution);
    },
  });
}

/**
 * Delete prosecution case
 */
export function useDeleteProsecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: prosecutionApi.deleteProsecution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROSECUTION_QUERY_KEYS.prosecutions });
      queryClient.invalidateQueries({ queryKey: PROSECUTION_QUERY_KEYS.prosecutionStatistics });
    },
  });
}

/**
 * Download charge sheet PDF
 */
export function useDownloadChargeSheet() {
  return useMutation({
    mutationFn: async (prosecutionId: string) => {
      const blob = await prosecutionApi.downloadChargeSheetPdf(prosecutionId);
      return { blob, prosecutionId };
    },
    onSuccess: ({ blob, prosecutionId }) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `charge-sheet-${prosecutionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}

/**
 * Get prosecution default settings
 */
export function useProsecutionDefaults() {
  return useQuery({
    queryKey: ['prosecution-defaults'],
    queryFn: prosecutionApi.getProsecutionDefaults,
    ...QUERY_OPTIONS.semiStatic,
  });
}

/**
 * Update prosecution default settings
 */
export function useUpdateProsecutionDefaults() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: prosecutionApi.updateProsecutionDefaults,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prosecution-defaults'] });
    },
  });
}
