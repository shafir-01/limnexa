import {generateText,Output} from 'ai';
import {createGateway} from '@ai-sdk/gateway';
import {authenticatedIdentity,bearer} from '@/lib/spacetime/connect';
import {extractionInput,extractionOutput,extractionSystem,confirmedTextProposal} from '@/lib/ai/contracts';
import {reserve,finish} from '@/lib/ai/audit';
export const maxDuration=30;
export async function POST(request:Request){
  const traceId=crypto.randomUUID();let identity:string;
  try{identity=(await authenticatedIdentity(bearer(request))).identity}catch{return Response.json({error:'AUTHENTICATION_REQUIRED',traceId},{status:401})}
  const input=extractionInput.safeParse(await request.json().catch(()=>null));if(!input.success)return Response.json({error:'VALIDATION_ERROR',traceId},{status:400});
  if(process.env.AI_DISABLED==='true')return Response.json({error:'AI_UNAVAILABLE',traceId},{status:503});
  const model=process.env.AI_EXTRACTION_MODEL||'openai/gpt-5.4-mini';let id:string;
  try{id=await reserve(identity,'field-extraction',model,input.data)}catch{return Response.json({error:'ASSISTANCE_LIMIT_OR_SERVICE_UNAVAILABLE',traceId},{status:429})}
  try{
    const gateway=createGateway({apiKey:process.env.AI_GATEWAY_API_KEY});
    const result=await generateText({model:gateway(model),system:extractionSystem,prompt:JSON.stringify({untrustedTranscript:input.data.transcript}),output:Output.object({schema:extractionOutput}),maxOutputTokens:500,abortSignal:AbortSignal.timeout(20000),maxRetries:1});
    const proposal=confirmedTextProposal(input.data.transcript,result.output);
    await finish(id,'completed',{proposal,model,usage:result.usage});
    return Response.json({id,traceId,proposal,model},{headers:{'cache-control':'no-store'}});
  }catch{await finish(id,'unavailable',{code:'AI_UNAVAILABLE'}).catch(()=>{});return Response.json({error:'AI_UNAVAILABLE',traceId},{status:503})}
}
