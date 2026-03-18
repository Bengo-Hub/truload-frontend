/**
 * Weighing Module Types
 *
 * Shared type definitions for mobile and multideck weighing screens.
 * Based on Kenya Traffic Act Cap 403 and EAC Act 2016 compliance requirements.
 */

// ============================================================================
// Scale & Hardware Types
// ============================================================================

export type ScaleStatus = 'connected' | 'disconnected' | 'unstable' | 'error' | 'calibrating';

export interface DeckWeight {
  deck: number;
  weight: number;
  status: 'stable' | 'unstable' | 'offline';
}

// ============================================================================
// Compliance Types
// ============================================================================

export type ComplianceStatus = 'LEGAL' | 'WARNING' | 'OVERLOAD';

export type AxleType = 'Steering' | 'SingleDrive' | 'Tandem' | 'Tridem' | 'Quad' | 'Tag' | 'Unknown';

export interface AxleWeight {
  axleNumber: number;
  measuredKg: number;
  permissibleKg: number;
  axleConfigurationId?: string;
}

export interface AxleGroupResult {
  groupLabel: string;
  axleType: AxleType | string;
  axleCount: number;
  permissibleKg: number;
  toleranceKg: number;
  effectiveLimitKg: number;
  measuredKg: number;
  overloadKg: number;
  pavementDamageFactor: number;
  status: ComplianceStatus;
  operationalToleranceKg?: number;
  axles: AxleWeight[];
}

export interface ComplianceResult {
  groupResults: AxleGroupResult[];
  gvwPermissibleKg: number;
  gvwMeasuredKg: number;
  gvwOverloadKg: number;
  totalFeeUsd: number;
  demeritPoints: number;
  overallStatus: ComplianceStatus;
  isCompliant: boolean;
  operationalToleranceKg?: number;
}

// ============================================================================
// Weighing Transaction Types
// ============================================================================

export type WeighingMode = 'mobile' | 'multideck' | 'wim';

// Steps: Capture → Vehicle (includes compliance) → Decision
export type WeighingStep = 'capture' | 'vehicle' | 'decision';

export interface WeighingStepConfig {
  id: WeighingStep;
  title: string;
  description: string;
  isComplete: boolean;
  isActive: boolean;
}

export interface VehicleDetails {
  registrationNumber: string;
  axleConfigurationId: string;
  axleConfigurationCode: string;
  transporterId?: string;
  transporterName?: string;
  driverId?: string;
  driverName?: string;
  driverLicense?: string;
  cargoType?: string;
  cargoDescription?: string;
  origin?: string;
  destination?: string;
  permitNumber?: string;
  hasPermit: boolean;
}

export interface WeighingTransaction {
  id: string;
  ticketNumber: string;
  mode: WeighingMode;
  stationId: string;
  stationName: string;
  vehicle: VehicleDetails;
  weighingAxles: AxleWeight[];
  deckWeights?: DeckWeight[];
  compliance?: ComplianceResult;
  reweighCycleNo: number;
  status: 'pending' | 'in_progress' | 'captured' | 'compliant' | 'overloaded';
  createdAt: string;
  capturedAt?: string;
}

// ============================================================================
// Axle Configuration Types (matches backend AxleConfigurationResponseDto)
// ============================================================================

export interface AxleConfiguration {
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
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string;
  weightReferenceCount: number;
  weightReferences?: AxleWeightReferenceDto[];
}

/** Backend weight reference DTO */
export interface AxleWeightReferenceDto {
  id: string;
  axleConfigurationId: string;
  axlePosition: number;
  axleLegalWeightKg: number;
  axleGroupId?: string;
  axleGrouping: string;
  tyreTypeId?: string;
  isActive: boolean;
  createdAt?: string;
}

/** Local/UI weight reference with tyre type for visual rendering */
export interface AxleWeightReference {
  id: string;
  axlePosition: number;
  axleGrouping: 'A' | 'B' | 'C' | 'D';
  tyreType: 'S' | 'D' | 'W';
  permissibleWeightKg: number;
  description?: string;
}

// ============================================================================
// Tolerance Types (Kenya Traffic Act Cap 403)
// ============================================================================

export interface ToleranceSettings {
  id: string;
  legalFramework: 'TRAFFIC_ACT' | 'EAC_ACT';
  singleAxleTolerancePercent: number; // 5%
  groupAxleTolerancePercent: number; // 0%
  gvwTolerancePercent: number; // 0%
  operationalToleranceKg: number; // 200kg
  isActive: boolean;
}

