import assert from'node:assert/strict';import{buildFirmwareDashboard,promotionState,confidence}from'../runtime/next-1302/research-dashboard.js';
assert.equal(promotionState({sessionIds:['a']}),'OBSERVED');
assert.equal(promotionState({sessionIds:['a','b']}),'REPRODUCED');
assert.equal(promotionState({sessionIds:['a','b'],reviewedSourceMatch:true,candidateEligible:true}),'CANDIDATE');
assert.equal(promotionState({sessionIds:['a','a'],reviewedSourceMatch:true,candidateEligible:true}),'OBSERVED');
const report=buildFirmwareDashboard({observations:[{firmware:'13.02',sessionId:'a'},{firmware:'13.02',sessionId:'b'},{firmware:'13.52',sessionId:'z'}],queue:[{targetFirmware:'13.02',candidateEligible:true}],sourceRecords:[{targetFirmware:'13.02'}]});
assert.equal(report.rows.length,4);const a=report.rows.find(x=>x.firmware==='13.02');assert.equal(a.promotion,'CANDIDATE');assert.equal(a.reproductionCount,2);const b=report.rows.find(x=>x.firmware==='13.52');assert.equal(b.promotion,'OBSERVED');assert.ok(confidence(a)>confidence(b));console.log('research dashboard checks passed');