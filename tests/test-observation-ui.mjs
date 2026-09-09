import assert from 'node:assert/strict';
import { evaluateObservationEligibility } from '../runtime/next-1302/observation-ui.js';
function snapshot(overrides={}){return {sessionId:'NEXT-UI-OBS-A',firmware:'13.02',firmwareSource:'UA',hardware:'hardware',simulation:false,buildId:'0013',carrierObtained:false,windowPInstalled:false,readVerified:false,writeVerified:false,userlandARWVerified:false,events:[{stage:'NEXT-1302-HARDWARE-CONFIRMED',sessionId:'NEXT-UI-OBS-A'},{stage:'NEXT-1302-SESSION-COMPLETED',sessionId:'NEXT-UI-OBS-A'}],...overrides};}
assert.equal(evaluateObservationEligibility(snapshot()).eligible,true);
assert.equal(evaluateObservationEligibility(snapshot({events:[{stage:'NEXT-1302-HARDWARE-CONFIRMED',sessionId:'NEXT-UI-OBS-A'}]})).eligible,false);
assert.equal(evaluateObservationEligibility(snapshot({events:[{stage:'NEXT-1302-HARDWARE-CONFIRMED',sessionId:'NEXT-UI-OBS-A'},{stage:'NEXT-1302-SESSION-COMPLETED',sessionId:'OTHER'}]})).eligible,false);
assert.equal(evaluateObservationEligibility(snapshot({events:[{stage:'NEXT-1302-HARDWARE-CONFIRMED',sessionId:'NEXT-UI-OBS-A'},{stage:'NEXT-1302-SESSION-COMPLETED',sessionId:'NEXT-UI-OBS-A'},{stage:'LATE',sessionId:'NEXT-UI-OBS-A'}]})).eligible,false);
assert.equal(evaluateObservationEligibility(snapshot({firmwareSource:'QUERY'})).eligible,false);
assert.equal(evaluateObservationEligibility(snapshot({simulation:true})).eligible,false);
assert.equal(evaluateObservationEligibility(snapshot({sessionId:''})).eligible,false);
console.log('observation UI eligibility checks passed');