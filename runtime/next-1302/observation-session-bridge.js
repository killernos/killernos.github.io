import { OBSERVATION_EVIDENCE_CLASS, OBSERVATION_REPORT_TYPE, OBSERVATION_SCHEMA_VERSION, isSupportedObservationFirmware, validateObservationSession } from './observation-schema.js';
const SAMPLE_KEYS = Object.freeze(['carrierObtained','windowPInstalled','readVerified','writeVerified','userlandARWVerified']);
function text(v){return v==null?'':String(v).trim();}
export function buildHardwareObservationSession(snapshot){
 const errors=[];
 if(!snapshot||typeof snapshot!=='object')return {ok:false,session:null,errors:['snapshot must be an object']};
 const sessionId=text(snapshot.sessionId);
 if(!sessionId)errors.push('sessionId is required');
 if(text(snapshot.firmwareSource).toUpperCase()!=='UA')errors.push('firmwareSource must be UA');
 if(snapshot.simulation!==false)errors.push('simulation must be explicitly false');
 if(text(snapshot.hardware)!=='hardware')errors.push('hardware must be hardware');
 if(!isSupportedObservationFirmware(snapshot.firmware))errors.push('firmware must be within 13.02-13.52');
 const events=Array.isArray(snapshot.events)?snapshot.events:[];
 const hasHardwareConfirmation=events.some(e=>e&&e.stage==='NEXT-1302-HARDWARE-CONFIRMED'&&text(e.sessionId)===sessionId);
 const finalEvent=events.length?events[events.length-1]:null;
 const hasTerminalCompletion=!!(finalEvent&&finalEvent.stage==='NEXT-1302-SESSION-COMPLETED'&&text(finalEvent.sessionId)===sessionId);
 if(!hasHardwareConfirmation)errors.push('session-bound hardware confirmation event is required');
 if(!hasTerminalCompletion)errors.push('final event must be the current session completion marker');
 if(errors.length)return {ok:false,session:null,errors};
 const samples=SAMPLE_KEYS.map(key=>({key,value:!!snapshot[key]}));
 const session={reportType:OBSERVATION_REPORT_TYPE,schemaVersion:OBSERVATION_SCHEMA_VERSION,sessionId,evidenceClass:OBSERVATION_EVIDENCE_CLASS,firmware:text(snapshot.firmware),firmwareSource:'UA',simulated:false,imported:false,queryDerived:false,userEntered:false,storageDerived:false,samples,sourcePage:'NEXT-1302-RESEARCH',sourceBuildId:text(snapshot.buildId),createdAt:new Date().toISOString(),kernelExecutionObserved:false,kernelWriteObserved:false,henObserved:false};
 const validation=validateObservationSession(session);
 return validation.ok?{ok:true,errors:[],session}:{ok:false,session:null,errors:validation.errors};
}
