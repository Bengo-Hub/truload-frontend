/**
 * TanStack Query hooks for weighing-related data
 *
 * These hooks provide cached data fetching with appropriate TTLs
 * for lookup data, vehicles, transactions, and scale tests.
 */

import * as permitsApi from '@/lib/api/permits';
import * as weighingApi from '@/lib/api/weighing';
import { QUERY_KEYS, QUERY_OPTIONS, queryKeys } from '@/lib/query/config';
import { ExtendPermitRequest, UpdatePermitRequest } from '@/types/weighing';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
    queryFn: () => weighingApi.fetchAxleConfigurations(),
    ...QUERY_OPTIONS.static,
  });
}

/**
 * Fetch only axle configurations that have weight references.
 * Used on weighing screens to prevent selecting configs without compliance data.
 */
export function useWeighingAxleConfigurations() {
  return useQuery({
    queryKey: [...QUERY_KEYS.AXLE_CONFIGURATIONS, 'with-refs'],
    queryFn: () => weighingApi.fetchAxleConfigurations({ hasWeightReferences: true }),
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
 * Fetch roads with server-side pagination (default page size 50)
 */
export function useRoadsPaged(params: { pageNumber: number; pageSize: number; search?: string; includeInactive?: boolean }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ROADS, 'paged', params.pageNumber, params.pageSize, params.search ?? '', params.includeInactive ?? false],
    queryFn: () => weighingApi.fetchRoadsPaged({
      pageNumber: params.pageNumber,
      pageSize: params.pageSize,
      search: params.search,
      includeInactive: params.includeInactive,
    }),
    ...QUERY_OPTIONS.semiStatic,
  });
}

/**
 * Fetch roads that pass through a subcounty. Cached for prosecution/setup screens.
 * Backend uses subcounty (district was replaced).
 */
export function useRoadsBySubcounty(subcountyId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ROADS, 'subcounty', subcountyId ?? ''],
    queryFn: () => weighingApi.fetchRoadsBySubcounty(subcountyId!),
    ...QUERY_OPTIONS.semiStatic,
    enabled: !!subcountyId,
  });
}

/** @deprecated Use useRoadsBySubcounty; backend replaced district with subcounty. */
export function useRoadsByDistrict(districtId: string | undefined) {
  return useRoadsBySubcounty(districtId);
}

/**
 * Fetch roads that pass through a county. Cached for prosecution/setup screens.
 */
export function useRoadsByCounty(countyId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ROADS, 'county', countyId ?? ''],
    queryFn: () => weighingApi.fetchRoadsByCounty(countyId!),
    ...QUERY_OPTIONS.semiStatic,
    enabled: !!countyId,
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
    staleTime: 2 * 60 * 1000, // Cache for at least 2 minutes before refetch
    enabled: !!stationId,
  });
}

/**
 * Fetch a single weighing transaction by ID.
 * Cached 2 minutes to avoid refetch storms on the weighing screen.
 */
export function useWeighingTransaction(id?: string) {
  return useQuery({
    queryKey: queryKeys.transaction(id ?? ''),
    queryFn: () => weighingApi.getWeighingTransaction(id!),
    ...QUERY_OPTIONS.dynamic,
    staleTime: 2 * 60 * 1000,
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
// PERMIT HOOKS
// ============================================================================

/**
 * Fetch all permit types (static data)
 */
export function usePermitTypes() {
  return useQuery({
    queryKey: QUERY_KEYS.PERMIT_TYPES,
    queryFn: permitsApi.fetchPermitTypes,
    ...QUERY_OPTIONS.static,
  });
}

/**
 * Fetch permits for a vehicle
 */
export function usePermitsByVehicle(vehicleId?: string) {
  return useQuery({
    queryKey: queryKeys.permitsByVehicle(vehicleId ?? ''),
    queryFn: () => permitsApi.fetchPermitsByVehicle(vehicleId!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!vehicleId,
  });
}

/**
 * Fetch active permit for a vehicle
 */
export function useActivePermit(vehicleId?: string) {
  return useQuery({
    queryKey: [...queryKeys.permitsByVehicle(vehicleId ?? ''), 'active'],
    queryFn: () => permitsApi.fetchActivePermitForVehicle(vehicleId!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!vehicleId,
  });
}

/**
 * Fetch permit by number (for live lookup)
 */
export function usePermitByNo(permitNo?: string) {
  return useQuery({
    queryKey: queryKeys.permitByNo(permitNo ?? ''),
    queryFn: () => permitsApi.getPermitByNo(permitNo!),
    ...QUERY_OPTIONS.dynamic,
    enabled: !!permitNo && permitNo.length >= 3,
    retry: false,
  });
}

/**
 * Create permit mutation
 */
export function useCreatePermit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: permitsApi.createPermit,
    onSuccess: (newPermit) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PERMITS });
      if (newPermit.vehicleId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.permitsByVehicle(newPermit.vehicleId) });
      }
    },
  });
}

/**
 * Update permit mutation
 */
export function useUpdatePermit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdatePermitRequest }) =>
      permitsApi.updatePermit(id, request),
    onSuccess: (updatedPermit) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PERMITS });
      queryClient.invalidateQueries({ queryKey: queryKeys.permit(updatedPermit.id) });
      if (updatedPermit.vehicleId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.permitsByVehicle(updatedPermit.vehicleId) });
      }
    },
  });
}

/**
 * Revoke permit mutation
 */
