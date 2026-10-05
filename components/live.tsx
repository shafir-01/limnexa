'use client';
import Link from 'next/link';
import {useReducer,useSpacetimeDB,useTable} from 'spacetimedb/react';
import {useState} from 'react';
import {HealthHandoff} from './health';
import {DeliveryHistory} from './delivery-history';
import {RuleReplay} from './rule-replay';
import {MissionActions} from './mission-actions';
import {ResponsibilityInbox} from './responsibility-inbox';
import {reducers,tables} from '@/lib/spacetime/bindings';
import {allowedTransitions,type IncidentState,type Trace,type Validation} from '@/lib/domain/core';

export function ConnectionStatus(){
  const {isActive}=useSpacetimeDB();
  return <span role="status" className={`badge ${isActive?'':'warn'}`}>{isActive?'Live connection':'Evidence service disconnected · drafts remain on this device'}</span>;
}
export function LiveStats(){
  const [evidence]=useTable(tables.demoEvidence),[incidents]=useTable(tables.demoIncidents);
  return <div className="grid"><div className="card"><span className="badge">Evidence</span><div className="stat">{evidence.length}</div></div><div className="card"><span className="badge blue">Sources</span><div className="stat">{new Set(evidence.map(e=>e.sourceLineageId)).size}</div></div><div className="card"><span className="badge warn">Investigations</span><div className="stat">{incidents.filter(i=>i.state==='INVESTIGATION_REQUIRED').length}</div></div></div>;
}
export function TrustDimensions({validation}:{validation:Validation}){
  return <div className="trust-grid">{validation.assertions?.map(a=><div key={a.dimension}><b>{a.dimension.replaceAll('_',' ')}</b><span className={`badge ${a.status==='fail'||a.status==='warn'?'warn':''}`}>{a.status.replaceAll('_',' ')}</span><p className="small muted">{a.code.replaceAll('_',' ')}</p></div>)}</div>;
}
export function LiveEvidence(){
  const [rows,ready]=useTable(tables.demoEvidence);
  return <div className="list">{!ready&&<p>Loading evidence…</p>}{rows.map(e=><article className="card" key={e.id}><span className="badge warn">Synthetic · {e.kind}</span><h2>{e.siteId}</h2><p>{e.description}</p><p className="muted small">Observed {e.observedAt} · Reach {e.reachId}</p><details><summary>Trust dimensions and provenance</summary><TrustDimensions validation={JSON.parse(e.validation) as Validation}/><p className="small">Evidence: {e.id}<br/>Lineage: {e.sourceLineageId}<br/>SHA-256: <code className="hash">{e.contentHash}</code></p></details></article>)}</div>;
}
type Incident={id:string;site:string;state:string;policyId:string;evidenceIds:string;trace:string;synthetic:boolean};
function IncidentControls({incident}:{incident:Incident}){
  const {token}=useSpacetimeDB();
  const advance=useReducer(reducers.advanceIncident),finding=useReducer(reducers.recordFinding),intervene=useReducer(reducers.recordIntervention);
  const [reason,setReason]=useState(''),[proof,setProof]=useState(''),[rationale,setRationale]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  async function move(toState:string){
    setBusy(true);
    try{
      let recordId='';
      if(toState==='CONFIRMED'){recordId=crypto.randomUUID();await finding({id:recordId,incidentId:incident.id,evidenceIds:incident.evidenceIds,description:proof})}
      if(toState==='ACTIONED'){recordId=crypto.randomUUID();await intervene({id:recordId,incidentId:incident.id,description:proof})}
      await advance({incidentId:incident.id,toState,reason,recordId,closureRationale:rationale});
      if(token)void fetch('/api/workflows/outbox/trigger',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({siteId:incident.site})}).catch(()=>{});
      setReason('');setProof('');setRationale('');setMessage(`Recorded ${toState}.`);
    }catch{setMessage('Transition rejected. Check the reason, supporting record, and required evidence.')}
    finally{setBusy(false)}
  }
  const next=allowedTransitions[incident.state as IncidentState]||[];
  return <div><h3>Officer decision</h3><label htmlFor={`reason-${incident.id}`}>Reason for the decision</label><textarea id={`reason-${incident.id}`} value={reason} onChange={e=>setReason(e.target.value)} maxLength={1000}/>{['INVESTIGATING','ACTION_REQUIRED'].includes(incident.state)&&<><label htmlFor={`proof-${incident.id}`}>{incident.state==='INVESTIGATING'?'Investigation finding supported by the linked evidence':'Intervention actually performed'}</label><textarea id={`proof-${incident.id}`} value={proof} onChange={e=>setProof(e.target.value)} maxLength={2000}/></>}{incident.state==='FOLLOW_UP'&&<details><summary>Explicit authorized closure rationale</summary><p className="small">Prefer verified follow-up evidence. An exceptional closure requires an accountable reason and does not establish improvement.</p><textarea aria-label="Exceptional closure rationale" value={rationale} onChange={e=>setRationale(e.target.value)} maxLength={1000}/></details>}<div className="actions">{next.map(state=><button className="quiet-button" type="button" key={state} disabled={busy||!reason.trim()||(['CONFIRMED','ACTIONED'].includes(state)&&!proof.trim())} onClick={()=>move(state)}>{state.replaceAll('_',' ')}</button>)}</div>{message&&<p role="status">{message}</p>}</div>;
}
export function IdentityPanel(){
  const {identity}=useSpacetimeDB();const [roles]=useTable(tables.myRole);
  return <details className="card"><summary>My access · {roles[0]?.kind||'citizen'}</summary><p className="small">This device has a persistent SpacetimeDB identity. An administrator grants professional roles; the browser cannot select its own authority.</p><code className="hash">{identity?.toHexString()||'Connecting…'}</code></details>;
}
export function LiveOperations(){
  const [demo,ready]=useTable(tables.demoIncidents),[privateIncidents]=useTable(tables.operationsIncidents),[roles]=useTable(tables.myRole),[events]=useTable(tables.operationsEvents),[deliveries]=useTable(tables.demoDeliveries);
  const canAct=['officer','admin'].includes(roles[0]?.kind||'');
  const incidents:readonly Incident[]=privateIncidents.length?privateIncidents.filter(i=>i.policyId!=='synthetic-wastewater-v1'):demo;
  return <><ConnectionStatus/><IdentityPanel/><ResponsibilityInbox/><div className="list">{!ready&&<p>Loading incident records…</p>}{incidents.map(i=>{
    const trace=JSON.parse(i.trace) as Trace;
    return <article className="two" key={i.id}><div className="card"><div className="section-head"><h2>{i.site}</h2><span className="badge warn">{i.state.replaceAll('_',' ')}</span></div><span className="badge">{i.synthetic?'Synthetic':'Operational'} · {trace.route}</span><h3>Why this was routed</h3><div className="timeline">{trace.conditions.map(c=><article key={c.code}><h3>{c.passed?'Pass':'Not met'} · {c.code.replaceAll('_',' ')}</h3><p>{c.detail}</p></article>)}</div>{trace.outcome==='ECOLOGICAL_REVIEW'&&<p className="notice">Instrument evidence met the synthetic ecological review condition. This event is routed to an ecological scientist, with no health emergency claim.</p>}{canAct&&<><IncidentControls incident={i}/>{['CONFIRMED','ACTION_REQUIRED','ACTIONED','FOLLOW_UP'].includes(i.state)&&trace.route==='environmental-officer'&&<HealthHandoff incidentId={i.id} siteId={i.site}/>}</>}</div><aside className="card"><h3>Decision record</h3><p><b>Policy:</b> {trace.policy.id} v{trace.policy.version}</p><p><b>Source:</b> {trace.policy.source.title}</p><p><b>Rule:</b> {trace.ruleVersion}</p><p><b>Independent groups:</b> {trace.independentLineages}</p><p><b>Evidence:</b> {trace.evidenceIds.join(', ')}</p><p className="small muted">Trace {trace.id}<br/>Executed {trace.executedAt}</p><p className="small">Investigation required is not a contamination diagnosis.</p><Link className="quiet-button" href={`/interoperability?incident=${encodeURIComponent(i.id)}`}>Inspect export</Link><RuleReplay traceId={trace.id}/><DeliveryHistory incidentId={i.id}/><h3>Delivery status</h3>{deliveries.filter(d=>d.aggregateId===i.id).map(d=><p className="small" key={d.id.toString()}>{d.kind} · {d.status}</p>)}{events.filter(e=>e.incidentId===i.id).map(e=><p className="small" key={e.id.toString()}>{e.fromState} → {e.toState}: {e.reason}</p>)}</aside></article>})}</div></>;
}
export function LiveMonitoring(){
  const refresh=useReducer(reducers.refreshMonitoring),[roles]=useTable(tables.myRole),[message,setMessage]=useState('');
  const [missions,ready]=useTable(tables.demoMissions),[available]=useTable(tables.availableMissions),[privateMissions]=useTable(tables.operationsMissions);
  const rows=privateMissions.length?privateMissions:[...missions,...available.filter(m=>!m.synthetic)];
  return <><ConnectionStatus/>{['officer','admin'].includes(roles[0]?.kind||'')&&<button className="quiet-button" onClick={async()=>{try{await refresh();setMessage('Monitoring gaps refreshed from current evidence and assigned policies.')}catch{setMessage('Monitoring refresh was rejected.')}}}>Refresh evidence gaps</button>}{message&&<p role="status">{message}</p>}<div className="list">{!ready&&<p>Loading missions…</p>}{ready&&!rows.length&&<p className="notice">No follow-up missions yet. An officer moving an incident to FOLLOW UP creates a targeted request through the authoritative reducer.</p>}{rows.map(m=><article className="card" key={m.id}><span className="badge blue">{m.synthetic?'Synthetic · ':''}{m.state}</span><h2>Revisit {m.site}</h2><p>{m.rationale}</p><p className="small">Mission {m.id}{m.incidentId?` · Incident ${m.incidentId}`:' · Adaptive evidence gap'}</p>{m.state==='open'&&<MissionActions missionId={m.id} siteId={m.site}/>}<p className="muted small">A before/after pair cannot establish causation. Closure records an operational outcome with its evidence or an explicit authorized rationale.</p></article>)}</div></>;
}
