'use client';
import {upload} from '@vercel/blob/client';
import {useState} from 'react';
import {useSpacetimeDB} from 'spacetimedb/react';
export function MediaUpload({siteId,onUploaded}:{siteId:string;onUploaded:(hash:string)=>void}){
  const {token,identity}=useSpacetimeDB();const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[mediaId,setMediaId]=useState(''),[triage,setTriage]=useState<Record<string,unknown>|null>(null);
  async function send(file:File){
    if(!identity||!token||!siteId)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){setMessage('Choose a JPEG, PNG, or WebP image up to 10 MB.');return;}
    setBusy(true);setMessage('Uploading to private storage…');
    try{
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))).map(n=>n.toString(16).padStart(2,'0')).join('');
      const metadata={id:crypto.randomUUID(),siteId,contentHash:hash,mimeType:file.type};
      const blob=await upload(`evidence/${identity.toHexString()}/${metadata.id}`,file,{access:'private',handleUploadUrl:'/api/media/upload-token',headers:{authorization:`Bearer ${token}`},clientPayload:JSON.stringify(metadata),contentType:file.type,multipart:file.size>4*1024*1024});
      const verified=await fetch('/api/media/finalize',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({pathname:blob.pathname,metadata})});
      if(!verified.ok)throw new Error('Verification failed');
      setMediaId(metadata.id);onUploaded(hash);setMessage('Private media verified by SHA-256 and attached to this draft.');
    }catch{setMessage('Upload did not finish. Your observation draft remains intact; choose the file again to retry.')}
    finally{setBusy(false)}
  }
  async function review(){setBusy(true);try{const response=await fetch('/api/ai/media-triage',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({mediaId})});if(!response.ok)throw new Error('Unavailable');const body=await response.json();setTriage(body.proposal)}catch{setMessage('Visual assistance is unavailable. The verified image and typed report remain available.')}finally{setBusy(false)}}
  return <div className="field"><label htmlFor="media">Supporting image (private)</label><input id="media" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||!siteId||!token} onChange={e=>{const file=e.target.files?.[0];if(file)void send(file)}}/><p className="small muted">Images support visible features. They cannot establish invisible contaminants or measured chemistry.</p>{mediaId&&<button className="quiet-button" type="button" disabled={busy} onClick={review}>Review visible image features with AI</button>}{triage&&<div className="notice"><b>Unconfirmed visual aid</b><p>Quality: {String(triage.quality)} · Foam: {String(triage.foam)} · Litter: {String(triage.litter)} · Discoloration: {String(triage.discoloration)}</p><p>No chemistry, pathogens, contaminants, health risk, causes, or measured values can be inferred. This aid does not change evidence eligibility or decisions.</p></div>}{message&&<p role="status">{message}</p>}</div>;
}