export function useRevokePermit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: permitsApi.revokePermit,
    onSuccess: (revokedPermit) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PERMITS });
      queryClient.invalidateQueries({ queryKey: queryKeys.permit(revokedPermit.id) });
      if (revokedPermit.vehicleId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.permitsByVehicle(revokedPermit.vehicleId) });
      }
    },
  });
}

/**
 * Extend permit mutation
 */
export function useExtendPermit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: ExtendPermitRequest }) =>
      permitsApi.extendPermit(id, request),
    onSuccess: (updatedPermit) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PERMITS });
      queryClient.invalidateQueries({ queryKey: queryKeys.permit(updatedPermit.id) });
      if (updatedPermit.vehicleId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.permitsByVehicle(updatedPermit.vehicleId) });
      }
    },
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
 * Create road mutation
 */
export function useCreateRoad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: weighingApi.createRoad,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ROADS });
    },
  });
}

/**
 * Update road mutation
 */
export function useUpdateRoad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: weighingApi.CreateRoadRequest }) =>
      weighingApi.updateRoad(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ROADS });
    },
  });
}

/**
 * Delete road mutation
 */
export function useDeleteRoad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: weighingApi.deleteRoad,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ROADS });
    },
  });
}

/**
 * Update transporter mutation
 */
export function useUpdateTransporter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<weighingApi.Transporter> }) =>
      weighingApi.updateTransporter(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSPORTERS });
    },
  });
}

/**
 * Delete transporter mutation
 */
export function useDeleteTransporter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: weighingApi.deleteTransporter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSPORTERS });
    },
  });
}

/**
 * Update driver mutation
 */
export function useUpdateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<weighingApi.Driver> }) =>
      weighingApi.updateDriver(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DRIVERS });
    },
  });
}

/**
 * Delete driver mutation
 */
export function useDeleteDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: weighingApi.deleteDriver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DRIVERS });
    },
  });
}

/**
 * Update vehicle mutation
 */
export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<weighingApi.Vehicle> }) =>
      weighingApi.updateVehicle(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLES });
    },
  });
}

/**
 * Delete vehicle mutation
 */
export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: weighingApi.deleteVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLES });
    },
  });
}

/**
 * Update cargo type mutation
 */
export function useUpdateCargoType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: weighingApi.CreateCargoTypeRequest }) =>
      weighingApi.updateCargoType(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CARGO_TYPES });
    },
  });
}

/**
 * Delete cargo type mutation
 */
export function useDeleteCargoType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: weighingApi.deleteCargoType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CARGO_TYPES });
    },
  });
}

/**
 * Update origin/destination mutation
 */
export function useUpdateOriginDestination() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: weighingApi.CreateOriginDestinationRequest }) =>
      weighingApi.updateOriginDestination(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORIGINS_DESTINATIONS });
    },
  });
}

/**
 * Delete origin/destination mutation
 */
export function useDeleteOriginDestination() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: weighingApi.deleteOriginDestination,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORIGINS_DESTINATIONS });
    },
  });
}

/**
 * Update vehicle make mutation
 */
export function useUpdateVehicleMake() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: weighingApi.CreateVehicleMakeRequest }) =>
      weighingApi.updateVehicleMake(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLE_MAKES });
    },
  });
}

/**
 * Delete vehicle make mutation
 */
export function useDeleteVehicleMake() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: weighingApi.deleteVehicleMake,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLE_MAKES });
    },
  });
}

/**
 * Fetch weight ticket PDF as blob (for preview dialog)
 */
export function useDownloadWeightTicket() {
  return useMutation({
    mutationFn: async (weighingId: string) => {
      const blob = await weighingApi.downloadWeightTicketPdf(weighingId);
      return { blob, weighingId };
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
 * Update weighing transaction mutation.
 * retry: 0 to avoid amplifying 429 rate-limit errors.
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
    retry: 0,
    onSuccess: (updatedTransaction, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WEIGHING_TRANSACTIONS });
      queryClient.setQueryData(queryKeys.transaction(id), updatedTransaction);
    },
  });
}

/**
 * Delete/Discard weighing transaction mutation
 */
export function useDeleteWeighingTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: weighingApi.deleteWeighingTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WEIGHING_TRANSACTIONS });
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
      queryFn: () => weighingApi.fetchAxleConfigurations(),
      ...QUERY_OPTIONS.static,
    });

    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.CARGO_TYPES,
      queryFn: () => weighingApi.fetchCargoTypes(),
      ...QUERY_OPTIONS.static,
    });

    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.ORIGINS_DESTINATIONS,
      queryFn: () => weighingApi.fetchOriginsDestinations(),
      ...QUERY_OPTIONS.semiStatic,
    });

    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.STATIONS,
      queryFn: () => weighingApi.fetchStations(),
      ...QUERY_OPTIONS.semiStatic,
    });
  };
}

// ============================================================================
// TARE REGISTER HOOKS (Commercial weighing)
// ============================================================================

export function useVehiclesPaged(params: weighingApi.VehicleListParams = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.VEHICLES, 'paged', params],
    queryFn: () => weighingApi.getVehiclesPaged(params),
    staleTime: 30_000,
  });
}

export function useVehicleTareHistory(vehicleId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEYS.VEHICLES, vehicleId, 'tare-history'],
    queryFn: () => weighingApi.getVehicleTareHistory(vehicleId!),
    enabled: !!vehicleId,
    staleTime: 30_000,
  });
}

export function useRecordTareWeight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: weighingApi.recordTareWeight,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.VEHICLES, variables.vehicleId, 'tare-history'] });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.VEHICLES, 'paged'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLES });
    },
  });
}
