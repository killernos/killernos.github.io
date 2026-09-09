import assert from 'node:assert/strict';
import { buildHardwareObservationSession } from '../runtime/next-1302/observation-session-bridge.js';
import { validateHardwareObservationSession } from '../runtime/next-1302/hardware-source-correlation.js';
const base={sessionId:'NEXT-SESSION-a',firmware:'13.02',firmwareSource:'UA',hardware:'hardware',simulation:false,buildId:'0012',carrierObtained:true,windowPInstalled:true,readVerified:true,writeVerified:true,userlandARWVerified:true,events:[{stage:'NEXT-1302-HARDWARE-CONFIRMED'}]};
const good=buildHardwareObservationSession(base);assert.equal(good.ok,true);assert.equal(good.session.reportType,'NEXT_HARDWARE_OBSERVATION_SESSION');assert.equal(good.session.evidenceClass,'HARDWARE_OBSERVED');assert.equal(good.session.sessionId,'NEXT-SESSION-a');assert.equal(validateHardwareObservationSession(good.session).ok,true);assert.equal(good.session.kernelExecutionObserved,false);assert.equal(good.session.kernelWriteObserved,false);assert.equal(good.session.henObserved,false);
for(const bad of [{...base,sessionId:''},{...base,firmwareSource:'QUERY'},{...base,simulation:true},{...base,hardware:'simulation'},{...base,events:[]}])assert.equal(buildHardwareObservationSession(bad).ok,false);
console.log('observation session bridge regression tests passed');
