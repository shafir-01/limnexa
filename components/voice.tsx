'use client';
import {useState} from 'react';
import {useScribe} from '@elevenlabs/react';
import {useSpacetimeDB} from 'spacetimedb/react';
export default function VoiceCapture({onConfirm}:{onConfirm:(text:string)=>void}){
  const {token}=useSpacetimeDB();const [message,setMessage]=useState('');
  const scribe=useScribe({modelId:'scribe_v2_realtime',onError:()=>setMessage('Voice is unavailable. Continue with typed reporting.')});
  async function start(){try{const response=await fetch('/api/voice/session-token',{method:'POST',headers:{authorization:`Bearer ${token}`}});if(!response.ok)throw new Error('Unavailable');const session=await response.json();await scribe.connect({token:session.token,microphone:{echoCancellation:true,noiseSuppression:true}});setMessage('Recording. Stop and review the transcript before adding it to your report.')}catch{setMessage('Voice is unavailable. Typed reporting continues normally.')}}
  const text=scribe.committedTranscripts.map(t=>t.text).join(' ');
  return <details><summary>Dictate a field description</summary><p className="small muted">Microphone audio is sent to ElevenLabs for transcription. Limnexa does not retain the raw audio. Review the transcript before confirming it.</p><div className="actions"><button className="quiet-button" type="button" disabled={scribe.isConnected||!token} onClick={start}>Start dictation</button><button className="quiet-button" type="button" disabled={!scribe.isConnected} onClick={()=>scribe.disconnect()}>Stop recording</button></div><p aria-live="polite">{text} {scribe.partialTranscript}</p>{text&&<button className="quiet-button" type="button" disabled={scribe.isConnected} onClick={()=>onConfirm(text)}>Confirm transcript as my description</button>}{message&&<p role="status">{message}</p>}</details>;
}
