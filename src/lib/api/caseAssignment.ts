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

/**
 * Get current investigating officer assignment for a case.
 * Returns null when no current assignment (backend returns 404).
 */
export async function getCurrentAssignment(
  caseId: string
): Promise<CaseAssignmentLogDto | null> {
  try {
    const { data } = await apiClient.get<CaseAssignmentLogDto>(
      `/cases/${caseId}/assignments/current`
    );
    return data;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 404) return null;
    }
    throw error;
  }
}

export async function logAssignment(
  caseId: string,
  request: LogAssignmentRequest
): Promise<CaseAssignmentLogDto> {
  const { data } = await apiClient.post<CaseAssignmentLogDto>(`/cases/${caseId}/assignments`, request);
  return data;
}
