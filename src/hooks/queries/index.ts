/**
 * TanStack Query Hooks
 *
 * Centralized exports for all query hooks with proper caching
 */

// Weighing-related queries
export * from './useWeighingQueries';

// Case Register queries
export * from './useCaseRegisterQueries';

// Court Hearing queries
export * from './useCourtHearingQueries';

// Prosecution queries
export * from './useProsecutionQueries';

// Invoice queries
export * from './useInvoiceQueries';

// Receipt queries
export * from './useReceiptQueries';

// Setup/Configuration queries
export * from './useSetupQueries';

// Yard queries
export * from './useYardQueries';

// Audit Log queries
export * from './useAuditLogQueries';

// Dashboard queries
export * from './useDashboardQueries';

// Settings queries
export * from './useSettingsQueries';

// Two-Factor Authentication queries
export * from './useTwoFactorQueries';

// Backup queries
export * from './useBackupQueries';

// Analytics queries
export * from './useAnalyticsQueries';

// Re-export query configuration for advanced usage
export { QUERY_KEYS, QUERY_OPTIONS, CACHE_TIMES, queryKeys } from '@/lib/query/config';
