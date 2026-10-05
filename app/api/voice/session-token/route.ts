import {ElevenLabsClient} from '@elevenlabs/elevenlabs-js';
import {authenticatedIdentity,bearer} from '@/lib/spacetime/connect';
import {reserve,finish} from '@/lib/ai/audit';
export async function POST(request:Request){
  const traceId=crypto.randomUUID();let identity:string;
  try{identity=(await authenticatedIdentity(bearer(request))).identity}catch{return Response.json({error:'AUTHENTICATION_REQUIRED',traceId},{status:401})}
  if(!process.env.ELEVENLABS_API_KEY)return Response.json({error:'VOICE_UNAVAILABLE',traceId},{status:503});
  let id:string;
  try{id=await reserve(identity,'voice-session','scribe_v2_realtime',{purpose:'transient field capture'})}catch{return Response.json({error:'ASSISTANCE_LIMIT_OR_SERVICE_UNAVAILABLE',traceId},{status:429})}
  try{
    const client=new ElevenLabsClient({apiKey:process.env.ELEVENLABS_API_KEY});
    const result=await client.tokens.singleUse.create('realtime_scribe');
    await finish(id,'completed',{provider:'elevenlabs',model:'scribe_v2_realtime',rawAudioRetained:false});
    return Response.json({token:result.token,traceId},{headers:{'cache-control':'no-store'}});
  }catch{await finish(id,'unavailable',{code:'VOICE_UNAVAILABLE'}).catch(()=>{});return Response.json({error:'VOICE_UNAVAILABLE',traceId},{status:503})}
}
