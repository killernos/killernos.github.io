import assert from 'node:assert/strict';
import { safeBuildTriageExport, runTriageForUi, summarizeTriageForUi } from '../runtime/next-1302/triage-ui.js';

const invalid=safeBuildTriageExport({reportType:'WRONG'});
assert.equal(invalid.ok,false);
assert.equal(invalid.error.code,'NEXT_TRIAGE_EXPORT_INVALID');

const source=[{firmware:'13.00',key:'ui_probe',value:'A'},{firmware:'13.02',key:'ui_probe',value:'B'}];
const session={reportType:'NEXT_HARDWARE_OBSERVATION_SESSION',evidenceClass:'HARDWARE_OBSERVED',firmware:'13.02',firmwareSource:'UA',simulated:false,imported:false,queryDerived:false,userEntered:false,storageDerived:false,samples:[{key:'ui_probe'}]};
const result=runTriageForUi([session],source);
assert.equal(result.ok,true);
const summary=summarizeTriageForUi(result);
assert.equal(summary.status,'READY');
assert.equal(summary.accepted,1);
assert.equal(summary.rejected,0);
assert.equal(summary.ranked,1);
assert.match(summary.message,/not exploit confidence/i);

const goodExport=safeBuildTriageExport(result.triage);
assert.equal(goodExport.ok,true);
assert.equal(goodExport.export.exploitProven,false);
assert.equal(goodExport.export.kernelExecutionAuthorized,false);
assert.equal(goodExport.export.kernelWriteAuthorized,false);
assert.equal(goodExport.export.henAuthorized,false);
console.log('triage UI regression tests passed');
