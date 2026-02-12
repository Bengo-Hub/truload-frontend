import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface CaseRegisterDto {
  id: string;
  caseNo: string;
  weighingId?: string;
  weighingTicketNo?: string;
  yardEntryId?: string;
  prohibitionOrderId?: string;
  prohibitionNo?: string;
  vehicleId: string;
  vehicleRegNumber: string;
  driverId?: string;
  driverName?: string;
  driverLicenseNo?: string;
  violationTypeId: string;
  violationType: string;
  violationDetails?: string;
  actId?: string;
  actName?: string;
  driverNtacNo?: string;
  transporterNtacNo?: string;
  obNo?: string;
  courtId?: string;
  courtName?: string;
  dispositionTypeId?: string;
  dispositionType?: string;
  caseStatusId: string;
  caseStatus: string;
  escalatedToCaseManager: boolean;
  caseManagerId?: string;
  caseManagerName?: string;
  prosecutorId?: string;
  prosecutorName?: string;
  complainantOfficerId?: string;
  complainantOfficerName?: string;
  investigatingOfficerId?: string;
  investigatingOfficerName?: string;
  createdById?: string;
  createdByName?: string;
  createdAt: string;
  closedAt?: string;
  closedById?: string;
  closedByName?: string;
  closingReason?: string;
  updatedAt: string;
}

export interface CreateCaseRequest {
  weighingId?: string;
  yardEntryId?: string;
  prohibitionOrderId?: string;
  vehicleId: string;
  driverId?: string;
  violationTypeId: string;
  violationDetails?: string;
  actId?: string;
  roadId?: string;
  countyId?: string;
  districtId?: string;
  subcountyId?: string;
}

export interface UpdateCaseRequest {
  violationDetails?: string;
  driverNtacNo?: string;
  transporterNtacNo?: string;
  obNo?: string;
  courtId?: string;
  dispositionTypeId?: string;
  caseManagerId?: string;
  prosecutorId?: string;
  investigatingOfficerId?: string;
}

export interface CloseCaseRequest {
  dispositionTypeId: string;
  closingReason: string;
}

