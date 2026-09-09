import assert from 'node:assert/strict';
import { prepareEvidenceBatch, summarizeEvidenceBatch } from '../runtime/next-1302/evidence-workbench.js';
function session(id,key='lead'){return {reportType:'NEXT_HARDWARE_OBSERVATION_SESSION',schemaVersion:2,evidenceClass:'HARDWARE_OBSERVED',sessionId:id,firmware:'13.02',firmwareSource:'UA',simulated:false,imported:false,queryDerived:false,userEntered:false,storageDerived:false,kernelExecutionObserved:false,kernelWriteObserved:false,henObserved:false,samples:[{key,value:true}]};}
const source=[{firmware:'13.00',key:'lead',value:'A'},{firmware:'13.02',key:'lead',value:'B'}];
const report=prepareEvidenceBatch([session('NEXT-WB-A'),session('NEXT-WB-A'),session('NEXT-WB-B','userlandARWVerified'),{...session('NEXT-WB-C'),firmwareSource:'QUERY'}],source);
const summary=summarizeEvidenceBatch(report);
assert.equal(summary.accepted,2);assert.equal(summary.duplicates,1);assert.equal(summary.rejected,1);assert.deepEqual(report.coverage.matchedKeys,['lead']);assert.deepEqual(report.coverage.unmatchedKeys,['userlandARWVerified']);assert.equal(report.automaticExploitPromotion,false);assert.equal(report.kernelExecutionAuthorized,false);assert.equal(report.kernelWriteAuthorized,false);assert.equal(report.henAuthorized,false);
console.log('hardware evidence workbench checks passed');