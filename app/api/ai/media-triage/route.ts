import {z} from 'zod';
import {get} from '@vercel/blob';
import {generateText,Output} from 'ai';
import {createGateway} from '@ai-sdk/gateway';
import {authenticatedIdentity,bearer,withConnection} from '@/lib/spacetime/connect';
import {reserve,finish} from '@/lib/ai/audit';
import {mediaTriageOutput,mediaTriageSystem} from '@/lib/ai/contracts';
export const maxDuration=30;
export async function POST(request:Request){
  const traceId=crypto.randomUUID();let identity:string,token:string;
  try{token=bearer(request);identity=(await authenticatedIdentity(token)).identity}catch{return Response.json({error:'AUTHENTICATION_REQUIRED',traceId},{status:401})}
  const input=z.object({mediaId:z.string().uuid()}).strict().safeParse(await request.json().catch(()=>null));if(!input.success)return Response.json({error:'VALIDATION_ERROR',traceId},{status:400});
  const media=await withConnection(token,['SELECT * FROM my_media'],conn=>conn.db.myMedia.id.find(input.data.mediaId));
  if(!media)return Response.json({error:'AUTHORIZATION_DENIED',traceId},{status:403});
  if(process.env.AI_DISABLED==='true')return Response.json({error:'AI_UNAVAILABLE',traceId},{status:503});
  const model=process.env.AI_MEDIA_MODEL||'openai/gpt-5.4-mini';let id:string;
  try{id=await reserve(identity,'visible-media-triage',model,{contentHash:media.contentHash,schemaVersion:'visible-media-v1'})}catch{return Response.json({error:'ASSISTANCE_LIMIT_OR_SERVICE_UNAVAILABLE',traceId},{status:429})}
  try{
    const blob=await get(media.pathname,{access:'private'});if(!blob||blob.statusCode!==200||blob.blob.size>10*1024*1024)throw new Error('MEDIA_UNAVAILABLE');
    const bytes=new Uint8Array(await new Response(blob.stream).arrayBuffer());
    const gateway=createGateway({apiKey:process.env.AI_GATEWAY_API_KEY});
    const result=await generateText({model:gateway(model),system:mediaTriageSystem,messages:[{role:'user',content:[{type:'text',text:'Review only the visible image features.'},{type:'image',image:bytes,mediaType:media.mimeType}]}],output:Output.object({schema:mediaTriageOutput}),maxOutputTokens:250,maxRetries:1,abortSignal:AbortSignal.timeout(20000)});
    const proposal={...result.output,confirmed:false,unsupportedInference:['chemistry','pathogens','contaminants','health risk','cause','measured values'],schemaVersion:'visible-media-v1'};
    await finish(id,'completed',{proposal,model,usage:result.usage});return Response.json({id,proposal,traceId},{headers:{'cache-control':'no-store'}});
  }catch{await finish(id,'unavailable',{code:'AI_UNAVAILABLE'}).catch(()=>{});return Response.json({error:'AI_UNAVAILABLE',traceId},{status:503})}
}
