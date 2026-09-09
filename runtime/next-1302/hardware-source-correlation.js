import { KERNEL_SOURCE_REGISTRY } from './kernel-source-registry.js';
import { buildDifferentialMatrix } from './kernel-differential.js';
import { validateObservationSession } from './observation-schema.js';

function text(v){ return v == null ? '' : String(v).trim(); }
function clone(v){ return JSON.parse(JSON.stringify(v)); }

export function validateHardwareObservationSession(session){
  return validateObservationSession(session);
}

export function correlateHardwareToSource(session, sourceRecords){
  const validation=validateHardwareObservationSession(session);
  if(!validation.ok){ const e=new Error(validation.errors.join('; ')); e.code='NEXT_HARDWARE_SESSION_INVALID'; throw e; }
  const matrix=buildDifferentialMatrix(sourceRecords);
  const firmware=text(session.firmware), sessionId=text(session.sessionId);
  const observedKeys=new Set((session.samples||[]).map(s=>text(s.key)).filter(Boolean));
  const matches=matrix.rows.filter(row => (row.baseFirmware===firmware || row.targetFirmware===firmware) && observedKeys.has(row.key));
  return {reportType:'NEXT_HARDWARE_SOURCE_CORRELATION',schemaVersion:2,createdAt:new Date().toISOString(),sessionId,firmware,firmwareSource:'UA',evidenceClass:'HARDWARE_OBSERVED',sourceEvidenceClass:'SOURCE_CONFIRMED',source:clone(KERNEL_SOURCE_REGISTRY.source),matchedDifferences:matches.map(row=>clone(row)),observedKeys:[...observedKeys],automaticExploitPromotion:false,kernelExecutionAuthorized:false,kernelWriteAuthorized:false,henAuthorized:false};
}

export function buildCandidateReview(correlations){
  const grouped=new Map();
  for(const c of correlations||[]){
    if(c?.reportType!=='NEXT_HARDWARE_SOURCE_CORRELATION' || c?.evidenceClass!=='HARDWARE_OBSERVED' || !text(c.sessionId)) continue;
    for(const row of c.matchedDifferences||[]){
      if(!['CHANGED','NEW','MISSING'].includes(row.state)) continue;
      const id=`${row.key}|${row.baseFirmware}|${row.targetFirmware}|${row.state}`;
      if(!grouped.has(id)) grouped.set(id,{key:row.key,baseFirmware:row.baseFirmware,targetFirmware:row.targetFirmware,state:row.state,sessions:new Set(),firmware:new Set()});
      const item=grouped.get(id); item.sessions.add(text(c.sessionId)); item.firmware.add(c.firmware);
    }
  }
  return [...grouped.values()].map(item=>{const distinctSessionCount=item.sessions.size; return {key:item.key,baseFirmware:item.baseFirmware,targetFirmware:item.targetFirmware,state:item.state,reproductions:distinctSessionCount,distinctSessionCount,observedFirmware:[...item.firmware],reviewState:distinctSessionCount>=2?'REPRODUCED':'HARDWARE_OBSERVED',candidateEligible:distinctSessionCount>=2,exploitProven:false};});
}
