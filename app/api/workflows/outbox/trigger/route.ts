import {start} from 'workflow/api';
import {authenticatedIdentity,bearer,serviceToken,withConnection} from '@/lib/spacetime/connect';
import {dispatchOutbox} from '@/lib/workflows/outbox';
export async function POST(request:Request){
  const traceId=crypto.randomUUID();
  try{const identity=await authenticatedIdentity(bearer(request));if(!['officer','scientist','admin'].includes(identity.role))return Response.json({error:'AUTHORIZATION_DENIED',traceId},{status:403});}catch{return Response.json({error:'AUTHENTICATION_REQUIRED',traceId},{status:401})}
  try{const pending=await withConnection(serviceToken(),['SELECT * FROM service_outbox'],conn=>[...conn.db.serviceOutbox.iter()].filter(m=>['pending','retry','processing'].includes(m.status)).slice(0,20).map(m=>m.id.toString()));const runs=await Promise.all(pending.map(async id=>({outboxId:id,runId:(await start(dispatchOutbox,[id])).runId})));return Response.json({runs,traceId});}catch{return Response.json({error:'EXTERNAL_RETRYABLE_FAILURE',traceId},{status:503})}
}
