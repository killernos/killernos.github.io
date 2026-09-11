import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BUILD_ID} from '../runtime/next-1302/research-state.js';

function escapeRegExp(value){return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}

const html=fs.readFileSync(new URL('../runtime/next-1302/index.html',import.meta.url),'utf8');
const state=fs.readFileSync(new URL('../runtime/next-1302/research-state.js',import.meta.url),'utf8');
const probe=fs.readFileSync(new URL('../runtime/next-1302/userland-probe.js',import.meta.url),'utf8');
const diag=fs.readFileSync(new URL('../runtime/next-1302/diagnostics-bridge.js',import.meta.url),'utf8');
assert.match(html,new RegExp(escapeRegExp(BUILD_ID),'g'));
assert.match(html,/id="download-observation"/);
assert.match(html,/hardware-evidence\.html/);
assert.match(state,new RegExp(`BUILD_ID\\s*=\\s*"${escapeRegExp(BUILD_ID)}"`));
assert.match(probe,/createObservationUi/);
assert.match(probe,/NEXT-1302-SESSION-COMPLETED/);
assert.doesNotMatch(probe,/runKernelTrigger\(/);
assert.match(diag,/firmwareSource:\s*state\.snapshot\.firmwareSource/);
assert.match(diag,/sessionId:\s*state\.snapshot\.sessionId/);
console.log('Phase 13 live evidence wiring checks passed');