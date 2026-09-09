import { validateObservationSession } from './observation-schema.js';
import { runTriageForUi } from './triage-ui.js';
function clone(v){return JSON.parse(JSON.stringify(v));}
function text(v){return v==null?'':String(v).trim();}
export function normalizeObservationInput(value){if(Array.isArray(value))return value;if(value&&typeof value==='object')return [value];throw new Error('Evidence input must be one observation object or an array.');}
export function prepareEvidenceBatch(input,sourceRecords){
 const sessions=normalizeObservationInput(input),accepted=[],rejected=[],duplicates=[],seen=new Set();
 sessions.forEach((session,index)=>{
  const validation=validateObservationSession(session);
  if(!validation.ok){rejected.push({index,sessionId:text(session&&session.sessionId),errors:validation.errors.slice()});return;}
  const id=text(session.sessionId);if(seen.has(id)){duplicates.push({index,sessionId:id});return;}seen.add(id);accepted.push(clone(session));
 });
 const sourceKeys=new Set((sourceRecords||[]).map(r=>text(r&&r.key)).filter(Boolean));
 const observedKeys=new Set();accepted.forEach(s=>(s.samples||[]).forEach(sample=>{const key=text(sample&&sample.key);if(key)observedKeys.add(key);}));
 const matchedKeys=[...observedKeys].filter(k=>sourceKeys.has(k)).sort();
 const unmatchedKeys=[...observedKeys].filter(k=>!sourceKeys.has(k)).sort();
 const triage=runTriageForUi(accepted,sourceRecords||[]);
 return {reportType:'NEXT_HARDWARE_EVIDENCE_WORKBENCH_REPORT',schemaVersion:1,createdAt:new Date().toISOString(),accepted,rejected,duplicates,coverage:{observedKeys:[...observedKeys].sort(),sourceKeys:[...sourceKeys].sort(),matchedKeys,unmatchedKeys},triage,automaticExploitPromotion:false,kernelExecutionAuthorized:false,kernelWriteAuthorized:false,henAuthorized:false};
}
export function summarizeEvidenceBatch(report){return {accepted:report&&report.accepted?report.accepted.length:0,rejected:report&&report.rejected?report.rejected.length:0,duplicates:report&&report.duplicates?report.duplicates.length:0,matchedKeys:report&&report.coverage?report.coverage.matchedKeys.length:0,unmatchedKeys:report&&report.coverage?report.coverage.unmatchedKeys.length:0,ranked:report&&report.triage&&report.triage.ok?report.triage.rankedQueue.length:0};}
export function downloadEvidenceBatch(report,doc=document){const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),link=doc.createElement('a');link.href=URL.createObjectURL(blob);link.download='next-hardware-evidence-workbench.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),0);}
