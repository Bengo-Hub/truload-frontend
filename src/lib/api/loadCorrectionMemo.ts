import { apiClient } from '@/lib/api/client';

/**
 * Load Correction Memo — issued after an overload invoice is fully paid, authorising the
 * reweigh/redistribution process. Mirrors backend DTOs/CaseManagement/LoadCorrectionMemoDto.
 */
export interface LoadCorrectionMemoDto {
  id: string;
  memoNo: string;
  caseRegisterId: string;
  caseNo?: string;
  weighingId: string;
  weighingTicketNo?: string;
  overloadKg: number;
  redistributionType: string;
  reweighScheduledAt?: string;
  reweighWeighingId?: string;
  complianceAchieved: boolean;
  reliefTruckRegNumber?: string;
  reliefTruckEmptyWeightKg?: number;
  issuedById: string;
  issuedByName?: string;
  issuedAt: string;
  createdAt: string;
}

export async function getLoadCorrectionMemoById(id: string): Promise<LoadCorrectionMemoDto> {
  const { data } = await apiClient.get<LoadCorrectionMemoDto>(`/case/memos/${id}`);
  return data;
}

export async function getLoadCorrectionMemosByCase(caseId: string): Promise<LoadCorrectionMemoDto[]> {
  const { data } = await apiClient.get<LoadCorrectionMemoDto[]>(`/case/memos/by-case/${caseId}`);
  return data;
}

/** Returns the memo for a weighing, or null when none exists (404). */
export async function getLoadCorrectionMemoByWeighing(weighingId: string): Promise<LoadCorrectionMemoDto | null> {
  try {
    const { data } = await apiClient.get<LoadCorrectionMemoDto>(`/case/memos/by-weighing/${weighingId}`);
    return data;
  } catch (e: unknown) {
    if ((e as { response?: { status?: number } })?.response?.status === 404) return null;
    throw e;
  }
}
