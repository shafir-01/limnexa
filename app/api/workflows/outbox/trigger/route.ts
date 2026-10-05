import {authenticatedIdentity,bearer,withConnection} from '@/lib/spacetime/connect';
import {launchPending} from '@/lib/workflows/launch';
import {z} from 'zod';
export async function POST(request:Request){
  const traceId=crypto.randomUUID();let siteId:string|undefined;
  try{
    const token=bearer(request),identity=await authenticatedIdentity(token);
    const input=z.object({evidenceId:z.string().max(100).optional(),siteId:z.string().max(120).optional()}).strict().safeParse(await request.json().catch(()=>({})));
    if(!input.success)return Response.json({error:'VALIDATION_ERROR',traceId},{status:400});
    if(['officer','scientist','admin'].includes(identity.role))siteId=input.data.siteId;
    else{
      const owned=await withConnection(token,['SELECT * FROM my_evidence'],conn=>input.data.evidenceId?conn.db.myEvidence.id.find(input.data.evidenceId):undefined);
      if(!owned)return Response.json({error:'AUTHORIZATION_DENIED',traceId},{status:403});
      siteId=owned.siteId;
    }
  }catch{return Response.json({error:'AUTHENTICATION_REQUIRED',traceId},{status:401})}
  try{return Response.json({runs:await launchPending(siteId),traceId})}catch{return Response.json({error:'EXTERNAL_RETRYABLE_FAILURE',traceId},{status:503})}
}
