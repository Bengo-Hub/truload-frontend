import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface ProsecutionCaseDto {
  id: string;
  caseRegisterId: string;
  caseNo: string;
  weighingId?: string;
  weighingTicketNo?: string;
  vehicleRegNumber?: string;
  prosecutionOfficerId: string;
  prosecutionOfficerName?: string;
  actId: string;
  actName?: string;
  gvwOverloadKg: number;
  gvwFeeUsd: number;
  gvwFeeKes: number;
  maxAxleOverloadKg: number;
  maxAxleFeeUsd: number;
  maxAxleFeeKes: number;
  bestChargeBasis: string;
  penaltyMultiplier: number;
  totalFeeUsd: number;
  totalFeeKes: number;
  forexRate: number;
  chargingCurrency?: string;
  certificateNo?: string;
  caseNotes?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChargeCalculationResult {
  weighingId: string;
  vehicleRegNumber: string;
  legalFramework: string;
  gvwOverloadKg: number;
  gvwFeeUsd: number;
  gvwFeeKes: number;
  maxAxleOverloadKg: number;
  maxAxleFeeUsd: number;
  maxAxleFeeKes: number;
  bestChargeBasis: string;
  penaltyMultiplier: number;
  totalFeeUsd: number;
  totalFeeKes: number;
  forexRate: number;
  isRepeatOffender: boolean;
  priorOffenseCount: number;
}

/**
 * Matches backend CreateProsecutionRequest.
 * Only actId is required; backend computes charges when chargeCalculation is omitted.
 */
export interface CreateProsecutionRequest {
  /** Applicable Act ID (EAC or Traffic Act) - must be a valid GUID from GET /acts */
  actId: string;
  /** Pre-calculated charges (optional; backend will calculate from weighing if omitted) */
  chargeCalculation?: ChargeCalculationResult;
  /** Additional notes */
  caseNotes?: string;
}

export interface UpdateProsecutionRequest {
  caseNotes?: string;
  status?: string;
}

export interface ProsecutionSearchCriteria {
  caseNo?: string;
  vehicleRegNumber?: string;
  stationId?: string;
  status?: string;
  actId?: string;
  dateFrom?: string;
  dateTo?: string;
  minFeeUsd?: number;
  maxFeeUsd?: number;
  pageNumber?: number;
  pageSize?: number;
}

export interface ProsecutionSearchResult {
  items: ProsecutionCaseDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface ProsecutionStatistics {
  totalCases: number;
  pendingCases: number;
  invoicedCases: number;
  paidCases: number;
  courtCases: number;
  totalFeesUsd: number;
  totalFeesKes: number;
  collectedFeesUsd: number;
  collectedFeesKes: number;
}

// ============================================================================
// Prosecution API
// ============================================================================

/**
 * Get prosecution case by ID
 */
export async function getProsecutionById(id: string): Promise<ProsecutionCaseDto> {
  const { data } = await apiClient.get<ProsecutionCaseDto>(`/prosecutions/${id}`);
  return data;
}

/**
 * Get prosecution case by case register ID
 */
export async function getProsecutionByCaseId(caseId: string): Promise<ProsecutionCaseDto | null> {
  try {
    const { data } = await apiClient.get<ProsecutionCaseDto>(`/cases/${caseId}/prosecution`);
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
 * Search prosecution cases
 */
export async function searchProsecutions(
  criteria: ProsecutionSearchCriteria
): Promise<ProsecutionSearchResult> {
  const { data } = await apiClient.post<ProsecutionSearchResult>('/prosecutions/search', criteria);
  return data;
}

/**
 * Calculate charges for a weighing transaction
 */
export async function calculateCharges(
  weighingId: string,
  legalFramework: string = 'TRAFFIC_ACT'
): Promise<ChargeCalculationResult> {
  const { data } = await apiClient.post<ChargeCalculationResult>(
    `/weighings/${weighingId}/calculate-charges?legalFramework=${encodeURIComponent(legalFramework)}`
  );
  return data;
}

/**
 * Create prosecution case from case register
 */
export async function createProsecution(
  caseId: string,
  request: CreateProsecutionRequest
): Promise<ProsecutionCaseDto> {
  const { data } = await apiClient.post<ProsecutionCaseDto>(`/cases/${caseId}/prosecution`, request);
  return data;
}

/**
 * Update prosecution case
 */
export async function updateProsecution(
  id: string,
  request: UpdateProsecutionRequest
): Promise<ProsecutionCaseDto> {
  const { data } = await apiClient.put<ProsecutionCaseDto>(`/prosecutions/${id}`, request);
  return data;
}

/**
 * Delete prosecution case
 */
export async function deleteProsecution(id: string): Promise<void> {
  await apiClient.delete(`/prosecutions/${id}`);
}

/**
 * Get prosecution statistics
 */
export async function getProsecutionStatistics(stationId?: string): Promise<ProsecutionStatistics> {
  const { data } = await apiClient.get<ProsecutionStatistics>('/prosecutions/statistics', {
    params: stationId ? { stationId } : undefined,
  });
  return data;
}

/**
 * Download charge sheet PDF
 */
export async function downloadChargeSheetPdf(id: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/prosecutions/${id}/charge-sheet`, {
    responseType: 'blob',
  });
  return data;
}

export interface ProsecutionDefaults {
  defaultCourtId?: string;
  defaultComplainantOfficerId?: string;
  defaultCountyId?: string;
  defaultSubcountyId?: string;
  defaultRoadId?: string;
}

/**
 * Get prosecution default settings
 */
export async function getProsecutionDefaults(): Promise<ProsecutionDefaults> {
  const { data } = await apiClient.get<ProsecutionDefaults>('/prosecutions/defaults');
  return data;
}

/**
 * Update prosecution default settings
 */
export async function updateProsecutionDefaults(
  request: ProsecutionDefaults
): Promise<{ message: string }> {
  const { data } = await apiClient.put<{ message: string }>('/prosecutions/defaults', request);
  return data;
}
