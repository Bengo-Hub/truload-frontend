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

// Act configuration queries (acts & compliance)
export * from './useActQueries';

// Two-Factor Authentication queries
export * from './useTwoFactorQueries';

// Backup queries
export * from './useBackupQueries';

// Analytics queries
export * from './useAnalyticsQueries';

// Integration queries
export * from './useIntegrationQueries';

// Case Party queries
export * from './useCasePartyQueries';

// Case Subfile queries
export * from './useCaseSubfileQueries';

// Arrest Warrant queries
export * from './useArrestWarrantQueries';

// Closure Checklist queries
export * from './useClosureChecklistQueries';

// Case Assignment queries
export * from './useCaseAssignmentQueries';

// Technical/Health queries
export * from './useTechnicalQueries';

// User/Officer queries
export * from './useUserQueries';

// Report queries
export * from './useReportQueries';

// Re-export query configuration for advanced usage
export { QUERY_KEYS, QUERY_OPTIONS, CACHE_TIMES, queryKeys } from '@/lib/query/config';
