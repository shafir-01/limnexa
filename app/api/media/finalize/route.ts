import {z} from 'zod';
import {authenticatedIdentity,bearer} from '@/lib/spacetime/connect';
import {mediaMetadata,verifyAndRegister} from '@/lib/blob/media';
const input=z.object({pathname:z.string().max(300),metadata:mediaMetadata}).strict();
export async function POST(request:Request){
  const traceId=crypto.randomUUID();let identity:string;
  try{identity=(await authenticatedIdentity(bearer(request))).identity}catch{return Response.json({error:'AUTHENTICATION_REQUIRED',traceId},{status:401})}
  const parsed=input.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:'VALIDATION_ERROR',traceId},{status:400});
  try{return Response.json(await verifyAndRegister(parsed.data.pathname,identity,parsed.data.metadata))}catch{return Response.json({error:'MEDIA_VERIFICATION_FAILED',traceId},{status:400})}
}
