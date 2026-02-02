import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface YardEntryDto {
  id: string;
  weighingId: string;
  stationId: string;
  stationName: string;
  reason: string;
  status: string;
  enteredAt: string;
  releasedAt?: string;
  ticketNumber?: string;
  vehicleRegNumber?: string;
  driverName?: string;
  transporterName?: string;
  gvwMeasuredKg?: number;
  gvwPermissibleKg?: number;
  overloadKg?: number;
  totalFeeUsd?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateYardEntryRequest {
  weighingId: string;
  stationId: string;
  reason: string;
}

export interface ReleaseYardEntryRequest {
  notes?: string;
}

export interface SearchYardEntriesParams {
  stationId?: string;
  status?: string;
  reason?: string;
  vehicleRegNo?: string;
  fromDate?: string;
  toDate?: string;
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface YardEntrySearchResult {
  items: YardEntryDto[];
  totalCount: number;
  skip: number;
  take: number;
}

export interface VehicleTagDto {
  id: string;
  regNo: string;
  tagType: string;
  tagCategoryId: string;
  tagCategoryCode: string;
  tagCategoryName: string;
  reason: string;
  stationCode: string;
  status: string;
  tagPhotoPath?: string;
  effectiveTimePeriod?: string;
  createdById: string;
  createdByName?: string;
  closedById?: string;
  closedByName?: string;
  closedReason?: string;
  openedAt: string;
  closedAt?: string;
  exported: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleTagRequest {
  regNo: string;
  tagType?: string;
  tagCategoryId: string;
  reason: string;
  stationCode: string;
  tagPhotoPath?: string;
  effectiveDays?: number;
}

export interface CloseVehicleTagRequest {
  closedReason: string;
}

export interface SearchVehicleTagsParams {
  regNo?: string;
  status?: string;
  tagType?: string;
  tagCategoryId?: string;
  stationCode?: string;
  fromDate?: string;
  toDate?: string;
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface VehicleTagSearchResult {
  items: VehicleTagDto[];
  totalCount: number;
  skip: number;
  take: number;
}

export interface TagCategoryDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

// ============================================================================
// Yard Entry API
// ============================================================================

export async function searchYardEntries(
  params: SearchYardEntriesParams
): Promise<YardEntrySearchResult> {
  const { data } = await apiClient.get<YardEntrySearchResult>(
    '/yard-entries',
    { params }
  );
  return data;
}

export async function getYardEntry(id: string): Promise<YardEntryDto> {
  const { data } = await apiClient.get<YardEntryDto>(`/yard-entries/${id}`);
  return data;
}

export async function createYardEntry(
  request: CreateYardEntryRequest
): Promise<YardEntryDto> {
  const { data } = await apiClient.post<YardEntryDto>('/yard-entries', request);
  return data;
}

export async function releaseYardEntry(
  id: string,
  request: ReleaseYardEntryRequest
): Promise<YardEntryDto> {
  const { data } = await apiClient.put<YardEntryDto>(
    `/yard-entries/${id}/release`,
    request
  );
  return data;
}

export async function updateYardEntryStatus(
  id: string,
  status: string
): Promise<YardEntryDto> {
  const { data } = await apiClient.put<YardEntryDto>(
    `/yard-entries/${id}/status`,
    JSON.stringify(status),
    { headers: { 'Content-Type': 'application/json' } }
  );
  return data;
}

// ============================================================================
// Vehicle Tag API
// ============================================================================

export async function searchVehicleTags(
  params: SearchVehicleTagsParams
): Promise<VehicleTagSearchResult> {
  const { data } = await apiClient.get<VehicleTagSearchResult>(
    '/vehicle-tags',
    { params }
  );
  return data;
}

export async function getVehicleTag(id: string): Promise<VehicleTagDto> {
  const { data } = await apiClient.get<VehicleTagDto>(`/vehicle-tags/${id}`);
  return data;
}

export async function checkVehicleTags(regNo: string): Promise<VehicleTagDto[]> {
  const { data } = await apiClient.get<VehicleTagDto[]>(
    `/vehicle-tags/check/${encodeURIComponent(regNo)}`
  );
  return data;
}

export async function createVehicleTag(
  request: CreateVehicleTagRequest
): Promise<VehicleTagDto> {
  const { data } = await apiClient.post<VehicleTagDto>('/vehicle-tags', request);
  return data;
}

export async function closeVehicleTag(
  id: string,
  request: CloseVehicleTagRequest
): Promise<VehicleTagDto> {
  const { data } = await apiClient.put<VehicleTagDto>(
    `/vehicle-tags/${id}/close`,
    request
  );
  return data;
}

export async function fetchTagCategories(): Promise<TagCategoryDto[]> {
  const { data } = await apiClient.get<TagCategoryDto[]>('/vehicle-tags/categories');
  return data;
}
