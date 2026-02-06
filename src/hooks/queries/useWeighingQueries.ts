/**
 * TanStack Query hooks for weighing-related data
 *
 * These hooks provide cached data fetching with appropriate TTLs
 * for lookup data, vehicles, transactions, and scale tests.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as weighingApi from '@/lib/api/weighing';
import { QUERY_KEYS, QUERY_OPTIONS, queryKeys } from '@/lib/query/config';

// ============================================================================
// STATIC LOOKUP DATA HOOKS
// These rarely change and are cached for 30 minutes
// ============================================================================

/**
 * Fetch all axle configurations (static data)
 */
export function useAxleConfigurations() {
  return useQuery({
    queryKey: QUERY_KEYS.AXLE_CONFIGURATIONS,
    queryFn: weighingApi.fetchAxleConfigurations,
    ...QUERY_OPTIONS.static,
  });
}

/**
 * Fetch all cargo types (static data)
 */
export function useCargoTypes() {
  return useQuery({
    queryKey: QUERY_KEYS.CARGO_TYPES,
    queryFn: weighingApi.fetchCargoTypes,
    ...QUERY_OPTIONS.static,
  });
}

/**
 * Fetch all vehicle makes (static data)
 */
export function useVehicleMakes() {
  return useQuery({
    queryKey: QUERY_KEYS.VEHICLE_MAKES,
    queryFn: weighingApi.fetchVehicleMakes,
    ...QUERY_OPTIONS.static,
  });
}

// ============================================================================
// SEMI-STATIC DATA HOOKS
// These change occasionally and are cached for 5 minutes
// ============================================================================

/**
 * Fetch origins/destinations
 */
export function useOriginsDestinations() {
  return useQuery({
    queryKey: QUERY_KEYS.ORIGINS_DESTINATIONS,
    queryFn: weighingApi.fetchOriginsDestinations,
    ...QUERY_OPTIONS.semiStatic,
  });
}

/**
 * Fetch transporters with optional search
 */
export function useTransporters(search?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.TRANSPORTERS, search ?? ''],
    queryFn: () => weighingApi.searchTransporters(search ?? ''),
    ...QUERY_OPTIONS.semiStatic,
    enabled: true, // Always fetch, even without search
  });
}

/**
 * Fetch drivers with optional search
 */
export function useDrivers(search?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.DRIVERS, search ?? ''],
    queryFn: () => weighingApi.searchDrivers(search ?? ''),
    ...QUERY_OPTIONS.semiStatic,
    enabled: true,
  });
}

/**
 * Fetch stations
 */
export function useStations() {
  return useQuery({
    queryKey: QUERY_KEYS.STATIONS,
    queryFn: weighingApi.fetchStations,
    ...QUERY_OPTIONS.semiStatic,
  });
}

/**
 * Fetch current user's station
 */
export function useMyStation() {
  return useQuery({
    queryKey: [...QUERY_KEYS.STATIONS, 'my-station'],
    queryFn: weighingApi.fetchMyStation,
    ...QUERY_OPTIONS.semiStatic,
  });
}

// ============================================================================
// DYNAMIC DATA HOOKS
// These change frequently and are cached for 1 minute
// ============================================================================

/**
 * Fetch vehicle by ID
 */
export function useVehicle(id?: string) {
  return useQuery({
    queryKey: queryKeys.vehicle(id ?? ''),
    queryFn: () => weighingApi.getVehicleById(id!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!id,
  });
}

/**
 * Fetch vehicle by registration number
 */
export function useVehicleByRegNo(regNo?: string) {
  return useQuery({
    queryKey: queryKeys.vehicleByRegNo(regNo ?? ''),
    queryFn: () => weighingApi.getVehicleByRegNo(regNo!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!regNo && regNo.length >= 3,
    retry: false, // Don't retry for vehicle lookups (might not exist)
  });
}

/**
 * Fetch scale test status for current user's station
 */
export function useMyScaleTestStatus(bound?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.SCALE_TESTS, 'my-station', 'status', bound ?? 'all'],
    queryFn: () => weighingApi.getMyStationScaleTestStatus(bound),
    ...QUERY_OPTIONS.dynamic,
  });
}

