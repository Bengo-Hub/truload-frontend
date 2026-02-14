import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface ActDefinitionDto {
  id: string;
  code: string;
  name: string;
  actType: string;
  fullName: string | null;
  description: string | null;
  effectiveDate: string | null;
  chargingCurrency: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AxleFeeScheduleDto {
  id: string;
  legalFramework: string;
  feeType: string;
  overloadMinKg: number;
  overloadMaxKg: number | null;
  feePerKgUsd: number;
  flatFeeUsd: number;
  demeritPoints: number;
  penaltyDescription: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}

export interface AxleTypeOverloadFeeScheduleDto {
  id: string;
  overloadMinKg: number;
  overloadMaxKg: number | null;
  steeringAxleFeeUsd: number;
  singleDriveAxleFeeUsd: number;
  tandemAxleFeeUsd: number;
  tridemAxleFeeUsd: number;
  quadAxleFeeUsd: number;
  legalFramework: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}

export interface ToleranceSettingDto {
  id: string;
  code: string;
  name: string;
  legalFramework: string;
  tolerancePercentage: number;
  toleranceKg: number | null;
  appliesTo: string;
  description: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}

export interface DemeritPointScheduleDto {
  id: string;
  violationType: string;
  overloadMinKg: number;
  overloadMaxKg: number | null;
  points: number;
  legalFramework: string;
  effectiveFrom: string;
  isActive: boolean;
}

export interface ActConfigurationDto {
  act: ActDefinitionDto;
  feeSchedules: AxleFeeScheduleDto[];
  axleTypeFeeSchedules: AxleTypeOverloadFeeScheduleDto[];
  toleranceSettings: ToleranceSettingDto[];
  demeritPointSchedules: DemeritPointScheduleDto[];
}

export interface ActConfigurationSummaryDto {
  totalActs: number;
  defaultActCode: string;
  defaultActName: string;
  defaultCurrency: string;
  totalFeeSchedules: number;
  totalToleranceSettings: number;
  totalDemeritSchedules: number;
}

// ============================================================================
// API Functions
// ============================================================================

export async function getAllActs() {
  const response = await apiClient.get<ActDefinitionDto[]>('/acts');
  return response.data;
}

export async function getActById(id: string) {
  const response = await apiClient.get<ActDefinitionDto>(`/acts/${id}`);
  return response.data;
}

export async function getActConfiguration(id: string) {
  const response = await apiClient.get<ActConfigurationDto>(`/acts/${id}/configuration`);
  return response.data;
}

export async function getDefaultAct() {
  const response = await apiClient.get<ActDefinitionDto>('/acts/default');
  return response.data;
}

export async function setDefaultAct(id: string) {
  const response = await apiClient.put<ActDefinitionDto>(`/acts/${id}/set-default`);
  return response.data;
}

export async function getFeeSchedules(legalFramework: string) {
  const response = await apiClient.get<AxleFeeScheduleDto[]>('/acts/fee-schedules', {
    params: { legalFramework },
  });
  return response.data;
}

export async function getAxleTypeFeeSchedules(legalFramework: string) {
  const response = await apiClient.get<AxleTypeOverloadFeeScheduleDto[]>('/acts/axle-type-fees', {
    params: { legalFramework },
  });
  return response.data;
}

export async function getToleranceSettings(legalFramework: string) {
  const response = await apiClient.get<ToleranceSettingDto[]>('/acts/tolerances', {
    params: { legalFramework },
  });
  return response.data;
}

export async function getDemeritPointSchedules(legalFramework: string) {
  const response = await apiClient.get<DemeritPointScheduleDto[]>('/acts/demerit-points', {
    params: { legalFramework },
  });
  return response.data;
}

export async function getActsSummary() {
  const response = await apiClient.get<ActConfigurationSummaryDto>('/acts/summary');
  return response.data;
}
