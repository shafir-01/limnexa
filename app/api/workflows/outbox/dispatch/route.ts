import {timingSafeEqual} from 'node:crypto';
import {launchPending} from '@/lib/workflows/launch';
import {serviceToken,withConnection} from '@/lib/spacetime/connect';
export const maxDuration=60;
async function dispatch(request:Request){
  const expected=process.env.CRON_SECRET,provided=request.headers.get('authorization')?.replace(/^Bearer /,'');
  if(!expected||!provided||expected.length!==provided.length||!timingSafeEqual(Buffer.from(expected),Buffer.from(provided)))return Response.json({error:'AUTHORIZATION_DENIED'},{status:403});
  try{
    await withConnection(serviceToken(),[],conn=>conn.reducers.refreshMonitoring({}));
    const runs=await launchPending();
    return Response.json({runs});
  }catch{return Response.json({error:'EXTERNAL_RETRYABLE_FAILURE'},{status:503})}
}
export const POST=dispatch;
export const GET=dispatch;
