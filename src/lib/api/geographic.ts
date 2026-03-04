import { apiClient } from '@/lib/api/client';

export interface CountyDto {
  id: string;
  code: string;
  name: string;
}

export interface SubcountyDto {
  id: string;
  countyId: string;
  code: string;
  name: string;
}

export async function fetchCounties(): Promise<CountyDto[]> {
  const { data } = await apiClient.get<CountyDto[]>('/geographic/counties');
  return data ?? [];
}

export async function fetchSubcounties(countyId?: string): Promise<SubcountyDto[]> {
  const params = countyId ? { countyId } : {};
  const { data } = await apiClient.get<SubcountyDto[]>('/geographic/subcounties', { params });
  return data ?? [];
}
