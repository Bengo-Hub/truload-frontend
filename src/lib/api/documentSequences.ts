import { apiClient } from '@/lib/api/client';

export interface DocumentSequenceDto {
  id: string;
  organizationId: string;
  stationId: string | null;
  stationName: string | null;
  documentType: string;
  currentSequence: number;
  resetFrequency: string;
  lastResetDate: string;
  updatedAt: string;
}

export interface UpdateDocumentSequenceRequest {
  currentSequence?: number;
  resetFrequency?: string;
  resetNow?: boolean;
}

export async function fetchDocumentSequences(stationId?: string): Promise<DocumentSequenceDto[]> {
  const params = stationId ? { stationId } : undefined;
  const response = await apiClient.get<DocumentSequenceDto[]>('/document-sequences', { params });
  return response.data;
}

export async function getDocumentSequence(id: string): Promise<DocumentSequenceDto> {
  const response = await apiClient.get<DocumentSequenceDto>(`/document-sequences/${id}`);
  return response.data;
}

export async function updateDocumentSequence(
  id: string,
  data: UpdateDocumentSequenceRequest
): Promise<DocumentSequenceDto> {
  const response = await apiClient.put<DocumentSequenceDto>(`/document-sequences/${id}`, data);
  return response.data;
}