// ============================================================================
// Vehicle Types (Backend Model: Models/Weighing/Vehicle.cs)
// ============================================================================

export interface Vehicle {
  id: string;
  regNo: string;
  make?: string;
  model?: string;
  vehicleType?: string;
  color?: string;
  yearOfManufacture?: number;
  chassisNo?: string;
  engineNo?: string;
  description?: string;
  isFlagged: boolean;
  ownerId?: string;
  transporterId?: string;
  axleConfigurationId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Navigation
  transporter?: Transporter;
  axleConfiguration?: AxleConfiguration;
}

export interface CreateVehicleRequest {
  regNo: string;
  make?: string;
  model?: string;
  vehicleType?: string;
  color?: string;
  yearOfManufacture?: number;
  chassisNo?: string;
  engineNo?: string;
  description?: string;
  transporterId?: string;
  axleConfigurationId?: string;
}

export interface UpdateVehicleRequest extends Partial<CreateVehicleRequest> {
  isActive?: boolean;
}

// ============================================================================
// Driver Types (Backend Model: Models/Weighing/Driver.cs)
// ============================================================================

export type LicenseStatus = 'active' | 'suspended' | 'revoked' | 'expired';

export interface Driver {
  id: string;
  ntsaId: string;
  idNumber: string;
  drivingLicenseNo: string;
  fullNames: string;
  surname: string;
  gender?: string;
  nationality?: string;
  dateOfBirth?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  licenseClass?: string;
  licenseIssueDate?: string;
  licenseExpiryDate?: string;
  licenseStatus: LicenseStatus;
  isProfessionalDriver: boolean;
  currentDemeritPoints: number;
  suspensionStartDate?: string;
  suspensionEndDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDriverRequest {
  ntsaId?: string;
  idNumber?: string;
  drivingLicenseNo?: string;
  fullNames: string;
  surname: string;
  gender?: string;
  nationality?: string;
  dateOfBirth?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  licenseClass?: string;
  licenseIssueDate?: string;
  licenseExpiryDate?: string;
  isProfessionalDriver?: boolean;
}

export interface UpdateDriverRequest extends Partial<CreateDriverRequest> {
  licenseStatus?: LicenseStatus;
  isActive?: boolean;
}

// ============================================================================
// Transporter Types (Backend Model: Models/Weighing/Transporter.cs)
// ============================================================================

export interface Transporter {
  id: string;
  code: string;
  name: string;
  registrationNo?: string;
  phone?: string;
  email?: string;
  address?: string;
  ntacNo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransporterRequest {
  code: string;
  name: string;
  registrationNo?: string;
  phone?: string;
  email?: string;
  address?: string;
  ntacNo?: string;
}

export interface UpdateTransporterRequest extends Partial<CreateTransporterRequest> {
  isActive?: boolean;
}

// ============================================================================
// Cargo Types (Backend Model: Models/Infrastructure/CargoTypes.cs)
// ============================================================================

export type CargoCategory = 'General' | 'Hazardous' | 'Perishable';

export interface CargoType {
  id: string;
  code: string;
  name: string;
  category: CargoCategory;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCargoTypeRequest {
  code: string;
  name: string;
  category?: CargoCategory;
}

export interface UpdateCargoTypeRequest extends Partial<CreateCargoTypeRequest> {
  isActive?: boolean;
}

// ============================================================================
// Origin/Destination Types (Backend Model: Models/Infrastructure/OriginsDestinations.cs)
// ============================================================================

export type LocationType = 'city' | 'town' | 'port' | 'border' | 'warehouse';

export interface OriginDestination {
  id: string;
  code: string;
  name: string;
  locationType: LocationType;
  country: string;
  /** Latitude for geo-based auto-fill */
  latitude?: number;
  /** Longitude for geo-based auto-fill */
  longitude?: number;
  /** Region/county for location grouping */
  region?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOriginDestinationRequest {
  code: string;
  name: string;
  locationType?: LocationType;
  country?: string;
}

export interface UpdateOriginDestinationRequest extends Partial<CreateOriginDestinationRequest> {
  isActive?: boolean;
}

// ============================================================================
// Vehicle Tag Types (Backend Model: Models/Yard/VehicleTag.cs)
// ============================================================================

export type TagType = 'automatic' | 'manual';
export type TagStatus = 'open' | 'closed';

export interface TagCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface VehicleTag {
  id: string;
  regNo: string;
  tagType: TagType;
  reason: string;
  stationCode: string;
  status: TagStatus;
  tagPhotoPath?: string;
  effectiveTimePeriod?: string;
  openedAt: string;
  closedAt?: string;
  closedReason?: string;
  exported: boolean;
  tagCategoryId: string;
  tagCategory?: TagCategory;
  createdById: string;
  createdByName?: string;
  closedById?: string;
  closedByName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleTagRequest {
  regNo: string;
  tagType?: TagType;
  reason: string;
  stationCode: string;
  tagCategoryId: string;
  tagPhotoPath?: string;
  effectiveTimePeriod?: string;
}

export interface UpdateVehicleTagRequest {
  reason?: string;
  tagCategoryId?: string;
  tagPhotoPath?: string;
}

export interface CloseTagRequest {
  closedReason: string;
}

// ============================================================================
// Yard Entry Types (Backend Model: Models/Yard/YardEntry.cs)
// ============================================================================

export type YardReason = 'redistribution' | 'gvw_overload' | 'permit_check' | 'offload';
export type YardStatus = 'pending' | 'processing' | 'released' | 'escalated';

export interface YardEntry {
  id: string;
  reason: YardReason;
  status: YardStatus;
  enteredAt: string;
  releasedAt?: string;
  weighingId: string;
  stationId: string;
  // Navigation
  weighing?: {
    ticketNumber: string;
    vehicleRegNumber: string;
    gvwMeasuredKg: number;
    gvwOverloadKg: number;
    controlStatus: string;
  };
  station?: {
    code: string;
    name: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateYardEntryRequest {
  weighingId: string;
  stationId: string;
  reason: YardReason;
}

export interface UpdateYardEntryRequest {
  reason?: YardReason;
  status?: YardStatus;
}

export interface ReleaseYardEntryRequest {
  releaseReason?: string;
}

// ============================================================================
// Vehicle Make & Model Types (Backend Model: Models/Infrastructure/)
// ============================================================================

export interface VehicleMake {
  id: string;
  code: string;
  name: string;
  country?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleMakeRequest {
  code: string;
  name: string;
  country?: string;
  description?: string;
}

export interface UpdateVehicleMakeRequest extends Partial<CreateVehicleMakeRequest> {
  isActive?: boolean;
}

export interface VehicleModel {
  id: string;
  code: string;
  name: string;
  makeId: string;
  makeName?: string;
  vehicleCategory?: 'Truck' | 'Trailer' | 'Bus' | 'Van' | 'Other';
  axleConfigurationId?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleModelRequest {
  code: string;
  name: string;
  makeId: string;
  vehicleCategory?: 'Truck' | 'Trailer' | 'Bus' | 'Van' | 'Other';
  axleConfigurationId?: string;
  description?: string;
}

export interface UpdateVehicleModelRequest extends Partial<CreateVehicleModelRequest> {
  isActive?: boolean;
}
// ============================================================================
// Permit Types (Backend Model: Models/Weighing/Permit.cs)
// ============================================================================

export type PermitStatus = 'active' | 'expired' | 'revoked';

export interface PermitType {
  id: string;
  code: string;
  name: string;
  description?: string;
  axleExtensionKg: number;
  gvwExtensionKg: number;
  validityDays?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permit {
  id: string;
  permitNo: string;
  vehicleId: string;
  vehicleRegNo: string;
  permitTypeId: string;
  permitTypeName: string;
  axleExtensionKg?: number;
  gvwExtensionKg?: number;
  validFrom: string;
  validTo: string;
  issuingAuthority: string;
  status: PermitStatus;
  documentUrl?: string;
  createdAt: string;
}

export interface CreatePermitRequest {
  permitNo: string;
  vehicleId: string;
  permitTypeId: string;
  axleExtensionKg?: number;
  gvwExtensionKg?: number;
  validFrom: string;
  validTo: string;
  issuingAuthority?: string;
  documentUrl?: string;
  status: PermitStatus;
}

export interface UpdatePermitRequest extends Partial<CreatePermitRequest> {}

export interface ExtendPermitRequest {
  newValidTo: string;
  comment?: string;
}
