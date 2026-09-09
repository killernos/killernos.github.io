const ALLOWED_STATES = new Set(['HARDWARE_OBSERVED','REPRODUCED','UNDER_REVIEW','CANDIDATE','REJECTED','INCONCLUSIVE']);
const INTERESTING_DIFFS = new Set(['CHANGED','NEW','MISSING']);
function text(v){return v==null?'':String(v).trim();}
function clone(v){return JSON.parse(JSON.stringify(v));}
function keyOf(v){return [v.key,v.baseFirmware,v.targetFirmware,v.state].map(text).join('|');}
export function validateCorrelationReport(report){
 const errors=[];
 if(!report||typeof report!=='object') return {ok:false,errors:['report must be an object']};
 if(report.reportType!=='NEXT_HARDWARE_SOURCE_CORRELATION') errors.push('unexpected reportType');
 if(report.evidenceClass!=='HARDWARE_OBSERVED') errors.push('correlation must be HARDWARE_OBSERVED');
 if(report.firmwareSource!=='UA') errors.push('firmwareSource must be UA');
 if(report.automaticExploitPromotion!==false) errors.push('automaticExploitPromotion must remain false');
 if(report.kernelExecutionAuthorized!==false||report.kernelWriteAuthorized!==false||report.henAuthorized!==false) errors.push('execution/write/HEN authorization must remain false');
 return {ok:errors.length===0,errors};
}
export function deriveReviewQueue(correlations){
 const grouped=new Map();
 for(const report of correlations||[]){
  const v=validateCorrelationReport(report); if(!v.ok) continue;
  for(const row of report.matchedDifferences||[]){
   if(!INTERESTING_DIFFS.has(row.state)) continue;
   const id=keyOf(row);
   if(!grouped.has(id)) grouped.set(id,{id,key:text(row.key),baseFirmware:text(row.baseFirmware),targetFirmware:text(row.targetFirmware),differenceState:row.state,reproductions:0,firmware:new Set(),sources:[],notes:[]});
   const item=grouped.get(id); item.reproductions++; item.firmware.add(text(report.firmware));
  }
 }
 return [...grouped.values()].map(item=>({
  id:item.id,key:item.key,baseFirmware:item.baseFirmware,targetFirmware:item.targetFirmware,differenceState:item.differenceState,
  reproductions:item.reproductions,observedFirmware:[...item.firmware],
  reviewState:item.reproductions>=2?'REPRODUCED':'HARDWARE_OBSERVED',
  priority:item.reproductions>=3?'HIGH':item.reproductions>=2?'MEDIUM':'LOW',
  candidateEligible:item.reproductions>=2,exploitProven:false,kernelExecutionAuthorized:false,kernelWriteAuthorized:false,henAuthorized:false,
  sources:[],reproductionNotes:[]
 }));
}
export function updateReviewState(entry,nextState,note=''){
 if(!entry||typeof entry!=='object') throw new Error('entry required');
 if(!ALLOWED_STATES.has(nextState)) throw new Error('invalid review state');
 if(nextState==='CANDIDATE' && (!entry.candidateEligible || Number(entry.reproductions)<2)) throw new Error('candidate requires at least two eligible reproductions');
 const out=clone(entry); out.reviewState=nextState; out.updatedAt=new Date().toISOString();
 if(note) out.reproductionNotes=[...(out.reproductionNotes||[]),text(note)];
 out.exploitProven=false; out.kernelExecutionAuthorized=false; out.kernelWriteAuthorized=false; out.henAuthorized=false;
 return out;
}
export function attachSourceReference(entry,source){
 const out=clone(entry); const ref={url:text(source?.url),label:text(source?.label),evidenceClass:text(source?.evidenceClass||'SOURCE_CONFIRMED')};
 if(!ref.url) throw new Error('source url required');
 if(ref.evidenceClass==='HARDWARE_OBSERVED') throw new Error('source references cannot self-promote to hardware evidence');
 out.sources=[...(out.sources||[])]; if(!out.sources.some(s=>s.url===ref.url)) out.sources.push(ref); return out;
}
export function summarizeReviewQueue(queue){
 const summary={total:0,HARDWARE_OBSERVED:0,REPRODUCED:0,UNDER_REVIEW:0,CANDIDATE:0,REJECTED:0,INCONCLUSIVE:0,highPriority:0};
 for(const item of queue||[]){summary.total++; if(summary[item.reviewState]!=null) summary[item.reviewState]++; if(item.priority==='HIGH') summary.highPriority++;}
 return summary;
}
