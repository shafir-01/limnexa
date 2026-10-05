'use client';
import { useEffect, useState } from 'react';
import { useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react';
import { reducers, tables } from '@/lib/spacetime/bindings';

export function ConnectionStatus() {
  const { isActive } = useSpacetimeDB();
  return <span role="status" className={`badge ${isActive ? '' : 'warn'}`}>{isActive ? 'Live connection' : 'Connecting to evidence service'}</span>;
}
export function LiveStats() {
  const [evidence] = useTable(tables.publicDemoEvidence);
  const [incidents] = useTable(tables.publicDemoIncidents);
  return <div className="grid"><div className="card"><span className="badge">Synthetic evidence</span><div className="stat">{evidence.length}</div><p>Source observations served from Maincloud.</p></div><div className="card"><span className="badge blue">Independent inputs</span><div className="stat">2</div><p>Two seeded source lineages were assessed by the published reducer.</p></div><div className="card"><span className="badge warn">Investigation</span><div className="stat">{incidents.length}</div><p>Policy-triggered operational records.</p></div></div>;
}
export function LiveEvidence() {
  const [rows, ready] = useTable(tables.publicDemoEvidence);
  return <div className="list">{!ready&&<p>Loading evidence…</p>}{rows.map(o=><article className="row" key={o.id}><div><span className="badge">Citizen observation</span><h3>{o.site}</h3><p>{o.description}</p><p className="muted small">{o.id} · {o.observedAt} · hash {o.contentHash}</p></div><span className="badge warn">Synthetic</span></article>)}</div>;
}
export function LiveOperations() {
  const [incidents, ready] = useTable(tables.publicDemoIncidents);
  return <div className="list">{!ready&&<p>Loading incident records…</p>}{incidents.map(i=>{
    let trace:{checks:{name:string;passed:boolean}[];independentSources:number;policyVersion:string};
    try { trace=JSON.parse(i.trace) as typeof trace; } catch { return <div className="notice" key={i.id}>Invalid stored trace for {i.id}</div>; }
    return <div className="two" key={i.id}><div className="card"><div className="section-head"><h2>{i.site}</h2><span className="badge warn">{i.state}</span></div><p>Incident {i.id}</p><h3>Why this was routed</h3><div className="timeline">{trace.checks.map(c=><article key={c.name}><h3>{c.passed?'✓':'×'} {c.name}</h3></article>)}</div></div><aside className="card"><h3>Decision record</h3><p><b>Policy:</b> {i.policyId} v{trace.policyVersion}</p><p><b>Independent sources:</b> {trace.independentSources}</p><p><b>Evidence IDs:</b> {i.evidenceIds}</p><p><b>State:</b> {i.state}</p><p className="muted small">Synthetic policy; investigation required is not a contamination diagnosis.</p></aside></div>})}</div>;
}
export function LiveMonitoring() {
  const [incidents] = useTable(tables.publicDemoIncidents);
  return <div className="list">{incidents.map(i=><div className="card" key={i.id}><span className="badge blue">Evidence gap</span><h2>Revisit {i.site}</h2><p>Collect an independent follow-up observation after any recorded action. The current incident is {i.state}.</p><p className="muted small">Linked incident: {i.id} · Synthetic</p></div>)}</div>;
}

type Draft={site:string;description:string;category:'wastewater-indicator'|'ecological'|'other';observedAt:string};
const empty:Draft={site:'',description:'',category:'other',observedAt:''};
export function ReportForm(){
  const [draft,setDraft]=useState<Draft>(empty),[message,setMessage]=useState('');
  const submit=useReducer(reducers.submitObservation);
  const [mine]=useTable(tables.myObservations);
  const { isActive }=useSpacetimeDB();
  useEffect(()=>{try{const saved=localStorage.getItem('limnexa-draft');if(saved)setDraft(JSON.parse(saved) as Draft)}catch{}},[]);
  function update(next:Draft){setDraft(next);try{localStorage.setItem('limnexa-draft',JSON.stringify(next))}catch{}}
  async function send(){
    if(draft.site.trim().length<3||draft.description.trim().length<15||!draft.observedAt){setMessage('Add a site, time, and description of at least 15 characters.');return;}
    if(!isActive){setMessage('Offline draft saved. Reconnect before submitting.');return;}
    const id=crypto.randomUUID();
    try{await submit({id,site:draft.site,category:draft.category,description:draft.description,observedAt:new Date(draft.observedAt).toISOString(),supersedesId:'',correctionReason:''});localStorage.removeItem('limnexa-draft');setDraft(empty);setMessage(`Submitted as ${id}. The original evidence is preserved.`)}catch{setMessage('Submission failed. Your offline draft is still saved on this device.');}
  }
  return <><div className="form card"><div className="field"><label htmlFor="site">Site or stream reach</label><input id="site" value={draft.site} onChange={e=>update({...draft,site:e.target.value})} placeholder="Name the location"/></div><div className="field"><label htmlFor="time">Observation time</label><input id="time" type="datetime-local" value={draft.observedAt} onChange={e=>update({...draft,observedAt:e.target.value})}/></div><div className="field"><label htmlFor="category">What kind of observation?</label><select id="category" value={draft.category} onChange={e=>update({...draft,category:e.target.value as Draft['category']})}><option value="other">Other / uncertain</option><option value="wastewater-indicator">Possible wastewater indicator</option><option value="ecological">Ecological condition</option></select></div><div className="field"><label htmlFor="description">Describe direct observations</label><textarea id="description" value={draft.description} onChange={e=>update({...draft,description:e.target.value})} placeholder="What did you see, smell, or hear?"/></div><button className="primary" type="button" onClick={send}>Submit observation</button>{message&&<p role="status" className="notice">{message}</p>}</div><section><h2>My observations</h2><div className="list">{mine.map(o=><article className="row" key={o.id}><div><h3>{o.site}</h3><p>{o.description}</p><p className="muted small">{o.id} · {o.observedAt}</p></div><span className="badge">Stored evidence</span></article>)}</div></section></>;
}
