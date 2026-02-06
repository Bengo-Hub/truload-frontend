/**
 * TanStack Query hooks for setup-related data
 *
 * These hooks provide cached data fetching for axle configurations,
 * weight references, and other setup/lookup data.
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import * as setupApi from '@/lib/api/setup';
import type { SearchAxleWeightReferencesParams } from '@/lib/api/setup';
import { QUERY_OPTIONS, QUERY_KEYS } from '@/lib/query/config';
import type {
  UpdateAxleWeightReferenceRequest,
  UpdateAxleConfigurationRequest,
} from '@/types/setup';

// Query key constants
export const SETUP_QUERY_KEYS = {
  axleConfigurations: ['axle-configurations'] as const,
  axleConfigurationById: (id: string) => ['axle-configurations', 'detail', id] as const,
  axleWeightReferences: ['axle-weight-references'] as const,
  axleWeightReferencesByConfig: (configId: string) => ['axle-weight-references', 'by-config', configId] as const,
  axleConfigLookup: (configId: string) => ['axle-configurations', 'lookup', configId] as const,
  axleGroups: ['axle-groups'] as const,
  tyreTypes: ['tyre-types'] as const,
};

// ============================================================================
// Axle Weight Reference Queries
// ============================================================================

/**
 * Fetch weight references for a configuration
 */
export function useAxleWeightReferences(configurationId?: string) {
  return useQuery({
    queryKey: SETUP_QUERY_KEYS.axleWeightReferencesByConfig(configurationId ?? ''),
    queryFn: () => setupApi.fetchAxleWeightReferencesByConfiguration(configurationId!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!configurationId,
  });
}

/**
 * Search weight references with pagination and filtering
 */
export function useSearchAxleWeightReferences(params: SearchAxleWeightReferencesParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AXLE_WEIGHT_REFERENCES, 'search', params],
    queryFn: () => setupApi.searchAxleWeightReferences(params),
    ...QUERY_OPTIONS.dynamic,
    placeholderData: keepPreviousData,
  });
}

/**
 * Fetch lookup data for an axle configuration (groups, tyre types, etc.)
 */
export function useAxleConfigLookupData(configurationId?: string) {
  return useQuery({
    queryKey: SETUP_QUERY_KEYS.axleConfigLookup(configurationId ?? ''),
    queryFn: () => setupApi.fetchAxleConfigurationLookupData(configurationId!),
    ...QUERY_OPTIONS.semiStatic,
    enabled: !!configurationId,
  });
}

// ============================================================================
// Axle Weight Reference Mutations
// ============================================================================

/**
 * Create weight reference mutation
 */
export function useCreateAxleWeightReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setupApi.createAxleWeightReference,
    onSuccess: (newRef) => {
      // Invalidate the list for this configuration
      queryClient.invalidateQueries({
        queryKey: SETUP_QUERY_KEYS.axleWeightReferencesByConfig(newRef.axleConfigurationId),
      });
      // Also invalidate general weight references
      queryClient.invalidateQueries({
        queryKey: SETUP_QUERY_KEYS.axleWeightReferences,
      });
    },
  });
}

/**
 * Update weight reference mutation
 */
export function useUpdateAxleWeightReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAxleWeightReferenceRequest }) =>
      setupApi.updateAxleWeightReference(id, payload),
    onSuccess: (updatedRef) => {
      // Invalidate the list for this configuration
      queryClient.invalidateQueries({
        queryKey: SETUP_QUERY_KEYS.axleWeightReferencesByConfig(updatedRef.axleConfigurationId),
      });
      // Also invalidate general weight references
      queryClient.invalidateQueries({
        queryKey: SETUP_QUERY_KEYS.axleWeightReferences,
      });
    },
  });
}

/**
 * Delete weight reference mutation
 */
export function useDeleteAxleWeightReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setupApi.deleteAxleWeightReference,
    onSuccess: () => {
      // Invalidate all weight reference queries since we don't know which config it belonged to
      queryClient.invalidateQueries({
        queryKey: SETUP_QUERY_KEYS.axleWeightReferences,
      });
    },
  });
}

// ============================================================================
// Axle Configuration Queries
// ============================================================================

/**
 * Fetch all axle configurations
 */
export function useAxleConfigurationsSetup() {
  return useQuery({
    queryKey: SETUP_QUERY_KEYS.axleConfigurations,
    queryFn: () => setupApi.fetchAxleConfigurations(),
    ...QUERY_OPTIONS.static,
  });
}

// ============================================================================
// Axle Configuration Mutations
// ============================================================================

/**
 * Create axle configuration mutation
 */
export function useCreateAxleConfiguration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setupApi.createAxleConfiguration,
    onSuccess: (newConfig) => {
      queryClient.invalidateQueries({
        queryKey: SETUP_QUERY_KEYS.axleConfigurations,
      });
      queryClient.setQueryData(
        SETUP_QUERY_KEYS.axleConfigurationById(newConfig.id),
        newConfig
      );
    },
  });
}

/**
 * Update axle configuration mutation
 */
export function useUpdateAxleConfiguration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAxleConfigurationRequest }) =>
      setupApi.updateAxleConfiguration(id, payload),
    onSuccess: (updatedConfig, { id }) => {
      queryClient.invalidateQueries({
        queryKey: SETUP_QUERY_KEYS.axleConfigurations,
      });
      queryClient.setQueryData(
        SETUP_QUERY_KEYS.axleConfigurationById(id),
        updatedConfig
      );
    },
  });
}

/**
 * Delete axle configuration mutation
 */
export function useDeleteAxleConfiguration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setupApi.deleteAxleConfiguration,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: SETUP_QUERY_KEYS.axleConfigurations,
      });
    },
  });
}
