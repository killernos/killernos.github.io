import assert from 'node:assert/strict';
import {normalizeEvidence,buildCrossFirmwareMatrix,compareFirmwarePair,summarizeCrossFirmwareMatrix} from '../runtime/next-1302/cross-firmware-evidence.js';

const obs=(firmware,sessionId,value,overrides={})=>({
 reportType:'NEXT_HARDWARE_OBSERVATION_SESSION',schemaVersion:2,evidenceClass:'HARDWARE_OBSERVED',
 firmware,sessionId,firmwareSource:'UA',simulated:false,imported:false,queryDerived:false,userEntered:false,storageDerived:false,
 kernelExecutionObserved:false,kernelWriteObserved:false,henObserved:false,
 samples:[{key:'userlandARWVerified',value},{key:'readVerified',value:true}],...overrides
});

const input=[obs('13.02','A',true),obs('13.02','B',true),obs('13.04','C',false),obs('13.02','A',false),obs('12.00','D',true)];
const normalized=normalizeEvidence(input);assert.equal(normalized.accepted.length,3);assert.equal(normalized.duplicates.length,1);assert.equal(normalized.rejected.length,1);
const matrix=buildCrossFirmwareMatrix(input);assert.equal(matrix.schemaVersion,2);assert.equal(matrix.acceptedSessions,3);assert.equal(matrix.duplicateSessions,1);assert.equal(matrix.rejectedSessions,1);
const row=matrix.rows.find(x=>x.firmware==='13.02'&&x.key==='userlandARWVerified');assert.equal(row.state,'STABLE');assert.equal(row.value,true);assert.equal(row.sessionCount,2);assert.equal(row.observedCount,2);
const diff=compareFirmwarePair(matrix,'13.02','13.04').find(x=>x.key==='userlandARWVerified');assert.equal(diff.classification,'CHANGED');
const summary=summarizeCrossFirmwareMatrix(matrix);assert.equal(summary.acceptedSessions,3);assert.ok(summary.stable>0);assert.ok(summary.noData>0);

// Missing a key in any accepted session must not promote the remaining value to STABLE.
const partial=buildCrossFirmwareMatrix([
 obs('13.02','P1',true,{samples:[{key:'probe',value:true}]}),
 obs('13.02','P2',true,{samples:[{key:'other',value:true}]})
]);
const partialRow=partial.rows.find(x=>x.firmware==='13.02'&&x.key==='probe');
assert.equal(partialRow.sessionCount,2);assert.equal(partialRow.observedCount,1);assert.equal(partialRow.state,'VARIABLE');assert.equal(partialRow.value,null);

// Weak/imported/simulated/non-UA objects cannot enter the hardware matrix.
const weak=[
 {firmware:'13.02',sessionId:'RAW',samples:[{key:'probe',value:true}]},
 obs('13.02','SIM',true,{simulated:true}),
 obs('13.02','IMP',true,{imported:true}),
 obs('13.02','NONUA',true,{firmwareSource:'USER'}),
 obs('13.02','KWRITE',true,{kernelWriteObserved:true}),
 obs('13.02','HEN',true,{henObserved:true})
];
const weakNormalized=normalizeEvidence(weak);assert.equal(weakNormalized.accepted.length,0);assert.equal(weakNormalized.rejected.length,weak.length);

// Reusing one sessionId under two firmware versions is a provenance conflict.
const conflict=normalizeEvidence([obs('13.02','CROSS',true),obs('13.04','CROSS',true)]);
assert.equal(conflict.accepted.length,1);assert.equal(conflict.rejected.length,1);assert.match(conflict.rejected[0].reason,/multiple firmware/i);

// Invalid scalar/sample structures are rejected by the shared strict schema.
const badSamples=normalizeEvidence([obs('13.02','BAD',true,{samples:[{key:'probe',value:Number.NaN}]})]);
assert.equal(badSamples.accepted.length,0);assert.equal(badSamples.rejected.length,1);

console.log('cross firmware evidence integrity regression checks passed');
