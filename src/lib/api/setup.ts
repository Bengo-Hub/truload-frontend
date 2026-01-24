import { apiClient } from '@/lib/api/client';
import type {
    AssignRolesRequest,
    AxleConfigurationLookupData,
    AxleConfigurationResponse,
    AxleWeightReferenceResponse,
    CreateAxleConfigurationRequest,
    CreateAxleWeightReferenceRequest,
    CreateWorkShiftRequest,
    DepartmentDto,
    OrganizationDto,
    PagedResult,
    RoleDto,
    StationDto,
    UpdateAxleConfigurationRequest,
    UpdateAxleWeightReferenceRequest,
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
  const { data } = await apiClient.get<PagedResult<UserSummary>>('/user-management/users', {
    params,
  });
  return data;
}

export async function getUserById(id: string): Promise<UserSummary> {
  const { data } = await apiClient.get<UserSummary>(`/user-management/users/${id}`);
  return data;
}

export async function updateUser(id: string, payload: UpdateUserRequest): Promise<UserSummary> {
  const { data } = await apiClient.put<UserSummary>(`/user-management/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/user-management/users/${id}`);
}

export async function assignRoles(id: string, payload: AssignRolesRequest): Promise<void> {
  await apiClient.post(`/user-management/users/${id}/roles`, payload);
}

export async function fetchRoles(includeInactive = false): Promise<RoleDto[]> {
  const { data } = await apiClient.get<RoleDto[]>('/user-management/roles', {
    params: { includeInactive },
  });
  return data;
}

export async function fetchOrganizations(includeInactive = false): Promise<OrganizationDto[]> {
  const { data } = await apiClient.get<OrganizationDto[]>('/Organizations', {
    params: { includeInactive },
  });
  return data;
}

export async function fetchStations(includeInactive = false): Promise<StationDto[]> {
  const { data } = await apiClient.get<StationDto[]>('/Stations', {
    params: { includeInactive },
  });
  return data;
}

export async function fetchDepartments(includeInactive = false): Promise<DepartmentDto[]> {
  const { data } = await apiClient.get<DepartmentDto[]>('/Departments', {
    params: { includeInactive },
  });
  return data;
}

// Work Shifts
export async function fetchWorkShifts(includeInactive = false): Promise<WorkShiftDto[]> {
  const { data } = await apiClient.get<WorkShiftDto[]>('/WorkShifts', {
    params: { includeInactive },
  });
  return data;
}

export async function createWorkShift(payload: CreateWorkShiftRequest): Promise<WorkShiftDto> {
  const body = normalizeWorkShiftTimes(payload);
  const { data } = await apiClient.post<WorkShiftDto>('/WorkShifts', body);
  return data;
}

export async function updateWorkShift(id: string, payload: UpdateWorkShiftRequest): Promise<WorkShiftDto> {
  const { data } = await apiClient.put<WorkShiftDto>(`/WorkShifts/${id}`, payload);
  return data;
}

export async function deleteWorkShift(id: string): Promise<void> {
  await apiClient.delete(`/WorkShifts/${id}`);
}

// Axle Configurations
export async function fetchAxleConfigurations(params?: {
  isStandard?: boolean;
  legalFramework?: string;
  axleCount?: number;
  includeInactive?: boolean;
}): Promise<AxleConfigurationResponse[]> {
  const { data } = await apiClient.get<AxleConfigurationResponse[]>('/AxleConfiguration', {
    params,
  });
  return data;
}

export async function createAxleConfiguration(
  payload: CreateAxleConfigurationRequest
): Promise<AxleConfigurationResponse> {
  const { data } = await apiClient.post<AxleConfigurationResponse>('/AxleConfiguration', payload);
  return data;
}

export async function updateAxleConfiguration(
  id: string,
  payload: UpdateAxleConfigurationRequest
): Promise<AxleConfigurationResponse> {
  const { data } = await apiClient.put<AxleConfigurationResponse>(`/AxleConfiguration/${id}`, payload);
  return data;
}

export async function deleteAxleConfiguration(id: string): Promise<void> {
  await apiClient.delete(`/AxleConfiguration/${id}`);
}

// Axle Weight References
export async function fetchAxleWeightReferencesByConfiguration(
  configurationId: string
): Promise<AxleWeightReferenceResponse[]> {
  const { data } = await apiClient.get<AxleWeightReferenceResponse[]>(
    `/AxleWeightReferences/by-configuration/${configurationId}`
  );
  return data;
}

export async function getAxleWeightReference(id: string): Promise<AxleWeightReferenceResponse> {
  const { data } = await apiClient.get<AxleWeightReferenceResponse>(
    `/AxleWeightReferences/${id}`
  );
  return data;
}

export async function createAxleWeightReference(
  payload: CreateAxleWeightReferenceRequest
): Promise<AxleWeightReferenceResponse> {
  const { data } = await apiClient.post<AxleWeightReferenceResponse>(
    '/AxleWeightReferences',
    payload
  );
  return data;
}

export async function updateAxleWeightReference(
  id: string,
  payload: UpdateAxleWeightReferenceRequest
): Promise<AxleWeightReferenceResponse> {
  const { data } = await apiClient.put<AxleWeightReferenceResponse>(
    `/AxleWeightReferences/${id}`,
    payload
  );
  return data;
}

export async function deleteAxleWeightReference(id: string): Promise<void> {
  await apiClient.delete(`/AxleWeightReferences/${id}`);
}

// Axle Configuration Lookup Data
export async function fetchAxleConfigurationLookupData(
  configurationId: string
): Promise<AxleConfigurationLookupData> {
  const { data } = await apiClient.get<AxleConfigurationLookupData>(
    `/AxleConfiguration/${configurationId}/lookup`
  );
  return data;
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
  const { data } = await apiClient.get<ApiSettingsResponse>('/SystemSettings/api', {
    params: { service },
  });
  return data;
}

export async function saveApiSettings(service: string, entries: KeyValueEntry[]): Promise<void> {
  await apiClient.put('/SystemSettings/api', { service, entries });
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
  const { data } = await apiClient.get<PasswordPolicy>('/Security/PasswordPolicy');
  return data;
}

export async function updatePasswordPolicy(policy: PasswordPolicy): Promise<void> {
  await apiClient.put('/Security/PasswordPolicy', policy);
}

// ----------------------
// System: Backup & Restore
// ----------------------

export interface BackupInfo {
  lastBackupAt?: string;
  backupId?: string;
}

export async function triggerBackup(): Promise<BackupInfo> {
  const { data } = await apiClient.post<BackupInfo>('/System/Backup', {});
  return data;
}

export async function restoreFromBackup(backupId: string): Promise<void> {
  await apiClient.post('/System/Restore', { backupId });
}
