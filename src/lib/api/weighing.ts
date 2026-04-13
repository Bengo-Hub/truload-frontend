import { apiClient } from '@/lib/api/client';
import { AxleWeightReferenceDto } from '@/types/weighing';

// ============================================================================
// Types
// ============================================================================

export interface Vehicle {
  id: string;
  regNo: string;
  vehicleType?: string;
  axleConfigurationId?: string;
  transporterId?: string;
  makeModel?: string;
  chassisNo?: string;
  tareWeight?: number;
  isActive?: boolean;
}

export interface Driver {
  id: string;
  ntsaId?: string;
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
  licenseStatus?: string;
  isProfessionalDriver?: boolean;
  currentDemeritPoints?: number;
  transporterId?: string;
  isActive?: boolean;
}

export interface Transporter {
  id: string;
  name: string;
  code?: string;
  address?: string;
  contactPerson?: string;
  phoneNumber?: string;
  email?: string;
  isActive?: boolean;
}

export interface WeighingAxle {
  id?: string;
  axleNumber: number;
  measuredWeightKg: number;
  permissibleWeightKg?: number;
  overloadKg?: number;
  axleConfigurationId?: string;
  axleWeightReferenceId?: string;
  capturedAt?: string;
}

export interface WeighingTransaction {
  id: string;
  ticketNumber: string;
  vehicleId: string;
  vehicleRegNumber: string;
  driverId?: string;
  transporterId?: string;
  stationId: string;
  weighedByUserId: string;
  weighingType?: string;
  actId?: string;
  bound?: string;
  gvwMeasuredKg: number;
  gvwPermissibleKg: number;
  overloadKg: number;
  excessKg?: number;
  controlStatus: string;
  totalFeeUsd: number;
  weighedAt: string;
  isSync: boolean;
  isCompliant: boolean;
  isSentToYard: boolean;
  violationReason?: string;
  captureStatus?: string;
  captureSource?: string;
  reweighCycleNo: number;
  originalWeighingId?: string;
  hasPermit: boolean;
  originId?: string;
  destinationId?: string;
  cargoId?: string;
  toleranceApplied?: boolean;
  reweighLimit?: number;
  weighingAxles: WeighingAxle[];

  // Vehicle details
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleType?: string;
  axleConfiguration?: string;
  isMultiDeck?: boolean;
  deckType?: string;

  // People
  driverName?: string;
  transporterName?: string;

  // Station
  stationName?: string;
  stationCode?: string;
  weighedByUserName?: string;

  // Deck weights
  deckAWeightKg?: number;
  deckBWeightKg?: number;
  deckCWeightKg?: number;
  deckDWeightKg?: number;

  // ANPR
  anprRegistration?: string;
  anprCheckCount?: number;
  anprMatch?: boolean;

  // Location coordinates
  locationLat?: number;
  locationLng?: number;

  // Route & Cargo (IDs for form prefill)
  roadId?: string;
  subcountyId?: string;
  sourceLocation?: string;
  destinationLocation?: string;
  cargoType?: string;
  cargoDescription?: string;

  // Timing
  timeTakenSeconds?: number;

  // Permit
  permitNumber?: string;

  // Scale test
  scaleTestId?: string;
  scaleTestResult?: string;
  scaleTestCarriedAt?: string;

  // Images
  vehicleThumbnailUrl?: string;
  vehicleImageUrls?: string[];
}

/** Backend group-level compliance result (from AxleGroupAggregationService) */
export interface BackendGroupResult {
  groupLabel: string;
  axleType: string;
  axleCount: number;
  groupWeightKg: number;
  groupPermissibleKg: number;
  toleranceKg: number;
  effectiveLimitKg: number;
  overloadKg: number;
  pavementDamageFactor: number;
  status: string;
  operationalToleranceKg: number;
  feeUsd: number;
  feeKes: number;
  demeritPoints: number;
  axles: {
    axleNumber: number;
    measuredWeightKg: number;
    permissibleWeightKg: number;
    overloadKg: number;
    tyreType?: string;
    spacingMeters?: number;
  }[];
}

