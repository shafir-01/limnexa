'use client';
import dynamic from 'next/dynamic';
const EvidenceMap=dynamic(()=>import('./evidence-map'),{ssr:false,loading:()=> <p>Loading spatial coverage…</p>});
export function MapPanel(){return <EvidenceMap/>;}
