import {validateObservationSession} from './observation-schema.js';
const FIRMWARES=Object.freeze(['13.02','13.04','13.50','13.52']);
function text(v){return v==null?'':String(v).trim();}
function scalar(v){return v===null||typeof v==='string'||typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v));}
function sampleMap(observation){const out=new Map();for(const sample of Array.isArray(observation?.samples)?observation.samples:[]){const key=text(sample?.key);if(key&&scalar(sample?.value))out.set(key,sample.value);}return out;}
function sessionKey(o){return text(o?.firmware)+'|'+text(o?.sessionId);}
export function normalizeEvidence(observations=[]){
 const accepted=[],duplicates=[],rejected=[],seenSessionFirmware=new Map();
 for(const observation of observations){
  const firmware=text(observation?.firmware),sessionId=text(observation?.sessionId),validation=validateObservationSession(observation);
  if(!FIRMWARES.includes(firmware)||!sessionId||!validation.ok){rejected.push({firmware,sessionId,reason:validation.ok?'unsupported firmware or missing sessionId':validation.errors.join('; ')});continue;}
  const priorFirmware=seenSessionFirmware.get(sessionId);
  if(priorFirmware&&priorFirmware!==firmware){rejected.push({firmware,sessionId,reason:'sessionId appears under multiple firmware versions'});continue;}
  seenSessionFirmware.set(sessionId,firmware);
  const key=sessionKey(observation);if(accepted.some(x=>sessionKey(x)===key)){duplicates.push({firmware,sessionId});continue;}accepted.push(observation);
 }
 return {accepted,duplicates,rejected};
}
export function buildCrossFirmwareMatrix(observations=[]){
 const normalized=normalizeEvidence(observations),keys=new Set();for(const o of normalized.accepted)for(const key of sampleMap(o).keys())keys.add(key);
 const rows=[];for(const key of [...keys].sort())for(const firmware of FIRMWARES){const sessions=normalized.accepted.filter(o=>text(o.firmware)===firmware),values=sessions.map(o=>sampleMap(o).get(key)).filter(v=>v!==undefined),serialized=values.map(v=>JSON.stringify(v)),unique=[...new Set(serialized)],complete=values.length===sessions.length;rows.push({firmware,key,sessionCount:sessions.length,observedCount:values.length,state:values.length===0?'NO_DATA':complete&&unique.length===1?'STABLE':'VARIABLE',value:complete&&unique.length===1?JSON.parse(unique[0]):null});}
 return {reportType:'NEXT_CROSS_FIRMWARE_EVIDENCE_MATRIX',schemaVersion:2,generatedAt:new Date().toISOString(),firmwares:FIRMWARES.slice(),acceptedSessions:normalized.accepted.length,duplicateSessions:normalized.duplicates.length,rejectedSessions:normalized.rejected.length,rows};
}
export function compareFirmwarePair(matrix,leftFirmware,rightFirmware){
 const left=text(leftFirmware),right=text(rightFirmware),rows=Array.isArray(matrix?.rows)?matrix.rows:[],keys=[...new Set(rows.map(x=>x.key))],differences=[];
 for(const key of keys){const a=rows.find(x=>x.firmware===left&&x.key===key),b=rows.find(x=>x.firmware===right&&x.key===key);let classification='INCONCLUSIVE';if(a&&b&&a.state==='STABLE'&&b.state==='STABLE')classification=JSON.stringify(a.value)===JSON.stringify(b.value)?'SAME':'CHANGED';else if(a?.observedCount>0&&!b?.observedCount)classification='MISSING';else if(!a?.observedCount&&b?.observedCount)classification='NEW';differences.push({key,leftFirmware:left,rightFirmware:right,leftState:a?.state||'NO_DATA',rightState:b?.state||'NO_DATA',leftValue:a?.value??null,rightValue:b?.value??null,classification});}
 return differences;
}
export function summarizeCrossFirmwareMatrix(matrix){const rows=Array.isArray(matrix?.rows)?matrix.rows:[];return {acceptedSessions:matrix?.acceptedSessions||0,duplicateSessions:matrix?.duplicateSessions||0,rejectedSessions:matrix?.rejectedSessions||0,stable:rows.filter(x=>x.state==='STABLE').length,variable:rows.filter(x=>x.state==='VARIABLE').length,noData:rows.filter(x=>x.state==='NO_DATA').length};}
