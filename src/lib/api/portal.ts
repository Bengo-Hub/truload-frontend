/**
 * Portal API Client
 *
 * API methods for the Transporter Portal.
 * Uses the same apiClient (JWT auth) but hits /portal/ endpoints.
 */

import { apiClient } from './client';
import type {
  AcceptPortalInviteRequest,
  InviteTeamMemberRequest,
  PortalConsignment,
  PortalDashboardStats,
  PortalDriver,
  PortalDriverPerformance,
  PortalRegistrationRequest,
  PortalRegistrationResponse,
  PortalSubscription,
  PortalTeamMember,
  PortalVehicle,
  PortalVehicleWeightTrend,
  PortalWeighingDetail,
  PortalWeighingFilters,
  PortalWeighingListResponse,
} from '@/types/portal';

// ============================================================================
// Registration
// ============================================================================

export async function registerPortal(
  data: PortalRegistrationRequest
): Promise<PortalRegistrationResponse> {
  const response = await apiClient.post<PortalRegistrationResponse>('/portal/register', data);
  return response.data;
}

// ============================================================================
// Dashboard
// ============================================================================

export async function getPortalDashboard(): Promise<PortalDashboardStats> {
  const { data } = await apiClient.get<PortalDashboardStats>('/portal/dashboard');
  return data;
}

// ============================================================================
// Weighings
// ============================================================================

export async function getPortalWeighings(
  filters: PortalWeighingFilters = {}
): Promise<PortalWeighingListResponse> {
  const { data } = await apiClient.get<PortalWeighingListResponse>('/portal/weighings', {
    params: filters,
  });
  return data;
}

export async function getPortalWeighingDetail(weighingId: string): Promise<PortalWeighingDetail> {
  const { data } = await apiClient.get<PortalWeighingDetail>(`/portal/weighings/${weighingId}`);
  return data;
}

export async function downloadPortalTicketPdf(
  weighingId: string
): Promise<{ blob: Blob; fileName: string }> {
  const response = await apiClient.get(`/portal/weighings/${weighingId}/pdf`, {
    responseType: 'blob',
  });
  const contentDisposition = response.headers['content-disposition'];
  let fileName = `ticket-${weighingId}.pdf`;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match?.[1]) {
      fileName = match[1].replace(/['"]/g, '');
    }
  }
  return { blob: response.data as Blob, fileName };
}

// ============================================================================
// Vehicles
// ============================================================================

export async function getPortalVehicles(): Promise<PortalVehicle[]> {
  const { data } = await apiClient.get<PortalVehicle[]>('/portal/vehicles');
  return data;
}

export async function getVehicleWeightTrends(
  vehicleId: string
): Promise<PortalVehicleWeightTrend[]> {
  const { data } = await apiClient.get<PortalVehicleWeightTrend[]>(
    `/portal/vehicles/${vehicleId}/weight-trends`
  );
  return data;
}

// ============================================================================
// Drivers
// ============================================================================

export async function getPortalDrivers(): Promise<PortalDriver[]> {
  const { data } = await apiClient.get<PortalDriver[]>('/portal/drivers');
  return data;
}

export async function getDriverPerformance(driverId: string): Promise<PortalDriverPerformance> {
  const { data } = await apiClient.get<PortalDriverPerformance>(
    `/portal/drivers/${driverId}/performance`
  );
  return data;
}

// ============================================================================
// Consignments
// ============================================================================

export async function getPortalConsignments(): Promise<PortalConsignment[]> {
  const { data } = await apiClient.get<PortalConsignment[]>('/portal/consignments');
  return data;
}

// ============================================================================
// Subscription
// ============================================================================

export async function getPortalSubscription(): Promise<PortalSubscription> {
  const { data } = await apiClient.get<PortalSubscription>('/portal/subscription');
  return data;
}

// ============================================================================
// Team Management
// ============================================================================

export async function getPortalTeam(): Promise<PortalTeamMember[]> {
  const { data } = await apiClient.get<PortalTeamMember[]>('/portal/team');
  return data;
}

export async function inviteTeamMember(
  request: InviteTeamMemberRequest
): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>('/portal/team/invite', request);
  return data;
}

export async function removeTeamMember(userId: string): Promise<{ message: string }> {
  const { data } = await apiClient.delete<{ message: string }>(`/portal/team/${userId}`);
  return data;
}

export async function acceptPortalInvite(
  request: AcceptPortalInviteRequest
): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>('/portal/team/accept', request);
  return data;
}

// ============================================================================
// Bulk Download
// ============================================================================

export async function bulkDownloadTickets(
  fromDate: string,
  toDate: string
): Promise<{ blob: Blob; fileName: string }> {
  const response = await apiClient.get('/portal/weighings/bulk-download', {
    params: { fromDate, toDate },
    responseType: 'blob',
  });
  const contentDisposition = response.headers['content-disposition'];
  let fileName = `tickets_${fromDate}_${toDate}.zip`;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match?.[1]) {
      fileName = match[1].replace(/['"]/g, '');
    }
  }
  return { blob: response.data as Blob, fileName };
}

// ============================================================================
// Vehicle Import
// ============================================================================

export interface VehicleImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export async function importVehiclesCsv(file: File): Promise<VehicleImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<VehicleImportResult>('/portal/vehicles/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
