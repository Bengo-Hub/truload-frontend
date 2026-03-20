export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
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

export interface CreateUserRequest {
  email: string;
  fullName?: string;
  phoneNumber?: string;
  password?: string;
  organizationId?: string;
  stationId?: string;
  departmentId?: string;
  roleNames?: string[];
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
  tenantType?: string;
  enabledModules?: string[];
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  logoUrl?: string | null;
  platformLogoUrl?: string | null;
  loginPageImageUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateOrganizationModulesRequest {
  tenantType?: string;
  enabledModules?: string[];
}

export interface CreateOrganizationRequest {
  code: string;
  name: string;
  orgType?: string;
  tenantType?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

export interface UpdateOrganizationRequest {
  code?: string;
  name?: string;
  orgType?: string;
  tenantType?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  logoUrl?: string | null;
  platformLogoUrl?: string | null;
  loginPageImageUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  isActive?: boolean;
}

export interface UpdateOrganizationBrandingRequest {
  logoUrl?: string | null;
  platformLogoUrl?: string | null;
  loginPageImageUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

export interface StationDto {
  id: string;
  code: string;
  name: string;
  stationType: string;
  organizationId: string;
  organizationName?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  supportsBidirectional: boolean;
  boundACode?: string;
  boundBCode?: string;
  countyId?: string;
  subcountyId?: string;
  roadId?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStationRequest {
  code: string;
  name: string;
  organizationId: string;
  stationType?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  supportsBidirectional?: boolean;
  boundACode?: string;
  boundBCode?: string;
}

export interface UpdateStationRequest {
  code?: string;
  name?: string;
  stationType?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  supportsBidirectional?: boolean;
  boundACode?: string;
  boundBCode?: string;
  isActive?: boolean;
}

export interface DepartmentDto {
  id: string;
  organizationId: string;
  organizationName?: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDepartmentRequest {
  organizationId: string;
  code: string;
  name: string;
  description?: string;
}

export interface UpdateDepartmentRequest {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
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

// Role management
export interface CreateRoleRequest {
  name: string;
  code?: string;
  description?: string;
}

export interface UpdateRoleRequest {
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface RolePermissionsDto {
  roleId: string;
  roleName: string;
  permissions: PermissionDto[];
}

export interface AssignPermissionsRequest {
  permissionIds: string[];
}

// User shift assignments
export interface UserShiftDto {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  workShiftId?: string;
  workShiftName?: string;
  shiftRotationId?: string;
  shiftRotationTitle?: string;
  startsOn: string;
  endsOn?: string;
  createdAt?: string;
}

export interface CreateUserShiftRequest {
  userId: string;
  workShiftId?: string;
  shiftRotationId?: string;
  startsOn: string;
  endsOn?: string;
}

export interface UpdateUserShiftRequest {
  workShiftId?: string;
  shiftRotationId?: string;
  startsOn?: string;
  endsOn?: string;
}

// Shift rotations
export interface RotationShiftDto {
  id: string;
  workShiftId: string;
  workShiftName?: string;
  sequenceOrder: number;
}

export interface ShiftRotationDto {
  id: string;
  title: string;
  runDuration: number;
  runUnit: string;
  breakDuration: number;
  breakUnit: string;
  currentActiveShiftId?: string;
  currentActiveShiftName?: string;
  nextChangeDate?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  rotationShifts: RotationShiftDto[];
}

export interface CreateShiftRotationRequest {
  title: string;
  runDuration: number;
  runUnit: string;
  breakDuration: number;
  breakUnit: string;
  rotationShifts: { workShiftId: string; sequenceOrder: number }[];
}

export interface UpdateShiftRotationRequest {
  title?: string;
  currentActiveShiftId?: string;
  runDuration?: number;
  runUnit?: string;
  breakDuration?: number;
  breakUnit?: string;
  nextChangeDate?: string;
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
  /** Weight references included when fetched with includeWeightReferences=true */
  weightReferences?: AxleWeightReferenceResponse[];
}

export interface WeightReferenceInline {
  axlePosition: number;
  axleLegalWeightKg: number;
  axleGrouping: 'A' | 'B' | 'C' | 'D';
  axleGroupId: string;
  tyreTypeId?: string;
}

export interface CreateAxleConfigurationRequest {
  axleCode: string;
  axleName: string;
  description?: string;
  axleNumber: number;
  legalFramework?: string;
  visualDiagramUrl?: string;
  notes?: string;
  weightReferences?: WeightReferenceInline[];
}

export interface UpdateAxleWeightReferenceInline {
  id?: string;
  axlePosition: number;
  axleLegalWeightKg: number;
  axleGrouping: 'A' | 'B' | 'C' | 'D';
  axleGroupId: string;
  tyreTypeId?: string;
}

export interface UpdateAxleConfigurationRequest {
  axleName: string;
  description?: string;
  legalFramework?: string;
  visualDiagramUrl?: string;
  notes?: string;
  isActive: boolean;
  weightReferences?: UpdateAxleWeightReferenceInline[];
}

// Axle weight references
export interface AxleWeightReferenceResponse {
  id: string;
  axleConfigurationId: string;
  axlePosition: number;
  axleLegalWeightKg: number;
  axleGrouping: string;
  axleGroupId: string;
  axleGroupCode?: string;
  axleGroupName?: string;
  tyreTypeId?: string;
  tyreTypeCode?: string;
  tyreTypeName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateAxleWeightReferenceRequest {
  axleConfigurationId: string;
  axlePosition: number;
  axleLegalWeightKg: number;
  axleGrouping: 'A' | 'B' | 'C' | 'D';
  axleGroupId: string;
  tyreTypeId?: string;
}

export interface UpdateAxleWeightReferenceRequest {
  axlePosition: number;
  axleLegalWeightKg: number;
  axleGrouping: 'A' | 'B' | 'C' | 'D';
  axleGroupId: string;
  tyreTypeId?: string;
  isActive: boolean;
}

// Lookup data types
export interface TyreTypeLookup {
  id: string;
  code: string;
  name: string;
  description?: string;
  typicalMaxWeightKg: number;
}

export interface AxleGroupLookup {
  id: string;
  code: string;
  name: string;
  description?: string;
  typicalWeightKg: number;
  minSpacingFeet?: number;
  maxSpacingFeet?: number;
  axleCountInGroup: number;
}

export interface AxleConfigurationLookupData {
  configuration: {
    id: string;
    axleCode: string;
    axleName: string;
    axleNumber: number;
    gvwPermissibleKg: number;
    legalFramework: string;
  };
  tyreTypes: TyreTypeLookup[];
  axleGroups: AxleGroupLookup[];
  axleGroupings: string[];
  axlePositions: number[];
}
