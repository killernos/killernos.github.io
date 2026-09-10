const TARGETS=new Set(['13.02','13.04','13.50','13.52']);
const STAGE_KEYS=Object.freeze({
 'SLOPKIT-CARRIER-OBTAINED':'carrierObtained',
 'SLOPKIT-WINDOW-P-INSTALLED':'windowPInstalled',
 'SLOPKIT-READ-VERIFIED':'readVerified',
 'SLOPKIT-WRITE-VERIFIED':'writeVerified',
 'USERLAND-ARW-VERIFIED':'userlandARWVerified'
});
function text(v){return v==null?'':String(v).trim();}
function reportOf(value){return value&&typeof value==='object'&&value.report&&typeof value.report==='object'?value.report:value;}
function recordsOf(report){return [...(Array.isArray(report?.diagnostics)?report.diagnostics:[]),...(Array.isArray(report?.diagnosticRecords)?report.diagnosticRecords:[])];}
function normalizedSource(v){return text(v).toLowerCase();}
export function adaptCommunityReport(envelope){
 const report=reportOf(envelope);
 if(!report||typeof report!=='object')return {ok:false,reason:'missing report object'};
 const firmware=text(report.firmware),sessionId=text(report.sessionId),source=normalizedSource(report.firmwareSource);
 if(!TARGETS.has(firmware))return {ok:false,reason:'firmware is outside dashboard targets'};
 if(!sessionId)return {ok:false,reason:'sessionId is required'};
 if(source!=='user-agent'&&source!=='ua')return {ok:false,reason:'firmware source is not user-agent'};
 if(report.simulated!==false)return {ok:false,reason:'simulated must be explicitly false'};
 if(report.hardwareDetected!==true)return {ok:false,reason:'hardwareDetected must be true'};
 const stages=new Set(recordsOf(report).map(x=>text(x?.stage||x?.name||x?.event)).filter(Boolean));
 const samples=Object.entries(STAGE_KEYS).map(([stage,key])=>({key,value:stages.has(stage)}));
 return {ok:true,observation:{firmware,sessionId,evidenceClass:'COMMUNITY_HARDWARE_OBSERVED',firmwareSource:'UA',samples,submissionId:text(envelope?.submissionId),receivedAt:text(envelope?.receivedAt),source:'community-report'}};
}
export function ingestCommunityReports(input){
 const values=Array.isArray(input)?input:Array.isArray(input?.reports)?input.reports:[input];
 const observations=[],rejected=[],duplicates=[];const seen=new Set();
 for(const value of values){
  const result=adaptCommunityReport(value);
  if(!result.ok){rejected.push({reason:result.reason,submissionId:text(value?.submissionId)});continue;}
  const key=result.observation.firmware+'|'+result.observation.sessionId;
  if(seen.has(key)){duplicates.push({firmware:result.observation.firmware,sessionId:result.observation.sessionId,submissionId:result.observation.submissionId});continue;}
  seen.add(key);observations.push(result.observation);
 }
 return {observations,rejected,duplicates,accepted:observations.length,duplicateCount:duplicates.length,rejectedCount:rejected.length};
}
