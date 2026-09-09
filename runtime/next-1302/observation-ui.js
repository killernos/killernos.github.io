import { buildObservationArtifact, downloadObservationArtifact } from './observation-export.js';

function text(value){return value==null?'':String(value);}

export function evaluateObservationEligibility(snapshot){
 const result=buildObservationArtifact(snapshot);
 if(result.ok){
  return {eligible:true,status:'READY',message:'Eligible hardware run. A strict NEXT hardware observation can be exported.',errors:[]};
 }
 return {eligible:false,status:'LOCKED',message:result.errors.join('; ')||'Hardware observation is not eligible yet.',errors:result.errors.slice()};
}

export function createObservationUi(doc,state){
 const sessionField=doc.getElementById('field-session-id');
 const firmwareSourceField=doc.getElementById('field-firmware-source');
 const eligibilityField=doc.getElementById('field-observation-eligibility');
 const status=doc.getElementById('observation-status');
 const button=doc.getElementById('download-observation');

 function refresh(){
  const snapshot=state.snapshot;
  const result=evaluateObservationEligibility(snapshot);
  if(sessionField)sessionField.textContent=text(snapshot.sessionId)||'No active session';
  if(firmwareSourceField)firmwareSourceField.textContent=text(snapshot.firmwareSource)||'UNKNOWN';
  if(eligibilityField)eligibilityField.textContent=result.status;
  if(status){status.textContent=result.message;status.className='status-copy'+(result.eligible?' ok':'');}
  if(button)button.disabled=!result.eligible;
  return result;
 }

 function download(){
  const before=refresh();
  if(!before.eligible)return {ok:false,artifact:null,errors:before.errors};
  const result=downloadObservationArtifact(state.snapshot,doc);
  refresh();
  return result;
 }

 if(button)button.addEventListener('click',download);
 return {refresh,download,evaluate:()=>evaluateObservationEligibility(state.snapshot)};
}
