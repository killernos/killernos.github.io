import { KERNEL_SOURCE_REGISTRY } from './kernel-source-registry.js';
import { buildDifferentialMatrix } from './kernel-differential.js';

const SUPPORTED_FW = new Set(KERNEL_SOURCE_REGISTRY.researchScope.firmware);
const FORBIDDEN_PROVENANCE = ['simulated','imported','queryDerived','userEntered','storageDerived'];

function text(v){ return v == null ? '' : String(v).trim(); }
function clone(v){ return JSON.parse(JSON.stringify(v)); }

export function validateHardwareObservationSession(session){
  const errors=[];
  if(!session || typeof session !== 'object') return {ok:false,errors:['session must be an object']};
  if(session.reportType !== 'NEXT_HARDWARE_OBSERVATION_SESSION') errors.push('reportType must be NEXT_HARDWARE_OBSERVATION_SESSION');
  if(session.evidenceClass !== 'HARDWARE_OBSERVED') errors.push('evidenceClass must be HARDWARE_OBSERVED');
  if(!SUPPORTED_FW.has(text(session.firmware))) errors.push('unsupported firmware');
  if(text(session.firmwareSource).toUpperCase() !== 'UA') errors.push('firmwareSource must be UA');
  for(const flag of FORBIDDEN_PROVENANCE) if(session[flag] === true) errors.push(`${flag} sessions are ineligible`);
  if(!Array.isArray(session.samples) || session.samples.length < 1) errors.push('at least one sample is required');
  if(Array.isArray(session.samples) && session.samples.length > 10) errors.push('maximum 10 samples per session');
  return {ok:errors.length===0,errors};
}

export function correlateHardwareToSource(session, sourceRecords){
  const validation=validateHardwareObservationSession(session);
  if(!validation.ok){ const e=new Error(validation.errors.join('; ')); e.code='NEXT_HARDWARE_SESSION_INVALID'; throw e; }
  const matrix=buildDifferentialMatrix(sourceRecords);
  const firmware=text(session.firmware);
  const observedKeys=new Set((session.samples||[]).map(s=>text(s.key)).filter(Boolean));
  const matches=matrix.rows.filter(row => (row.baseFirmware===firmware || row.targetFirmware===firmware) && observedKeys.has(row.key));
  return {
    reportType:'NEXT_HARDWARE_SOURCE_CORRELATION',
    schemaVersion:1,
    createdAt:new Date().toISOString(),
    firmware,
    firmwareSource:'UA',
    evidenceClass:'HARDWARE_OBSERVED',
    sourceEvidenceClass:'SOURCE_CONFIRMED',
    source:clone(KERNEL_SOURCE_REGISTRY.source),
    matchedDifferences:matches.map(row=>clone(row)),
    observedKeys:[...observedKeys],
    automaticExploitPromotion:false,
    kernelExecutionAuthorized:false,
    kernelWriteAuthorized:false,
    henAuthorized:false
  };
}

export function buildCandidateReview(correlations){
  const grouped=new Map();
  for(const c of correlations||[]){
    if(c?.reportType!=='NEXT_HARDWARE_SOURCE_CORRELATION' || c?.evidenceClass!=='HARDWARE_OBSERVED') continue;
    for(const row of c.matchedDifferences||[]){
      if(!['CHANGED','NEW','MISSING'].includes(row.state)) continue;
      const id=`${row.key}|${row.baseFirmware}|${row.targetFirmware}|${row.state}`;
      if(!grouped.has(id)) grouped.set(id,{key:row.key,baseFirmware:row.baseFirmware,targetFirmware:row.targetFirmware,state:row.state,reproductions:0,firmware:new Set()});
      const item=grouped.get(id); item.reproductions++; item.firmware.add(c.firmware);
    }
  }
  return [...grouped.values()].map(item=>({
    key:item.key,
    baseFirmware:item.baseFirmware,
    targetFirmware:item.targetFirmware,
    state:item.state,
    reproductions:item.reproductions,
    observedFirmware:[...item.firmware],
    reviewState:item.reproductions>=2?'REPRODUCED':'HARDWARE_OBSERVED',
    candidateEligible:item.reproductions>=2,
    exploitProven:false
  }));
}
