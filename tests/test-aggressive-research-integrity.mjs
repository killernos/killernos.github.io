import assert from 'node:assert/strict';
import fs from 'node:fs';
import {classifyAggressiveResearch} from '../runtime/next-1302/aggressive-research.js';

assert.equal(classifyAggressiveResearch([{stage:'USERLAND-ARW-VERIFIED'}]).status,'USERLAND-READY / NO-KERNEL-SIGNAL');
assert.equal(classifyAggressiveResearch([{stage:'KERNEL-FAULT-OBSERVED'}]).status,'COLLECTING');
assert.equal(classifyAggressiveResearch([{stage:'USERLAND-ARW-VERIFIED'},{stage:'KERNEL-FAULT-OBSERVED'}]).status,'KERNEL-CANDIDATE / NEEDS-MANUAL-REVIEW');

const aggressive=fs.readFileSync(new URL('../runtime/next-1302/aggressive-research.js',import.meta.url),'utf8');
assert.match(aggressive,/kernelExecutionAuthorized:false/);
assert.match(aggressive,/kernelWriteAuthorized:false/);
assert.match(aggressive,/patchingAuthorized:false/);
assert.match(aggressive,/henAuthorized:false/);

const bridge=fs.readFileSync(new URL('../runtime/next-1302/diagnostics-bridge.js',import.meta.url),'utf8');
assert.match(bridge,/NEXT-1302-SESSION-COMPLETED/);
assert.match(bridge,/researchMode:true/);
assert.match(bridge,/researchCandidate:CANDIDATE_NAME/);

const reportIntegrity=fs.readFileSync(new URL('../js/report-research-integrity.js',import.meta.url),'utf8');
assert.match(reportIntegrity,/research\.researchMode=true/);
assert.match(reportIntegrity,/SlopKit Userland/);
assert.match(reportIntegrity,/finalStage==="NEXT-1302-SESSION-COMPLETED"/);
assert.match(reportIntegrity,/report\.lastNormalizedStage="RUNTIME-COMPLETE"/);

const probe=fs.readFileSync(new URL('../runtime/next-1302/userland-probe.js',import.meta.url),'utf8');
assert.match(probe,/createAggressiveResearch/);
assert.match(probe,/unhandledrejection/);
assert.match(probe,/unexpected-termination/);

console.log('Aggressive research integrity tests passed.');