export interface WeighingResult {
  weighingId: string;
  ticketNumber: string;
  vehicleRegNumber: string;
  gvwMeasuredKg: number;
  gvwPermissibleKg: number;
  gvwOverloadKg: number;
  /** GVW tolerance applied in kg (from DB tolerance settings) */
  gvwToleranceKg?: number;
  /** GVW effective limit including tolerance */
  gvwEffectiveLimitKg?: number;
  /** Display string for GVW tolerance (e.g. "5%", "2,000 kg", "0% (strict)") */
  gvwToleranceDisplay?: string;
  isCompliant: boolean;
  controlStatus: string;
  /** Overall compliance status: LEGAL, WARNING, or OVERLOAD */
  overallStatus?: string;
  violationReason?: string;
  totalFeeUsd: number;
  totalFeeKes?: number;
  hasPermit: boolean;
  reweighCycleNo: number;
  weighedAt: string;
  /** Whether vehicle has been sent to yard (auto-created on overload or manual). */
  isSentToYard?: boolean;
  operationalToleranceKg?: number;
  /** Display string for axle tolerance (e.g. "0% (strict)", "5%") */
  axleToleranceDisplay?: string;
  /** Group-level compliance results from backend with DB-driven tolerance */
  groupResults?: BackendGroupResult[];
  axleCompliance: {
    axleNumber: number;
    measuredWeightKg: number;
    permissibleWeightKg: number;
    overloadKg: number;
    isCompliant: boolean;
  }[];
}

export interface SearchWeighingParams {
  stationId?: string;
  vehicleRegNo?: string;
  fromDate?: string;
  toDate?: string;
  fromTime?: string;
  toTime?: string;
  controlStatus?: string;
  isCompliant?: boolean;
  operatorId?: string;
  weighingType?: string;
  stationCode?: string;
  axleConfiguration?: string;
  transporterId?: string;
  state?: string;
  searchTicketNo?: string;
  searchVehicleReg?: string;
  cargoType?: string;
  sourceLocation?: string;
  destinationLocation?: string;
  hasPermit?: boolean;
  isSentToYard?: boolean;
  minOverloadKg?: number;
  maxOverloadKg?: number;
  viewMode?: 'list' | 'images' | 'line';
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateWeighingRequest {
  ticketNumber?: string;
  stationId: string;
  vehicleId?: string;
  vehicleRegNo?: string;  // Backend will lookup/create vehicle by reg number
  driverId?: string;
  transporterId?: string;
  weighingType?: string;
  bound?: string;
  originId?: string;
  destinationId?: string;
  cargoId?: string;
  /** Applicable Act (Traffic Act, EAC). When null, backend uses default act. */
  actId?: string;
  roadId?: string;
  subcountyId?: string;
  locationTown?: string;
  locationSubcounty?: string;
  locationCounty?: string;
  locationLat?: number;
  locationLng?: number;
}

export interface UpdateWeighingRequest {
  vehicleRegNumber?: string;
  driverId?: string;
  transporterId?: string;
  originId?: string;
  destinationId?: string;
  cargoId?: string;
  /** Applicable Act (Traffic Act, EAC). When null, backend uses default act. */
  actId?: string;
  roadId?: string;
  subcountyId?: string;
  locationTown?: string;
  locationSubcounty?: string;
  locationCounty?: string;
  locationLat?: number;
  locationLng?: number;
  reliefVehicleReg?: string;
  comment?: string;
}

export interface CaptureWeightsRequest {
  axles: {
    axleNumber: number;
    measuredWeightKg: number;
    axleConfigurationId?: string;
  }[];
}

export interface InitiateReweighRequest {
  originalWeighingId: string;
  reweighTicketNumber?: string;
}

// ============================================================================
// Vehicle API
// ============================================================================

export async function getVehicleById(id: string): Promise<Vehicle> {
  const { data } = await apiClient.get<Vehicle>(`/Vehicle/${id}`);
  return data;
}

export async function getVehicleByRegNo(regNo: string): Promise<Vehicle | null> {
  try {
    const { data } = await apiClient.get<Vehicle>(`/Vehicle/reg/${encodeURIComponent(regNo)}`);
    return data;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 404) return null;
    }
    throw error;
  }
}

