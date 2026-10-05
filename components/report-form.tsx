'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useReducer,useSpacetimeDB,useTable} from 'spacetimedb/react';
import {reducers,tables} from '@/lib/spacetime/bindings';
import {fieldDatabase,type FieldDraft} from '@/lib/offline/drafts';
import {reportSchema,type Evidence,type ReportInput} from '@/lib/domain/core';
import dynamic from 'next/dynamic';
import {MediaUpload} from './media-upload';
import {ProtocolGuide} from './protocol-guide';
import type {SiteInput} from '@/lib/domain/core';
const VoiceCapture=dynamic(()=>import('./voice'),{ssr:false});

function newDraft():ReportInput{const query=new URLSearchParams(window.location.search);return {id:crypto.randomUUID(),siteId:query.get('site')||'',reachId:'',description:'',category:'other',observedAt:new Date().toISOString(),latitude:0,longitude:0,gpsAccuracyM:null,protocolVersion:'field-v1',mediaHashes:[],measurement:null,supersedesId:'',correctionReason:'',missionId:query.get('mission')||''}}
export function ReportForm(){
  const [liveSites]=useTable(tables.monitoringSites),[mine]=useTable(tables.myEvidence);
  const [cachedSites,setCachedSites]=useState<SiteInput[]>([]);
  const sites=liveSites.length?liveSites:cachedSites;
  useEffect(()=>{let active=true;void fieldDatabase.sites.toArray().then(rows=>{if(active)setCachedSites(rows)}).catch(()=>{});return()=>{active=false};},[]);
  useEffect(()=>{if(liveSites.length)void fieldDatabase.sites.bulkPut([...liveSites]).catch(()=>{});},[liveSites]);
  const {isActive,token}=useSpacetimeDB();
  const submit=useReducer(reducers.createReport),revise=useReducer(reducers.appendRevision);
  const [draft,setDraft]=useState<ReportInput|null>(null),[pending,setPending]=useState(false),[message,setMessage]=useState(''),[storageReady,setStorageReady]=useState(false);
  const [proposal,setProposal]=useState<{description:string;category:ReportInput['category']}|null>(null);
  const synchronizing=useRef(false);
  useEffect(()=>{if(!draft?.siteId||draft.reachId)return;const site=sites.find(s=>s.id===draft.siteId);if(!site)return;const timer=setTimeout(()=>setDraft(previous=>previous?{...previous,reachId:site.reachId,latitude:site.latitude,longitude:site.longitude}:previous),0);return()=>clearTimeout(timer);},[sites,draft?.siteId,draft?.reachId]);
  useEffect(()=>{let mounted=true;fieldDatabase.drafts.get('active').then(saved=>{if(mounted){setDraft(saved?.payload||newDraft());setPending(saved?.state==='pending');setStorageReady(true)}}).catch(()=>{if(mounted){setDraft(newDraft());setMessage('Device storage is unavailable. Keep this page open until submission.')}});return()=>{mounted=false}},[]);
  useEffect(()=>{if(!draft||!storageReady)return;const saved:FieldDraft={key:'active',payload:draft,state:pending?'pending':'editing',updatedAt:new Date().toISOString()};void fieldDatabase.drafts.put(saved).catch(()=>setMessage('Could not save the draft on this device.'));},[draft,pending,storageReady]);
  const synchronize=useCallback(async (payload:ReportInput)=>{
    if(synchronizing.current)return;synchronizing.current=true;
    try{
      await (payload.supersedesId?revise({payload:JSON.stringify(payload)}):submit({payload:JSON.stringify(payload)}));
      if(storageReady)await fieldDatabase.drafts.delete('active').catch(()=>{});setPending(false);setDraft(newDraft());setMessage('Evidence submitted. The original record and its provenance are preserved.');
    }catch{setMessage('Submission is pending. Your draft will retry when the evidence service reconnects.');}
    finally{synchronizing.current=false}
  },[storageReady,revise,submit]);
  useEffect(()=>{if(!isActive||!pending||!draft)return;const timer=setTimeout(()=>void synchronize(draft),0);return()=>clearTimeout(timer);},[isActive,pending,draft,synchronize]); // retries preserve the original client id
  async function send(){
    const result=reportSchema.safeParse(draft);
    if(!result.success){setMessage(result.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '));return;}
    if(!storageReady&&!isActive){setMessage('Offline storage is unavailable. Keep this page open and submit when connected.');return;}
    if(storageReady)try{await fieldDatabase.drafts.put({key:'active',payload:result.data,state:'pending',updatedAt:new Date().toISOString()})}catch{setMessage('Could not queue this report safely. Keep this page open and retry.');return;}
    setPending(true);
    if(isActive)await synchronize(result.data);else setMessage('Offline: your observation is queued on this device and will sync once connected.');
  }
  async function propose(){
    if(!draft||!token)return;
    setMessage('Preparing a proposal from your description…');
    try{const response=await fetch('/api/ai/extract',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({transcript:draft.description})});const body=await response.json();if(!response.ok)throw new Error('Unavailable');setProposal(body.proposal);setMessage('Review the proposed fields. They remain suggestions until you confirm them.')}catch{setMessage('AI assistance is unavailable. Typed reporting continues normally.')}
  }
  if(!draft)return <p role="status">Restoring your field draft…</p>;
  const selected=sites.find(s=>s.id===draft.siteId);
  const change=(patch:Partial<ReportInput>)=>setDraft({...draft,...patch});
  function captureLocation(){if(!navigator.geolocation){setMessage('Geolocation is unavailable. The report can still be saved for review.');return;}navigator.geolocation.getCurrentPosition(position=>{change({latitude:position.coords.latitude,longitude:position.coords.longitude,gpsAccuracyM:position.coords.accuracy});setMessage(`GPS captured with ${Math.round(position.coords.accuracy)} m reported accuracy. The server will check its distance from the selected site.`)},()=>setMessage('GPS was not captured. The observation will retain an unknown-accuracy warning.'),{enableHighAccuracy:true,timeout:15000,maximumAge:0});}
  return <><div className="form card">
    {selected?.synthetic&&<div className="notice">Synthetic demonstration location. This submission will be marked synthetic.</div>}
    {draft.supersedesId&&<div className="notice">Appending a correction to {draft.supersedesId}. The original remains in the ledger.</div>}
    <div className="field"><label htmlFor="site">Monitoring site</label><select id="site" value={draft.siteId} disabled={pending} onChange={e=>{const site=sites.find(s=>s.id===e.target.value);if(site)change({siteId:site.id,reachId:site.reachId,latitude:site.latitude,longitude:site.longitude})}}><option value="">Select a known monitoring site</option>{sites.map(s=><option value={s.id} key={s.id}>{s.name}{s.synthetic?' · synthetic':''}</option>)}</select></div>
    <div className="field"><label htmlFor="time">Observed time (UTC)</label><input id="time" type="datetime-local" value={draft.observedAt.slice(0,16)} disabled={pending} onChange={e=>change({observedAt:e.target.value?`${e.target.value}:00.000Z`:''})}/></div>
    <button className="quiet-button" type="button" disabled={pending||!draft.siteId} onClick={captureLocation}>Capture GPS position and accuracy</button>
    <p className="small muted">{draft.gpsAccuracyM===null?'No GPS captured. Coordinates currently describe the selected site, and the report will require spatial review.':`Captured coordinates ${draft.latitude.toFixed(5)}, ${draft.longitude.toFixed(5)} · reported accuracy ${Math.round(draft.gpsAccuracyM)} m`}</p>
    <div className="field"><label htmlFor="category">Observation category</label><select id="category" value={draft.category} disabled={pending} onChange={e=>change({category:e.target.value as ReportInput['category']})}><option value="other">Other / uncertain</option><option value="wastewater-indicator">Visible or sensed wastewater indicator</option><option value="ecological">Ecological condition</option></select></div>
    <ProtocolGuide category={draft.category} instrument={!!draft.measurement}/>
    <div className="field"><label htmlFor="description">Describe what you directly observed</label><textarea id="description" value={draft.description} disabled={pending} onChange={e=>change({description:e.target.value})}/></div>
    {!pending&&<VoiceCapture onConfirm={description=>change({description})}/>}
    {!pending&&<MediaUpload siteId={draft.siteId} onUploaded={hash=>change({mediaHashes:[...new Set([...draft.mediaHashes,hash])].slice(0,5)})}/>}
    {draft.mediaHashes.length>0&&<p className="small">{draft.mediaHashes.length} verified private media artifact(s) attached.</p>}
    <button className="quiet-button" type="button" onClick={propose} disabled={pending||!token||draft.description.length<15}>Propose fields with AI</button>
    {proposal&&<div className="notice"><b>AI proposal · unconfirmed</b><p>{proposal.description}</p><p>Category: {proposal.category}</p><button type="button" className="primary" onClick={()=>{change(proposal);setProposal(null);setMessage('You confirmed the proposed text. Review the complete report before submitting.')}}>Confirm these fields</button></div>}
    <details><summary>Instrument measurement (optional)</summary><p className="muted small">Enter an actual instrument reading with its unit and calibration record. No measurement is inferred from the report.</p><label><input type="checkbox" checked={!!draft.measurement} disabled={pending} onChange={e=>change({measurement:e.target.checked?{indicator:'dissolved-oxygen',value:Number.NaN,unit:'mg/L',instrumentId:'',calibrationDate:''}:null})}/> Include a measured value</label>{draft.measurement&&<><div className="field"><label htmlFor="indicator">Indicator</label><select id="indicator" value={draft.measurement.indicator} onChange={e=>{const indicator=e.target.value as NonNullable<ReportInput['measurement']>['indicator'];change({measurement:{...draft.measurement!,indicator,unit:({'dissolved-oxygen':'mg/L',temperature:'Cel',pH:'[pH]',conductivity:'uS/cm'})[indicator]}})}}>{['dissolved-oxygen','temperature','pH','conductivity'].map(i=><option key={i}>{i}</option>)}</select></div><div className="field"><label htmlFor="value">Reading ({draft.measurement.unit})</label><input id="value" type="number" step="any" value={Number.isFinite(draft.measurement.value)?draft.measurement.value:''} onChange={e=>change({measurement:{...draft.measurement!,value:Number(e.target.value)}})}/></div><div className="field"><label htmlFor="instrument">Instrument identifier</label><input id="instrument" value={draft.measurement.instrumentId} onChange={e=>change({measurement:{...draft.measurement!,instrumentId:e.target.value}})}/></div><div className="field"><label htmlFor="calibration">Calibration timestamp (UTC)</label><input id="calibration" type="datetime-local" value={draft.measurement.calibrationDate.slice(0,16)} onChange={e=>change({measurement:{...draft.measurement!,calibrationDate:`${e.target.value}:00.000Z`}})}/></div></>}</details>
    {draft.supersedesId&&<div className="field"><label htmlFor="correction">Correction reason</label><textarea id="correction" value={draft.correctionReason} onChange={e=>change({correctionReason:e.target.value})}/></div>}
    <div className="field"><label htmlFor="mission">Monitoring mission ID (when completing a mission)</label><input id="mission" value={draft.missionId} onChange={e=>change({missionId:e.target.value})}/></div>
    <div className="actions"><button className="primary" type="button" onClick={send} disabled={pending}>{pending?'Queued for synchronization':'Submit confirmed observation'}</button>{pending&&isActive&&<button className="quiet-button" type="button" onClick={()=>synchronize(draft)}>Retry queued submission</button>}</div>
    {message&&<p role="status" className="notice">{message}</p>}
    <p className="muted small">Drafts are stored in IndexedDB. Submission IDs remain stable across retries. Coordinates refer to your selected monitoring site; GPS accuracy is recorded separately when captured.</p>
  </div><section><h2>My evidence ledger</h2><div className="list">{mine.map(row=>{const e=JSON.parse(row.payload) as Evidence;return <article className="row" key={e.id}><div><span className={`badge ${e.synthetic?'warn':''}`}>{e.synthetic?'Synthetic evidence':e.kind}</span><h3>{e.siteId}</h3><p>{e.description}</p><p className="muted small">{e.id} · {e.observedAt}{e.supersedesId?` · revises ${e.supersedesId}`:''}</p></div><button type="button" className="quiet-button" onClick={()=>{const raw=reportSchema.strip().parse(e);setDraft({...raw,id:crypto.randomUUID(),supersedesId:e.id,correctionReason:''});setPending(false);window.scrollTo({top:0,behavior:'smooth'})}}>Append correction</button></article>})}</div></section></>;
}
