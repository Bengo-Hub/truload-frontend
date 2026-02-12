import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface CasePartyDto {
  id: string;
  caseRegisterId: string;
  partyRole: string;
  userId?: string;
  userName?: string;
  driverId?: string;
  driverName?: string;
  vehicleOwnerId?: string;
  vehicleOwnerName?: string;
  transporterId?: string;
  transporterName?: string;
  externalName?: string;
  externalIdNumber?: string;
  externalPhone?: string;
  notes?: string;
  isCurrentlyActive: boolean;
  addedAt: string;
  removedAt?: string;
}

export interface AddCasePartyRequest {
  partyRole: string;
  userId?: string;
  driverId?: string;
  vehicleOwnerId?: string;
  transporterId?: string;
  externalName?: string;
  externalIdNumber?: string;
  externalPhone?: string;
  notes?: string;
}

export interface UpdateCasePartyRequest {
  notes?: string;
  isCurrentlyActive?: boolean;
}

// ============================================================================
// Case Party API
// ============================================================================

export async function getPartiesByCaseId(caseId: string): Promise<CasePartyDto[]> {
  const { data } = await apiClient.get<CasePartyDto[]>(`/cases/${caseId}/parties`);
  return data;
}

export async function addParty(
  caseId: string,
  request: AddCasePartyRequest
): Promise<CasePartyDto> {
  const { data } = await apiClient.post<CasePartyDto>(`/cases/${caseId}/parties`, request);
  return data;
}

export async function updateParty(
  caseId: string,
  partyId: string,
  request: UpdateCasePartyRequest
): Promise<CasePartyDto> {
  const { data } = await apiClient.put<CasePartyDto>(`/cases/${caseId}/parties/${partyId}`, request);
  return data;
}

export async function removeParty(caseId: string, partyId: string): Promise<void> {
  await apiClient.delete(`/cases/${caseId}/parties/${partyId}`);
}
