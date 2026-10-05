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
        const map=new LibreMap({container:element,style:{version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]},center:[evidence[0]!.longitude,evidence[0]!.latitude],zoom:13});
        map.addControl(new NavigationControl());
        map.on('load',()=>{map.addSource('evidence',{type:'geojson',data:geo});map.addLayer({id:'cells',type:'fill',source:'evidence',paint:{'fill-color':'#1769e0','fill-opacity':0.48}});map.addLayer({id:'cell-boundaries',type:'line',source:'evidence',paint:{'line-color':'#0f3f8e','line-width':2}});map.addSource('sites',{type:'geojson',data:{type:'FeatureCollection',features:evidence.map(e=>({type:'Feature',properties:{},geometry:{type:'Point',coordinates:[e.longitude,e.latitude]}}))}});map.addLayer({id:'sites',type:'circle',source:'sites',paint:{'circle-radius':9,'circle-color':'#0f5dcc','circle-stroke-color':'#fff','circle-stroke-width':3}})});
        cleanup=()=>map.remove();
      }catch{setMessage('Interactive map is unavailable on this device. The evidence ledger below contains the same records.')}
    }).catch(()=>setMessage('Map could not load. Use the evidence ledger below.'));
    return()=>{disposed=true;cleanup?.()};
  },[evidence]);
  return <section aria-label="Spatial evidence coverage"><h2>Map</h2><div className="map" ref={container} aria-label="Interactive evidence map"/>{message&&<p role="status">{message}</p>}</section>;
}
