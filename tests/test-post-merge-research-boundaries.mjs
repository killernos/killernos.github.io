import assert from 'node:assert/strict';
import fs from 'node:fs';

const main=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const research=fs.readFileSync(new URL('../runtime/next-1302/index.html',import.meta.url),'utf8');
const registry=fs.readFileSync(new URL('../runtime/next-1302/kernel-source-registry.js',import.meta.url),'utf8');

assert.match(main,/11\.00-12\.02/);
assert.match(main,/Lapse/);
assert.match(main,/12\.00 is still the only locally hardware-testable console/);
assert.match(research,/id="event-log"[^>]*aria-live="polite"/);
assert.match(research,/does not execute Celsius, kernel exploitation, kernel patch shellcode, kexec, or GoldHEN/);
assert.match(registry,/automaticExecution:\s*false/);
assert.match(registry,/kernelPatchExecution:\s*false/);
assert.match(registry,/kexecExecution:\s*false/);
assert.match(registry,/henExecution:\s*false/);

console.log('post-merge research boundary checks passed');
