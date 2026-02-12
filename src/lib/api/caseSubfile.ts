import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface CaseSubfileDto {
  id: string;
  caseRegisterId: string;
  caseNo?: string;
  subfileTypeId: string;
  subfileTypeName?: string;
  subfileName?: string;
  documentType?: string;
  content?: string;
  filePath?: string;
  fileUrl?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  checksum?: string;
  uploadedById?: string;
  uploadedByName?: string;
  uploadedAt: string;
  metadata?: string;
  createdAt: string;
}

export interface CreateCaseSubfileRequest {
  caseRegisterId: string;
  subfileTypeId: string;
  subfileName?: string;
  documentType?: string;
  content?: string;
  filePath?: string;
  fileUrl?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  metadata?: string;
}

export interface UpdateCaseSubfileRequest {
  subfileName?: string;
  content?: string;
  filePath?: string;
  fileUrl?: string;
  metadata?: string;
}

export interface SubfileCompletionDto {
  caseRegisterId: string;
  items: SubfileTypeCompletionItem[];
  totalTypes: number;
  completedTypes: number;
}

export interface SubfileTypeCompletionItem {
  subfileTypeId: string;
  subfileTypeCode: string;
  subfileTypeName: string;
  hasDocuments: boolean;
  documentCount: number;
}

export interface SubfileTypeDto {
  id: string;
  code: string;
  name: string;
  description?: string;
}

// ============================================================================
// Case Subfile API
// ============================================================================

export async function getSubfilesByCaseId(caseId: string): Promise<CaseSubfileDto[]> {
  const { data } = await apiClient.get<CaseSubfileDto[]>(`/case/subfiles/by-case/${caseId}`);
  return data;
}

export async function getSubfileCompletion(caseId: string): Promise<SubfileCompletionDto> {
  const { data } = await apiClient.get<SubfileCompletionDto>(`/case/subfiles/by-case/${caseId}/completion`);
  return data;
}

export async function createSubfile(request: CreateCaseSubfileRequest): Promise<CaseSubfileDto> {
  const { data } = await apiClient.post<CaseSubfileDto>('/case/subfiles', request);
  return data;
}

export async function updateSubfile(
  id: string,
  request: UpdateCaseSubfileRequest
): Promise<CaseSubfileDto> {
  const { data } = await apiClient.put<CaseSubfileDto>(`/case/subfiles/${id}`, request);
  return data;
}

export async function deleteSubfile(id: string): Promise<void> {
  await apiClient.delete(`/case/subfiles/${id}`);
}

export async function fetchSubfileTypes(): Promise<SubfileTypeDto[]> {
  const { data } = await apiClient.get<SubfileTypeDto[]>('/case/taxonomy/subfile-types');
  return data;
}
