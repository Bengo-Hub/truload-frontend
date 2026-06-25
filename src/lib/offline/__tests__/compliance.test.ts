/**
 * Unit tests for the offline compliance engine.
 *
 * The fixtures are REAL kuraweigh weighings (compliant + overloaded) with the GVW overload the
 * backend computed. This locks the offline engine to the server's results in CI — the same
 * assertion the live parity harness (scripts/offline-compliance-parity.mjs) makes against the DB.
 */
import { computeProvisionalCompliance, type ToleranceSettingRef } from '../compliance';

// Mirror of tolerance_settings in kuraweigh.
const SETTINGS: ToleranceSettingRef[] = [
  { code: 'BOTH_AXLE_TOLERANCE', legalFramework: 'BOTH', tolerancePercentage: 5, toleranceKg: null, appliesTo: 'AXLE' },
  { code: 'BOTH_GVW_TOLERANCE', legalFramework: 'BOTH', tolerancePercentage: 5, toleranceKg: null, appliesTo: 'GVW' },
  { code: 'EAC_AXLE_TOLERANCE', legalFramework: 'EAC', tolerancePercentage: 5, toleranceKg: null, appliesTo: 'AXLE' },
  { code: 'EAC_GVW_TOLERANCE', legalFramework: 'EAC', tolerancePercentage: 5, toleranceKg: null, appliesTo: 'GVW' },
  { code: 'STANDARD_LAW_SINGLE', legalFramework: 'GLOBAL', tolerancePercentage: 5, toleranceKg: null, appliesTo: 'AXLE' },
  { code: 'OPERATIONAL_ALLOWANCE', legalFramework: 'GLOBAL', tolerancePercentage: 0, toleranceKg: 200, appliesTo: 'BOTH' },
  { code: 'STANDARD_LAW_GROUP', legalFramework: 'GLOBAL', tolerancePercentage: 0, toleranceKg: null, appliesTo: 'BOTH' },
  { code: 'TRAFFIC_ACT_AXLE_TOLERANCE', legalFramework: 'TRAFFIC_ACT', tolerancePercentage: 5, toleranceKg: null, appliesTo: 'AXLE' },
  { code: 'TRAFFIC_ACT_GVW_TOLERANCE', legalFramework: 'TRAFFIC_ACT', tolerancePercentage: 0, toleranceKg: 3000, appliesTo: 'GVW' },
];

describe('offline compliance engine — parity with backend', () => {
  it('compliant 3-axle (perm 26000, meas 24600, GVW tol 3000) → no GVW overload', () => {
    const r = computeProvisionalCompliance({
      legalFramework: 'TRAFFIC_ACT',
      gvwPermissibleKg: 26000,
      gvwConfigToleranceKg: 3000,
      toleranceSettings: SETTINGS,
      axles: [
        { axleNumber: 1, measuredWeightKg: 6600, permissibleWeightKg: 8000, axleGrouping: 'A' },
        { axleNumber: 2, measuredWeightKg: 8700, permissibleWeightKg: 9000, axleGrouping: 'B' },
        { axleNumber: 3, measuredWeightKg: 9300, permissibleWeightKg: 9000, axleGrouping: 'B' },
      ],
    });
    expect(r.gvwMeasuredKg).toBe(24600);
    expect(r.gvwOverloadKg).toBe(0);
    expect(r.provisional).toBe(true);
  });

  it('overloaded 2-axle (perm 18000, meas 19700, GVW tol 1500) → 200kg GVW overload', () => {
    const r = computeProvisionalCompliance({
      legalFramework: 'TRAFFIC_ACT',
      gvwPermissibleKg: 18000,
      gvwConfigToleranceKg: 1500,
      toleranceSettings: SETTINGS,
      axles: [
        { axleNumber: 1, measuredWeightKg: 6500, permissibleWeightKg: 8000, axleGrouping: 'A' },
        { axleNumber: 2, measuredWeightKg: 13200, permissibleWeightKg: 10000, axleGrouping: 'B' },
      ],
    });
    expect(r.gvwMeasuredKg).toBe(19700);
    expect(r.gvwOverloadKg).toBe(200); // 19700 - (18000 + 1500)
    expect(r.overallStatus).toBe('OVERLOAD');
    // Axle group B is also over: 13200 - (10000 + 5% = 500) = 2700.
    const b = r.groupResults.find((g) => g.groupLabel === 'B')!;
    expect(b.overloadKg).toBe(2700);
  });

  it('replicates GetToleranceAsync precedence: regulatory GVW used when no config override', () => {
    const r = computeProvisionalCompliance({
      legalFramework: 'TRAFFIC_ACT',
      gvwPermissibleKg: 26000,
      gvwConfigToleranceKg: null, // no config override → regulatory TRAFFIC_ACT_GVW = 3000kg
      toleranceSettings: SETTINGS,
      axles: [{ axleNumber: 1, measuredWeightKg: 30000, permissibleWeightKg: 26000, axleGrouping: 'A' }],
    });
    expect(r.gvwToleranceKg).toBe(3000);
    expect(r.gvwOverloadKg).toBe(1000); // 30000 - 29000
  });

  it('config override below 1000kg is ignored in favour of regulatory tolerance', () => {
    const r = computeProvisionalCompliance({
      legalFramework: 'TRAFFIC_ACT',
      gvwPermissibleKg: 26000,
      gvwConfigToleranceKg: 500, // < 1000 → ignored
      toleranceSettings: SETTINGS,
      axles: [{ axleNumber: 1, measuredWeightKg: 30000, permissibleWeightKg: 26000, axleGrouping: 'A' }],
    });
    expect(r.gvwToleranceKg).toBe(3000);
  });
});
