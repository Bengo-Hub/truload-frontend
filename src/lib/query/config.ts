/**
 * Centralized TanStack Query Configuration
 *
 * Defines cache TTLs and query options for different data categories.
 * Data is categorized by how frequently it changes:
 *
 * 1. STATIC: Rarely changes (axle configs, cargo types, vehicle classes)
 *    - Long cache time (30 minutes), minimal refetch
 *
 * 2. SEMI_STATIC: Changes occasionally (organizations, stations, users, roles)
 *    - Medium cache time (5 minutes)
 *
 * 3. DYNAMIC: Changes frequently (weighing transactions, scale tests)
 *    - Short cache time (1 minute), frequent refetch
 *
 * 4. REAL_TIME: Must always be fresh (current user, auth state)
 *    - Very short cache, always revalidate
 */

// Cache durations in milliseconds
export const CACHE_TIMES = {
  /** Static data that rarely changes - 30 minutes */
  STATIC: 30 * 60 * 1000,
  /** Semi-static data that changes occasionally - 5 minutes */
  SEMI_STATIC: 5 * 60 * 1000,
  /** Dynamic data that changes frequently - 1 minute */
  DYNAMIC: 60 * 1000,
  /** Real-time data that should always be fresh - 30 seconds */
  REAL_TIME: 30 * 1000,
  /** Infinite cache - data persists until manual invalidation */
  INFINITE: Infinity,
} as const;

// Garbage collection times (when to remove unused queries from cache)
export const GC_TIMES = {
  /** Keep static data in memory for 1 hour */
  STATIC: 60 * 60 * 1000,
  /** Keep semi-static data for 15 minutes */
  SEMI_STATIC: 15 * 60 * 1000,
  /** Keep dynamic data for 5 minutes */
  DYNAMIC: 5 * 60 * 1000,
  /** Keep real-time data for 2 minutes */
  REAL_TIME: 2 * 60 * 1000,
} as const;

/**
 * Query key prefixes for organized cache management
 */
export const QUERY_KEYS = {
  // Auth & User
  AUTH: ['auth'] as const,
  CURRENT_USER: ['auth', 'current-user'] as const,

  // Lookup/Reference Data (Static)
  AXLE_CONFIGURATIONS: ['axle-configurations'] as const,
  CARGO_TYPES: ['cargo-types'] as const,
  VEHICLE_CLASSES: ['vehicle-classes'] as const,
  ORIGINS_DESTINATIONS: ['origins-destinations'] as const,

  // Organization Data (Semi-static)
  ORGANIZATIONS: ['organizations'] as const,
  STATIONS: ['stations'] as const,
  DEPARTMENTS: ['departments'] as const,
  ROLES: ['roles'] as const,
  USERS: ['users'] as const,
  TRANSPORTERS: ['transporters'] as const,
  DRIVERS: ['drivers'] as const,

  // Weighing Data (Dynamic)
  VEHICLES: ['vehicles'] as const,
  WEIGHING_TRANSACTIONS: ['weighing-transactions'] as const,
  SCALE_TESTS: ['scale-tests'] as const,
  WORK_SHIFTS: ['work-shifts'] as const,

  // Settings
  SETTINGS: ['settings'] as const,
} as const;

/**
 * Default query options for different data categories
 */
export const QUERY_OPTIONS = {
  /** Static lookup data - axle configs, cargo types, etc. */
  static: {
    staleTime: CACHE_TIMES.STATIC,
    gcTime: GC_TIMES.STATIC,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 2,
  },

  /** Semi-static organization data - orgs, stations, users */
  semiStatic: {
    staleTime: CACHE_TIMES.SEMI_STATIC,
    gcTime: GC_TIMES.SEMI_STATIC,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always' as const,
    refetchOnReconnect: true,
    retry: 2,
  },

  /** Dynamic operational data - transactions, tests */
  dynamic: {
    staleTime: CACHE_TIMES.DYNAMIC,
    gcTime: GC_TIMES.DYNAMIC,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: 3,
  },

  /** Real-time data - auth state */
  realTime: {
    staleTime: CACHE_TIMES.REAL_TIME,
    gcTime: GC_TIMES.REAL_TIME,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always' as const,
    refetchOnReconnect: true,
    retry: 1,
  },
} as const;

/**
 * Create query key with parameters
 */
export function createQueryKey<T extends readonly unknown[]>(
  base: T,
  ...params: (string | number | boolean | undefined | null)[]
): readonly [...T, ...(string | number | boolean)[]] {
  const filteredParams = params.filter(
    (p): p is string | number | boolean => p !== undefined && p !== null
  );
  return [...base, ...filteredParams] as const;
}

/**
 * Commonly used composite query keys
 */
export const queryKeys = {
  // Vehicles
  vehicle: (id: string) => createQueryKey(QUERY_KEYS.VEHICLES, id),
  vehicleByRegNo: (regNo: string) => createQueryKey(QUERY_KEYS.VEHICLES, 'regNo', regNo),

  // Weighing
  transaction: (id: string) => createQueryKey(QUERY_KEYS.WEIGHING_TRANSACTIONS, id),
  transactionsByStation: (stationId: string) =>
    createQueryKey(QUERY_KEYS.WEIGHING_TRANSACTIONS, 'station', stationId),

  // Scale Tests
  scaleTestStatus: (stationId: string, bound?: string) =>
    createQueryKey(QUERY_KEYS.SCALE_TESTS, 'status', stationId, bound ?? 'all'),
  scaleTestsByStation: (stationId: string, bound?: string) =>
    createQueryKey(QUERY_KEYS.SCALE_TESTS, 'station', stationId, bound ?? 'all'),

  // Users
  user: (id: string) => createQueryKey(QUERY_KEYS.USERS, id),
  usersBySearch: (search?: string) => createQueryKey(QUERY_KEYS.USERS, 'search', search ?? ''),

  // Stations
  station: (id: string) => createQueryKey(QUERY_KEYS.STATIONS, id),
  stationsByOrg: (orgId: string) => createQueryKey(QUERY_KEYS.STATIONS, 'org', orgId),

  // Origins/Destinations
  originsDestinationsByStation: (stationId?: string) =>
    createQueryKey(QUERY_KEYS.ORIGINS_DESTINATIONS, 'station', stationId ?? 'all'),
} as const;
