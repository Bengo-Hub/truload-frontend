/**
 * TanStack Query hooks for backup management.
 * Uses centralized QUERY_OPTIONS for consistent caching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_OPTIONS } from '@/lib/query/config';
import * as backupApi from '@/lib/api/backup';

// Query keys
export const BACKUP_QUERY_KEYS = {
  STATUS: ['backup', 'status'] as const,
  LIST: ['backup', 'list'] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get backup system status
 */
export function useBackupStatus() {
  return useQuery({
    queryKey: BACKUP_QUERY_KEYS.STATUS,
    queryFn: backupApi.getBackupStatus,
    ...QUERY_OPTIONS.dynamic,
  });
}

/**
 * List all backups
 */
export function useBackupList() {
  return useQuery({
    queryKey: BACKUP_QUERY_KEYS.LIST,
    queryFn: backupApi.listBackups,
    ...QUERY_OPTIONS.dynamic,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new backup
 */
export function useCreateBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: backupApi.createBackup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BACKUP_QUERY_KEYS.LIST });
      queryClient.invalidateQueries({ queryKey: BACKUP_QUERY_KEYS.STATUS });
    },
  });
}

/**
 * Delete a backup
 */
export function useDeleteBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: backupApi.deleteBackup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BACKUP_QUERY_KEYS.LIST });
      queryClient.invalidateQueries({ queryKey: BACKUP_QUERY_KEYS.STATUS });
    },
  });
}

/**
 * Validate a backup
 */
export function useValidateBackup() {
  return useMutation({
    mutationFn: backupApi.validateBackup,
  });
}

/**
 * Restore from a backup
 */
export function useRestoreBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: backupApi.restoreBackup,
    onSuccess: () => {
      // Invalidate all queries after restore
      queryClient.invalidateQueries();
    },
  });
}

/**
 * Update backup settings
 */
export function useUpdateBackupSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: backupApi.updateBackupSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BACKUP_QUERY_KEYS.STATUS });
    },
  });
}

/**
 * Download a backup file
 */
export function useDownloadBackup() {
  return useMutation({
    mutationFn: async (fileName: string) => {
      const blob = await backupApi.downloadBackup(fileName);
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}
