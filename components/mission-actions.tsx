'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useReducer,useTable} from 'spacetimedb/react';
import {reducers,tables} from '@/lib/spacetime/bindings';
export function MissionActions({missionId,siteId}:{missionId:string;siteId:string}){
  const claim=useReducer(reducers.claimMission),[claims]=useTable(tables.myMissionClaims),[message,setMessage]=useState('');
  const current=claims.find(c=>c.missionId===missionId);
  return <div><div className="actions">{!current&&<button className="quiet-button" onClick={async()=>{try{await claim({missionId});setMessage('Mission claimed for this device. Submit evidence for professional review.')}catch{setMessage('Mission could not be claimed. Reconnect and check that it remains open.')}}}>Claim this monitoring mission</button>}<Link className="quiet-button" href={`/report?mission=${encodeURIComponent(missionId)}&site=${encodeURIComponent(siteId)}`}>Collect follow-up evidence</Link></div>{current&&<p className="small">My participation: {current.status}</p>}{message&&<p role="status">{message}</p>}</div>;
}
