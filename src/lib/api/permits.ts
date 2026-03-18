import { apiClient } from '@/lib/api/client';
import { 
  Permit, 
  PermitType, 
  CreatePermitRequest, 
  UpdatePermitRequest,
  ExtendPermitRequest
} from '@/types/weighing';

// ============================================================================
// Permit Types API
// ============================================================================

export async function fetchPermitTypes(): Promise<PermitType[]> {
  const { data } = await apiClient.get<PermitType[]>('/PermitTypes');
  return data;
}

// ============================================================================
// Permits API
// ============================================================================

export async function fetchPermitsByVehicle(vehicleId: string): Promise<Permit[]> {
  const { data } = await apiClient.get<Permit[]>(`/Permits/vehicle/${vehicleId}`);
  return data;
}

export async function fetchActivePermitForVehicle(vehicleId: string): Promise<Permit | null> {
  try {
    const { data } = await apiClient.get<Permit>(`/Permits/vehicle/${vehicleId}/active`);
    return data;
  } catch (error: any) {
    if (error.response?.status === 404) return null;
    throw error;
  }
}

export async function getPermitById(id: string): Promise<Permit> {
  const { data } = await apiClient.get<Permit>(`/Permits/${id}`);
  return data;
}

export async function getPermitByNo(permitNo: string): Promise<Permit | null> {
  try {
    const { data } = await apiClient.get<Permit>(`/Permits/by-number/${encodeURIComponent(permitNo)}`);
    return data;
  } catch (error: any) {
    if (error.response?.status === 404) return null;
    throw error;
  }
}

export async function createPermit(request: CreatePermitRequest): Promise<Permit> {
  const { data } = await apiClient.post<Permit>('/Permits', request);
  return data;
}

export async function updatePermit(id: string, request: UpdatePermitRequest): Promise<Permit> {
  const { data } = await apiClient.put<Permit>(`/Permits/${id}`, request);
  return data;
}

export async function revokePermit(id: string): Promise<Permit> {
  const { data } = await apiClient.post<Permit>(`/Permits/${id}/revoke`);
  return data;
}

export async function extendPermit(id: string, request: ExtendPermitRequest): Promise<Permit> {
  const { data } = await apiClient.post<Permit>(`/Permits/${id}/extend`, request);
  return data;
}

/**
 * Get the URL for the permit PDF document
 */
export function getPermitPdfUrl(id: string): string {
  // Assuming the baseURL is configured in apiClient or we can get it from env
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  return `${baseUrl}/api/Permits/${id}/pdf`;
}

export async function fetchPermitPdfBytes(id: string): Promise<Blob> {
  const { data } = await apiClient.get(`/Permits/${id}/pdf`, {
    responseType: 'blob'
  });
  return data;
}
