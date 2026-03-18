/**
 * TanStack Query hooks for Court Hearing operations
 *
 * These hooks provide cached data fetching for court hearings
 * and related lookup data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as courtHearingApi from '@/lib/api/courtHearing';
import { QUERY_OPTIONS } from '@/lib/query/config';

// Query key constants
export const COURT_HEARING_QUERY_KEYS = {
  hearings: ['court-hearings'] as const,
  hearingById: (id: string) => ['court-hearings', 'detail', id] as const,
  hearingsByCase: (caseId: string) => ['court-hearings', 'by-case', caseId] as const,
  courts: ['courts'] as const,
  hearingTypes: ['hearing-types'] as const,
  hearingStatuses: ['hearing-statuses'] as const,
  hearingOutcomes: ['hearing-outcomes'] as const,
};

// ============================================================================
// Court Hearing Queries
// ============================================================================

/**
 * Get hearings by case ID
 */
export function useHearingsByCaseId(caseId?: string) {
  return useQuery({
    queryKey: COURT_HEARING_QUERY_KEYS.hearingsByCase(caseId ?? ''),
    queryFn: () => courtHearingApi.getHearingsByCaseId(caseId!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!caseId,
  });
}

/**
 * Get hearing by ID
 */
export function useHearingById(id?: string) {
  return useQuery({
    queryKey: COURT_HEARING_QUERY_KEYS.hearingById(id ?? ''),
    queryFn: () => courtHearingApi.getHearingById(id!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!id,
  });
}

// ============================================================================
// Lookup Data Queries (Static)
// ============================================================================

/**
 * Fetch courts, optionally filtered by county
 */
export function useCourts(countyId?: string) {
  return useQuery({
    queryKey: countyId ? [...COURT_HEARING_QUERY_KEYS.courts, 'by-county', countyId] : COURT_HEARING_QUERY_KEYS.courts,
    queryFn: async () => {
      const courts = await courtHearingApi.fetchCourts();
      if (countyId) {
        return courts.filter(c => c.countyId === countyId);
      }
      return courts;
    },
    ...QUERY_OPTIONS.static,
  });
}

/**
 * Fetch hearing types
 */
export function useHearingTypes() {
  return useQuery({
    queryKey: COURT_HEARING_QUERY_KEYS.hearingTypes,
    queryFn: courtHearingApi.fetchHearingTypes,
    ...QUERY_OPTIONS.static,
  });
}

/**
 * Fetch hearing statuses
 */
export function useHearingStatuses() {
  return useQuery({
    queryKey: COURT_HEARING_QUERY_KEYS.hearingStatuses,
    queryFn: courtHearingApi.fetchHearingStatuses,
    ...QUERY_OPTIONS.static,
  });
}

/**
 * Fetch hearing outcomes
 */
export function useHearingOutcomes() {
  return useQuery({
    queryKey: COURT_HEARING_QUERY_KEYS.hearingOutcomes,
    queryFn: courtHearingApi.fetchHearingOutcomes,
    ...QUERY_OPTIONS.static,
  });
}

// ============================================================================
// Court Hearing Mutations
// ============================================================================

/**
 * Schedule a new hearing
 */
export function useScheduleHearing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      caseId,
      request,
    }: {
      caseId: string;
      request: courtHearingApi.CreateCourtHearingRequest;
    }) => courtHearingApi.scheduleHearing(caseId, request),
    onSuccess: (newHearing) => {
      queryClient.invalidateQueries({ queryKey: COURT_HEARING_QUERY_KEYS.hearings });
      queryClient.invalidateQueries({
        queryKey: COURT_HEARING_QUERY_KEYS.hearingsByCase(newHearing.caseRegisterId),
      });
      queryClient.setQueryData(
        COURT_HEARING_QUERY_KEYS.hearingById(newHearing.id),
        newHearing
      );
    },
  });
}

/**
 * Update a hearing
 */
export function useUpdateHearing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: string;
      request: courtHearingApi.UpdateCourtHearingRequest;
    }) => courtHearingApi.updateHearing(id, request),
    onSuccess: (updatedHearing, { id }) => {
      queryClient.invalidateQueries({ queryKey: COURT_HEARING_QUERY_KEYS.hearings });
      queryClient.invalidateQueries({
        queryKey: COURT_HEARING_QUERY_KEYS.hearingsByCase(updatedHearing.caseRegisterId),
      });
      queryClient.setQueryData(COURT_HEARING_QUERY_KEYS.hearingById(id), updatedHearing);
    },
  });
}

/**
 * Adjourn a hearing
 */
export function useAdjournHearing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: string;
      request: courtHearingApi.AdjournHearingRequest;
    }) => courtHearingApi.adjournHearing(id, request),
    onSuccess: (adjournedHearing, { id }) => {
      queryClient.invalidateQueries({ queryKey: COURT_HEARING_QUERY_KEYS.hearings });
      queryClient.invalidateQueries({
        queryKey: COURT_HEARING_QUERY_KEYS.hearingsByCase(adjournedHearing.caseRegisterId),
      });
      queryClient.setQueryData(COURT_HEARING_QUERY_KEYS.hearingById(id), adjournedHearing);
    },
  });
}

/**
 * Complete a hearing
 */
export function useCompleteHearing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: string;
      request: courtHearingApi.CompleteHearingRequest;
    }) => courtHearingApi.completeHearing(id, request),
    onSuccess: (completedHearing, { id }) => {
      queryClient.invalidateQueries({ queryKey: COURT_HEARING_QUERY_KEYS.hearings });
      queryClient.invalidateQueries({
        queryKey: COURT_HEARING_QUERY_KEYS.hearingsByCase(completedHearing.caseRegisterId),
      });
      queryClient.setQueryData(COURT_HEARING_QUERY_KEYS.hearingById(id), completedHearing);
    },
  });
}

/**
 * Delete a hearing
 */
export function useDeleteHearing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: courtHearingApi.deleteHearing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURT_HEARING_QUERY_KEYS.hearings });
    },
  });
}

/**
 * Download court minutes PDF
 */
export function useDownloadCourtMinutes() {
  return useMutation({
    mutationFn: async (hearingId: string) => {
      const blob = await courtHearingApi.downloadCourtMinutesPdf(hearingId);
      return { blob, hearingId };
    },
    onSuccess: ({ blob, hearingId }) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `court-minutes-${hearingId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}
