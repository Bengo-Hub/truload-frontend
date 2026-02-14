import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface CaseDocumentDto {
  id: string;
  documentType: string;
  displayName: string;
  referenceNo: string | null;
  downloadUrl: string;
  status: string | null;
  createdAt: string;
  createdBy: string | null;
}

export interface CaseDocumentSummaryDto {
  totalDocuments: number;
  weightTickets: number;
  chargeSheets: number;
  invoices: number;
  receipts: number;
  courtMinutes: number;
  specialReleaseCertificates: number;
  subfiles: number;
}

// ============================================================================
// API Functions
// ============================================================================

export async function getCaseDocuments(caseId: string) {
  const response = await apiClient.get<CaseDocumentDto[]>(`/cases/${caseId}/documents`);
  return response.data;
}

export async function getCaseDocumentSummary(caseId: string) {
  const response = await apiClient.get<CaseDocumentSummaryDto>(`/cases/${caseId}/documents/summary`);
  return response.data;
}
