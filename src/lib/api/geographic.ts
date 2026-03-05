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

export interface CreateCountyRequest {
  name: string;
  code?: string;
}

export interface CreateSubcountyRequest {
  countyId: string;
  name: string;
  code?: string;
}

export async function createCounty(payload: CreateCountyRequest): Promise<CountyDto> {
  const { data } = await apiClient.post<CountyDto>('/geographic/counties', payload);
  return data!;
}

export async function createSubcounty(payload: CreateSubcountyRequest): Promise<SubcountyDto> {
  const { data } = await apiClient.post<SubcountyDto>('/geographic/subcounties', payload);
  return data!;
}
