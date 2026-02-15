import { apiClient } from '@/lib/api/client';
import type {
  AssignPermissionsRequest,
  AssignRolesRequest,
  AxleConfigurationLookupData,
  AxleConfigurationResponse,
  AxleWeightReferenceResponse,
  CreateAxleConfigurationRequest,
  CreateAxleWeightReferenceRequest,
  CreateDepartmentRequest,
  CreateOrganizationRequest,
  CreateRoleRequest,
  CreateShiftRotationRequest,
  CreateStationRequest,
  CreateUserRequest,
  CreateUserShiftRequest,
  CreateWorkShiftRequest,
  DepartmentDto,
  OrganizationDto,
  PagedResponse,
  PermissionDto,
  RoleDto,
  RolePermissionsDto,
  ShiftRotationDto,
  StationDto,
  UpdateAxleConfigurationRequest,
  UpdateAxleWeightReferenceRequest,
  UpdateDepartmentRequest,
  UpdateOrganizationRequest,
  UpdateRoleRequest,
  UpdateShiftRotationRequest,
  UpdateStationRequest,
  UpdateUserRequest,
  UpdateUserShiftRequest,
  UpdateWorkShiftRequest,
  UserShiftDto,
  UserSummary,
  WorkShiftDto,
} from '@/types/setup';

// User Management
export async function fetchUsers(params: {
  search?: string;
  organizationId?: string;
  stationId?: string;
  pageNumber?: number;
  pageSize?: number;
}): Promise<PagedResponse<UserSummary>> {
  const { data } = await apiClient.get<PagedResponse<UserSummary>>('/user-management/users', {
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

export async function sendPasswordResetEmail(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email });
}

export async function adminResetPassword(userId: string, newPassword: string, confirmNewPassword: string): Promise<void> {
  await apiClient.post(`/user-management/users/${userId}/reset-password`, {
    newPassword,
    confirmNewPassword,
  });
}

export async function createUser(payload: CreateUserRequest): Promise<UserSummary> {
  const { data } = await apiClient.post<UserSummary>('/user-management/users', payload);
  return data;
}

export async function assignRoles(id: string, payload: AssignRolesRequest): Promise<void> {
  await apiClient.post(`/user-management/users/${id}/roles`, payload);
}

// Role Management
export async function fetchRoles(includeInactive = false): Promise<RoleDto[]> {
  const { data } = await apiClient.get<RoleDto[]>('/user-management/roles', {
    params: { includeInactive },
  });
  return data;
}

export async function createRole(payload: CreateRoleRequest): Promise<RoleDto> {
  const { data } = await apiClient.post<RoleDto>('/user-management/roles', payload);
  return data;
}

export async function updateRole(id: string, payload: UpdateRoleRequest): Promise<RoleDto> {
  const { data } = await apiClient.put<RoleDto>(`/user-management/roles/${id}`, payload);
  return data;
}

export async function deleteRole(id: string): Promise<void> {
  await apiClient.delete(`/user-management/roles/${id}`);
}

export async function fetchRolePermissions(roleId: string): Promise<RolePermissionsDto> {
  const { data } = await apiClient.get<RolePermissionsDto>(`/user-management/roles/${roleId}/permissions`);
  return data;
}

export async function assignPermissionsToRole(roleId: string, payload: AssignPermissionsRequest): Promise<void> {
  await apiClient.post(`/user-management/roles/${roleId}/permissions`, payload);
}

export async function removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
  await apiClient.delete(`/user-management/roles/${roleId}/permissions/${permissionId}`);
}

// Permissions
export async function fetchPermissions(): Promise<PermissionDto[]> {
  const { data } = await apiClient.get<PermissionDto[]>('/permissions');
  return data;
}

export async function fetchPermissionsByCategory(category: string): Promise<PermissionDto[]> {
  const { data } = await apiClient.get<PermissionDto[]>(`/permissions/category/${category}`);
  return data;
}

// Organizations, Stations, Departments
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

// Organizations CRUD
export async function createOrganization(payload: CreateOrganizationRequest): Promise<OrganizationDto> {
  const { data } = await apiClient.post<OrganizationDto>('/Organizations', payload);
  return data;
}