export async function searchVehicles(query: string): Promise<Vehicle[]> {
  const { data } = await apiClient.get<Vehicle[]>('/Vehicle/search', {
    params: { query },
  });
  return data;
}

export async function createVehicle(vehicle: Partial<Vehicle>): Promise<Vehicle> {
  const { data } = await apiClient.post<Vehicle>('/Vehicle', vehicle);
  return data;
}

export async function updateVehicle(id: string, vehicle: Partial<Vehicle>): Promise<void> {
  await apiClient.put(`/Vehicle/${id}`, { ...vehicle, id });
}

export async function deleteVehicle(id: string): Promise<void> {
  await apiClient.delete(`/vehicles/${id}`);
}

// ============================================================================
// Driver API
// ============================================================================

export async function getDriverById(id: string): Promise<Driver> {
  const { data } = await apiClient.get<Driver>(`/drivers/${id}`);
  return data;
}

export async function searchDrivers(query: string): Promise<Driver[]> {
  const { data } = await apiClient.get<Driver[]>('/drivers/search', {
    params: { query },
  });
  return data;
}

export async function createDriver(driver: Partial<Driver>): Promise<Driver> {
  const { data } = await apiClient.post<Driver>('/drivers', driver);
  return data;
}

export async function updateDriver(id: string, driver: Partial<Driver>): Promise<void> {
  await apiClient.put(`/drivers/${id}`, { ...driver, id });
}

export async function deleteDriver(id: string): Promise<void> {
  await apiClient.delete(`/drivers/${id}`);
}

// ============================================================================
// Transporter API
// ============================================================================

export async function getTransporterById(id: string): Promise<Transporter> {
  const { data } = await apiClient.get<Transporter>(`/transporters/${id}`);
  return data;
}

export async function searchTransporters(query: string): Promise<Transporter[]> {
  const { data } = await apiClient.get<Transporter[]>('/transporters/search', {
    params: { query },
  });
  return data;
}

export async function createTransporter(transporter: Partial<Transporter>): Promise<Transporter> {
  const { data } = await apiClient.post<Transporter>('/transporters', transporter);
  return data;
}

export async function fetchTransporters(): Promise<Transporter[]> {
  const { data } = await apiClient.get<Transporter[]>('/transporters');
  return data;
}

export async function updateTransporter(id: string, transporter: Partial<Transporter>): Promise<Transporter> {
  const { data } = await apiClient.put<Transporter>(`/transporters/${id}`, { ...transporter, id });
  return data;
}

export async function deleteTransporter(id: string): Promise<void> {
  await apiClient.delete(`/transporters/${id}`);
}

// ============================================================================
// Weighing Transaction API
// ============================================================================

export async function searchWeighingTransactions(
  params: SearchWeighingParams
): Promise<PagedResponse<WeighingTransaction>> {
  const { data } = await apiClient.get<PagedResponse<WeighingTransaction>>(
    '/weighing-transactions',
    { params }
  );
  return data;
}

export async function getWeighingTransaction(id: string): Promise<WeighingTransaction> {
  const { data } = await apiClient.get<WeighingTransaction>(`/weighing-transactions/${id}`);
  return data;
}

export async function createWeighingTransaction(
  request: CreateWeighingRequest
): Promise<WeighingTransaction> {
  const { data } = await apiClient.post<WeighingTransaction>(
    '/weighing-transactions',
    request
  );
  return data;
}

export async function updateWeighingTransaction(
  id: string,
  request: UpdateWeighingRequest
): Promise<WeighingTransaction> {
  const { data } = await apiClient.put<WeighingTransaction>(
    `/weighing-transactions/${id}`,
    request
  );
  return data;
}

export async function deleteWeighingTransaction(id: string): Promise<void> {
  await apiClient.delete(`/weighing-transactions/${id}`);
}

export async function captureWeights(
  transactionId: string,
  request: CaptureWeightsRequest
): Promise<WeighingResult> {
  const { data } = await apiClient.post<WeighingResult>(
    `/weighing-transactions/${transactionId}/capture-weights`,
    request
  );
  return data;
}

export async function initiateReweigh(request: InitiateReweighRequest): Promise<WeighingTransaction> {
  const { data } = await apiClient.post<WeighingTransaction>(
    '/weighing-transactions/reweigh',
    request
  );
  return data;
}

