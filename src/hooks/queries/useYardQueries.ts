/**
 * TanStack Query hooks for yard and tag-related data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as yardApi from '@/lib/api/yard';

// Query keys
export const YARD_QUERY_KEYS = {
  YARD_ENTRIES: ['yard-entries'] as const,
  VEHICLE_TAGS: ['vehicle-tags'] as const,
  TAG_CATEGORIES: ['tag-categories'] as const,
};

// Query options
const QUERY_OPTIONS = {
  dynamic: {
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  },
  semiStatic: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  },
};

// ============================================================================
// Yard Entry Hooks
// ============================================================================

/**
 * Search yard entries with pagination and filtering
 */
export function useYardEntries(params: yardApi.SearchYardEntriesParams) {
  return useQuery({
    queryKey: [...YARD_QUERY_KEYS.YARD_ENTRIES, 'search', params],
    queryFn: () => yardApi.searchYardEntries(params),
    ...QUERY_OPTIONS.dynamic,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Get a single yard entry by ID
 */
export function useYardEntry(id?: string) {
  return useQuery({
    queryKey: [...YARD_QUERY_KEYS.YARD_ENTRIES, id],
    queryFn: () => yardApi.getYardEntry(id!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!id,
  });
}

/**
 * Create yard entry mutation
 */
export function useCreateYardEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: yardApi.createYardEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: YARD_QUERY_KEYS.YARD_ENTRIES });
    },
  });
}

/**
 * Release yard entry mutation
 */
export function useReleaseYardEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: string;
      request: yardApi.ReleaseYardEntryRequest;
    }) => yardApi.releaseYardEntry(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: YARD_QUERY_KEYS.YARD_ENTRIES });
    },
  });
}

/**
 * Update yard entry status mutation
 */
export function useUpdateYardEntryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      yardApi.updateYardEntryStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: YARD_QUERY_KEYS.YARD_ENTRIES });
    },
  });
}

// ============================================================================
// Vehicle Tag Hooks
// ============================================================================

/**
 * Search vehicle tags with pagination and filtering
 */
export function useVehicleTags(params: yardApi.SearchVehicleTagsParams) {
  return useQuery({
    queryKey: [...YARD_QUERY_KEYS.VEHICLE_TAGS, 'search', params],
    queryFn: () => yardApi.searchVehicleTags(params),
    ...QUERY_OPTIONS.dynamic,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Get a single vehicle tag by ID
 */
export function useVehicleTag(id?: string) {
  return useQuery({
    queryKey: [...YARD_QUERY_KEYS.VEHICLE_TAGS, id],
    queryFn: () => yardApi.getVehicleTag(id!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!id,
  });
}

/**
 * Check if a vehicle has open tags
 */
export function useCheckVehicleTags(regNo?: string) {
  return useQuery({
    queryKey: [...YARD_QUERY_KEYS.VEHICLE_TAGS, 'check', regNo],
    queryFn: () => yardApi.checkVehicleTags(regNo!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!regNo && regNo.length >= 3,
  });
}

/**
 * Create vehicle tag mutation
 */
export function useCreateVehicleTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: yardApi.createVehicleTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: YARD_QUERY_KEYS.VEHICLE_TAGS });
    },
  });
}

/**
 * Close vehicle tag mutation
 */
export function useCloseVehicleTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: string;
      request: yardApi.CloseVehicleTagRequest;
    }) => yardApi.closeVehicleTag(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: YARD_QUERY_KEYS.VEHICLE_TAGS });
    },
  });
}

/**
 * Fetch tag categories (static data)
 */
export function useTagCategories() {
  return useQuery({
    queryKey: YARD_QUERY_KEYS.TAG_CATEGORIES,
    queryFn: yardApi.fetchTagCategories,
    ...QUERY_OPTIONS.semiStatic,
  });
}
