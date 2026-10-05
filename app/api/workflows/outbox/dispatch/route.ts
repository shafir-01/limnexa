import {timingSafeEqual} from 'node:crypto';
import {start} from 'workflow/api';
import {dispatchOutbox} from '@/lib/workflows/outbox';
import {serviceToken,withConnection} from '@/lib/spacetime/connect';
export const maxDuration=60;
async function dispatch(request:Request){
  const expected=process.env.CRON_SECRET,provided=request.headers.get('authorization')?.replace(/^Bearer /,'');
  if(!expected||!provided||expected.length!==provided.length||!timingSafeEqual(Buffer.from(expected),Buffer.from(provided)))return Response.json({error:'AUTHORIZATION_DENIED'},{status:403});
  try{
    // Reducer leases reject concurrent claims; processing rows are included so
    // an interrupted worker can be recovered when its lease expires.
    const pending=await withConnection(serviceToken(),['SELECT * FROM service_outbox'],conn=>[...conn.db.serviceOutbox.iter()].filter(m=>['pending','retry','processing'].includes(m.status)).slice(0,20).map(m=>m.id.toString()));
    const runs=await Promise.all(pending.map(async id=>({outboxId:id,runId:(await start(dispatchOutbox,[id])).runId})));
    return Response.json({runs});
  }catch{return Response.json({error:'EXTERNAL_RETRYABLE_FAILURE'},{status:503})}
}
export const POST=dispatch;
export const GET=dispatch;
