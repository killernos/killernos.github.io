"use strict";
(function(){
 if(typeof XMLHttpRequest==="undefined")return;
 var endpoint=String(window.NEXT_COMMUNITY_REPORT_ENDPOINT||"");
 var originalOpen=XMLHttpRequest.prototype.open,originalSend=XMLHttpRequest.prototype.send;
 function text(v){return v==null?"":String(v).trim();}
 function isResearchReport(report){var runtime=report&&report.runtime||{},backend=report&&report.backend||{},research=report&&report.research||{};return runtime.runtimeMode==="research"||runtime.nextAccess==="RESEARCH"||/NEXT 13\.02-13\.52 Research/.test(text(backend.backendSelected))||/^NEXT-1302-|^SLOPKIT-|^USERLAND[_-]ARW-/.test(text(research.lastResearchStage));}
 function normalize(report){if(!report||report.schema!=="next-community-report-2"||!isResearchReport(report))return report;var research=report.research||(report.research={});research.researchMode=true;if(!research.candidate||research.candidate==="None")research.candidate="SlopKit Userland";if(!research.candidateStatus)research.candidateStatus="research";if(!report.candidate||report.candidate==="None")report.candidate="SlopKit Userland";if(!report.entrypoint||report.entrypoint==="Unknown")report.entrypoint="SlopKit";var researchFinal=text(research.lastResearchStage),actualFinal=text(report.lastStage);if(researchFinal==="NEXT-1302-SESSION-COMPLETED"&&actualFinal==="NEXT-1302-SESSION-COMPLETED")report.lastNormalizedStage="RUNTIME-COMPLETE";return report;}
 XMLHttpRequest.prototype.open=function(method,url){this.__nextResearchIntegrityRequest=String(method||"").toUpperCase()==="POST"&&String(url||"")===endpoint;return originalOpen.apply(this,arguments);};
 XMLHttpRequest.prototype.send=function(body){if(this.__nextResearchIntegrityRequest&&typeof body==="string"){try{body=JSON.stringify(normalize(JSON.parse(body)));}catch(e){}}return originalSend.call(this,body);};
 window.NEXTResearchReportIntegrity={normalize:normalize};
})();
