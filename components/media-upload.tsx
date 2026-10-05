'use client';
import {upload} from '@vercel/blob/client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useSpacetimeDB} from 'spacetimedb/react';
import {fieldDatabase,type QueuedMedia} from '@/lib/offline/drafts';
export function MediaUpload({siteId,draftId,onUploaded,onPending}:{siteId:string;draftId:string;onUploaded:(hash:string)=>void;onPending:(pending:boolean)=>void}){
  const {token,identity,isActive}=useSpacetimeDB();const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[mediaId,setMediaId]=useState(''),[triage,setTriage]=useState<Record<string,unknown>|null>(null);
  const working=useRef(false);
  const flush=useCallback(async()=>{
    if(working.current||!token||!identity||!isActive||!navigator.onLine)return;
    working.current=true;setBusy(true);
    try{
      const queued=await fieldDatabase.media.where('draftId').equals(draftId).toArray();onPending(queued.length>0);
      for(const row of queued){
        const metadata={id:row.id,siteId:row.siteId,contentHash:row.contentHash,mimeType:row.mimeType},pathname=`evidence/${identity.toHexString()}/${row.id}`;
        const finalize=()=>fetch('/api/media/finalize',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({pathname,metadata})});
        let verified:Response|undefined;
        if(row.attempts>0)verified=await finalize();
        if(!verified?.ok){
          await fieldDatabase.media.update(row.id,{attempts:row.attempts+1});
          await upload(pathname,row.blob,{access:'private',handleUploadUrl:'/api/media/upload-token',headers:{authorization:`Bearer ${token}`},clientPayload:JSON.stringify(metadata),contentType:row.mimeType,multipart:row.blob.size>4*1024*1024});
          verified=await finalize();
        }
        if(!verified.ok)throw new Error('Verification failed');
        // Persist attachment before removing the queued binary.
        await fieldDatabase.transaction('rw',fieldDatabase.drafts,fieldDatabase.media,async()=>{
          const saved=await fieldDatabase.drafts.get('active');
          if(saved?.payload.id===draftId)await fieldDatabase.drafts.put({...saved,payload:{...saved.payload,mediaHashes:[...new Set([...saved.payload.mediaHashes,row.contentHash])].slice(0,5)}});
          await fieldDatabase.media.delete(row.id);
        });
        setMediaId(row.id);onUploaded(row.contentHash);setMessage('Private media verified by SHA-256 and attached to this draft.');
      }
      onPending(false);
    }catch{setMessage('Image is queued on this device. Reconnect or retry; the observation draft remains intact.');onPending(true)}
    finally{working.current=false;setBusy(false)}
  },[draftId,identity,isActive,onPending,onUploaded,token]);
  useEffect(()=>{const timer=setTimeout(()=>{void fieldDatabase.media.where('draftId').equals(draftId).count().then(count=>{onPending(count>0);if(count)void flush()})},0);window.addEventListener('online',flush);return()=>{clearTimeout(timer);window.removeEventListener('online',flush)}},[draftId,flush,onPending]);
  async function queue(file:File){
    if(!siteId)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){setMessage('Choose a JPEG, PNG, or WebP image up to 10 MB.');return;}
    setBusy(true);onPending(true);
    try{
      if(await fieldDatabase.media.where('draftId').equals(draftId).count()>=5)throw new Error('Queue limit');
      const image=await createImageBitmap(file),scale=Math.min(1,4096/Math.max(image.width,image.height));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
      canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);image.close();
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Image conversion failed')),'image/webp',0.9));
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(n=>n.toString(16).padStart(2,'0')).join('');
      const row:QueuedMedia={id:crypto.randomUUID(),draftId,siteId,blob,contentHash:hash,mimeType:'image/webp',attempts:0,createdAt:new Date().toISOString()};
      await fieldDatabase.media.put(row);setMessage('Image metadata removed. The private upload is queued on this device.');
      await flush();
    }catch{setMessage('Image could not be prepared. Your typed draft remains intact.');onPending((await fieldDatabase.media.where('draftId').equals(draftId).count())>0)}
    finally{setBusy(false)}
  }
  async function review(){setBusy(true);try{const response=await fetch('/api/ai/media-triage',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({mediaId})});if(!response.ok)throw new Error('Unavailable');const body=await response.json();setTriage(body.proposal)}catch{setMessage('Visual assistance is unavailable. The verified image and typed report remain available.')}finally{setBusy(false)}}
  return <div className="field"><label htmlFor="media">Supporting image (private)</label><input id="media" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||!siteId} onChange={e=>{const file=e.target.files?.[0];if(file)void queue(file)}}/><p className="small muted">Images are re-encoded to remove embedded metadata and queued locally until verified. They cannot establish invisible contaminants or measured chemistry.</p><button className="quiet-button" type="button" disabled={busy||!isActive} onClick={()=>void flush()}>Retry queued images</button>{mediaId&&<button className="quiet-button" type="button" disabled={busy} onClick={review}>Review visible image features with AI</button>}{triage&&<div className="notice"><b>Unconfirmed visual aid</b><p>Quality: {String(triage.quality)} · Foam: {String(triage.foam)} · Litter: {String(triage.litter)} · Discoloration: {String(triage.discoloration)}</p><p>No chemistry, pathogens, contaminants, health risk, causes, or measured values can be inferred. This aid does not change evidence eligibility or decisions.</p></div>}{message&&<p role="status">{message}</p>}</div>;
}
