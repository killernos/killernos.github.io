const SAMPLE_KEYS = Object.freeze(['carrierObtained','windowPInstalled','readVerified','writeVerified','userlandARWVerified']);
function text(v){return v==null?'':String(v).trim();}
export function buildHardwareObservationSession(snapshot){
 const errors=[];
 if(!snapshot||typeof snapshot!=='object')return {ok:false,session:null,errors:['snapshot must be an object']};
 if(!text(snapshot.sessionId))errors.push('sessionId is required');
 if(text(snapshot.firmwareSource).toUpperCase()!=='UA')errors.push('firmwareSource must be UA');
 if(snapshot.simulation!==false)errors.push('simulation must be explicitly false');
 if(text(snapshot.hardware)!=='hardware')errors.push('hardware must be hardware');
 if(!/^13\.(02|0[3-9]|[1-4][0-9]|5[0-2])$/.test(text(snapshot.firmware)))errors.push('firmware must be within 13.02-13.52');
 if(!Array.isArray(snapshot.events)||!snapshot.events.some(e=>e&&e.stage==='NEXT-1302-HARDWARE-CONFIRMED'))errors.push('hardware confirmation event is required');
 if(errors.length)return {ok:false,session:null,errors};
 const samples=SAMPLE_KEYS.map(key=>({key,value:!!snapshot[key]}));
 return {ok:true,errors:[],session:{reportType:'NEXT_HARDWARE_OBSERVATION_SESSION',schemaVersion:2,sessionId:text(snapshot.sessionId),evidenceClass:'HARDWARE_OBSERVED',firmware:text(snapshot.firmware),firmwareSource:'UA',simulated:false,imported:false,queryDerived:false,userEntered:false,storageDerived:false,samples,sourcePage:'NEXT-1302-RESEARCH',sourceBuildId:text(snapshot.buildId),createdAt:new Date().toISOString(),kernelExecutionObserved:false,kernelWriteObserved:false,henObserved:false}};
}
