import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface CaseClosureChecklistDto {
  id: string;
  caseRegisterId: string;
  caseNo?: string;
  closureTypeId?: string;
  closureTypeName?: string;
  legalSectionId?: string;
  legalSectionTitle?: string;
  subfileAComplete: boolean;
  subfileBComplete: boolean;
  subfileCComplete: boolean;
  subfileDComplete: boolean;
  subfileEComplete: boolean;
  subfileFComplete: boolean;
  subfileGComplete: boolean;
  subfileHComplete: boolean;
  subfileIComplete: boolean;
  subfileJComplete: boolean;
  allSubfilesVerified: boolean;
  reviewStatusId?: string;
  reviewStatusName?: string;
  reviewRequestedAt?: string;
  reviewRequestedById?: string;
  reviewRequestedByName?: string;
  reviewNotes?: string;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  verifiedById?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateChecklistRequest {
  closureTypeId?: string;
  legalSectionId?: string;
  subfileAComplete?: boolean;
  subfileBComplete?: boolean;
  subfileCComplete?: boolean;
  subfileDComplete?: boolean;
  subfileEComplete?: boolean;
  subfileFComplete?: boolean;
  subfileGComplete?: boolean;
  subfileHComplete?: boolean;
  subfileIComplete?: boolean;
  subfileJComplete?: boolean;
}

export interface RequestReviewRequest {
  reviewNotes?: string;
}

export interface ReviewDecisionRequest {
  reviewNotes?: string;
}

export interface ClosureTypeDto {
  id: string;
  code: string;
  name: string;
  description?: string;
}

// ============================================================================
// Closure Checklist API
// ============================================================================

export async function getChecklist(caseId: string): Promise<CaseClosureChecklistDto> {
  const { data } = await apiClient.get<CaseClosureChecklistDto>(`/cases/${caseId}/closure-checklist`);
  return data;
}

export async function updateChecklist(
  caseId: string,
  request: UpdateChecklistRequest
): Promise<CaseClosureChecklistDto> {
  const { data } = await apiClient.put<CaseClosureChecklistDto>(`/cases/${caseId}/closure-checklist`, request);
  return data;
}

export async function requestReview(
  caseId: string,
  request: RequestReviewRequest
): Promise<CaseClosureChecklistDto> {
  const { data } = await apiClient.post<CaseClosureChecklistDto>(
    `/cases/${caseId}/closure-checklist/request-review`,
    request
  );
  return data;
}

export async function approveReview(
  caseId: string,
  request: ReviewDecisionRequest
): Promise<CaseClosureChecklistDto> {
  const { data } = await apiClient.post<CaseClosureChecklistDto>(
    `/cases/${caseId}/closure-checklist/approve-review`,
    request
  );
  return data;
}

export async function rejectReview(
  caseId: string,
  request: ReviewDecisionRequest
): Promise<CaseClosureChecklistDto> {
  const { data } = await apiClient.post<CaseClosureChecklistDto>(
    `/cases/${caseId}/closure-checklist/reject-review`,
    request
  );
  return data;
}

export async function fetchClosureTypes(): Promise<ClosureTypeDto[]> {
  const { data } = await apiClient.get<ClosureTypeDto[]>('/case/taxonomy/closure-types');
  return data;
}
