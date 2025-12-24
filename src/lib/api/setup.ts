import { apiClient } from '@/lib/api/client';
import type {
  AssignRolesRequest,
  AxleConfigurationResponse,
  CreateAxleConfigurationRequest,
  CreateWorkShiftRequest,
  DepartmentDto,
  OrganizationDto,
  PagedResult,
  RoleDto,
  StationDto,
  UpdateAxleConfigurationRequest,
  UpdateUserRequest,
  UpdateWorkShiftRequest,
  UserSummary,
  WorkShiftDto,
} from '@/types/setup';

// User Management
export async function fetchUsers(params: {
  search?: string;
  organizationId?: string;
  stationId?: string;
  skip?: number;
  take?: number;
}): Promise<PagedResult<UserSummary>> {
  const { data } = await apiClient.get<PagedResult<UserSummary>>('/api/v1/user-management/users', {
    params,
  });
  return data;
}

export async function getUserById(id: string): Promise<UserSummary> {
  const { data } = await apiClient.get<UserSummary>(`/api/v1/user-management/users/${id}`);
  return data;
}

export async function updateUser(id: string, payload: UpdateUserRequest): Promise<UserSummary> {
  const { data } = await apiClient.put<UserSummary>(`/api/v1/user-management/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/user-management/users/${id}`);
}

export async function assignRoles(id: string, payload: AssignRolesRequest): Promise<void> {
  await apiClient.post(`/api/v1/user-management/users/${id}/roles`, payload);
}

export async function fetchRoles(includeInactive = false): Promise<RoleDto[]> {
  const { data } = await apiClient.get<RoleDto[]>('/api/v1/user-management/roles', {
    params: { includeInactive },
  });
  return data;
}

export async function fetchOrganizations(includeInactive = false): Promise<OrganizationDto[]> {
  const { data } = await apiClient.get<OrganizationDto[]>('/api/v1/Organizations', {
    params: { includeInactive },
  });
  return data;
}

export async function fetchStations(includeInactive = false): Promise<StationDto[]> {
  const { data } = await apiClient.get<StationDto[]>('/api/v1/Stations', {
    params: { includeInactive },
  });
  return data;
}

export async function fetchDepartments(includeInactive = false): Promise<DepartmentDto[]> {
  const { data } = await apiClient.get<DepartmentDto[]>('/api/v1/Departments', {
    params: { includeInactive },
  });
  return data;
}

// Work Shifts
export async function fetchWorkShifts(includeInactive = false): Promise<WorkShiftDto[]> {
  const { data } = await apiClient.get<WorkShiftDto[]>('/api/v1/WorkShifts', {
    params: { includeInactive },
  });
  return data;
}

export async function createWorkShift(payload: CreateWorkShiftRequest): Promise<WorkShiftDto> {
  const body = normalizeWorkShiftTimes(payload);
  const { data } = await apiClient.post<WorkShiftDto>('/api/v1/WorkShifts', body);
  return data;
}

export async function updateWorkShift(id: string, payload: UpdateWorkShiftRequest): Promise<WorkShiftDto> {
  const { data } = await apiClient.put<WorkShiftDto>(`/api/v1/WorkShifts/${id}`, payload);
  return data;
}

export async function deleteWorkShift(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/WorkShifts/${id}`);
}

// Axle Configurations
export async function fetchAxleConfigurations(params?: {
  isStandard?: boolean;
  legalFramework?: string;
  axleCount?: number;
  includeInactive?: boolean;
}): Promise<AxleConfigurationResponse[]> {
  const { data } = await apiClient.get<AxleConfigurationResponse[]>('/api/v1/AxleConfiguration', {
    params,
  });
  return data;
}

export async function createAxleConfiguration(
  payload: CreateAxleConfigurationRequest
): Promise<AxleConfigurationResponse> {
  const { data } = await apiClient.post<AxleConfigurationResponse>('/api/v1/AxleConfiguration', payload);
  return data;
}

export async function updateAxleConfiguration(
  id: string,
  payload: UpdateAxleConfigurationRequest
): Promise<AxleConfigurationResponse> {
  const { data } = await apiClient.put<AxleConfigurationResponse>(`/api/v1/AxleConfiguration/${id}`, payload);
  return data;
}

export async function deleteAxleConfiguration(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/AxleConfiguration/${id}`);
}

function normalizeWorkShiftTimes<T extends { schedules?: { startTime: string; endTime: string }[] }>(payload: T): T {
  if (!payload.schedules) return payload;

  const schedules = payload.schedules.map((s) => ({
    ...s,
    startTime: toTimeSpan(s.startTime),
    endTime: toTimeSpan(s.endTime),
  }));

  return { ...payload, schedules } as T;
}

function toTimeSpan(value: string): string {
  // Accept "HH:mm" or "HH:mm:ss" and normalize to HH:mm:ss
  if (!value) return '00:00:00';
  if (value.split(':').length === 2) {
    return `${value}:00`;
  }
  return value;
}

// ----------------------
// System Settings (KV API)
// ----------------------

export interface KeyValueEntry {
  key: string;
  value: string;
}

export interface ApiSettingsResponse {
  service: string;
  entries: KeyValueEntry[];
  updatedAt?: string;
}

export async function fetchApiSettings(service: string): Promise<ApiSettingsResponse> {
  // Flexible key-value API settings approach (service-based)
  const { data } = await apiClient.get<ApiSettingsResponse>('/api/v1/SystemSettings/api', {
    params: { service },
  });
  return data;
}

export async function saveApiSettings(service: string, entries: KeyValueEntry[]): Promise<void> {
  await apiClient.put('/api/v1/SystemSettings/api', { service, entries });
}

// ----------------------
// Security: Password Policy
// ----------------------

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireSpecial: boolean;
  lockoutThreshold: number;
  lockoutMinutes: number;
}

export async function fetchPasswordPolicy(): Promise<PasswordPolicy> {
  const { data } = await apiClient.get<PasswordPolicy>('/api/v1/Security/PasswordPolicy');
  return data;
}

export async function updatePasswordPolicy(policy: PasswordPolicy): Promise<void> {
  await apiClient.put('/api/v1/Security/PasswordPolicy', policy);
}

// ----------------------
// System: Backup & Restore
// ----------------------

export interface BackupInfo {
  lastBackupAt?: string;
  backupId?: string;
}

export async function triggerBackup(): Promise<BackupInfo> {
  const { data } = await apiClient.post<BackupInfo>('/api/v1/System/Backup', {});
  return data;
}

export async function restoreFromBackup(backupId: string): Promise<void> {
  await apiClient.post('/api/v1/System/Restore', { backupId });
}
