'use client';
import {useEffect,useRef,useState} from 'react';
import {useReducer,useSpacetimeDB,useTable} from 'spacetimedb/react';
import {reducers,tables} from '@/lib/spacetime/bindings';
import {fieldDatabase,type FieldDraft} from '@/lib/offline/drafts';
import {reportSchema,type Evidence,type ReportInput} from '@/lib/domain/core';

function newDraft():ReportInput{return {id:crypto.randomUUID(),siteId:'',reachId:'',description:'',category:'other',observedAt:new Date().toISOString(),latitude:0,longitude:0,gpsAccuracyM:null,protocolVersion:'field-v1',mediaHashes:[],measurement:null,supersedesId:'',correctionReason:'',missionId:''}}
export function ReportForm(){
  const [sites]=useTable(tables.monitoringSites),[mine]=useTable(tables.myEvidence);
  const {isActive,token}=useSpacetimeDB();
  const submit=useReducer(reducers.createReport),revise=useReducer(reducers.appendRevision);
  const [draft,setDraft]=useState<ReportInput|null>(null),[pending,setPending]=useState(false),[message,setMessage]=useState(''),[storageReady,setStorageReady]=useState(false);
  const [proposal,setProposal]=useState<{description:string;category:ReportInput['category']}|null>(null);
  const synchronizing=useRef(false);
  useEffect(()=>{let mounted=true;fieldDatabase.drafts.get('active').then(saved=>{if(mounted){setDraft(saved?.payload||newDraft());setPending(saved?.state==='pending');setStorageReady(true)}}).catch(()=>{if(mounted){setDraft(newDraft());setMessage('Device storage is unavailable. Keep this page open until submission.')}});return()=>{mounted=false}},[]);
  useEffect(()=>{if(!draft||!storageReady)return;const saved:FieldDraft={key:'active',payload:draft,state:pending?'pending':'editing',updatedAt:new Date().toISOString()};void fieldDatabase.drafts.put(saved).catch(()=>setMessage('Could not save the draft on this device.'));},[draft,pending,storageReady]);
  async function synchronize(payload:ReportInput){
    if(synchronizing.current)return;synchronizing.current=true;
    try{
      await (payload.supersedesId?revise({payload:JSON.stringify(payload)}):submit({payload:JSON.stringify(payload)}));
      if(storageReady)await fieldDatabase.drafts.delete('active').catch(()=>{});setPending(false);setDraft(newDraft());setMessage('Evidence submitted. The original record and its provenance are preserved.');
    }catch{setMessage('Submission is pending. Your draft will retry when the evidence service reconnects.');}
    finally{synchronizing.current=false}
  }
  useEffect(()=>{if(isActive&&pending&&draft)void synchronize(draft);},[isActive,pending]); // retries preserve the original client id
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
  return <><div className="form card">
    {selected?.synthetic&&<div className="notice">Synthetic demonstration location. This submission will be marked synthetic.</div>}
    {draft.supersedesId&&<div className="notice">Appending a correction to {draft.supersedesId}. The original remains in the ledger.</div>}
    <div className="field"><label htmlFor="site">Monitoring site</label><select id="site" value={draft.siteId} disabled={pending} onChange={e=>{const site=sites.find(s=>s.id===e.target.value);if(site)change({siteId:site.id,reachId:site.reachId,latitude:site.latitude,longitude:site.longitude})}}><option value="">Select a known monitoring site</option>{sites.map(s=><option value={s.id} key={s.id}>{s.name}{s.synthetic?' · synthetic':''}</option>)}</select></div>
    <div className="field"><label htmlFor="time">Observed time (UTC)</label><input id="time" type="datetime-local" value={draft.observedAt.slice(0,16)} disabled={pending} onChange={e=>change({observedAt:e.target.value?`${e.target.value}:00.000Z`:''})}/></div>
    <div className="field"><label htmlFor="category">Observation category</label><select id="category" value={draft.category} disabled={pending} onChange={e=>change({category:e.target.value as ReportInput['category']})}><option value="other">Other / uncertain</option><option value="wastewater-indicator">Visible or sensed wastewater indicator</option><option value="ecological">Ecological condition</option></select></div>
    <div className="field"><label htmlFor="description">Describe what you directly observed</label><textarea id="description" value={draft.description} disabled={pending} onChange={e=>change({description:e.target.value})}/></div>
    <button className="quiet-button" type="button" onClick={propose} disabled={pending||draft.description.length<15}>Propose fields with AI</button>
    {proposal&&<div className="notice"><b>AI proposal · unconfirmed</b><p>{proposal.description}</p><p>Category: {proposal.category}</p><button type="button" className="primary" onClick={()=>{change(proposal);setProposal(null);setMessage('You confirmed the proposed text. Review the complete report before submitting.')}}>Confirm these fields</button></div>}
    <details><summary>Instrument measurement (optional)</summary><p className="muted small">Enter an actual instrument reading with its unit and calibration record. No measurement is inferred from the report.</p><label><input type="checkbox" checked={!!draft.measurement} disabled={pending} onChange={e=>change({measurement:e.target.checked?{indicator:'dissolved-oxygen',value:0,unit:'mg/L',instrumentId:'',calibrationDate:new Date().toISOString()}:null})}/> Include a measured value</label>{draft.measurement&&<><div className="field"><label htmlFor="indicator">Indicator</label><select id="indicator" value={draft.measurement.indicator} onChange={e=>{const indicator=e.target.value as NonNullable<ReportInput['measurement']>['indicator'];change({measurement:{...draft.measurement!,indicator,unit:({'dissolved-oxygen':'mg/L',temperature:'Cel',pH:'[pH]',conductivity:'uS/cm'})[indicator]}})}}>{['dissolved-oxygen','temperature','pH','conductivity'].map(i=><option key={i}>{i}</option>)}</select></div><div className="field"><label htmlFor="value">Reading ({draft.measurement.unit})</label><input id="value" type="number" step="any" value={draft.measurement.value} onChange={e=>change({measurement:{...draft.measurement!,value:Number(e.target.value)}})}/></div><div className="field"><label htmlFor="instrument">Instrument identifier</label><input id="instrument" value={draft.measurement.instrumentId} onChange={e=>change({measurement:{...draft.measurement!,instrumentId:e.target.value}})}/></div><div className="field"><label htmlFor="calibration">Calibration timestamp (UTC)</label><input id="calibration" type="datetime-local" value={draft.measurement.calibrationDate.slice(0,16)} onChange={e=>change({measurement:{...draft.measurement!,calibrationDate:`${e.target.value}:00.000Z`}})}/></div></>}</details>
    {draft.supersedesId&&<div className="field"><label htmlFor="correction">Correction reason</label><textarea id="correction" value={draft.correctionReason} onChange={e=>change({correctionReason:e.target.value})}/></div>}
    <div className="field"><label htmlFor="mission">Monitoring mission ID (when completing a mission)</label><input id="mission" value={draft.missionId} onChange={e=>change({missionId:e.target.value})}/></div>
    <div className="actions"><button className="primary" type="button" onClick={send} disabled={pending}>{pending?'Queued for synchronization':'Submit confirmed observation'}</button>{pending&&isActive&&<button className="quiet-button" type="button" onClick={()=>synchronize(draft)}>Retry queued submission</button>}</div>
    {message&&<p role="status" className="notice">{message}</p>}
    <p className="muted small">Drafts are stored in IndexedDB. Submission IDs remain stable across retries. Coordinates refer to your selected monitoring site; GPS accuracy is recorded separately when captured.</p>
  </div><section><h2>My evidence ledger</h2><div className="list">{mine.map(row=>{const e=JSON.parse(row.payload) as Evidence;return <article className="row" key={e.id}><div><span className={`badge ${e.synthetic?'warn':''}`}>{e.synthetic?'Synthetic evidence':e.kind}</span><h3>{e.siteId}</h3><p>{e.description}</p><p className="muted small">{e.id} · {e.observedAt}{e.supersedesId?` · revises ${e.supersedesId}`:''}</p></div><button type="button" className="quiet-button" onClick={()=>{const {ownerId,sourceLineageId,synthetic,kind,submittedAt,contentHash,...raw}=e;setDraft({...raw,id:crypto.randomUUID(),supersedesId:e.id,correctionReason:''});setPending(false);window.scrollTo({top:0,behavior:'smooth'})}}>Append correction</button></article>})}</div></section></>;
}
