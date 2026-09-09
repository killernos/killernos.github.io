import { KERNEL_SOURCE_REGISTRY } from './kernel-source-registry.js';

const VALID_STATES = new Set(['SAME','CHANGED','NEW','MISSING','INCONCLUSIVE']);

function clone(value){ return JSON.parse(JSON.stringify(value)); }
function norm(value){ return value == null ? null : String(value).trim(); }

export function compareSourceRecord(baseRecord, targetRecord){
  if(!baseRecord && !targetRecord) return {state:'INCONCLUSIVE'};
  if(!baseRecord && targetRecord) return {state:'NEW'};
  if(baseRecord && !targetRecord) return {state:'MISSING'};
  const a = norm(baseRecord.value);
  const b = norm(targetRecord.value);
  if(a == null || b == null) return {state:'INCONCLUSIVE'};
  return {state:a === b ? 'SAME' : 'CHANGED', baseValue:a, targetValue:b};
}

export function buildDifferentialMatrix(records){
  const byFw = new Map();
  for(const record of records || []){
    const fw = norm(record.firmware);
    const key = norm(record.key);
    if(!fw || !key) continue;
    if(!byFw.has(fw)) byFw.set(fw,new Map());
    byFw.get(fw).set(key, clone(record));
  }
  const firmware = KERNEL_SOURCE_REGISTRY.researchScope.firmware.slice();
  const keys = new Set();
  byFw.forEach(m=>m.forEach((_,k)=>keys.add(k)));
  const rows = [];
  for(let i=1;i<firmware.length;i++){
    const baseFirmware = firmware[i-1], targetFirmware = firmware[i];
    for(const key of keys){
      const result = compareSourceRecord(byFw.get(baseFirmware)?.get(key), byFw.get(targetFirmware)?.get(key));
      if(!VALID_STATES.has(result.state)) result.state='INCONCLUSIVE';
      rows.push({
        key,
        baseFirmware,
        targetFirmware,
        state:result.state,
        baseValue:result.baseValue ?? null,
        targetValue:result.targetValue ?? null,
        evidenceClass:'SOURCE_CONFIRMED',
        hardwareObserved:false,
        candidateEligible:false
      });
    }
  }
  return {
    reportType:'NEXT_KERNEL_SOURCE_DIFFERENTIAL',
    schemaVersion:1,
    source:clone(KERNEL_SOURCE_REGISTRY.source),
    createdAt:new Date().toISOString(),
    rows
  };
}

export function summarizeDifferential(report){
  const summary = {SAME:0,CHANGED:0,NEW:0,MISSING:0,INCONCLUSIVE:0};
  for(const row of report?.rows || []) summary[row.state] = (summary[row.state] || 0) + 1;
  return summary;
}

export function validateImportedSourceRecords(records){
  if(!Array.isArray(records)) return {ok:false,errors:['records must be an array']};
  const errors=[];
  for(let i=0;i<records.length;i++){
    const r=records[i]||{};
    if(!KERNEL_SOURCE_REGISTRY.researchScope.firmware.includes(norm(r.firmware))) errors.push(`record ${i}: unsupported firmware`);
    if(!norm(r.key)) errors.push(`record ${i}: key required`);
    if(r.hardwareObserved===true) errors.push(`record ${i}: imported source data cannot claim HARDWARE_OBSERVED`);
  }
  return {ok:errors.length===0,errors};
}
