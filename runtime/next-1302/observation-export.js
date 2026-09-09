import { buildHardwareObservationSession } from './observation-session-bridge.js';
export function buildObservationArtifact(snapshot){
 const result=buildHardwareObservationSession(snapshot);
 if(!result.ok)return {ok:false,artifact:null,errors:result.errors.slice()};
 return {ok:true,errors:[],artifact:result.session};
}
export function downloadObservationArtifact(snapshot,doc=document){
 const result=buildObservationArtifact(snapshot);
 if(!result.ok)return result;
 const blob=new Blob([JSON.stringify(result.artifact,null,2)],{type:'application/json'}),link=doc.createElement('a');
 link.href=URL.createObjectURL(blob);link.download='next-hardware-observation-'+result.artifact.firmware.replace('.','-')+'-'+result.artifact.sessionId+'.json';link.click();
 setTimeout(()=>URL.revokeObjectURL(link.href),0);return result;
}
