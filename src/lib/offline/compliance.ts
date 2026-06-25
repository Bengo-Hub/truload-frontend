/**
 * Offline provisional compliance engine.
 *
 * A faithful TypeScript port of the backend overload computation
 * (AxleGroupAggregationService.AggregateAxleGroupsAsync + CalculateGroupToleranceAsync +
 * the GVW tolerance logic in CalculateComplianceAsync), so an officer can see EXACT overload
 * results while offline using cached reference data. The result is flagged `provisional`:
 * the server recomputes authoritatively (and adds fees/conviction-tier/forex) when the
 * weighing syncs.
 *
 * IMPORTANT: this must stay in lockstep with the backend. It is validated by a parity test
 * (scripts/offline-compliance-parity.mjs) that replays real weighings through this engine and
 * compares against the server-computed overloads. Do not diverge without re-running parity.
 */

// ── Cached reference shapes (subset of the backend DTOs) ──────────────────────
export interface ToleranceSettingRef {
  code: string;
  legalFramework: string; // 'TRAFFIC_ACT' | 'EAC' | '' for STANDARD_LAW_*/OPERATIONAL_ALLOWANCE
  tolerancePercentage: number;
  toleranceKg: number | null;
  appliesTo: string; // 'GVW' | 'AXLE' | ''
}

export interface CompliantAxleInput {
  axleNumber: number;
  measuredWeightKg: number;
  permissibleWeightKg: number; // from axle config weight-ref (+ permit ext); server-equivalent
  axleGrouping: string; // 'A' | 'B' | ...
}

export interface ComplianceInput {
  axles: CompliantAxleInput[];
  gvwPermissibleKg: number;
  /** AxleConfiguration.ToleranceKg — a GVW-level override; only used when >= 1000kg. */
  gvwConfigToleranceKg?: number | null;
  legalFramework: string; // 'TRAFFIC_ACT' | 'EAC'
  toleranceSettings: ToleranceSettingRef[];
}

export interface GroupResult {
  groupLabel: string;
  axleCount: number;
  groupWeightKg: number;
  groupPermissibleKg: number;
  toleranceKg: number;
  effectiveLimitKg: number;
  overloadKg: number;
  status: 'LEGAL' | 'WARNING' | 'OVERLOAD';
}

export interface ProvisionalComplianceResult {
  provisional: true;
  isCompliant: boolean;
  overallStatus: 'LEGAL' | 'WARNING' | 'OVERLOAD';
  gvwMeasuredKg: number;
  gvwPermissibleKg: number;
  gvwToleranceKg: number;
  gvwEffectiveLimitKg: number;
  gvwOverloadKg: number;
  operationalToleranceKg: number;
  groupResults: GroupResult[];
}

const eq = (a: string | undefined, b: string) => (a ?? '').toUpperCase() === b.toUpperCase();
const up = (a: string | undefined) => (a ?? '').toUpperCase();

/**
 * Resolve the effective tolerance setting for (framework, appliesTo), faithfully mirroring
 * ToleranceRepository.GetToleranceAsync: match exact framework OR 'BOTH' OR 'GLOBAL', and
 * exact appliesTo OR 'BOTH'; then prioritise exact framework (2) > BOTH (1) > GLOBAL (0),
 * then exact appliesTo > BOTH. (EffectiveFrom/active filtering is done server-side before
 * the cache is populated.)
 */
function getTolerance(
  settings: ToleranceSettingRef[],
  legalFramework: string,
  appliesTo: string,
): ToleranceSettingRef | null {
  const f = up(legalFramework);
  const a = up(appliesTo);
  const fwPriority = (s: ToleranceSettingRef) => (up(s.legalFramework) === f ? 2 : up(s.legalFramework) === 'BOTH' ? 1 : 0);
  const applPriority = (s: ToleranceSettingRef) => (up(s.appliesTo) === a ? 1 : 0);
  const candidates = settings.filter(
    (s) =>
      (up(s.legalFramework) === f || up(s.legalFramework) === 'BOTH' || up(s.legalFramework) === 'GLOBAL') &&
      (up(s.appliesTo) === a || up(s.appliesTo) === 'BOTH'),
  );
  if (candidates.length === 0) return null;
  candidates.sort((x, y) => fwPriority(y) - fwPriority(x) || applPriority(y) - applPriority(x));
  return candidates[0];
}

function getByCode(settings: ToleranceSettingRef[], code: string): ToleranceSettingRef | null {
  return settings.find((s) => eq(s.code, code)) ?? null;
}

