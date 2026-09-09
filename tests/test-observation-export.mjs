import assert from 'node:assert/strict';
import { buildObservationArtifact } from '../runtime/next-1302/observation-export.js';
function snapshot(overrides={}){return {sessionId:'NEXT-SESSION-test-13',firmware:'13.02',firmwareSource:'UA',hardware:'hardware',simulation:false,buildId:'test',carrierObtained:true,windowPInstalled:true,readVerified:true,writeVerified:true,userlandARWVerified:true,events:[{stage:'NEXT-1302-HARDWARE-CONFIRMED'},{stage:'NEXT-1302-SESSION-COMPLETED'}],...overrides};}
const good=buildObservationArtifact(snapshot());
assert.equal(good.ok,true);assert.equal(good.artifact.reportType,'NEXT_HARDWARE_OBSERVATION_SESSION');assert.equal(good.artifact.schemaVersion,2);assert.equal(good.artifact.evidenceClass,'HARDWARE_OBSERVED');assert.equal(good.artifact.kernelExecutionObserved,false);assert.equal(good.artifact.kernelWriteObserved,false);assert.equal(good.artifact.henObserved,false);
for(const simulation of [undefined,null,'false',0,1,true]){const bad=buildObservationArtifact(snapshot({simulation}));assert.equal(bad.ok,false,`simulation=${String(simulation)} must be rejected`);}
assert.equal(buildObservationArtifact(snapshot({firmwareSource:'QUERY'})).ok,false);
assert.equal(buildObservationArtifact(snapshot({hardware:'simulation'})).ok,false);
assert.equal(buildObservationArtifact(snapshot({events:[]})).ok,false);
assert.equal(buildObservationArtifact(snapshot({events:[{stage:'NEXT-1302-HARDWARE-CONFIRMED'}]})).ok,false);
console.log('observation export regression checks passed');