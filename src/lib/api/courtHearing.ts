import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface CourtHearingDto {
  id: string;
  caseRegisterId: string;
  caseNo: string;
  courtId?: string;
  courtName?: string;
  hearingDate: string;
  hearingTime?: string;
  hearingTypeId?: string;
  hearingTypeName?: string;
  hearingStatusId?: string;
  hearingStatusName?: string;
  hearingOutcomeId?: string;
  hearingOutcomeName?: string;
  minuteNotes?: string;
  nextHearingDate?: string;
  adjournmentReason?: string;
  presidingOfficer?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourtHearingRequest {
  courtId?: string;
  hearingDate: string;
  hearingTime?: string;
  hearingTypeId?: string;
  presidingOfficer?: string;
  minuteNotes?: string;
}

export interface UpdateCourtHearingRequest {
  courtId?: string;
  hearingDate?: string;
  hearingTime?: string;
  hearingTypeId?: string;
  hearingStatusId?: string;
  presidingOfficer?: string;
  minuteNotes?: string;
}

export interface AdjournHearingRequest {
  nextHearingDate: string;
  adjournmentReason: string;
}

export interface CompleteHearingRequest {
  hearingOutcomeId: string;
  minuteNotes?: string;
}

// Lookup DTOs
export interface CourtDto {
  id: string;
  code: string;
  name: string;
  location?: string;
  courtType?: string;
  countyId?: string;
  districtId?: string;
  isActive: boolean;
}

export interface CreateCourtRequest {
  code: string;
  name: string;
  location?: string;
  courtType?: string;
  countyId?: string;
  districtId?: string;
}

export async function createCourt(payload: CreateCourtRequest): Promise<CourtDto> {
  const { data } = await apiClient.post<CourtDto>('/courts', payload);
  return data!;
}

export interface HearingTypeDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface HearingStatusDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface HearingOutcomeDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

// ============================================================================
// Court Hearing API
// ============================================================================

/**
 * Get hearings by case ID
 */
export async function getHearingsByCaseId(caseId: string): Promise<CourtHearingDto[]> {
  const { data } = await apiClient.get<CourtHearingDto[]>(`/cases/${caseId}/hearings`);
  return data;
}

/**
 * Get hearing by ID
 */
export async function getHearingById(id: string): Promise<CourtHearingDto> {
  const { data } = await apiClient.get<CourtHearingDto>(`/hearings/${id}`);
  return data;
}

/**
 * Schedule a new hearing
 */
export async function scheduleHearing(
  caseId: string,
  request: CreateCourtHearingRequest
): Promise<CourtHearingDto> {
  const { data } = await apiClient.post<CourtHearingDto>(`/cases/${caseId}/hearings`, request);
  return data;
}

/**
 * Update a hearing
 */
export async function updateHearing(
  id: string,
  request: UpdateCourtHearingRequest
): Promise<CourtHearingDto> {
  const { data } = await apiClient.put<CourtHearingDto>(`/hearings/${id}`, request);
  return data;
}

/**
 * Adjourn a hearing
 */
export async function adjournHearing(
  id: string,
  request: AdjournHearingRequest
): Promise<CourtHearingDto> {
  const { data } = await apiClient.post<CourtHearingDto>(`/hearings/${id}/adjourn`, request);
  return data;
}

/**
 * Complete a hearing
 */
export async function completeHearing(
  id: string,
  request: CompleteHearingRequest
): Promise<CourtHearingDto> {
  const { data } = await apiClient.post<CourtHearingDto>(`/hearings/${id}/complete`, request);
  return data;
}

/**
 * Delete a hearing
 */
export async function deleteHearing(id: string): Promise<void> {
  await apiClient.delete(`/hearings/${id}`);
}

/**
 * Download court minutes PDF
 */
export async function downloadCourtMinutesPdf(id: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/hearings/${id}/minutes`, {
    responseType: 'blob',
  });
  return data;
}

// ============================================================================
// Lookup APIs
// ============================================================================

/**
 * Fetch courts
 */
export async function fetchCourts(): Promise<CourtDto[]> {
  const { data } = await apiClient.get<CourtDto[]>('/courts');
  return data;
}

/**
 * Fetch hearing types
 */
export async function fetchHearingTypes(): Promise<HearingTypeDto[]> {
  const { data } = await apiClient.get<HearingTypeDto[]>('/case/taxonomy/hearing-types');
  return data;
}

/**
 * Fetch hearing statuses
 */
export async function fetchHearingStatuses(): Promise<HearingStatusDto[]> {
  const { data } = await apiClient.get<HearingStatusDto[]>('/case/taxonomy/hearing-statuses');
  return data;
}

/**
 * Fetch hearing outcomes
 */
export async function fetchHearingOutcomes(): Promise<HearingOutcomeDto[]> {
  const { data } = await apiClient.get<HearingOutcomeDto[]>('/case/taxonomy/hearing-outcomes');
  return data;
}