/** kg from a setting: fixed kg wins, else percentage of permissible, else 0. */
function toleranceKgOf(setting: ToleranceSettingRef | null, permissibleKg: number): number {
  if (!setting) return 0;
  if (setting.toleranceKg != null && setting.toleranceKg > 0) return setting.toleranceKg;
  if (setting.tolerancePercentage > 0) return Math.round(permissibleKg * (setting.tolerancePercentage / 100));
  return 0;
}

/**
 * Per-axle-group tolerance — mirrors CalculateGroupToleranceAsync precedence:
 *   1. Act-specific AXLE setting (exists => final, even 0% = strict).
 *   2. STANDARD_LAW_SINGLE (<=1 axle) / STANDARD_LAW_GROUP (2+) — only if no act AXLE setting.
 *   3. 0% strict.
 */
function groupToleranceKg(
  settings: ToleranceSettingRef[],
  legalFramework: string,
  axleCount: number,
  groupPermissibleKg: number,
): number {
  const actSetting = getTolerance(settings, legalFramework, 'AXLE');
  if (actSetting) return toleranceKgOf(actSetting, groupPermissibleKg);

  const standard = getByCode(settings, axleCount <= 1 ? 'STANDARD_LAW_SINGLE' : 'STANDARD_LAW_GROUP');
  return toleranceKgOf(standard, groupPermissibleKg);
}

function determineStatus(overloadKg: number, opToleranceKg: number): 'LEGAL' | 'WARNING' | 'OVERLOAD' {
  if (overloadKg <= 0) return 'LEGAL';
  if (overloadKg <= opToleranceKg) return 'WARNING';
  return 'OVERLOAD';
}

/** Compute exact overload (GVW + per axle group) offline from cached reference data. */
export function computeProvisionalCompliance(input: ComplianceInput): ProvisionalComplianceResult {
  const { axles, legalFramework, toleranceSettings } = input;

  const opSetting = getByCode(toleranceSettings, 'OPERATIONAL_ALLOWANCE');
  const operationalToleranceKg = opSetting?.toleranceKg ?? 200;

  // ── Axle groups (group by axleGrouping, ordered) ──
  const groupMap = new Map<string, CompliantAxleInput[]>();
  for (const a of axles) {
    const arr = groupMap.get(a.axleGrouping) ?? [];
    arr.push(a);
    groupMap.set(a.axleGrouping, arr);
  }
  const groupResults: GroupResult[] = [...groupMap.keys()]
    .sort()
    .map((label) => {
      const groupAxles = groupMap.get(label)!;
      const groupWeightKg = groupAxles.reduce((s, a) => s + a.measuredWeightKg, 0);
      const groupPermissibleKg = groupAxles.reduce((s, a) => s + a.permissibleWeightKg, 0);
      const toleranceKg = groupToleranceKg(toleranceSettings, legalFramework, groupAxles.length, groupPermissibleKg);
      const effectiveLimitKg = groupPermissibleKg + toleranceKg;
      const overloadKg = Math.max(0, groupWeightKg - effectiveLimitKg);
      return {
        groupLabel: label,
        axleCount: groupAxles.length,
        groupWeightKg,
        groupPermissibleKg,
        toleranceKg,
        effectiveLimitKg,
        overloadKg,
        status: determineStatus(overloadKg, operationalToleranceKg),
      };
    });

  // ── GVW ──
  const gvwMeasuredKg = axles.reduce((s, a) => s + a.measuredWeightKg, 0);
  const gvwPermissibleKg = input.gvwPermissibleKg;
  // Per-config GVW override (>= 1000kg) wins; else regulatory GVW tolerance.
  const gvwToleranceKg =
    input.gvwConfigToleranceKg != null && input.gvwConfigToleranceKg >= 1000
      ? input.gvwConfigToleranceKg
      : toleranceKgOf(getTolerance(toleranceSettings, legalFramework, 'GVW'), gvwPermissibleKg);
  const gvwEffectiveLimitKg = gvwPermissibleKg + gvwToleranceKg;
  const gvwOverloadKg = Math.max(0, gvwMeasuredKg - gvwEffectiveLimitKg);

  const anyOverload = gvwOverloadKg > 0 || groupResults.some((g) => g.overloadKg > 0);
  const maxOverload = Math.max(gvwOverloadKg, ...groupResults.map((g) => g.overloadKg), 0);

  return {
    provisional: true,
    isCompliant: !anyOverload,
    overallStatus: determineStatus(maxOverload, operationalToleranceKg),
    gvwMeasuredKg,
    gvwPermissibleKg,
    gvwToleranceKg,
    gvwEffectiveLimitKg,
    gvwOverloadKg,
    operationalToleranceKg,
    groupResults,
  };
}
