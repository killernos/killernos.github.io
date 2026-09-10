import {normalizeEvidence} from './cross-firmware-evidence.js';

const ORDER=Object.freeze(['OBSERVED','REPRODUCED','CANDIDATE']);
function text(v){return v==null?'':String(v).trim();}
function uniq(values){return [...new Set(values.filter(Boolean))];}
function queueBelongsToFirmware(entry,firmware){
 if(text(entry?.firmware)===firmware)return true;
 return Array.isArray(entry?.observedFirmware)&&entry.observedFirmware.map(text).includes(firmware);
}
function reviewedSourceForKey(records,firmware,key){
 return (records||[]).some(record=>text(record?.firmware)===firmware&&text(record?.key)===key&&record?.evidenceClass==='SOURCE_CONFIRMED'&&record?.hardwareObserved===false);
}
export function promotionState(item){
 const sessions=uniq(item?.sessionIds||[]).length;
 const reproduced=sessions>=2;
 const reviewed=!!item?.reviewedSourceMatch;
 const eligible=!!item?.candidateEligible;
 if(reproduced&&reviewed&&eligible)return 'CANDIDATE';
 if(reproduced)return 'REPRODUCED';
 return 'OBSERVED';
}
export function confidence(item){
 const sessions=uniq(item?.sessionIds||[]).length;
 const source=!!item?.reviewedSourceMatch;
 const state=promotionState(item);
 let score=Math.min(60,sessions*20)+(source?20:0)+(state==='CANDIDATE'?20:state==='REPRODUCED'?10:0);
 return Math.min(100,score);
}
export function buildFirmwareDashboard({observations=[],queue=[],sourceRecords=[]}={}){
 const firmwares=['13.02','13.04','13.50','13.52'];
 const normalized=normalizeEvidence(observations);
 const byFirmware=new Map(firmwares.map(fw=>[fw,[]]));
 for(const observation of normalized.accepted){const fw=text(observation.firmware);if(byFirmware.has(fw))byFirmware.get(fw).push(observation);}
 const rows=firmwares.map(firmware=>{
  const obs=byFirmware.get(firmware),sessionIds=uniq(obs.map(x=>text(x.sessionId))),keySessions=new Map();
  for(const observation of obs)for(const sample of observation.samples||[]){const key=text(sample?.key);if(!key)continue;if(!keySessions.has(key))keySessions.set(key,new Set());keySessions.get(key).add(text(observation.sessionId));}
  const queueRows=(queue||[]).filter(x=>queueBelongsToFirmware(x,firmware));
  const sourceMatchKeys=[...keySessions.keys()].filter(key=>reviewedSourceForKey(sourceRecords,firmware,key));
  const candidateKeys=[...keySessions.entries()].filter(([key,sessions])=>sessions.size>=2&&sourceMatchKeys.includes(key)&&queueRows.some(x=>text(x?.key)===key&&x?.candidateEligible===true)).map(([key])=>key);
  const reviewedSourceMatch=sourceMatchKeys.length>0,candidateEligible=candidateKeys.length>0;
  const item={firmware,sessionIds,reviewedSourceMatch,candidateEligible};
  const rejectedObservationCount=normalized.rejected.filter(x=>text(x.firmware)===firmware).length;
  const duplicateObservationCount=normalized.duplicates.filter(x=>text(x.firmware)===firmware).length;
  return {...item,observationCount:obs.length,reproductionCount:sessionIds.length,rejectedObservationCount,duplicateObservationCount,sourceMatchKeys,candidateKeys,promotion:promotionState(item),confidence:confidence(item),queueCount:queueRows.length};
 });
 return {reportType:'NEXT_RESEARCH_DASHBOARD',schemaVersion:2,generatedAt:new Date().toISOString(),promotionOrder:ORDER.slice(),acceptedObservationCount:normalized.accepted.length,rejectedObservationCount:normalized.rejected.length,duplicateObservationCount:normalized.duplicates.length,rows};
}
export function summarizeDashboard(report){
 const rows=Array.isArray(report?.rows)?report.rows:[];
 return {firmwares:rows.length,observed:rows.filter(x=>x.promotion==='OBSERVED'&&x.observationCount>0).length,reproduced:rows.filter(x=>x.promotion==='REPRODUCED').length,candidates:rows.filter(x=>x.promotion==='CANDIDATE').length,acceptedObservations:Number(report?.acceptedObservationCount||0),rejectedObservations:Number(report?.rejectedObservationCount||0),duplicateObservations:Number(report?.duplicateObservationCount||0)};
}
