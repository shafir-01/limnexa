import {authenticatedIdentity,bearer,serviceToken,withConnection} from '@/lib/spacetime/connect';
import {evaluate,type Evidence,type Trace,type Weather} from '@/lib/domain/core';
export async function GET(request:Request,{params}:{params:Promise<{traceId:string}>}){
  const {traceId}=await params;
  if(!/^[a-f0-9]{64}$/.test(traceId))return Response.json({error:'VALIDATION_ERROR'},{status:400});
  try{
    const record=await withConnection(serviceToken(),['SELECT * FROM service_rule_executions'],conn=>conn.db.serviceRuleExecutions.id.find(traceId));
    if(!record)return Response.json({error:'TRACE_NOT_FOUND'},{status:404});
    if(!record.synthetic){const identity=await authenticatedIdentity(bearer(request));if(!['officer','scientist','admin'].includes(identity.role))return Response.json({error:'AUTHORIZATION_DENIED'},{status:403})}
    const trace=JSON.parse(record.payload) as Trace;
    const replay=await withConnection(serviceToken(),['SELECT * FROM service_evidence','SELECT * FROM service_weather_context'],conn=>{
      const evidence=trace.evidenceIds.map(id=>conn.db.serviceEvidence.id.find(id)).filter(e=>e!=null).map(e=>JSON.parse(e.payload) as Evidence);
      const weather=trace.weatherIds.map(id=>conn.db.serviceWeatherContext.id.find(id)).filter(w=>w!=null).map(w=>JSON.parse(w.payload) as Weather);
      if(evidence.length!==trace.evidenceIds.length||weather.length!==trace.weatherIds.length)throw new Error('REPLAY_INPUTS_MISSING');
      return evaluate(evidence,weather,trace.policy,record.siteId,trace.executedAt);
    });
    return Response.json({reproduced:replay.id===trace.id,storedTraceId:trace.id,replayedTraceId:replay.id,ruleVersion:trace.ruleVersion,policyVersion:trace.policy.version,executedAt:trace.executedAt,scope:'Historical immutable inputs, stored policy and original execution time. Current expert reviews do not rewrite the historical decision.'},{headers:{'cache-control':'no-store'}});
  }catch{return Response.json({error:'REPLAY_UNAVAILABLE'},{status:503})}
}
