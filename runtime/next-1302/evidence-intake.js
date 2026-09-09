import { correlateHardwareToSource, validateHardwareObservationSession } from './hardware-source-correlation.js';
import { deriveReviewQueue, summarizeReviewQueue } from './candidate-review-queue.js';

function clone(v){return JSON.parse(JSON.stringify(v));}

export function processEvidenceBatch(sessions, sourceRecords){
 const accepted=[]; const rejected=[]; const correlations=[];
 for(let i=0;i<(sessions||[]).length;i++){
  const session=sessions[i];
  const validation=validateHardwareObservationSession(session);
  if(!validation.ok){ rejected.push({index:i,errors:[...validation.errors]}); continue; }
  try{
   correlations.push(correlateHardwareToSource(session,sourceRecords));
   accepted.push({index:i,firmware:String(session.firmware),evidenceClass:'HARDWARE_OBSERVED'});
  }catch(error){ rejected.push({index:i,errors:[String(error?.message||error)]}); }
 }
 const queue=deriveReviewQueue(correlations);
 return {
  reportType:'NEXT_EVIDENCE_TRIAGE_REPORT',schemaVersion:1,createdAt:new Date().toISOString(),
  accepted,rejected,correlations:clone(correlations),queue:clone(queue),summary:summarizeReviewQueue(queue),
  exploitProven:false,kernelExecutionAuthorized:false,kernelWriteAuthorized:false,henAuthorized:false
 };
}

export function rankResearchQueue(queue){
 const priorityWeight={HIGH:3,MEDIUM:2,LOW:1};
 return [...(queue||[])].sort((a,b)=>{
  const p=(priorityWeight[b.priority]||0)-(priorityWeight[a.priority]||0); if(p) return p;
  const r=Number(b.reproductions||0)-Number(a.reproductions||0); if(r) return r;
  return String(a.id||'').localeCompare(String(b.id||''));
 }).map((entry,index)=>({...clone(entry),rank:index+1,exploitProven:false,kernelExecutionAuthorized:false,kernelWriteAuthorized:false,henAuthorized:false}));
}

export function buildTriageExport(triage){
 if(triage?.reportType!=='NEXT_EVIDENCE_TRIAGE_REPORT') throw new Error('invalid triage report');
 return {
  ...clone(triage),
  rankedQueue:rankResearchQueue(triage.queue),
  notice:'Research ranking only. Priority and reproduction do not prove a kernel exploit or authorize execution.'
 };
}
