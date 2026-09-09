import assert from 'node:assert/strict';
import { validateHardwareObservationSession, correlateHardwareToSource, buildCandidateReview } from '../runtime/next-1302/hardware-source-correlation.js';

const source=[
 {firmware:'13.00',key:'candidate_symbol',value:'0x100'},
 {firmware:'13.02',key:'candidate_symbol',value:'0x120'},
 {firmware:'13.04',key:'candidate_symbol',value:'0x120'}
];
const hardware={reportType:'NEXT_HARDWARE_OBSERVATION_SESSION',evidenceClass:'HARDWARE_OBSERVED',firmware:'13.02',firmwareSource:'UA',simulated:false,imported:false,queryDerived:false,userEntered:false,storageDerived:false,samples:[{key:'candidate_symbol',result:'OBSERVED'}]};
assert.equal(validateHardwareObservationSession(hardware).ok,true);
const c1=correlateHardwareToSource(hardware,source);
assert.equal(c1.evidenceClass,'HARDWARE_OBSERVED');
assert.equal(c1.kernelExecutionAuthorized,false);
assert.equal(c1.kernelWriteAuthorized,false);
assert.equal(c1.henAuthorized,false);
assert.equal(c1.matchedDifferences.some(r=>r.state==='CHANGED'),true);

for(const flag of ['simulated','imported','queryDerived','userEntered','storageDerived']){
 const bad={...hardware,[flag]:true};
 assert.equal(validateHardwareObservationSession(bad).ok,false);
 assert.throws(()=>correlateHardwareToSource(bad,source),e=>e?.code==='NEXT_HARDWARE_SESSION_INVALID');
}
assert.equal(validateHardwareObservationSession({...hardware,firmwareSource:'QUERY'}).ok,false);
assert.equal(validateHardwareObservationSession({...hardware,evidenceClass:'SOURCE_CONFIRMED'}).ok,false);
assert.equal(validateHardwareObservationSession({...hardware,samples:new Array(11).fill({key:'candidate_symbol'})}).ok,false);

const c2=correlateHardwareToSource({...hardware,samples:[{key:'candidate_symbol',result:'OBSERVED_AGAIN'}]},source);
const review=buildCandidateReview([c1,c2]);
const candidate=review.find(r=>r.key==='candidate_symbol'&&r.state==='CHANGED');
assert.equal(candidate.reproductions,2);
assert.equal(candidate.reviewState,'REPRODUCED');
assert.equal(candidate.candidateEligible,true);
assert.equal(candidate.exploitProven,false);
console.log('hardware/source correlation regression tests passed');
