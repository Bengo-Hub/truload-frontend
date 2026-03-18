import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface BackupInfoDto {
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  createdAt: string;
  backupType: string;
  description: string | null;
}

export interface BackupListResponse {
  backups: BackupInfoDto[];
  totalCount: number;
  totalSizeBytes: number;
}

export interface CreateBackupRequest {
  description?: string;
  backupType: 'Full' | 'Differential' | 'ConfigOnly';
}

export interface CreateBackupResponse {
  success: boolean;
  fileName: string | null;
  filePath: string | null;
  fileSizeBytes: number;
  message: string;
}

export interface RestoreBackupRequest {
  fileName: string;
  confirmationCode?: string;
}

export interface RestoreBackupResponse {
  success: boolean;
  message: string;
  restoredFrom: string | null;
  restoredAt: string | null;
}

export interface BackupSystemStatusDto {
  isEnabled: boolean;
  scheduleCron: string;
  storagePath: string;
  backupPgDumpPath: string;
  retentionDays: number;
  lastBackupAt: string | null;
  nextScheduledBackup: string | null;
  totalBackupsCount: number;
  totalStorageUsedBytes: number;
}

export interface UpdateBackupSettingsRequest {
  isEnabled: boolean;
  scheduleCron: string;
  storagePath: string;
  backupPgDumpPath?: string;
  retentionDays: number;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get backup system status
 */
export async function getBackupStatus() {
  const response = await apiClient.get<BackupSystemStatusDto>('/system/backups/status');
  return response.data;
}

/**
 * List all backups
 */
export async function listBackups() {
  const response = await apiClient.get<BackupListResponse>('/system/backups');
  return response.data;
}

/**
 * Create a new backup
 */
export async function createBackup(data: CreateBackupRequest) {
  const response = await apiClient.post<CreateBackupResponse>('/system/backups', data);
  return response.data;
}

/**
 * Download a backup file
 */
export async function downloadBackup(fileName: string) {
  const response = await apiClient.get(`/system/backups/${encodeURIComponent(fileName)}/download`, {
    responseType: 'blob',
  });
  return response.data;
}

/**
 * Delete a backup file
 */
export async function deleteBackup(fileName: string) {
  const response = await apiClient.delete(`/system/backups/${encodeURIComponent(fileName)}`);
  return response.data;
}

/**
 * Validate a backup file
 */
export async function validateBackup(fileName: string) {
  const response = await apiClient.post(`/system/backups/${encodeURIComponent(fileName)}/validate`);
  return response.data;
}

/**
 * Restore from a backup file
 */
export async function restoreBackup(data: RestoreBackupRequest) {
  const response = await apiClient.post<RestoreBackupResponse>('/system/backups/restore', data);
  return response.data;
}

/**
 * Update backup settings
 */
export async function updateBackupSettings(data: UpdateBackupSettingsRequest) {
  const response = await apiClient.put('/system/backups/settings', data);
  return response.data;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================================
// Exported API Object
// ============================================================================

export const backupApi = {
  getStatus: getBackupStatus,
  list: listBackups,
  create: createBackup,
  download: downloadBackup,
  delete: deleteBackup,
  validate: validateBackup,
  restore: restoreBackup,
  updateSettings: updateBackupSettings,
};
