import assert from'node:assert/strict';
import{buildFirmwareDashboard,promotionState,confidence}from'../runtime/next-1302/research-dashboard.js';

function observation(firmware,sessionId,key,value=true){return{
 reportType:'NEXT_HARDWARE_OBSERVATION_SESSION',schemaVersion:2,evidenceClass:'HARDWARE_OBSERVED',sessionId,firmware,firmwareSource:'UA',
 simulated:false,imported:false,queryDerived:false,userEntered:false,storageDerived:false,kernelExecutionObserved:false,kernelWriteObserved:false,henObserved:false,
 samples:[{key,value}]
};}

assert.equal(promotionState({sessionIds:['a']}),'OBSERVED');
assert.equal(promotionState({sessionIds:['a','b']}),'REPRODUCED');
assert.equal(promotionState({sessionIds:['a','b'],reviewedSourceMatch:true,candidateEligible:true}),'CANDIDATE');
assert.equal(promotionState({sessionIds:['a','a'],reviewedSourceMatch:true,candidateEligible:true}),'OBSERVED');

const report=buildFirmwareDashboard({
 observations:[observation('13.02','a','lead'),observation('13.02','b','lead'),observation('13.52','z','other')],
 queue:[{key:'lead',observedFirmware:['13.02'],candidateEligible:true}],
 sourceRecords:[{firmware:'13.02',key:'lead',evidenceClass:'SOURCE_CONFIRMED',hardwareObserved:false}]
});
assert.equal(report.schemaVersion,2);
assert.equal(report.rows.length,4);
const a=report.rows.find(x=>x.firmware==='13.02');
assert.equal(a.promotion,'CANDIDATE');
assert.equal(a.reproductionCount,2);
assert.deepEqual(a.sourceMatchKeys,['lead']);
assert.deepEqual(a.candidateKeys,['lead']);
const b=report.rows.find(x=>x.firmware==='13.52');
assert.equal(b.promotion,'OBSERVED');
assert.ok(confidence(a)>confidence(b));

const noTargetFallback=buildFirmwareDashboard({
 observations:[observation('13.02','a','lead'),observation('13.02','b','lead')],
 queue:[{key:'lead',targetFirmware:'13.02',candidateEligible:true}],
 sourceRecords:[{targetFirmware:'13.02',key:'lead',evidenceClass:'SOURCE_CONFIRMED',hardwareObserved:false}]
}).rows.find(x=>x.firmware==='13.02');
assert.equal(noTargetFallback.reviewedSourceMatch,false);
assert.equal(noTargetFallback.candidateEligible,false);
assert.equal(noTargetFallback.promotion,'REPRODUCED');

const wrongKeySource=buildFirmwareDashboard({
 observations:[observation('13.02','a','lead'),observation('13.02','b','lead')],
 queue:[{key:'lead',observedFirmware:['13.02'],candidateEligible:true}],
 sourceRecords:[{firmware:'13.02',key:'unrelated',evidenceClass:'SOURCE_CONFIRMED',hardwareObserved:false}]
}).rows.find(x=>x.firmware==='13.02');
assert.equal(wrongKeySource.reviewedSourceMatch,false);
assert.equal(wrongKeySource.promotion,'REPRODUCED');

const invalid={firmware:'13.02',sessionId:'bad',samples:[{key:'lead',value:true}]};
const invalidReport=buildFirmwareDashboard({observations:[invalid,observation('13.02','good','lead')]});
const invalidRow=invalidReport.rows.find(x=>x.firmware==='13.02');
assert.equal(invalidRow.reproductionCount,1);
assert.equal(invalidRow.observationCount,1);
assert.equal(invalidRow.rejectedObservationCount,1);
assert.equal(invalidReport.rejectedObservationCount,1);

const conflictReport=buildFirmwareDashboard({observations:[observation('13.02','same','lead'),observation('13.04','same','lead')]});
assert.equal(conflictReport.rows.find(x=>x.firmware==='13.02').observationCount,0);
assert.equal(conflictReport.rows.find(x=>x.firmware==='13.04').observationCount,0);
assert.equal(conflictReport.rejectedObservationCount,2);

console.log('research dashboard checks passed');