// ============================================================================
// Weighing Statistics API
// ============================================================================

export interface WeighingStatistics {
  totalWeighings: number;
  legalCount: number;
  overloadedCount: number;
  warningCount: number;
  complianceRate: number;
  totalFeesKes: number;
  avgOverloadKg: number;
}

export async function getWeighingStatistics(params: {
  dateFrom?: string;
  dateTo?: string;
  stationId?: string;
}): Promise<WeighingStatistics> {
  const { data } = await apiClient.get<WeighingStatistics>(
    '/weighing-transactions/statistics',
    { params }
  );
  return data;
}

// ============================================================================
// Autoweigh API (TruConnect middleware integration)
// ============================================================================

export interface AutoweighCaptureRequest {
  stationId: string;
  bound?: string;
  vehicleRegNumber: string;
  vehicleId?: string;
  axles: { axleNumber: number; measuredWeightKg: number; axleConfigurationId?: string }[];
  weighingMode?: string;
  capturedAt?: string;
  source?: string;
  sourceDeviceId?: string;
  clientLocalId?: string;
  captureSource?: string;
  isFinalCapture?: boolean;
  weighingTransactionId?: string;
}

export interface AutoweighResult {
  weighingId: string;
  ticketNumber: string;
  vehicleRegNumber: string;
  vehicleId?: string;
  vehicleFound: boolean;
  gvwMeasuredKg: number;
  gvwPermissibleKg: number;
  gvwOverloadKg: number;
  isCompliant: boolean;
  controlStatus: string;
  violationReason: string;
  captureStatus: string;
  captureSource: string;
  totalFeeUsd: number;
  hasPermit: boolean;
  axleCompliance: {
    axleNumber: number;
    measuredWeightKg: number;
    permissibleWeightKg: number;
    overloadKg: number;
    isCompliant: boolean;
  }[];
  capturedAt: string;
  processedAt: string;
  source?: string;
}

export async function autoweighCapture(
  request: AutoweighCaptureRequest
): Promise<AutoweighResult> {
  const { data } = await apiClient.post<AutoweighResult>(
    '/weighing-transactions/autoweigh',
    request
  );
  return data;
}

// ============================================================================
// Lookup APIs (Cargo, Origins/Destinations)
// ============================================================================

