export interface PagedResult<T> {
  total: number;
  skip: number;
  take: number;
  data: T[];
}

// User management
export interface UserSummary {
  id: string;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  stationId?: string;
  stationName?: string;
  organizationId?: string;
  organizationName?: string;
  departmentId?: string;
  departmentName?: string;
  roles: string[];
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateUserRequest {
  fullName?: string;
  phoneNumber?: string;
  organizationId?: string;
  stationId?: string;
  departmentId?: string;
}

export interface AssignRolesRequest {
  roleNames: string[];
}

export interface RoleDto {
  id: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
}

export interface PermissionDto {
  id: string;
  code: string;
  name: string;
  category?: string;
}

export interface OrganizationDto {
  id: string;
  code: string;
  name: string;
  orgType?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

export interface StationDto {
  id: string;
  code: string;
  name: string;
  location?: string;
}

export interface DepartmentDto {
  id: string;
  name: string;
  description?: string;
}

// Work shifts
export interface WorkShiftScheduleDto {
  id?: string;
  day: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  breakHours: number;
  isWorkingDay?: boolean;
}

export interface WorkShiftDto {
  id: string;
  name: string;
  description?: string;
  totalHoursPerWeek: number;
  graceMinutes: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  schedules: WorkShiftScheduleDto[];
}

export interface CreateWorkShiftRequest {
  name: string;
  description?: string;
  totalHoursPerWeek: number;
  graceMinutes: number;
  schedules: WorkShiftScheduleDto[];
}

export interface UpdateWorkShiftRequest {
  name?: string;
  description?: string;
  totalHoursPerWeek?: number;
  graceMinutes?: number;
  isActive?: boolean;
}

// Axle configurations
export interface AxleConfigurationResponse {
  id: string;
  axleCode: string;
  axleName: string;
  description?: string;
  axleNumber: number;
  gvwPermissibleKg: number;
  isStandard: boolean;
  legalFramework: string;
  visualDiagramUrl?: string;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdByUserId?: string;
  weightReferenceCount: number;
}

export interface CreateAxleConfigurationRequest {
  axleCode: string;
  axleName: string;
  description?: string;
  axleNumber: number;
  gvwPermissibleKg: number;
  legalFramework?: string;
  visualDiagramUrl?: string;
  notes?: string;
}

export interface UpdateAxleConfigurationRequest {
  axleName: string;
  description?: string;
  gvwPermissibleKg: number;
  legalFramework?: string;
  visualDiagramUrl?: string;
  notes?: string;
  isActive: boolean;
}
