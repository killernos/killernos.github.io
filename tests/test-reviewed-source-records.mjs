import assert from 'node:assert/strict';
import { getReviewedSourceRecords } from '../runtime/next-1302/reviewed-source-records.js';
import { validateImportedSourceRecords, buildDifferentialMatrix } from '../runtime/next-1302/kernel-differential.js';

const records=getReviewedSourceRecords();
assert.ok(records.length>=8);
assert.ok(records.every(r=>r.evidenceClass==='SOURCE_CONFIRMED'));
assert.ok(records.every(r=>r.hardwareObserved===false));
assert.deepEqual(validateImportedSourceRecords(records),{ok:true,errors:[]});
const report=buildDifferentialMatrix(records);
assert.equal(report.reportType,'NEXT_KERNEL_SOURCE_DIFFERENTIAL');
assert.ok(report.rows.some(r=>r.key==='bdj_cve_2025_64390_public_status'&&r.baseFirmware==='13.02'&&r.targetFirmware==='13.04'&&r.state==='CHANGED'));
assert.ok(report.rows.every(r=>r.hardwareObserved===false&&r.candidateEligible===false));
console.log('reviewed source record regression tests passed');
