const TARGETS=new Set(['13.02','13.04','13.50','13.52']);
const STAGE_KEYS=Object.freeze({
 'SLOPKIT-CARRIER-OBTAINED':'carrierObtained',
 'SLOPKIT-WINDOW-P-INSTALLED':'windowPInstalled',
 'SLOPKIT-READ-VERIFIED':'readVerified',
 'SLOPKIT-WRITE-VERIFIED':'writeVerified',
 'USERLAND-ARW-VERIFIED':'userlandARWVerified'
});
const SUMMARY_KEYS=Object.freeze({
 carrierObtained:['carrierObtained','carrierState'],
 windowPInstalled:['windowPInstalled','windowPState'],
 readVerified:['readVerified','readState'],
 writeVerified:['writeVerified','writeState'],
 userlandARWVerified:['userlandARWVerified','userlandARWState']
});
function text(v){return v==null?'':String(v).trim();}
function reportOf(value){return value&&typeof value==='object'&&value.report&&typeof value.report==='object'?value.report:value;}
function recordsOf(report){return [...(Array.isArray(report?.diagnostics)?report.diagnostics:[]),...(Array.isArray(report?.diagnosticRecords)?report.diagnosticRecords:[])];}
function normalizedSource(v){return text(v).toLowerCase();}
function stateTrue(v){return v===true||['true','verified','pass','passed','success','ok','yes'].includes(normalizedSource(v));}
function summarySample(research,key){for(const candidate of SUMMARY_KEYS[key]||[]){if(Object.prototype.hasOwnProperty.call(research,candidate))return stateTrue(research[candidate]);}return false;}
function forbiddenActivity(report,stages){
 const research=report?.research&&typeof report.research==='object'?report.research:{};
 const hen=report?.hen&&typeof report.hen==='object'?report.hen:{};
 if(report.kernelExecutionObserved!==false||report.kernelWriteObserved!==false||report.henObserved!==false)return true;
 if(report.imported!==false||report.queryDerived!==false||report.userEntered!==false||report.storageDerived!==false)return true;
 if(stateTrue(research.kernelWrite)||stateTrue(research.kernelExecution)||stateTrue(research.kernelRead)||stateTrue(research.kernelLeak))return true;
 if(stateTrue(hen.attempted)||stateTrue(hen.loaded)||stateTrue(hen.success)||stateTrue(hen.observed))return true;
 for(const stage of stages){if(/KERNEL-(?:READ|WRITE|EXECUTION|EXEC)|HEN-(?:LOAD|LOADED|SUCCESS)/i.test(stage))return true;}
 return false;
}
export function adaptCommunityReport(envelope){
 const report=reportOf(envelope);
 if(!report||typeof report!=='object')return {ok:false,reason:'missing report object'};
 const firmware=text(report.firmware),sessionId=text(report.sessionId),source=normalizedSource(report.firmwareSource);
 if(!TARGETS.has(firmware))return {ok:false,reason:'firmware is outside dashboard targets'};
 if(!sessionId)return {ok:false,reason:'sessionId is required'};
 if(source!=='user-agent'&&source!=='ua')return {ok:false,reason:'firmware source is not user-agent'};
 if(report.simulated!==false)return {ok:false,reason:'simulated must be explicitly false'};
 if(report.hardwareDetected!==true)return {ok:false,reason:'hardwareDetected must be true'};
 const records=recordsOf(report).filter(x=>text(x?.sessionId)===sessionId);
 const stages=new Set(records.map(x=>text(x?.stage||x?.name||x?.event)).filter(Boolean));
 if(forbiddenActivity(report,stages))return {ok:false,reason:'prohibited scope or provenance flag'};
 const research=report.research&&typeof report.research==='object'?report.research:{};
 const hasRecords=records.length>0;
 if(hasRecords&&(!stages.has('NEXT-1302-HARDWARE-CONFIRMED')||!stages.has('NEXT-1302-SESSION-COMPLETED')))return {ok:false,reason:'incomplete session'};
 if(!hasRecords&&!Object.keys(research).length)return {ok:false,reason:'missing bounded session evidence'};
 const samples=Object.entries(STAGE_KEYS).map(([stage,key])=>({key,value:hasRecords?stages.has(stage):summarySample(research,key)}));
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
