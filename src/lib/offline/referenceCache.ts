/**
 * Offline reference-data cache.
 *
 * On login / when online, downloads the compliance reference data (axle configs + weight refs,
 * tolerance settings, fee schedules, demerit schedules, acts, recent convictions) into IndexedDB
 * so the offline compliance engine (compliance.ts) can compute provisional overload + charges
 * while disconnected. Daily TTL; safe to call repeatedly (overwrites).
 */
import { offlineDb } from './db';
import { fetchAxleConfigurations, getAxleConfigurationById, type AxleConfiguration } from '@/lib/api/weighing';
import {
  getToleranceSettings,
  getFeeSchedules,
  getDemeritPointSchedules,
  getAllActs,
  type ToleranceSettingDto,
  type AxleFeeScheduleDto,
  type ActDefinitionDto,
} from '@/lib/api/acts';
import { apiClient } from '@/lib/api/client';

const FRAMEWORKS = ['TRAFFIC_ACT', 'EAC'] as const;
const TTL_MS = 24 * 60 * 60 * 1000;

export interface RecentConviction {
  vehicleId: string;
  vehicleRegNumber: string;
  legalFramework: string;
  convictedAt: string;
}

async function put(key: string, data: unknown): Promise<void> {
  const now = Date.now();
  await offlineDb.referenceDataCache.put({
    key,
    data: JSON.stringify(data),
    fetchedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + TTL_MS).toISOString(),
  });
}

async function getCached<T>(key: string): Promise<T | null> {
  try {
    const entry = await offlineDb.referenceDataCache.get(key);
    return entry ? (JSON.parse(entry.data) as T) : null;
  } catch {
    return null;
  }
}

/** Download + cache all compliance reference data. Best-effort: per-item failures don't abort. */
export async function cacheComplianceReferenceData(): Promise<void> {
  // Axle configurations WITH weight references (the list endpoint omits refs, so resolve each).
  try {
    const list = await fetchAxleConfigurations({ hasWeightReferences: true });
    const withRefs = await Promise.all(
      list.map((c) => getAxleConfigurationById(c.id, true).catch(() => c)),
    );
    await put('axleConfigs', withRefs);
  } catch { /* keep prior cache */ }

  for (const fw of FRAMEWORKS) {
    try { await put(`tolerances:${fw}`, await getToleranceSettings(fw)); } catch { /* keep */ }
    try { await put(`feeSchedules:${fw}`, await getFeeSchedules(fw)); } catch { /* keep */ }
    try { await put(`demerit:${fw}`, await getDemeritPointSchedules(fw)); } catch { /* keep */ }
  }

  try { await put('acts', await getAllActs()); } catch { /* keep */ }

  try {
    const { data } = await apiClient.get<RecentConviction[]>('/prosecutions/recent-convictions', {
      params: { months: 12 },
    });
    await put('recentConvictions', data);
  } catch { /* keep */ }
}

// ── Cache readers used by the offline compliance helper ───────────────────────
export const getCachedAxleConfigs = () => getCached<AxleConfiguration[]>('axleConfigs');
export const getCachedTolerances = (fw: string) => getCached<ToleranceSettingDto[]>(`tolerances:${fw}`);
export const getCachedFeeSchedules = (fw: string) => getCached<AxleFeeScheduleDto[]>(`feeSchedules:${fw}`);
export const getCachedActs = () => getCached<ActDefinitionDto[]>('acts');
export const getCachedRecentConvictions = () => getCached<RecentConviction[]>('recentConvictions');
