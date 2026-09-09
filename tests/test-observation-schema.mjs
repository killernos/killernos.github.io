import assert from 'node:assert/strict';
import { isSupportedObservationFirmware, validateObservationSession } from '../runtime/next-1302/observation-schema.js';
function valid(overrides={}){return {reportType:'NEXT_HARDWARE_OBSERVATION_SESSION',schemaVersion:2,evidenceClass:'HARDWARE_OBSERVED',sessionId:'NEXT-SCHEMA-A',firmware:'13.02',firmwareSource:'UA',simulated:false,imported:false,queryDerived:false,userEntered:false,storageDerived:false,kernelExecutionObserved:false,kernelWriteObserved:false,henObserved:false,samples:[{key:'probe',value:true}],...overrides};}
assert.equal(isSupportedObservationFirmware('13.02'),true);assert.equal(isSupportedObservationFirmware('13.03'),true);assert.equal(isSupportedObservationFirmware('13.52'),true);assert.equal(isSupportedObservationFirmware('13.53'),false);assert.equal(isSupportedObservationFirmware('13.00'),false);
assert.equal(validateObservationSession(valid()).ok,true);
assert.equal(validateObservationSession(valid({schemaVersion:1})).ok,false);
assert.equal(validateObservationSession(valid({simulated:undefined})).ok,false);
assert.equal(validateObservationSession(valid({samples:[{key:'probe',value:true},{key:'probe',value:false}]})).ok,false);
assert.equal(validateObservationSession(valid({samples:[{key:'probe',value:{nested:true}}]})).ok,false);
console.log('observation schema integrity checks passed');