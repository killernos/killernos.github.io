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
