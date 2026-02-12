import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface CaseAssignmentLogDto {
  id: string;
  caseRegisterId: string;
  caseNo?: string;
  previousOfficerId?: string;
  previousOfficerName?: string;
  newOfficerId: string;
  newOfficerName?: string;
  assignedById: string;
  assignedByName?: string;
  assignmentType: string;
  reason: string;
  assignedAt: string;
  isCurrent: boolean;
  officerRank?: string;
}

export interface LogAssignmentRequest {
  newOfficerId: string;
  assignmentType: string;
  reason: string;
  officerRank?: string;
}

// ============================================================================
// Case Assignment API
// ============================================================================

export async function getAssignmentsByCaseId(caseId: string): Promise<CaseAssignmentLogDto[]> {
  const { data } = await apiClient.get<CaseAssignmentLogDto[]>(`/cases/${caseId}/assignments`);
  return data;
}

export async function getCurrentAssignment(caseId: string): Promise<CaseAssignmentLogDto> {
  const { data } = await apiClient.get<CaseAssignmentLogDto>(`/cases/${caseId}/assignments/current`);
  return data;
}

export async function logAssignment(
  caseId: string,
  request: LogAssignmentRequest
): Promise<CaseAssignmentLogDto> {
  const { data } = await apiClient.post<CaseAssignmentLogDto>(`/cases/${caseId}/assignments`, request);
  return data;
}
