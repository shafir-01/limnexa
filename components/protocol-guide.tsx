'use client';
import {useEffect,useRef,useState} from 'react';
import {useSpacetimeDB} from 'spacetimedb/react';
import {protocolGuidance} from '@/lib/voice/protocol';
export function ProtocolGuide({category,instrument}:{category:string;instrument:boolean}){
  const {token}=useSpacetimeDB(),audio=useRef<HTMLAudioElement|null>(null),url=useRef('');const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const topic=instrument?'instrument':category==='ecological'?'ecological':category==='wastewater-indicator'?'wastewater-indicator':'general';
  useEffect(()=>()=>{audio.current?.pause();if(url.current)URL.revokeObjectURL(url.current)},[]);
  async function speak(){setBusy(true);try{const response=await fetch('/api/voice/guidance',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({topic})});if(!response.ok)throw new Error('Unavailable');audio.current?.pause();if(url.current)URL.revokeObjectURL(url.current);url.current=URL.createObjectURL(await response.blob());audio.current=new Audio(url.current);await audio.current.play();setMessage('Playing the protocol guidance shown above.')}catch{setMessage('Spoken guidance is unavailable. The complete protocol text is shown above.')}finally{setBusy(false)}}
  return <details><summary>Field protocol guidance</summary><p>{protocolGuidance[topic]}</p><div className="actions"><button type="button" className="quiet-button" disabled={!token||busy} onClick={speak}>Listen to protocol guidance</button><button type="button" className="quiet-button" onClick={()=>audio.current?.pause()}>Stop guidance</button></div>{message&&<p role="status">{message}</p>}</details>;
}
