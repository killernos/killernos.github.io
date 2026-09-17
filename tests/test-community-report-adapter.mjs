import assert from 'node:assert/strict';
import { adaptCommunityReport, ingestCommunityReports } from '../runtime/next-1302/community-report-adapter.js';

const sessionId='NEXT-SESSION-ONE';
const requiredFalse={
  kernelExecutionObserved:false,
  kernelWriteObserved:false,
  henObserved:false,
  imported:false,
  queryDerived:false,
  userEntered:false,
  storageDerived:false
};
const event=stage=>({stage,sessionId});
const report={
  submissionId:'NEXT-SUBMIT-A',
  report:{
    firmware:'13.02',sessionId,firmwareSource:'user-agent',simulated:false,hardwareDetected:true,
    ...requiredFalse,
    diagnostics:[
      event('NEXT-1302-HARDWARE-CONFIRMED'),
      event('SLOPKIT-CARRIER-OBTAINED'),
      event('SLOPKIT-WINDOW-P-INSTALLED'),
      event('SLOPKIT-READ-VERIFIED'),
      event('SLOPKIT-WRITE-VERIFIED'),
      event('USERLAND-ARW-VERIFIED'),
      event('NEXT-1302-SESSION-COMPLETED')
    ]
  }
};

const adapted=adaptCommunityReport(report);
assert.equal(adapted.ok,true);
assert.equal(adapted.observation.firmware,'13.02');
assert.equal(adapted.observation.samples.every(x=>x.value===true),true);

const duplicate=structuredClone(report);duplicate.submissionId='NEXT-SUBMIT-B';
const batch=ingestCommunityReports([report,duplicate]);
assert.equal(batch.accepted,1);
assert.equal(batch.duplicateCount,1);
assert.equal(batch.observations[0].sessionId,sessionId);

for(const bad of [
  {...report,report:{...report.report,simulated:true}},
  {...report,report:{...report.report,hardwareDetected:false}},
  {...report,report:{...report.report,firmwareSource:'query'}},
  {...report,report:{...report.report,firmware:'12.00'}},
  {...report,report:{...report.report,imported:true}},
  {...report,report:{...report.report,kernelExecutionObserved:true}},
  {...report,report:{...report.report,kernelWriteObserved:true}},
  {...report,report:{...report.report,henObserved:true}}
])assert.equal(adaptCommunityReport(bad).ok,false);

// Session evidence from another run must not satisfy this report.
const wrongSession=structuredClone(report);
wrongSession.report.diagnostics=wrongSession.report.diagnostics.map(x=>({...x,sessionId:'NEXT-SESSION-OTHER'}));
assert.equal(adaptCommunityReport(wrongSession).ok,false);

// A bounded diagnostic session must include both hardware confirmation and completion.
const incomplete=structuredClone(report);
incomplete.report.diagnostics=incomplete.report.diagnostics.filter(x=>x.stage!=='NEXT-1302-SESSION-COMPLETED');
assert.equal(adaptCommunityReport(incomplete).ok,false);

// Nested kernel/HEN claims are outside this evidence-only adapter path.
for(const bad of [
  {...report,report:{...report.report,research:{kernelRead:true}}},
  {...report,report:{...report.report,research:{kernelLeak:'verified'}}},
  {...report,report:{...report.report,hen:{attempted:true}}},
  {...report,report:{...report.report,diagnostics:[...report.report.diagnostics,event('KERNEL-WRITE-VERIFIED')]}}
])assert.equal(adaptCommunityReport(bad).ok,false);

// Private-server envelopes may intentionally strip diagnostics and retain only bounded summary state.
const summaryOnly={
  submissionId:'NEXT-SUBMIT-SUMMARY',
  report:{
    firmware:'13.52',sessionId:'NEXT-SESSION-SUMMARY',firmwareSource:'UA',simulated:false,hardwareDetected:true,
    ...requiredFalse,
    research:{carrierObtained:true,windowPInstalled:true,readVerified:true,writeVerified:true,userlandARWVerified:true}
  }
};
const summaryAdapted=adaptCommunityReport(summaryOnly);
assert.equal(summaryAdapted.ok,true);
assert.equal(summaryAdapted.observation.samples.every(x=>x.value===true),true);

console.log('community report adapter regression checks passed');
