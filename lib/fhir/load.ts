import {serviceToken,withConnection} from '../spacetime/connect';
import {validateEvidence,type Evidence,type Trace} from '../domain/core';
import {toBundle} from './map';
import {validateExport} from './validate';
export async function loadExport(incidentId:string,allowPrivate=false,snapshot?:{state:string;trace:Trace;evidenceIds:string}){
  return withConnection(serviceToken(),['SELECT * FROM service_incidents','SELECT * FROM service_evidence'],conn=>{
    const incident=conn.db.serviceIncidents.id.find(incidentId);
    if(!incident||(!incident.synthetic&&!allowPrivate)||incident.policyId==='synthetic-wastewater-v1')throw new Error('AUTHORIZATION_DENIED');
    const trace=snapshot?.trace||JSON.parse(incident.trace) as Trace;
    const ids=new Set(trace.evidenceIds);
    const evidence=[...conn.db.serviceEvidence.iter()].filter(e=>ids.has(e.id)).map(row=>JSON.parse(row.payload) as Evidence);
    const bundle=toBundle({incident:{...incident,state:snapshot?.state||incident.state},trace,evidence,validations:evidence.map(e=>validateEvidence(e,e.submittedAt,trace.policy)),exportedAt:trace.executedAt});
    return {bundle,validation:validateExport(bundle)};
  });
}
