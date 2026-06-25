/**
 * Parity test for the offline CHARGES engine (computeProvisionalCharges).
 * Replays real prosecution_cases through the engine and compares gvwFeeKes + totalFeeKes
 * against the server-stored values. Run:
 *   node scripts/offline-charges-parity.mjs <prosecutions.json> <feeSchedules.json>
 */
import { readFileSync } from 'node:fs';
import { computeProvisionalCharges } from '../src/lib/offline/compliance.ts';

const prosecutions = JSON.parse(readFileSync(process.argv[2], 'utf8')) ?? [];
const feeSchedules = JSON.parse(readFileSync(process.argv[3], 'utf8')) ?? [];

let pass = 0, fail = 0;
const failures = [];
for (const p of prosecutions) {
  const r = computeProvisionalCharges({
    gvwOverloadKg: p.gvwOverloadKg,
    legalFramework: p.fw,
    priorConvictionCount: p.offenseCount, // conviction tier derives from this
    feeSchedules,
    forexRate: 130,
    axleFeeUsd: p.axleFeeUsd ?? 0,
  });
  const okGvw = Number(r.gvwFeeKes) === Number(p.gvwFeeKes);
  const okTotal = Number(r.totalFeeKes) === Number(p.totalFeeKes);
  if (okGvw && okTotal) pass++;
  else { fail++; failures.push({ id: p.id, gvw: [r.gvwFeeKes, p.gvwFeeKes, okGvw], total: [r.totalFeeKes, p.totalFeeKes, okTotal] }); }
}
console.log(`\nCharges parity: ${pass} passed, ${fail} failed`);
if (failures.length) { failures.forEach((f) => console.log(JSON.stringify(f))); process.exit(1); }
console.log('✓ Offline charges match server-stored gvw_fee_kes + total_fee_kes on all sampled prosecutions.');