/**
 * Fetch scale test status for a station
 */
export function useScaleTestStatus(stationId?: string, bound?: string) {
  return useQuery({
    queryKey: queryKeys.scaleTestStatus(stationId ?? '', bound),
    queryFn: () => weighingApi.getScaleTestStatus(stationId!, bound),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!stationId,
  });
}

/**
 * Fetch latest scale test for current user's station
 */
export function useMyLatestScaleTest(bound?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.SCALE_TESTS, 'my-station', 'latest', bound ?? 'all'],
    queryFn: () => weighingApi.getMyLatestScaleTest(bound),
    ...QUERY_OPTIONS.dynamic,
  });
}

/**
 * Fetch latest scale test for a station
 */
export function useLatestScaleTest(stationId?: string, bound?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.SCALE_TESTS, 'station', stationId ?? '', 'latest', bound ?? 'all'],
    queryFn: () => weighingApi.getLatestScaleTest(stationId!, bound),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!stationId,
  });
}

/**
 * Fetch scale tests for a station by date range
 */
export function useScaleTests(stationId?: string, fromDate?: string, toDate?: string, bound?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.SCALE_TESTS, 'station', stationId ?? '', 'range', fromDate, toDate, bound ?? 'all'],
    queryFn: () => weighingApi.getScaleTestsByDateRange(stationId!, fromDate!, toDate!, bound),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!stationId && !!fromDate && !!toDate,
  });
}

/**
 * Fetch recent weighing transactions for dashboard display
 * Cached for 5 minutes (semiStatic) to reduce API calls
 */
export function useRecentWeighings(stationId?: string, limit: number = 10) {
  return useQuery({
    queryKey: [...QUERY_KEYS.WEIGHING_TRANSACTIONS, 'recent', stationId ?? 'all', limit],
    queryFn: () => weighingApi.searchWeighingTransactions({
      stationId,
      pageSize: limit,
      sortBy: 'weighedAt',
      sortOrder: 'desc',
    }),
    ...QUERY_OPTIONS.semiStatic,
    enabled: true, // Always fetch
  });
}

/**
 * Fetch pending weighing transactions for the current station
 * Used for "Resume" functionality in the capture step.
 * When weighingType is provided, only shows pending transactions of that type.
 */
export function usePendingWeighings(stationId?: string, weighingType?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.WEIGHING_TRANSACTIONS, 'pending', stationId ?? 'all', weighingType ?? 'all'],
    queryFn: () => weighingApi.searchWeighingTransactions({
      stationId,
      controlStatus: 'Pending',
      weighingType,
      pageSize: 20,
      sortBy: 'weighedAt',
      sortOrder: 'desc',
    }),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!stationId,
  });
}

/**
 * Fetch a single weighing transaction by ID
 */
export function useWeighingTransaction(id?: string) {
  return useQuery({
    queryKey: queryKeys.transaction(id ?? ''),
    queryFn: () => weighingApi.getWeighingTransaction(id!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!id,
  });
}

/**
 * Fetch weighing transactions with pagination and filtering
 * Used for the tickets list view
 */
export function useWeighingTransactions(params: weighingApi.SearchWeighingParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.WEIGHING_TRANSACTIONS, 'search', params],
    queryFn: () => weighingApi.searchWeighingTransactions(params),
    ...QUERY_OPTIONS.dynamic,
    placeholderData: (previousData) => previousData, // Keep showing old data while fetching new page
  });
}

/**
 * Fetch today's weighing statistics for dashboard
 * Cached for 5 minutes
 */
export function useTodayWeighingStats(stationId?: string) {
  const today = new Date();
  const fromDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).toISOString();
  const toDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

  return useQuery({
    queryKey: [...QUERY_KEYS.WEIGHING_TRANSACTIONS, 'stats', 'today', stationId ?? 'all'],
    queryFn: async () => {
      const result = await weighingApi.searchWeighingTransactions({
        stationId,
        fromDate,
        toDate,
        pageSize: 1000, // Get all for stats calculation
      });

      // Calculate statistics
      const transactions = result.items;
      const compliant = transactions.filter(t => t.controlStatus === 'LEGAL' || t.controlStatus === 'Compliant');
      const overloaded = transactions.filter(t => t.controlStatus === 'OVERLOAD' || t.controlStatus === 'Overloaded');
      const warnings = transactions.filter(t => t.controlStatus === 'WARNING' || t.controlStatus === 'Warning');

      return {
        total: transactions.length,
        compliant: compliant.length,
        overloaded: overloaded.length,
        warnings: warnings.length,
        complianceRate: transactions.length > 0
          ? Math.round((compliant.length / transactions.length) * 100)
          : 100,
      };
    },
    ...QUERY_OPTIONS.semiStatic,
    enabled: true,
  });
}

