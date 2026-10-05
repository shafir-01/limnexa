'use client';
import {useState} from 'react';
import {useReducer,useTable} from 'spacetimedb/react';
import {reducers,tables} from '@/lib/spacetime/bindings';
import type {Evidence,Validation} from '@/lib/domain/core';
import {MonitoringRequest} from './monitoring-request';
import {IdentityPanel,TrustDimensions} from './live';
function Review({evidence,validation}:{evidence:Evidence;validation:Validation}){
  const verify=useReducer(reducers.recordExpertVerification);
  const [reason,setReason]=useState(''),[message,setMessage]=useState('');
  async function record(verdict:string){try{await verify({id:crypto.randomUUID(),evidenceId:evidence.id,verdict,reason});setMessage(`Expert review recorded: ${verdict}`);setReason('')}catch{setMessage('Review was rejected. Verify your role and the evidence record.')}}
  return <article className="card"><span className="badge">{evidence.synthetic?'Synthetic · ':''}{evidence.kind}</span><h2>{evidence.siteId}</h2><p>{evidence.description}</p>{evidence.measurement&&<p>Declared measurement: {evidence.measurement.value} {evidence.measurement.unit} · {evidence.measurement.instrumentId}</p>}<TrustDimensions validation={validation}/><p className="small">Evidence {evidence.id}{evidence.supersedesId?` · revises ${evidence.supersedesId}`:''}</p><label htmlFor={`review-${evidence.id}`}>Professional review rationale</label><textarea id={`review-${evidence.id}`} value={reason} onChange={e=>setReason(e.target.value)} maxLength={1000}/><div className="actions"><button className="quiet-button" disabled={!reason.trim()} onClick={()=>record('accepted')}>Accept evidence</button><button className="quiet-button" disabled={!reason.trim()} onClick={()=>record('rejected')}>Reject evidence</button></div>{message&&<p role="status">{message}</p>}</article>;
}
export function ScienceReview(){
  const [roles]=useTable(tables.myRole);const [records,ready]=useTable(tables.scienceEvidence),[validations]=useTable(tables.scienceValidation);
  return <><IdentityPanel/>{['scientist','officer','admin'].includes(roles[0]?.kind||'')&&<MonitoringRequest/>}{ready&&!records.length&&<p className="notice">An administrator must grant this device a scientist or officer role to inspect private evidence.</p>}<div className="list">{records.map(r=>{const v=validations.find(v=>v.evidenceId===r.id);return v?<Review key={r.id} evidence={JSON.parse(r.payload) as Evidence} validation={JSON.parse(v.payload) as Validation}/>:null})}</div></>;
}
