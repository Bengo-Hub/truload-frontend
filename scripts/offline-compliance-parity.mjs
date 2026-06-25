/**
 * Parity test for the offline compliance engine (src/lib/offline/compliance.ts).
 *
 * Replays REAL weighings (pulled from the kuraweigh DB) through the offline TS engine and
 * compares its GVW overload + measured-sum against the server-computed values stored on the
 * transaction. This is how we keep the offline engine in lockstep with the backend.
 *
 * Usage (Node 22.6+ strips TS types):
 *   node scripts/offline-compliance-parity.mjs <dataFile1.json> [dataFile2.json ...]
 * Each JSON file is an array of: { id, fw, perm, meas, overload, gvwtol, axles:[{axleNumber,measuredWeightKg,permissibleWeightKg,axleGrouping}] }
 */
import { readFileSync } from 'node:fs';
import { computeProvisionalCompliance } from '../src/lib/offline/compliance.ts';

// Cached tolerance settings (mirror of tolerance_settings in kuraweigh).
const TOLERANCE_SETTINGS = [
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

let pass = 0, fail = 0;
const failures = [];

for (const file of process.argv.slice(2)) {
  const rows = JSON.parse(readFileSync(file, 'utf8')) ?? [];
  for (const w of rows) {
    if (!w.axles?.length) continue;
    const result = computeProvisionalCompliance({
      axles: w.axles,
      gvwPermissibleKg: w.perm,
      gvwConfigToleranceKg: w.gvwtol, // the override the backend resolved
      legalFramework: w.fw,
      toleranceSettings: TOLERANCE_SETTINGS,
    });
    const okMeas = result.gvwMeasuredKg === w.meas;
    const okOverload = result.gvwOverloadKg === w.overload;
    if (okMeas && okOverload) {
      pass++;
    } else {
      fail++;
      failures.push({
        id: w.id,
        meas: [result.gvwMeasuredKg, w.meas, okMeas],
        gvwOverload: [result.gvwOverloadKg, w.overload, okOverload],
      });
    }
  }
}

console.log(`\nParity: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('FAILURES (engine vs stored):');
  for (const f of failures) console.log(JSON.stringify(f));
  process.exit(1);
}
console.log('✓ Offline engine matches server-computed GVW overload + measured sum on all sampled weighings.');