/**
 * Fetch weighing statistics from the dedicated backend statistics endpoint.
 * More efficient than fetching all transactions and computing client-side.
 */
export function useWeighingStatistics(params: {
  dateFrom?: string;
  dateTo?: string;
  stationId?: string;
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.WEIGHING_TRANSACTIONS, 'statistics', params],
    queryFn: () => weighingApi.getWeighingStatistics(params),
    ...QUERY_OPTIONS.semiStatic,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create vehicle mutation
 */
export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: weighingApi.createVehicle,
    onSuccess: (newVehicle) => {
      // Invalidate vehicle queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLES });
      // Pre-populate cache for the new vehicle
      if (newVehicle.id) {
        queryClient.setQueryData(queryKeys.vehicle(newVehicle.id), newVehicle);
      }
      if (newVehicle.regNo) {
        queryClient.setQueryData(queryKeys.vehicleByRegNo(newVehicle.regNo), newVehicle);
      }
    },
  });
}

/**
 * Create transporter mutation
 */
export function useCreateTransporter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: weighingApi.createTransporter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSPORTERS });
    },
  });
}

/**
 * Create driver mutation
 */
export function useCreateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: weighingApi.createDriver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DRIVERS });
    },
  });
}

/**
 * Create cargo type mutation
 */
export function useCreateCargoType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: weighingApi.createCargoType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CARGO_TYPES });
    },
  });
}

/**
 * Create vehicle make mutation
 */
export function useCreateVehicleMake() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: weighingApi.createVehicleMake,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLE_MAKES });
    },
  });
}

/**
 * Create origin/destination mutation
 */
export function useCreateOriginDestination() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: weighingApi.createOriginDestination,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORIGINS_DESTINATIONS });
    },
  });
}

/**
 * Create weighing transaction mutation
 */
export function useCreateWeighingTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: weighingApi.createWeighingTransaction,
    onSuccess: (newTransaction) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WEIGHING_TRANSACTIONS });
      if (newTransaction.id) {
        queryClient.setQueryData(queryKeys.transaction(newTransaction.id), newTransaction);
      }
    },
  });
}

/**
 * Update weighing transaction mutation
 */
export function useUpdateWeighingTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: weighingApi.UpdateWeighingRequest;
    }) => weighingApi.updateWeighingTransaction(id, payload),
    onSuccess: (updatedTransaction, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WEIGHING_TRANSACTIONS });
      queryClient.setQueryData(queryKeys.transaction(id), updatedTransaction);
    },
  });
}

/**
 * Create scale test mutation
 */
export function useCreateScaleTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: weighingApi.createScaleTest,
    onSuccess: () => {
      // Invalidate all scale test related queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SCALE_TESTS });
    },
  });
}

// ============================================================================
// PREFETCH HELPERS
// ============================================================================

/**
 * Prefetch all static lookup data
 * Call this on app initialization or when entering weighing flow
 */
export function usePrefetchLookupData() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.AXLE_CONFIGURATIONS,
      queryFn: weighingApi.fetchAxleConfigurations,
      ...QUERY_OPTIONS.static,
    });

    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.CARGO_TYPES,
      queryFn: weighingApi.fetchCargoTypes,
      ...QUERY_OPTIONS.static,
    });

    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.ORIGINS_DESTINATIONS,
      queryFn: weighingApi.fetchOriginsDestinations,
      ...QUERY_OPTIONS.semiStatic,
    });

    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.STATIONS,
      queryFn: weighingApi.fetchStations,
      ...QUERY_OPTIONS.semiStatic,
    });
  };
}