export interface CargoType {
  id: string;
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface OriginDestination {
  id: string;
  name: string;
  code?: string;
  country?: string;
  region?: string;
  isActive?: boolean;
}

export async function fetchCargoTypes(): Promise<CargoType[]> {
  const { data } = await apiClient.get<CargoType[]>('/cargo-types');
  return data;
}

export interface CreateCargoTypeRequest {
  code: string;
  name: string;
  category?: 'General' | 'Hazardous' | 'Perishable';
}

export async function createCargoType(payload: CreateCargoTypeRequest): Promise<CargoType> {
  const { data } = await apiClient.post<CargoType>('/cargo-types', payload);
  return data;
}

export async function updateCargoType(id: string, payload: CreateCargoTypeRequest): Promise<CargoType> {
  const { data } = await apiClient.put<CargoType>(`/cargo-types/${id}`, payload);
  return data;
}

export async function deleteCargoType(id: string): Promise<void> {
  await apiClient.delete(`/cargo-types/${id}`);
}

export async function fetchOriginsDestinations(): Promise<OriginDestination[]> {
  const { data } = await apiClient.get<OriginDestination[]>('/origins-destinations');
  return data;
}

export interface CreateOriginDestinationRequest {
  name: string;
  code?: string;
  locationType?: 'city' | 'town' | 'port' | 'border' | 'warehouse';
  country?: string;
}

export async function createOriginDestination(payload: CreateOriginDestinationRequest): Promise<OriginDestination> {
  const { data } = await apiClient.post<OriginDestination>('/origins-destinations', payload);
  return data;
}

export async function updateOriginDestination(id: string, payload: CreateOriginDestinationRequest): Promise<OriginDestination> {
  const { data } = await apiClient.put<OriginDestination>(`/origins-destinations/${id}`, payload);
  return data;
}

export async function deleteOriginDestination(id: string): Promise<void> {
  await apiClient.delete(`/origins-destinations/${id}`);
}

// ============================================================================
// Roads API (location / weighing setup)
// ============================================================================

export interface Road {
  id: string;
  code: string;
  name: string;
  roadClass: string;
  districtId?: string;
  totalLengthKm?: number;
  isActive: boolean;
  roadCounties?: { countyId: string }[];
  roadDistricts?: { districtId: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface RoadsPagedParams {
  pageNumber?: number;
  pageSize?: number;
  includeInactive?: boolean;
  search?: string;
}

export async function fetchRoadsPaged(params: RoadsPagedParams = {}): Promise<PagedResponse<Road>> {
  const { pageNumber = 1, pageSize = 50, includeInactive = false, search } = params;
  const { data } = await apiClient.get<PagedResponse<Road>>('/roads/paged', {
    params: { pageNumber, pageSize, includeInactive, search: search || undefined },
  });
  return data;
}

/** @deprecated Use fetchRoadsBySubcounty; backend replaced district with subcounty. */
export async function fetchRoadsByDistrict(districtId: string): Promise<Road[]> {
  return fetchRoadsBySubcounty(districtId);
}

export async function fetchRoadsBySubcounty(subcountyId: string): Promise<Road[]> {
  const { data } = await apiClient.get<Road[]>(`/roads/subcounty/${subcountyId}`);
  return data ?? [];
}

export async function fetchRoadsByCounty(countyId: string): Promise<Road[]> {
  const { data } = await apiClient.get<Road[]>(`/roads/county/${countyId}`);
  return data ?? [];
}

export interface CreateRoadRequest {
  code: string;
  name: string;
  roadClass: string;
  districtId?: string;
  totalLengthKm?: number;
  roadCounties?: { countyId: string }[];
  roadDistricts?: { districtId: string }[];
}

export async function createRoad(payload: CreateRoadRequest): Promise<Road> {
  const { data } = await apiClient.post<Road>('/roads', payload);
  return data;
}

export async function updateRoad(id: string, payload: CreateRoadRequest): Promise<Road> {
  const { data } = await apiClient.put<Road>(`/roads/${id}`, payload);
  return data;
}

export async function deleteRoad(id: string): Promise<void> {
  await apiClient.delete(`/roads/${id}`);
}

// ============================================================================
// Vehicle Makes API
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

export async function fetchVehicleMakes(): Promise<VehicleMake[]> {
  const { data } = await apiClient.get<VehicleMake[]>('/vehicle-makes/active');
  return data;
}

export async function createVehicleMake(payload: CreateVehicleMakeRequest): Promise<VehicleMake> {
  const { data } = await apiClient.post<VehicleMake>('/vehicle-makes', payload);
  return data;
}

export async function updateVehicleMake(id: string, payload: CreateVehicleMakeRequest): Promise<VehicleMake> {
  const { data } = await apiClient.put<VehicleMake>(`/vehicle-makes/${id}`, payload);
  return data;
}

export async function deleteVehicleMake(id: string): Promise<void> {
  await apiClient.delete(`/vehicle-makes/${id}`);
}

// ============================================================================
// Station API
// ============================================================================

export interface Station {
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
  isActive: boolean;
  isHq?: boolean;
  countyId?: string;
  subcountyId?: string;
  roadId?: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchStations(): Promise<Station[]> {
  const { data } = await apiClient.get<Station[]>('/Stations');
  return data;
}

/**
 * Fetch the station linked to the current authenticated user.
 * Uses the station_id from the user's JWT claims.
 */
export async function fetchMyStation(): Promise<Station | null> {
  try {
    const { data } = await apiClient.get<Station>('/Stations/my-station');
    return data;
  } catch {
    // Return null if user has no linked station (404)
    console.warn('No station linked to current user');
    return null;
  }
}

export async function getStationById(id: string): Promise<Station> {
  const { data } = await apiClient.get<Station>(`/Stations/${id}`);
  return data;
}

export async function getStationsByType(stationType: string): Promise<Station[]> {
  const { data } = await apiClient.get<Station[]>(`/Stations/type/${stationType}`);
  return data;
}

export async function getStationsByOrganization(organizationId: string): Promise<Station[]> {
  const { data } = await apiClient.get<Station[]>(`/Stations/organization/${organizationId}`);
  return data;
}

// ============================================================================
// Axle Configuration API
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

export async function fetchAxleConfigurations(params?: {
  hasWeightReferences?: boolean;
}): Promise<AxleConfiguration[]> {
  const { data } = await apiClient.get<AxleConfiguration[]>('/AxleConfiguration', { params });
  return data;
}

export async function getAxleConfigurationById(id: string, includeWeightReferences = true): Promise<AxleConfiguration> {
  const { data } = await apiClient.get<AxleConfiguration>(`/AxleConfiguration/${id}`, {
    params: { includeWeightReferences },
  });
  return data;
}

export async function getAxleConfigurationByCode(code: string): Promise<AxleConfiguration | null> {
  try {
    const { data } = await apiClient.get<AxleConfiguration>(`/AxleConfiguration/by-code/${encodeURIComponent(code)}`);
    return data;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 404) return null;
    }
    throw error;
  }
}

// ============================================================================
// Compliance API
// ============================================================================

export interface AxleDetailResult {
  axleNumber: number;
  measuredWeightKg: number;
  permissibleWeightKg: number;
  overloadKg: number;
  tyreType?: string;
  spacingMeters?: number;
}

export interface AxleGroupResult {
  groupLabel: string;
  axleType: string;
  axleCount: number;
  groupWeightKg: number;
  groupPermissibleKg: number;
  toleranceKg: number;
  effectiveLimitKg: number;
  overloadKg: number;
  pavementDamageFactor: number;
  status: string;
  feeUsd: number;
  demeritPoints: number;
  axles: AxleDetailResult[];
}

export interface DemeritPointBreakdown {
  violationType: string;
  overloadKg: number;
  points: number;
}

export interface PenaltyInfo {
  description: string;
  suspensionDays?: number;
  requiresCourt: boolean;
  additionalFineUsd: number;
  additionalFineKes: number;
}

export interface DemeritPointsResult {
  totalPoints: number;
  breakdown: DemeritPointBreakdown[];
  applicablePenalty?: PenaltyInfo;
  requiresCourt: boolean;
  suspensionDays?: number;
}

export interface ComplianceResult {
  weighingId: string;
  ticketNumber: string;
  vehicleRegNumber?: string;
  groupResults: AxleGroupResult[];
  gvwMeasuredKg: number;
  gvwPermissibleKg: number;
  gvwOverloadKg: number;
  totalAxleFeeUsd: number;
  gvwFeeUsd: number;
  totalFeeUsd: number;
  demeritPoints: DemeritPointsResult;
  overallStatus: string;
  isCompliant: boolean;
  shouldSendToYard: boolean;
  violationReasons: string[];
}

export async function getComplianceResult(weighingId: string): Promise<ComplianceResult> {
  const { data } = await apiClient.get<ComplianceResult>(
    `/weighing-transactions/${weighingId}/compliance`
  );
  return data;
}

export async function calculateCompliance(weighingId: string): Promise<ComplianceResult> {
  const { data } = await apiClient.post<ComplianceResult>(
    `/weighing-transactions/${weighingId}/calculate-compliance`
  );
  return data;
}

// ============================================================================
// Annual Calibration Record API
// ============================================================================

export interface AnnualCalibrationRecord {
  id: string;
  stationId?: string;
  certificateNo: string;
  issueDate: string;
  expiryDate: string;
  targetWeightKg: number;
  maxDeviationKg: number;
  certificateFileUrl?: string;
  status: 'Active' | 'Expired' | 'Revoked';
  organizationId: string;
  createdAt: string;
}

export async function getActiveAnnualCalibration(): Promise<AnnualCalibrationRecord> {
  const { data } = await apiClient.get<AnnualCalibrationRecord>('/AnnualCalibration/active');
  return data;
}

export async function createAnnualCalibration(payload: Partial<AnnualCalibrationRecord>): Promise<AnnualCalibrationRecord> {
  const { data } = await apiClient.post<AnnualCalibrationRecord>('/AnnualCalibration', payload);
  return data;
}

// ============================================================================
// Scale Test API
// ============================================================================

export type ScaleTestType = 'calibration_weight' | 'vehicle';
export type WeighingModeType = 'mobile' | 'multideck';

export interface ScaleTest {
  id: string;
  stationId: string;
  stationName?: string;
  stationCode?: string;
  bound?: string;
  /** Type of test: calibration_weight or vehicle */
  testType: ScaleTestType;
  /** Vehicle plate for vehicle-based tests */
  vehiclePlate?: string;
  /** Weighing mode: mobile or multideck */
  weighingMode?: WeighingModeType;
  /** Expected test weight in kg */
  testWeightKg?: number;
  /** Actual measured weight in kg */
  actualWeightKg?: number;
  result: string; // 'pass' | 'fail'
  deviationKg?: number;
  details?: string;
  carriedAt: string;
  carriedById: string;
  carriedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScaleTestStatus {
  hasValidTest: boolean;
  latestTest?: ScaleTest;
  weighingAllowed: boolean;
  message: string;
  stationId: string;
  bound?: string;
}

export interface CreateScaleTestRequest {
  stationId: string;
  bound?: string;
  /** Type of test: calibration_weight or vehicle */
  testType?: ScaleTestType;
  /** Vehicle plate for vehicle-based tests */
  vehiclePlate?: string;
  /** Weighing mode: mobile or multideck */
  weighingMode?: WeighingModeType;
  /** Expected test weight in kg */
  testWeightKg?: number;
  /** Actual measured weight in kg */
  actualWeightKg?: number;
  result: string; // 'pass' | 'fail'
  deviationKg?: number;
  details?: string;
}

/**
 * Create a new scale test record
 */
export async function createScaleTest(request: CreateScaleTestRequest): Promise<ScaleTest> {
  const { data } = await apiClient.post<ScaleTest>('/scale-tests', request);
  return data;
}

/**
 * Get scale test status for current user's station
 */
export async function getMyStationScaleTestStatus(bound?: string): Promise<ScaleTestStatus> {
  const { data } = await apiClient.get<ScaleTestStatus>('/scale-tests/my-station/status', {
    params: bound ? { bound } : undefined,
  });
  return data;
}

/**
 * Get latest scale test for current user's station
 */
export async function getMyLatestScaleTest(bound?: string): Promise<ScaleTest | null> {
  try {
    const { data } = await apiClient.get<ScaleTest>('/scale-tests/my-station/latest', {
      params: bound ? { bound } : undefined,
    });
    return data;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 404) return null;
    }
    throw error;
  }
}

/**
 * Get latest scale test for a station
 */
export async function getLatestScaleTest(stationId: string, bound?: string): Promise<ScaleTest | null> {
  try {
    const { data } = await apiClient.get<ScaleTest>(`/scale-tests/station/${stationId}/latest`, {
      params: bound ? { bound } : undefined,
    });
    return data;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 404) return null;
    }
    throw error;
  }
}

/**
 * Check scale test status for a station
 */
export async function getScaleTestStatus(stationId: string, bound?: string): Promise<ScaleTestStatus> {
  const { data } = await apiClient.get<ScaleTestStatus>(`/scale-tests/station/${stationId}/status`, {
    params: bound ? { bound } : undefined,
  });
  return data;
}

/**
 * Get scale tests for a station by date range
 */
export async function getScaleTestsByDateRange(
  stationId: string,
  fromDate: string,
  toDate: string,
  bound?: string
): Promise<ScaleTest[]> {
  const { data } = await apiClient.get<ScaleTest[]>(`/scale-tests/station/${stationId}/range`, {
    params: { fromDate, toDate, ...(bound ? { bound } : {}) },
  });
  return data;
}

// ============================================================================
// PDF Download API
// ============================================================================

/**
 * Download weight ticket PDF for a weighing transaction
 */
export async function downloadWeightTicketPdf(weighingId: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/weighing-transactions/${weighingId}/ticket/pdf`, {
    responseType: 'blob',
  });
  return data;
}

/**
 * Helper to trigger PDF download in browser
 */
export async function downloadAndSavePdf(
  fetchFn: () => Promise<Blob>,
  filename: string
): Promise<void> {
  const blob = await fetchFn();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