export interface CaseSearchParams {
  caseNo?: string;
  vehicleRegNumber?: string;
  violationTypeId?: string;
  caseStatusId?: string;
  dispositionTypeId?: string;
  createdFrom?: string;
  createdTo?: string;
  escalatedToCaseManager?: boolean;
  caseManagerId?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface CaseSearchResult {
  items: CaseRegisterDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface CaseStatistics {
  totalCases: number;
  openCases: number;
  pendingCases: number;
  closedCases: number;
  escalatedCases: number;
  todayCases: number;
  weekCases: number;
  monthCases: number;
}

// Violation Type DTO
export interface ViolationTypeDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  severity: string;
  isActive: boolean;
}

// Case Status DTO
export interface CaseStatusDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

// Disposition Type DTO
export interface DispositionTypeDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

// ============================================================================
// Special Release Types
// ============================================================================

export interface SpecialReleaseDto {
  id: string;
  certificateNo: string;
  caseRegisterId: string;
  caseNo: string;
  releaseTypeId: string;
  releaseType: string;
  reason: string;
  requiresRedistribution: boolean;
  requiresReweigh: boolean;
  loadCorrectionMemoId?: string;
  loadCorrectionMemoNo?: string;
  complianceCertificateId?: string;
  complianceCertificateNo?: string;
  authorizedById?: string;
  authorizedByName?: string;
  authorizedAt?: string;
  isApproved: boolean;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  isRejected: boolean;
  rejectedById?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpecialReleaseRequest {
  caseRegisterId: string;
  releaseTypeId: string;
  reason: string;
  requiresRedistribution?: boolean;
  requiresReweigh?: boolean;
}

export interface ReleaseTypeDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  requiresRedistribution: boolean;
  requiresReweigh: boolean;
  isActive: boolean;
}

// ============================================================================
// Case Register API
// ============================================================================

/**
 * Search cases with filters
 */
export async function searchCases(params: CaseSearchParams): Promise<CaseSearchResult> {
  const { data } = await apiClient.post<CaseSearchResult>('/case/cases/search', params);
  return data;
}

/**
 * Get case by ID
 */
export async function getCaseById(id: string): Promise<CaseRegisterDto> {
  const { data } = await apiClient.get<CaseRegisterDto>(`/case/cases/${id}`);
  return data;
}

/**
 * Get case by case number
 */
export async function getCaseByCaseNo(caseNo: string): Promise<CaseRegisterDto> {
  const { data } = await apiClient.get<CaseRegisterDto>(`/case/cases/by-case-no/${encodeURIComponent(caseNo)}`);
  return data;
}

/**
 * Get case by weighing ID
 */
export async function getCaseByWeighingId(weighingId: string): Promise<CaseRegisterDto | null> {
  try {
    const { data } = await apiClient.get<CaseRegisterDto>(`/case/cases/by-weighing/${weighingId}`);
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
 * Create a new case manually
 */
export async function createCase(request: CreateCaseRequest): Promise<CaseRegisterDto> {
  const { data } = await apiClient.post<CaseRegisterDto>('/case/cases', request);
  return data;
}

/**
 * Auto-create case from weighing violation
 */
export async function createCaseFromWeighing(weighingId: string): Promise<CaseRegisterDto> {
  const { data } = await apiClient.post<CaseRegisterDto>(`/case/cases/from-weighing/${weighingId}`);
  return data;
}

/**
 * Auto-create case from prohibition order
 */
export async function createCaseFromProhibition(prohibitionOrderId: string): Promise<CaseRegisterDto> {
  const { data } = await apiClient.post<CaseRegisterDto>(`/case/cases/from-prohibition/${prohibitionOrderId}`);
  return data;
}

/**
 * Update case details
 */
export async function updateCase(id: string, request: UpdateCaseRequest): Promise<CaseRegisterDto> {
  const { data } = await apiClient.put<CaseRegisterDto>(`/case/cases/${id}`, request);
  return data;
}

/**
 * Close case with disposition
 */
export async function closeCase(id: string, request: CloseCaseRequest): Promise<CaseRegisterDto> {
  const { data } = await apiClient.post<CaseRegisterDto>(`/case/cases/${id}/close`, request);
  return data;
}

/**
 * Escalate case to case manager
 */
export async function escalateCase(id: string, caseManagerId: string): Promise<CaseRegisterDto> {
  const { data } = await apiClient.post<CaseRegisterDto>(`/case/cases/${id}/escalate`, caseManagerId);
  return data;
}

/**
 * Assign investigating officer
 */
export async function assignInvestigatingOfficer(id: string, investigatingOfficerId: string): Promise<CaseRegisterDto> {
  const { data } = await apiClient.post<CaseRegisterDto>(`/case/cases/${id}/assign-io`, investigatingOfficerId);
  return data;
}

/**
 * Delete case
 */
export async function deleteCase(id: string): Promise<void> {
  await apiClient.delete(`/case/cases/${id}`);
}

/**
 * Get case statistics
 */
export async function getCaseStatistics(): Promise<CaseStatistics> {
  const { data } = await apiClient.get<CaseStatistics>('/case/cases/statistics');
  return data;
}

// ============================================================================
// Lookup APIs
// ============================================================================

/**
 * Fetch violation types
 */
export async function fetchViolationTypes(): Promise<ViolationTypeDto[]> {
  const { data } = await apiClient.get<ViolationTypeDto[]>('/case/violation-types');
  return data;
}

/**
 * Fetch case statuses
 */
export async function fetchCaseStatuses(): Promise<CaseStatusDto[]> {
  const { data } = await apiClient.get<CaseStatusDto[]>('/case/case-statuses');
  return data;
}

/**
 * Fetch disposition types
 */
export async function fetchDispositionTypes(): Promise<DispositionTypeDto[]> {
  const { data } = await apiClient.get<DispositionTypeDto[]>('/case/disposition-types');
  return data;
}

// ============================================================================
// Special Release API
// ============================================================================

/**
 * Get special release by ID
 */
export async function getSpecialRelease(id: string): Promise<SpecialReleaseDto> {
  const { data } = await apiClient.get<SpecialReleaseDto>(`/case/special-releases/${id}`);
  return data;
}

/**
 * Get special releases by case ID
 */
export async function getSpecialReleasesByCase(caseRegisterId: string): Promise<SpecialReleaseDto[]> {
  const { data } = await apiClient.get<SpecialReleaseDto[]>(`/case/special-releases/by-case/${caseRegisterId}`);
  return data;
}

/**
 * Get pending special releases
 */
export async function getPendingSpecialReleases(): Promise<SpecialReleaseDto[]> {
  const { data } = await apiClient.get<SpecialReleaseDto[]>('/case/special-releases/pending');
  return data;
}

/**
 * Create special release request
 */
export async function createSpecialRelease(request: CreateSpecialReleaseRequest): Promise<SpecialReleaseDto> {
  const { data } = await apiClient.post<SpecialReleaseDto>('/case/special-releases', request);
  return data;
}

/**
 * Approve special release
 */
export async function approveSpecialRelease(id: string): Promise<SpecialReleaseDto> {
  const { data } = await apiClient.post<SpecialReleaseDto>(`/case/special-releases/${id}/approve`);
  return data;
}

/**
 * Reject special release
 */
export async function rejectSpecialRelease(id: string, reason: string): Promise<SpecialReleaseDto> {
  const { data } = await apiClient.post<SpecialReleaseDto>(`/case/special-releases/${id}/reject`, { reason });
  return data;
}

/**
 * Fetch release types
 */
export async function fetchReleaseTypes(): Promise<ReleaseTypeDto[]> {
  const { data } = await apiClient.get<ReleaseTypeDto[]>('/case/release-types');
  return data;
}

/**
 * Download special release certificate PDF
 */
export async function downloadSpecialReleaseCertificate(id: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/case/special-releases/${id}/certificate/pdf`, {
    responseType: 'blob',
  });
  return data;
}