export async function updateOrganization(id: string, payload: UpdateOrganizationRequest): Promise<OrganizationDto> {
  const { data } = await apiClient.put<OrganizationDto>(`/Organizations/${id}`, payload);
  return data;
}

export async function deleteOrganization(id: string): Promise<void> {
  await apiClient.delete(`/Organizations/${id}`);
}

// Stations CRUD
export async function createStation(payload: CreateStationRequest): Promise<StationDto> {
  const { data } = await apiClient.post<StationDto>('/Stations', payload);
  return data;
}

export async function updateStation(id: string, payload: UpdateStationRequest): Promise<StationDto> {
  const { data } = await apiClient.put<StationDto>(`/Stations/${id}`, payload);
  return data;
}

export async function deleteStation(id: string): Promise<void> {
  await apiClient.delete(`/Stations/${id}`);
}

// Departments CRUD
export async function createDepartment(payload: CreateDepartmentRequest): Promise<DepartmentDto> {
  const { data } = await apiClient.post<DepartmentDto>('/Departments', payload);
  return data;
}

export async function updateDepartment(id: string, payload: UpdateDepartmentRequest): Promise<DepartmentDto> {
  const { data } = await apiClient.put<DepartmentDto>(`/Departments/${id}`, payload);
  return data;
}

export async function deleteDepartment(id: string): Promise<void> {
  await apiClient.delete(`/Departments/${id}`);
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

// User Shift Assignments
export async function fetchUserShifts(userId: string, activeOnly = true): Promise<UserShiftDto[]> {
  const { data } = await apiClient.get<UserShiftDto[]>(`/user-shifts/user/${userId}`, {
    params: { activeOnly },
  });
  return data;
}

export async function fetchActiveUserShift(userId: string): Promise<UserShiftDto | null> {
  try {
    const { data } = await apiClient.get<UserShiftDto>(`/user-shifts/user/${userId}/active`);
    return data;
  } catch {
    return null;
  }
}

export async function assignUserShift(payload: CreateUserShiftRequest): Promise<UserShiftDto> {
  const { data } = await apiClient.post<UserShiftDto>('/user-shifts', payload);
  return data;
}

export async function updateUserShift(id: string, payload: UpdateUserShiftRequest): Promise<UserShiftDto> {
  const { data } = await apiClient.put<UserShiftDto>(`/user-shifts/${id}`, payload);
  return data;
}

export async function deleteUserShift(id: string): Promise<void> {
  await apiClient.delete(`/user-shifts/${id}`);
}

// Shift Rotations
export async function fetchShiftRotations(includeInactive = false): Promise<ShiftRotationDto[]> {
  const { data } = await apiClient.get<ShiftRotationDto[]>('/shift-rotations', {
    params: { includeInactive },
  });
  return data;
}

export async function createShiftRotation(payload: CreateShiftRotationRequest): Promise<ShiftRotationDto> {
  const { data } = await apiClient.post<ShiftRotationDto>('/shift-rotations', payload);
  return data;
}

export async function updateShiftRotation(id: string, payload: UpdateShiftRotationRequest): Promise<ShiftRotationDto> {
  const { data } = await apiClient.put<ShiftRotationDto>(`/shift-rotations/${id}`, payload);
  return data;
}

export async function deleteShiftRotation(id: string): Promise<void> {
  await apiClient.delete(`/shift-rotations/${id}`);
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
export interface SearchAxleWeightReferencesParams {
  configurationId?: string;
  axleGrouping?: string;
  includeInactive?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export async function searchAxleWeightReferences(
  params: SearchAxleWeightReferencesParams
): Promise<PagedResponse<AxleWeightReferenceResponse>> {
  const { data } = await apiClient.get<PagedResponse<AxleWeightReferenceResponse>>(
    '/AxleWeightReferences',
    { params }
  );
  return data;
}

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
export interface WeightRefLookupData {
  tyreTypes: { id: string; code: string; name: string; description?: string; typicalMaxWeightKg?: number }[];
  axleGroups: { id: string; code: string; name: string; description?: string; typicalWeightKg: number }[];
  axleGroupings: string[];
}

export async function fetchWeightRefLookupData(): Promise<WeightRefLookupData> {
  const { data } = await apiClient.get<WeightRefLookupData>(
    '/AxleConfiguration/lookup/weight-ref-data'
  );
  return data;
}

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
