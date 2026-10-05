import type {ExportPacket} from './map';
import {DEMO_POLICY,evaluate,makeEvidence,validateEvidence,type ReportInput} from '../domain/core';
export function fixture():ExportPacket{
  const now='2026-10-05T12:00:00.000Z';
  const report:ReportInput={id:'synthetic-measurement',siteId:'DEMO-SITE-001',reachId:'DEMO-REACH-001',description:'Synthetic instrument dissolved oxygen observation.',category:'ecological',observedAt:now,latitude:59.3293,longitude:18.0686,gpsAccuracyM:12,protocolVersion:'field-v1',mediaHashes:[],measurement:{indicator:'dissolved-oxygen',value:3,unit:'mg/L',instrumentId:'SYNTHETIC-PROBE',calibrationDate:'2026-10-01T12:00:00.000Z'},supersedesId:'',correctionReason:'',missionId:''};
  const evidence=makeEvidence(report,{identity:'private-citizen-identity',lineage:'private-source',synthetic:true},now);
  return {incident:{id:'demo-fixture',site:report.siteId,state:'TRIAGED',synthetic:true},trace:evaluate([evidence],[],DEMO_POLICY,report.siteId,now),evidence:[evidence],validations:[validateEvidence(evidence,now,DEMO_POLICY)],exportedAt:now};
}
