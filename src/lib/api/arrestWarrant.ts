import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface ArrestWarrantDto {
  id: string;
  caseRegisterId: string;
  caseNo?: string;
  warrantNo: string;
  issuedBy?: string;
  accusedName: string;
  accusedIdNo?: string;
  offenceDescription?: string;
  warrantStatusId: string;
  warrantStatusName?: string;
  issuedAt: string;
  executedAt?: string;
  droppedAt?: string;
  executionDetails?: string;
  droppedReason?: string;
  issuedDate: string;
  executionDate?: string;
  warrantFileUrl?: string;
  casePartyId?: string;
  casePartyName?: string;
  createdAt: string;
}

export interface CreateArrestWarrantRequest {
  caseRegisterId: string;
  accusedName: string;
  accusedIdNo?: string;
  offenceDescription?: string;
  issuedBy?: string;
  issuedDate: string;
  executionDate?: string;
  warrantFileUrl?: string;
  casePartyId?: string;
}

export interface ExecuteWarrantRequest {
  executionDetails: string;
  executionDate?: string;
}

export interface DropWarrantRequest {
  droppedReason: string;
}

export interface LiftWarrantRequest {
  liftedReason: string;
}

// ============================================================================
// Arrest Warrant API
// ============================================================================

export async function getWarrantsByCaseId(caseId: string): Promise<ArrestWarrantDto[]> {
  const { data } = await apiClient.get<ArrestWarrantDto[]>(`/case/warrants/by-case/${caseId}`);
  return data;
}

export async function getWarrantById(id: string): Promise<ArrestWarrantDto> {
  const { data } = await apiClient.get<ArrestWarrantDto>(`/case/warrants/${id}`);
  return data;
}

export async function createWarrant(request: CreateArrestWarrantRequest): Promise<ArrestWarrantDto> {
  const { data } = await apiClient.post<ArrestWarrantDto>('/case/warrants', request);
  return data;
}

export async function executeWarrant(
  id: string,
  request: ExecuteWarrantRequest
): Promise<ArrestWarrantDto> {
  const { data } = await apiClient.post<ArrestWarrantDto>(`/case/warrants/${id}/execute`, request);
  return data;
}

export async function dropWarrant(
  id: string,
  request: DropWarrantRequest
): Promise<ArrestWarrantDto> {
  const { data } = await apiClient.post<ArrestWarrantDto>(`/case/warrants/${id}/drop`, request);
  return data;
}

export async function liftWarrant(
  id: string,
  request: LiftWarrantRequest
): Promise<ArrestWarrantDto> {
  const { data } = await apiClient.post<ArrestWarrantDto>(`/case/warrants/${id}/lift`, request);
  return data;
}
