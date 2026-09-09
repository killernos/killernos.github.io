const ORDER=Object.freeze(['OBSERVED','REPRODUCED','CANDIDATE']);
function text(v){return v==null?'':String(v).trim();}
function uniq(values){return [...new Set(values.filter(Boolean))];}
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
 const byFirmware=new Map(firmwares.map(fw=>[fw,[]]));
 for(const observation of observations){const fw=text(observation.firmware);if(byFirmware.has(fw))byFirmware.get(fw).push(observation);}
 const rows=firmwares.map(firmware=>{
  const obs=byFirmware.get(firmware),sessionIds=uniq(obs.map(x=>text(x.sessionId)));
  const queueRows=queue.filter(x=>text(x.firmware)===firmware||text(x.targetFirmware)===firmware);
  const reviewedSourceMatch=sourceRecords.some(x=>text(x.firmware)===firmware||text(x.targetFirmware)===firmware);
  const candidateEligible=queueRows.some(x=>x.candidateEligible===true);
  const item={firmware,sessionIds,reviewedSourceMatch,candidateEligible};
  return {...item,observationCount:obs.length,reproductionCount:sessionIds.length,promotion:promotionState(item),confidence:confidence(item),queueCount:queueRows.length};
 });
 return {reportType:'NEXT_RESEARCH_DASHBOARD',schemaVersion:1,generatedAt:new Date().toISOString(),promotionOrder:ORDER.slice(),rows};
}
export function summarizeDashboard(report){
 const rows=Array.isArray(report?.rows)?report.rows:[];
 return {firmwares:rows.length,observed:rows.filter(x=>x.promotion==='OBSERVED'&&x.observationCount>0).length,reproduced:rows.filter(x=>x.promotion==='REPRODUCED').length,candidates:rows.filter(x=>x.promotion==='CANDIDATE').length};
}
