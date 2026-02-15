import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface DocumentConvention {
  id: string;
  documentType: string;
  displayName: string;
  prefix: string;
  includeStationCode: boolean;
  includeBound: boolean;
  includeDate: boolean;
  dateFormat: string;
  includeVehicleReg: boolean;
  sequencePadding: number;
  separator: string;
  resetFrequency: string;
  isActive: boolean;
}

export interface UpdateDocumentConventionRequest {
  prefix: string;
  includeStationCode: boolean;
  includeBound: boolean;
  includeDate: boolean;
  dateFormat: string;
  includeVehicleReg: boolean;
  sequencePadding: number;
  separator: string;
  resetFrequency: string;
}

export interface DocumentNumberPreview {
  documentType: string;
  previewNumber: string;
  convention: DocumentConvention;
}

// ============================================================================
// API Functions
// ============================================================================

export async function fetchDocumentConventions(): Promise<DocumentConvention[]> {
  const response = await apiClient.get('/document-conventions');
  return response.data;
}

export async function getDocumentConvention(id: string): Promise<DocumentConvention> {
  const response = await apiClient.get(`/document-conventions/${id}`);
  return response.data;
}

export async function updateDocumentConvention(
  id: string,
  data: UpdateDocumentConventionRequest
): Promise<DocumentConvention> {
  const response = await apiClient.put(`/document-conventions/${id}`, data);
  return response.data;
}

export async function previewDocumentNumber(params: {
  documentType: string;
  stationCode?: string;
  bound?: string;
  vehicleReg?: string;
}): Promise<DocumentNumberPreview> {
  const response = await apiClient.get('/document-conventions/preview', { params });
  return response.data;
}
