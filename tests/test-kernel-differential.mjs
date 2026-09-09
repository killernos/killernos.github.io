import assert from 'node:assert/strict';
import { compareSourceRecord, validateImportedSourceRecords, buildDifferentialMatrix, summarizeDifferential } from '../runtime/next-1302/kernel-differential.js';

assert.equal(compareSourceRecord({value:'0x10'},{value:'0x10'}).state,'SAME');
assert.equal(compareSourceRecord({value:'0x10'},{value:'0x20'}).state,'CHANGED');
assert.equal(compareSourceRecord(null,{value:'0x20'}).state,'NEW');
assert.equal(compareSourceRecord({value:'0x10'},null).state,'MISSING');

const valid=[
  {firmware:'13.00',key:'example_symbol',value:'0x100',hardwareObserved:false},
  {firmware:'13.02',key:'example_symbol',value:'0x110',hardwareObserved:false}
];
assert.equal(validateImportedSourceRecords(valid).ok,true);
const report=buildDifferentialMatrix(valid);
assert.equal(report.reportType,'NEXT_KERNEL_SOURCE_DIFFERENTIAL');
assert.equal(report.rows.find(r=>r.baseFirmware==='13.00'&&r.targetFirmware==='13.02').state,'CHANGED');
assert.equal(report.rows.every(r=>r.hardwareObserved===false),true);
assert.equal(report.rows.every(r=>r.candidateEligible===false),true);
assert.equal(summarizeDifferential(report).CHANGED>=1,true);

const duplicate=[...valid,{firmware:'13.02',key:'example_symbol',value:'0x999'}];
const duplicateValidation=validateImportedSourceRecords(duplicate);
assert.equal(duplicateValidation.ok,false);
assert.match(duplicateValidation.errors.join('\n'),/duplicate firmware\/key pair/);
assert.throws(()=>buildDifferentialMatrix(duplicate),e=>e?.code==='NEXT_KERNEL_SOURCE_VALIDATION_FAILED');

const forged=[{firmware:'13.02',key:'fake',value:'1',hardwareObserved:true}];
assert.equal(validateImportedSourceRecords(forged).ok,false);
assert.throws(()=>buildDifferentialMatrix(forged));

console.log('kernel differential regression tests passed');
