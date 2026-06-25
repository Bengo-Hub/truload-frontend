/**
 * Offline capture compliance — glue between the cached reference data and the parity-validated
 * compliance engine. Given a weighing's axle config + captured axle weights, derives each axle's
 * permissible weight + grouping from the cached AxleConfiguration weight references, then computes
 * a PROVISIONAL overload result + charges. Returns a WeighingResult-shaped object flagged
 * `provisional` so the existing capture UI can render it; the server recomputes authoritatively on
 * sync. Returns null if the reference data isn't cached (can't compute offline).
 */
import type { WeighingResult } from '@/lib/api/weighing';
import {
  computeProvisionalCompliance,
  computeProvisionalCharges,
  type ToleranceSettingRef,
  type FeeScheduleRef,
} from './compliance';
import {
  getCachedAxleConfigs,
  getCachedTolerances,
  getCachedFeeSchedules,
  getCachedRecentConvictions,
} from './referenceCache';

export interface OfflineCaptureInput {
  axleConfigCode: string;
  ticketNumber?: string | null;
  vehicleRegNumber: string;
  axles: { axleNumber: number; measuredWeightKg: number }[];
}

export type ProvisionalWeighingResult = WeighingResult & { provisional: true };

function normReg(r: string): string {
  return (r ?? '').toUpperCase().replace(/\s+/g, '');
}

/** Compute provisional offline compliance + charges from cached reference data. */
export async function computeOfflineCompliance(
  input: OfflineCaptureInput,
): Promise<ProvisionalWeighingResult | null> {
  const configs = await getCachedAxleConfigs();
  const config = configs?.find((c) => c.axleCode === input.axleConfigCode);
  if (!config || !config.weightReferences?.length) return null;

  const legalFramework = config.legalFramework || 'TRAFFIC_ACT';
  const tolerances = (await getCachedTolerances(legalFramework)) ?? [];
  const feeSchedules = (await getCachedFeeSchedules(legalFramework)) ?? [];
  const convictions = (await getCachedRecentConvictions()) ?? [];

  // Map each captured axle to its weight reference (by axle position) for permissible + grouping.
  const refByPos = new Map(config.weightReferences.map((r) => [r.axlePosition, r]));
  const engineAxles = input.axles.map((a) => {
    const ref = refByPos.get(a.axleNumber);
    return {
      axleNumber: a.axleNumber,
      measuredWeightKg: a.measuredWeightKg,
      permissibleWeightKg: ref?.axleLegalWeightKg ?? 0,
      axleGrouping: ref?.axleGrouping ?? String(a.axleNumber),
    };
  });

  const compliance = computeProvisionalCompliance({
    axles: engineAxles,
    gvwPermissibleKg: config.gvwPermissibleKg,
    // AxleConfiguration GVW tolerance override (>=1000kg) — not on the list DTO; engine falls
    // back to the regulatory GVW tolerance from the cached settings when undefined.
    gvwConfigToleranceKg: (config as { toleranceKg?: number | null }).toleranceKg ?? null,
    legalFramework,
    toleranceSettings: tolerances as ToleranceSettingRef[],
  });

  const priorConvictionCount = convictions.filter(
    (c) => normReg(c.vehicleRegNumber) === normReg(input.vehicleRegNumber),
  ).length;

  const charges = computeProvisionalCharges({
    gvwOverloadKg: compliance.gvwOverloadKg,
    legalFramework,
    priorConvictionCount,
    feeSchedules: feeSchedules as FeeScheduleRef[],
    forexRate: 130, // last-known fallback; server reconciles with the live rate on sync
  });

  return {
    provisional: true,
    weighingId: '',
    ticketNumber: input.ticketNumber ?? 'OFFLINE',
    vehicleRegNumber: input.vehicleRegNumber,
    gvwMeasuredKg: compliance.gvwMeasuredKg,
    gvwPermissibleKg: compliance.gvwPermissibleKg,
    gvwOverloadKg: compliance.gvwOverloadKg,
    gvwToleranceKg: compliance.gvwToleranceKg,
    gvwEffectiveLimitKg: compliance.gvwEffectiveLimitKg,
    isCompliant: compliance.isCompliant,
    overallStatus: compliance.overallStatus,
    totalFeeUsd: charges.totalFeeUsd,
    totalFeeKes: charges.totalFeeKes,
    chargingCurrency: legalFramework === 'TRAFFIC_ACT' ? 'KES' : 'USD',
    hasPermit: false,
    reweighCycleNo: 0,
    weighedAt: new Date().toISOString(),
    operationalToleranceKg: compliance.operationalToleranceKg,
    groupResults: compliance.groupResults.map((g) => ({
      groupLabel: g.groupLabel,
      axleType: '',
      axleCount: g.axleCount,
      groupWeightKg: g.groupWeightKg,
      groupPermissibleKg: g.groupPermissibleKg,
      toleranceKg: g.toleranceKg,
      effectiveLimitKg: g.effectiveLimitKg,
      overloadKg: g.overloadKg,
      feeUsd: 0,
      pavementDamageFactor: 0,
      status: g.status,
    })) as WeighingResult['groupResults'],
    axleCompliance: engineAxles.map((a) => {
      const grp = compliance.groupResults.find((g) => g.groupLabel === a.axleGrouping);
      return {
        axleNumber: a.axleNumber,
        measuredWeightKg: a.measuredWeightKg,
        permissibleWeightKg: a.permissibleWeightKg,
        overloadKg: grp && grp.axleCount === 1 ? grp.overloadKg : 0,
        isCompliant: !grp || grp.overloadKg <= 0,
      };
    }),
  } as ProvisionalWeighingResult;
}
