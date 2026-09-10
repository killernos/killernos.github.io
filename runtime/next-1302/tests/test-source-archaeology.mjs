import assert from 'node:assert/strict';
import { SOURCE_ARCHAEOLOGY_REPORT, getSourceArchaeologyReport, archaeologyForFirmware } from '../source-archaeology-records.js';

assert.equal(SOURCE_ARCHAEOLOGY_REPORT.reportType, 'NEXT_SOURCE_ARCHAEOLOGY_REPORT');
assert.equal(SOURCE_ARCHAEOLOGY_REPORT.evidenceClass, 'SOURCE_CONFIRMED');
assert.equal(SOURCE_ARCHAEOLOGY_REPORT.boundaries.hardwareObserved, false);
assert.equal(SOURCE_ARCHAEOLOGY_REPORT.boundaries.exploitProven, false);
assert.equal(SOURCE_ARCHAEOLOGY_REPORT.boundaries.kernelRead, false);
assert.equal(SOURCE_ARCHAEOLOGY_REPORT.boundaries.kernelWrite, false);
assert.equal(SOURCE_ARCHAEOLOGY_REPORT.boundaries.kernelExecution, false);
assert.equal(SOURCE_ARCHAEOLOGY_REPORT.boundaries.hen, false);
assert.equal(SOURCE_ARCHAEOLOGY_REPORT.boundaries.automaticPromotion, false);
assert.equal(SOURCE_ARCHAEOLOGY_REPORT.source.auditMethod, 'GITHUB_GIT_TREE_AND_COMMIT_METADATA');

const byFirmware = Object.fromEntries(SOURCE_ARCHAEOLOGY_REPORT.artifacts.map(x => [x.firmware, x]));
assert.equal(byFirmware['13.00'].blobSha, '093f6be6d4a741f88d0e63396768ee7a9928d544');
assert.equal(byFirmware['13.00'].size, 314);
assert.equal(byFirmware['13.02'].blobSha, 'ae341fcb9006d15706df3c73b163368c66b9e089');
assert.equal(byFirmware['13.04'].blobSha, 'ae341fcb9006d15706df3c73b163368c66b9e089');
assert.equal(byFirmware['13.50'].blobSha, '6b3733654376075927d1910631e3c20ce7b8be89');
assert.equal(byFirmware['13.52'].blobSha, '0e94f18748fa90c936407f724a375ee7eff77110');
assert.equal(byFirmware['13.02'].size, 712);
assert.equal(byFirmware['13.04'].size, 712);
assert.equal(byFirmware['13.50'].size, 712);
assert.equal(byFirmware['13.52'].size, 712);

const offsets = SOURCE_ARCHAEOLOGY_REPORT.sourceTransitions.find(x => x.path === 'ps4_offsets.js');
assert.equal(offsets.beforeBlobSha, 'd130414d37b3e05afd9e28604e98d0a6ed50eaa2');
assert.equal(offsets.beforeSize, 49028);
assert.equal(offsets.afterBlobSha, '2bc5563bb36089caaef26a3b74f87e7b9a1a309b');
assert.equal(offsets.afterSize, 17527);
assert.equal(offsets.additions, 0);
assert.equal(offsets.deletions, 675);

const payload = SOURCE_ARCHAEOLOGY_REPORT.sourceTransitions.find(x => x.path === 'payload.bin');
assert.equal(payload.oldBlobSha, 'ff498f3b9335b079f899ac0facf6393c83f97f5c');
assert.equal(payload.oldSize, 242716);
assert.equal(payload.newBlobSha, '0130e4dffc4438f1cd2f7ac8731b5030c661109a');
assert.equal(payload.newSize, 499776);

const fw1302 = archaeologyForFirmware('13.02');
const fw1304 = archaeologyForFirmware('13.04');
assert.equal(fw1302.affectsPromotion, false);
assert.equal(fw1304.affectsPromotion, false);
assert.equal(fw1302.artifacts.length, 1);
assert.equal(fw1304.artifacts.length, 1);
assert.equal(fw1302.artifacts[0].blobSha, fw1304.artifacts[0].blobSha);
assert.equal(fw1302.artifacts[0].size, fw1304.artifacts[0].size);
assert.ok(fw1302.relationships.some(x => x.id === 'NEXT-ARCH-1302-1304-BLOB'));

const fw1300 = archaeologyForFirmware('13.00');
assert.notEqual(fw1300.artifacts[0].blobSha, fw1302.artifacts[0].blobSha);
assert.notEqual(fw1300.artifacts[0].size, fw1302.artifacts[0].size);

const copy = getSourceArchaeologyReport();
copy.artifacts[0].blobSha = 'mutated';
assert.notEqual(copy.artifacts[0].blobSha, SOURCE_ARCHAEOLOGY_REPORT.artifacts[0].blobSha);

console.log('Phase 15B source archaeology tests passed');
