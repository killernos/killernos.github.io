export const OBSERVATION_REPORT_TYPE='NEXT_HARDWARE_OBSERVATION_SESSION';
export const OBSERVATION_SCHEMA_VERSION=2;
export const OBSERVATION_EVIDENCE_CLASS='HARDWARE_OBSERVED';
export const STRICT_FALSE_FLAGS=Object.freeze(['simulated','imported','queryDerived','userEntered','storageDerived','kernelExecutionObserved','kernelWriteObserved','henObserved']);
function text(v){return v==null?'':String(v).trim();}
export function isSupportedObservationFirmware(value){const m=/^(\d+)\.(\d{2})$/.exec(text(value));if(!m)return false;const n=parseInt(m[1],10)*100+parseInt(m[2],10);return n>=1302&&n<=1352;}
export function validateObservationSession(session){
 const errors=[];
 if(!session||typeof session!=='object'||Array.isArray(session))return {ok:false,errors:['session must be an object']};
 if(session.reportType!==OBSERVATION_REPORT_TYPE)errors.push('reportType must be '+OBSERVATION_REPORT_TYPE);
 if(session.schemaVersion!==OBSERVATION_SCHEMA_VERSION)errors.push('schemaVersion must be 2');
 if(session.evidenceClass!==OBSERVATION_EVIDENCE_CLASS)errors.push('evidenceClass must be HARDWARE_OBSERVED');
 if(!text(session.sessionId))errors.push('sessionId is required');
 if(!isSupportedObservationFirmware(session.firmware))errors.push('firmware must be within 13.02-13.52');
 if(text(session.firmwareSource).toUpperCase()!=='UA')errors.push('firmwareSource must be UA');
 for(const flag of STRICT_FALSE_FLAGS)if(session[flag]!==false)errors.push(flag+' must be explicitly false');
 if(!Array.isArray(session.samples)||session.samples.length<1)errors.push('at least one sample is required');
 if(Array.isArray(session.samples)&&session.samples.length>10)errors.push('maximum 10 samples per session');
 if(Array.isArray(session.samples)){
  const seen=new Set();
  session.samples.forEach((sample,index)=>{
   if(!sample||typeof sample!=='object'||Array.isArray(sample)){errors.push('sample '+index+' must be an object');return;}
   const key=text(sample.key);if(!key)errors.push('sample '+index+' key is required');
   else if(seen.has(key))errors.push('sample '+index+' duplicates key '+key);else seen.add(key);
   const value=sample.value;if(value!==null&&!['string','number','boolean'].includes(typeof value))errors.push('sample '+index+' value must be a JSON scalar');
  });
 }
 return {ok:errors.length===0,errors};
}
