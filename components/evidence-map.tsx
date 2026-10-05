'use client';
import {useEffect,useRef,useState} from 'react';
import {useTable} from 'spacetimedb/react';
import {tables} from '@/lib/spacetime/bindings';
import {latLngToCell,cellToBoundary} from 'h3-js';
import type {FeatureCollection,Polygon} from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
export default function EvidenceMap(){
  const [evidence]=useTable(tables.demoEvidence),container=useRef<HTMLDivElement>(null),[message,setMessage]=useState('');
  useEffect(()=>{
    const element=container.current;if(!element||!evidence.length)return;
    let disposed=false,cleanup:undefined|(()=>void);
    void import('maplibre-gl').then(({Map:LibreMap,NavigationControl})=>{
      if(disposed)return;
      try{
        const cells=new Map<string,number>();
        for(const e of evidence){const cell=latLngToCell(e.latitude,e.longitude,9);cells.set(cell,(cells.get(cell)||0)+1)}
        const geo:FeatureCollection<Polygon>={type:'FeatureCollection',features:[...cells].map(([cell,count])=>{const boundary=cellToBoundary(cell,true);boundary.push(boundary[0]!);return {type:'Feature',properties:{cell,count},geometry:{type:'Polygon',coordinates:[boundary]}}})};
        const map=new LibreMap({container:element,style:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#e5eeea'}}]},center:[evidence[0]!.longitude,evidence[0]!.latitude],zoom:13,attributionControl:false});
        map.addControl(new NavigationControl());
        map.on('load',()=>{map.addSource('evidence',{type:'geojson',data:geo});map.addLayer({id:'cells',type:'fill',source:'evidence',paint:{'fill-color':'#2e806b','fill-opacity':0.4}});map.addLayer({id:'cell-boundaries',type:'line',source:'evidence',paint:{'line-color':'#123234','line-width':2}});map.addSource('sites',{type:'geojson',data:{type:'FeatureCollection',features:evidence.map(e=>({type:'Feature',properties:{},geometry:{type:'Point',coordinates:[e.longitude,e.latitude]}}))}});map.addLayer({id:'sites',type:'circle',source:'sites',paint:{'circle-radius':7,'circle-color':'#123234','circle-stroke-color':'#fff','circle-stroke-width':2}})});
        cleanup=()=>map.remove();
      }catch{setMessage('Interactive map is unavailable on this device. The evidence ledger below contains the same records.')}
    }).catch(()=>setMessage('Map could not load. Use the evidence ledger below.'));
    return()=>{disposed=true;cleanup?.()};
  },[evidence]);
  return <section aria-label="Synthetic spatial coverage"><h2>Spatial evidence coverage</h2><p className="muted">Synthetic points and H3 cells at resolution 9. Coordinates are illustrative; this is not a survey of a real stream. The ledger below is the accessible alternative.</p><div className="map" ref={container} aria-label="Interactive synthetic evidence map"/>{message&&<p role="status">{message}</p>}<p className="small">{new Set(evidence.map(e=>latLngToCell(e.latitude,e.longitude,9))).size} occupied cells · {evidence.length} evidence records. Source counts do not imply scientific independence.</p></section>;
}
