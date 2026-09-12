import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CHECKPOINTS, create1302ResearchAdapter } from '../runtime/next-1302/research-adapter.js';

const runtimeHtml = fs.readFileSync(new URL('../runtime/next-1302/index.html', import.meta.url), 'utf8');
const probe = fs.readFileSync(new URL('../runtime/next-1302/userland-probe.js', import.meta.url), 'utf8');
const diagnostics = fs.readFileSync(new URL('../js/diagnostics.js', import.meta.url), 'utf8');

assert.match(runtimeHtml, /userland-probe\.js\?v=next-universal-1302-1352-research-0017/);
assert.match(probe, /core\.js\?v=10/);
assert.match(probe, /research-state\.js\?v=next-universal-1302-1352-research-0017/);
assert.match(probe, /research-adapter\.js\?v=next-universal-1302-1352-research-0017/);
assert.match(probe, /requirePromotion:true/);
assert.match(probe, /pairStatus\.promoted/);
assert.match(probe, /SLOPKIT-PAIR-PROMOTED/);
assert.doesNotMatch(probe, /promote=false/);
assert.doesNotMatch(diagnostics, /observedResearch = sessionHasStage\([^\n]+ADDROF/);
assert.doesNotMatch(diagnostics, /observedResearch = sessionHasStage\([^\n]+READ-PRIMITIVE-PASS/);
assert.match(diagnostics, /report\.diagnostics = \(state\.includeDiagnostics \|\| observedResearch\) \? sessionRecords : \[\]/);

globalThis.window = {
  p: {
    read1() {}, read2() {}, read4() {}, read8() {},
    write1() {}, write2() {}, write4() {}, write8() {}, leakval() {}
  }
};
const adapter = create1302ResearchAdapter({
  requirePromotion: true,
  verifyPromotion: () => false,
  primitiveFactory: async () => ({ assertHome: () => true }),
  installWindowP: () => globalThis.window.p,
  hasWindowP: () => true,
  verifyRead: () => true,
  verifyWrite: () => true
});
adapter.initialize();
const result = await adapter.runUserlandEntry();
assert.equal(result.ok, false);
assert.equal(result.failureReason, 'userland-promotion-not-verified');
assert.equal(globalThis.window.p, undefined);
assert.notEqual(adapter.getSnapshot().currentCheckpoint, CHECKPOINTS.USERLAND_ARW_CONFIRMED);
delete globalThis.window;

console.log('verified userland promotion checks passed');
