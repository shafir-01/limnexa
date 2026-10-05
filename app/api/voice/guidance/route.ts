import {z} from 'zod';
import {ElevenLabsClient} from '@elevenlabs/elevenlabs-js';
import {authenticatedIdentity,bearer} from '@/lib/spacetime/connect';
import {reserve,finish} from '@/lib/ai/audit';
import {protocolGuidance} from '@/lib/voice/protocol';
export async function POST(request:Request){
  const traceId=crypto.randomUUID();let identity:string;
  try{identity=(await authenticatedIdentity(bearer(request))).identity}catch{return Response.json({error:'AUTHENTICATION_REQUIRED',traceId},{status:401})}
  const input=z.object({topic:z.enum(['general','wastewater-indicator','ecological','instrument'])}).strict().safeParse(await request.json().catch(()=>null));if(!input.success)return Response.json({error:'VALIDATION_ERROR',traceId},{status:400});
  if(!process.env.ELEVENLABS_API_KEY||!process.env.ELEVENLABS_VOICE_ID)return Response.json({error:'VOICE_UNAVAILABLE',traceId},{status:503});
  let id:string;try{id=await reserve(identity,'voice-guidance','eleven_multilingual_v2',{topic:input.data.topic,protocolVersion:'field-v1'})}catch{return Response.json({error:'ASSISTANCE_LIMIT_OR_SERVICE_UNAVAILABLE',traceId},{status:429})}
  try{
    const client=new ElevenLabsClient({apiKey:process.env.ELEVENLABS_API_KEY});
    const audio=await client.textToSpeech.convert(process.env.ELEVENLABS_VOICE_ID,{text:protocolGuidance[input.data.topic],modelId:'eleven_multilingual_v2',outputFormat:'mp3_44100_128'},{timeoutInSeconds:20,maxRetries:0});
    await finish(id,'completed',{provider:'elevenlabs',topic:input.data.topic,protocolVersion:'field-v1',schemaVersion:'fixed-guidance-v1'});
    return new Response(audio,{headers:{'content-type':'audio/mpeg','cache-control':'no-store'}});
  }catch{await finish(id,'unavailable',{code:'VOICE_UNAVAILABLE'}).catch(()=>{});return Response.json({error:'VOICE_UNAVAILABLE',traceId},{status:503})}
}
