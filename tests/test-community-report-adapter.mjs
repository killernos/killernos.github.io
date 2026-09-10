import assert from 'node:assert/strict';
import { adaptCommunityReport, ingestCommunityReports } from '../runtime/next-1302/community-report-adapter.js';
const report={submissionId:'NEXT-SUBMIT-A',report:{firmware:'13.02',sessionId:'NEXT-SESSION-ONE',firmwareSource:'user-agent',simulated:false,hardwareDetected:true,diagnostics:[{stage:'SLOPKIT-CARRIER-OBTAINED'},{stage:'SLOPKIT-WINDOW-P-INSTALLED'},{stage:'SLOPKIT-READ-VERIFIED'},{stage:'SLOPKIT-WRITE-VERIFIED'},{stage:'USERLAND-ARW-VERIFIED'}]}};
const adapted=adaptCommunityReport(report);assert.equal(adapted.ok,true);assert.equal(adapted.observation.firmware,'13.02');assert.equal(adapted.observation.samples.every(x=>x.value===true),true);
const duplicate=structuredClone(report);duplicate.submissionId='NEXT-SUBMIT-B';
const batch=ingestCommunityReports([report,duplicate]);assert.equal(batch.accepted,1);assert.equal(batch.duplicateCount,1);assert.equal(batch.observations[0].sessionId,'NEXT-SESSION-ONE');
for(const bad of [{...report,report:{...report.report,simulated:true}},{...report,report:{...report.report,hardwareDetected:false}},{...report,report:{...report.report,firmwareSource:'query'}},{...report,report:{...report.report,firmware:'12.00'}}])assert.equal(adaptCommunityReport(bad).ok,false);
console.log('community report adapter regression checks passed');
