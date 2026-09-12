const REVIEW_STAGES = new Set(['KERNEL-FAULT-OBSERVED','KERNEL-LEAK-OBSERVED','KERNEL-POINTER-LIKE-OBSERVED']);
const USERLAND_READY_STAGES = new Set(['USERLAND-ARW-VERIFIED','SLOPKIT-READ-VERIFIED','SLOPKIT-WRITE-VERIFIED']);
const MAX_EVENTS = 160;
function text(v){return v==null?'':String(v).trim();}
function now(){return new Date().toISOString();}
export function classifyAggressiveResearch(events=[]){
 let userlandReady=false;
 const reviewSignals=new Set();
 for(const event of events||[]){const stage=text(event&&event.stage);if(USERLAND_READY_STAGES.has(stage))userlandReady=true;if(REVIEW_STAGES.has(stage))reviewSignals.add(stage);}
 const kernelCandidateReview=userlandReady&&reviewSignals.size>0;
 return {userlandReady,reviewSignalCount:reviewSignals.size,reviewSignals:[...reviewSignals],kernelCandidateReview,status:kernelCandidateReview?'KERNEL-CANDIDATE / NEEDS-MANUAL-REVIEW':userlandReady?'USERLAND-READY / NO-KERNEL-SIGNAL':'COLLECTING'};
}
export function createAggressiveResearch(doc){
 const storageKey='next-1302:aggressive-research-mode';
 const recoveryKey='next-1302:aggressive-research-recovery';
 const modeField=doc.getElementById('field-aggressive-mode'),anomalyField=doc.getElementById('field-anomaly-count'),candidateField=doc.getElementById('field-candidate-review'),toggle=doc.getElementById('toggle-aggressive-mode');
 let enabled=true,active=false,sessionId='',events=[],startedAt='',recovered=null;
 try{const storedMode=localStorage.getItem(storageKey);if(storedMode!==null)enabled=storedMode==='1';const raw=localStorage.getItem(recoveryKey);if(raw)recovered=JSON.parse(raw);}catch(e){}
 function classification(){return classifyAggressiveResearch(events);}
 function render(){if(modeField)modeField.textContent=enabled?'ENABLED':'DISABLED';if(anomalyField)anomalyField.textContent=String(events.filter(e=>e.kind==='anomaly').length);if(candidateField)candidateField.textContent=classification().status;if(toggle)toggle.textContent=enabled?'Disable Aggressive Research Mode':'Enable Aggressive Research Mode';}
 function persist(incomplete){if(!enabled)return;try{localStorage.setItem(recoveryKey,JSON.stringify({sessionId,startedAt,updatedAt:now(),incomplete:!!incomplete,classification:classification(),events:events.slice(-40),kernelExecutionAuthorized:false,kernelWriteAuthorized:false,patchingAuthorized:false,henAuthorized:false}));}catch(e){}}
 function record(stage,detail,kind='stage'){if(!enabled||!active)return;const entry={at:now(),sessionId,stage:text(stage),detail:text(detail).slice(0,240),kind:text(kind)||'stage'};events.push(entry);if(events.length>MAX_EVENTS)events.shift();persist(true);render();}
 function setEnabled(value){enabled=!!value;try{localStorage.setItem(storageKey,enabled?'1':'0');if(!enabled)localStorage.removeItem(recoveryKey);}catch(e){};render();return enabled;}
 function start(id){active=true;sessionId=text(id);startedAt=now();events=[];record('MODE-SESSION-START','bounded-observation-only');}
 function finish(){record('MODE-SESSION-END',classification().status);persist(false);active=false;return snapshot();}
 function observe(stage,detail){record(stage,detail,REVIEW_STAGES.has(text(stage))?'anomaly':'stage');}
 function observeError(kind,message){record('PAGE-'+text(kind).toUpperCase(),message,'anomaly');}
 function snapshot(){const c=classification();return {enabled,active,sessionId,startedAt,eventCount:events.length,anomalyCount:events.filter(e=>e.kind==='anomaly').length,classification:c,recoveredPrevious:recovered&&recovered.incomplete===true?recovered:null,events:events.slice(),kernelExecutionAuthorized:false,kernelWriteAuthorized:false,patchingAuthorized:false,henAuthorized:false};}
 if(toggle)toggle.addEventListener('click',()=>setEnabled(!enabled));render();
 return {isEnabled:()=>enabled,setEnabled,start,finish,observe,observeError,snapshot};
}
