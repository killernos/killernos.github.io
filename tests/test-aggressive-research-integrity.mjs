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
assert.match(aggressive,/let enabled=false,active=false/);
assert.match(aggressive,/if\(!enabled\|\|!active\)return/);
assert.match(aggressive,/active=true;sessionId=/);
assert.match(aggressive,/persist\(false\);active=false/);
assert.doesNotMatch(aggressive,/emit\('AGGRESSIVE-/);

const bridge=fs.readFileSync(new URL('../runtime/next-1302/diagnostics-bridge.js',import.meta.url),'utf8');
assert.match(bridge,/markInterrupted/);
assert.match(bridge,/NEXT-1302-SESSION-INCOMPLETE/);
assert.match(bridge,/stageName==="NEXT-1302-SESSION-COMPLETED"/);
assert.match(bridge,/extra&&extra\.success===true/);
assert.match(bridge,/researchMode:true/);
assert.match(bridge,/researchCandidate:CANDIDATE_NAME/);

const reportIntegrity=fs.readFileSync(new URL('../js/report-research-integrity.js',import.meta.url),'utf8');
assert.match(reportIntegrity,/research\.researchMode=true/);
assert.match(reportIntegrity,/SlopKit Userland/);
assert.match(reportIntegrity,/researchFinal==="NEXT-1302-SESSION-COMPLETED"&&actualFinal==="NEXT-1302-SESSION-COMPLETED"/);
assert.match(reportIntegrity,/report\.lastNormalizedStage="RUNTIME-COMPLETE"/);
assert.doesNotMatch(reportIntegrity,/report\.lastStage=researchFinal/);

const probe=fs.readFileSync(new URL('../runtime/next-1302/userland-probe.js',import.meta.url),'utf8');
assert.match(probe,/createAggressiveResearch\(doc\)/);
assert.match(probe,/unhandledrejection/);
assert.match(probe,/unexpected-termination/);
assert.match(probe,/diagnostics\.markInterrupted\("page-unloaded-while-running"\)/);
assert.match(probe,/aggressive\.finish\(\);state\.setRunning\(false\);diagnostics\.markCompleted/);
assert.match(probe,/diagnostics\.emit\("NEXT-1302-SESSION-COMPLETED"/);

console.log('Aggressive research integrity tests passed.');
