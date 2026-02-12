import { apiClient } from '@/lib/api/client';

export interface HealthStatus {
  status: string;
  service: string;
  timestamp: string;
  version: string;
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const { data } = await apiClient.get<HealthStatus>('/health');
  return data;
}
