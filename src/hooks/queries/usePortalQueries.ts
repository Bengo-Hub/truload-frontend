/**
 * TanStack Query hooks for the Transporter Portal.
 */

import {
  acceptPortalInvite,
  getPortalDashboard,
  getPortalTeam,
  getPortalWeighings,
  getPortalWeighingDetail,
  getPortalVehicles,
  getVehicleWeightTrends,
  getPortalDrivers,
  getDriverPerformance,
  getPortalConsignments,
  getPortalSubscription,
  downloadPortalTicketPdf,
  bulkDownloadTickets,
  importVehiclesCsv,
  inviteTeamMember,
  removeTeamMember,
} from '@/lib/api/portal';
import type {
  AcceptPortalInviteRequest,
  InviteTeamMemberRequest,
  PortalWeighingFilters,
} from '@/types/portal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const PORTAL_QUERY_KEYS = {
  all: ['portal'] as const,
  dashboard: ['portal', 'dashboard'] as const,
  weighings: (filters?: PortalWeighingFilters) => ['portal', 'weighings', filters] as const,
  weighingDetail: (id: string) => ['portal', 'weighings', id] as const,
  vehicles: ['portal', 'vehicles'] as const,
  vehicleTrends: (id: string) => ['portal', 'vehicles', id, 'trends'] as const,
  drivers: ['portal', 'drivers'] as const,
  driverPerformance: (id: string) => ['portal', 'drivers', id, 'performance'] as const,
  consignments: ['portal', 'consignments'] as const,
  subscription: ['portal', 'subscription'] as const,
  team: ['portal', 'team'] as const,
};

export function usePortalDashboard() {
  return useQuery({
    queryKey: PORTAL_QUERY_KEYS.dashboard,
    queryFn: getPortalDashboard,
    staleTime: 30_000,
  });
}

export function usePortalWeighings(filters: PortalWeighingFilters = {}) {
  return useQuery({
    queryKey: PORTAL_QUERY_KEYS.weighings(filters),
    queryFn: () => getPortalWeighings(filters),
    staleTime: 30_000,
  });
}

export function usePortalWeighingDetail(id: string) {
  return useQuery({
    queryKey: PORTAL_QUERY_KEYS.weighingDetail(id),
    queryFn: () => getPortalWeighingDetail(id),
    enabled: !!id,
  });
}

export function usePortalVehicles() {
  return useQuery({
    queryKey: PORTAL_QUERY_KEYS.vehicles,
    queryFn: getPortalVehicles,
    staleTime: 60_000,
  });
}

export function usePortalVehicleTrends(vehicleId: string) {
  return useQuery({
    queryKey: PORTAL_QUERY_KEYS.vehicleTrends(vehicleId),
    queryFn: () => getVehicleWeightTrends(vehicleId),
    enabled: !!vehicleId,
  });
}

export function usePortalDrivers() {
  return useQuery({
    queryKey: PORTAL_QUERY_KEYS.drivers,
    queryFn: getPortalDrivers,
    staleTime: 60_000,
  });
}

export function usePortalDriverPerformance(driverId: string) {
  return useQuery({
    queryKey: PORTAL_QUERY_KEYS.driverPerformance(driverId),
    queryFn: () => getDriverPerformance(driverId),
    enabled: !!driverId,
  });
}

export function usePortalConsignments() {
  return useQuery({
    queryKey: PORTAL_QUERY_KEYS.consignments,
    queryFn: getPortalConsignments,
    staleTime: 60_000,
  });
}

export function usePortalSubscription() {
  return useQuery({
    queryKey: PORTAL_QUERY_KEYS.subscription,
    queryFn: getPortalSubscription,
    staleTime: 120_000,
  });
}

export function useDownloadPortalTicket() {
  return useMutation({
    mutationFn: (weighingId: string) => downloadPortalTicketPdf(weighingId),
  });
}

export function useBulkDownloadTickets() {
  return useMutation({
    mutationFn: ({ fromDate, toDate }: { fromDate: string; toDate: string }) =>
      bulkDownloadTickets(fromDate, toDate),
  });
}

export function useImportVehiclesCsv() {
  return useMutation({
    mutationFn: (file: File) => importVehiclesCsv(file),
  });
}

export function usePortalTeam() {
  return useQuery({
    queryKey: PORTAL_QUERY_KEYS.team,
    queryFn: getPortalTeam,
    staleTime: 60_000,
  });
}

export function useInviteTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: InviteTeamMemberRequest) => inviteTeamMember(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PORTAL_QUERY_KEYS.team });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeTeamMember(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PORTAL_QUERY_KEYS.team });
    },
  });
}

export function useAcceptPortalInvite() {
  return useMutation({
    mutationFn: (request: AcceptPortalInviteRequest) => acceptPortalInvite(request),
  });
}
