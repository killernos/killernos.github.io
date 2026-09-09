import { processEvidenceBatch, buildTriageExport, rankResearchQueue } from './evidence-intake.js';

export function safeBuildTriageExport(report){
 try{return {ok:true,export:buildTriageExport(report),error:null};}
 catch(error){return {ok:false,export:null,error:{code:'NEXT_TRIAGE_EXPORT_INVALID',message:String(error?.message||error)}};}
}

export function runTriageForUi(sessions,sourceRecords){
 try{
  const triage=processEvidenceBatch(sessions,sourceRecords);
  return {ok:true,triage,rankedQueue:rankResearchQueue(triage.queue),error:null};
 }catch(error){
  return {ok:false,triage:null,rankedQueue:[],error:{code:'NEXT_TRIAGE_PROCESSING_FAILED',message:String(error?.message||error)}};
 }
}

export function summarizeTriageForUi(result){
 if(!result?.ok) return {status:'ERROR',accepted:0,rejected:0,ranked:0,message:result?.error?.message||'Triage failed'};
 return {status:'READY',accepted:result.triage.accepted.length,rejected:result.triage.rejected.length,ranked:result.rankedQueue.length,message:'Research triage only; ranking is not exploit confidence.'};
}
