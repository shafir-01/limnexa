import {contentHash,type Evidence,type Trace,type Validation} from '../domain/core';
import {FHIR_TARGET} from './target';
export type FhirResource={resourceType:string;id:string;[key:string]:unknown};
export type FhirBundle=FhirResource&{type:'collection';entry:{fullUrl:string;resource:FhirResource}[]};
export type ExportPacket={incident:{id:string;site:string;state:string;synthetic:boolean};trace:Trace;evidence:Evidence[];validations:Validation[];exportedAt:string};
const SYSTEM='https://limnexa.vercel.app/fhir';
const id=(value:string)=>contentHash(value).slice(0,40);
const html=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function toBundle(packet:ExportPacket):FhirBundle{
  const resources:FhirResource[]=[];
  const synthetic=packet.incident.synthetic;
  const meta={tag:[{system:`${SYSTEM}/CodeSystem/data-class`,code:synthetic?'synthetic':'environmental',display:synthetic?'Synthetic demonstration data':'Environmental evidence'}]};
  const locationId=id(packet.incident.site),organizationId='limnexa';
  const location:FhirResource={resourceType:'Location',id:locationId,meta:{...meta,profile:[`${FHIR_TARGET.canonical}/StructureDefinition/location-oah`]},identifier:[{system:`${SYSTEM}/site`,value:packet.incident.site}],name:synthetic?`Synthetic monitoring location ${packet.incident.site}`:packet.incident.site,mode:'instance',status:'active'};
  const representative=packet.evidence.find(e=>e.siteId===packet.incident.site);
  if(representative)location.position={latitude:synthetic?representative.latitude:Math.round(representative.latitude*100)/100,longitude:synthetic?representative.longitude:Math.round(representative.longitude*100)/100};
  resources.push(location,{resourceType:'Organization',id:organizationId,meta,active:true,name:'Limnexa environmental evidence intake'});
  for(const e of packet.evidence){
    const validation=packet.validations.find(v=>v.evidenceId===e.id);
    if(!validation?.eligible||e.siteId!==packet.incident.site||e.synthetic!==synthetic)continue;
    const indicator=e.measurement?({'dissolved-oxygen':'dissolvedO2',temperature:'waterTemperature',pH:'pH',conductivity:'conductivity'} as const)[e.measurement.indicator]:e.category==='wastewater-indicator'?'foam':null;
    const o:FhirResource={resourceType:'Observation',id:id(e.id),meta:{...meta,...(indicator?{profile:[`${FHIR_TARGET.canonical}/StructureDefinition/observation-indicators-oah`]}:{})},identifier:[{system:`${SYSTEM}/evidence`,value:e.id}],status:'final',code:indicator?{coding:[{system:`${FHIR_TARGET.canonical}/CodeSystem/temporarySystem-oah-eu`,code:indicator}]}:{text:'Citizen environmental field report'},subject:{reference:`Location/${locationId}`},effectiveDateTime:e.observedAt,issued:e.submittedAt,performer:[{reference:`Organization/${organizationId}`,display:'Responsible evidence intake organization'}],note:[{text:`${synthetic?'SYNTHETIC. ':''}${e.description}`},{text:`Capture validation ${validation.version}; content SHA-256 ${e.contentHash}. This record does not establish a contamination diagnosis.`}]};
    if(e.measurement)o.valueQuantity={value:e.measurement.value,unit:e.measurement.unit,system:'http://unitsofmeasure.org',code:e.measurement.unit};
    else o.valueCodeableConcept={text:e.description};
    resources.push(o);
    const provenance:FhirResource={resourceType:'Provenance',id:id(`provenance:${e.id}`),meta,target:[{reference:`Observation/${o.id}`}],recorded:e.submittedAt,activity:{coding:[{system:'http://terminology.hl7.org/CodeSystem/v3-DataOperation',code:e.supersedesId?'UPDATE':'CREATE'}],text:e.supersedesId?'Append-only correction and deterministic capture validation':'Immutable capture and deterministic validation'},agent:[{type:{coding:[{system:'http://terminology.hl7.org/CodeSystem/provenance-participant-type',code:'author'}]},who:{identifier:{system:`${SYSTEM}/source-lineage`,value:id(e.sourceLineageId)},display:'Pseudonymous environmental source'}},{type:{coding:[{system:'http://terminology.hl7.org/CodeSystem/provenance-participant-type',code:'assembler'}]},who:{reference:`Organization/${organizationId}`}}],entity:[{role:'source',what:{identifier:{system:`${SYSTEM}/sha256`,value:e.contentHash},display:`Original evidence ${e.id}`}}]};
    if(e.supersedesId)(provenance.entity as unknown[]).push({role:'revision',what:{identifier:{system:`${SYSTEM}/evidence`,value:e.supersedesId},display:e.correctionReason}});
    resources.push(provenance);
  }
  const taskId=id(`task:${packet.incident.id}`);
  resources.push({resourceType:'Task',id:taskId,meta,identifier:[{system:`${SYSTEM}/incident`,value:packet.incident.id}],status:packet.incident.state==='CLOSED'?'completed':packet.incident.state==='DISMISSED'?'cancelled':packet.incident.state==='INVESTIGATION_REQUIRED'?'requested':'in-progress',intent:'order',code:{text:packet.trace.route==='ecological-scientist'?'Ecological evidence review':'Environmental investigation'},description:`${synthetic?'SYNTHETIC. ':''}Rule ${packet.trace.ruleVersion}; trace ${packet.trace.id}; state ${packet.incident.state}. Investigation is not a diagnosis.`,focus:{reference:`Location/${locationId}`},requester:{reference:`Organization/${organizationId}`},authoredOn:packet.trace.executedAt,owner:{display:packet.trace.route}});
  resources.push({resourceType:'Communication',id:id(`communication:${packet.incident.id}`),meta,status:'preparation',category:[{text:'Environmental responsibility notification'}],about:[{reference:`Task/${taskId}`}],sender:{reference:`Organization/${organizationId}`},recipient:[{display:packet.trace.route}],payload:[{contentString:`${synthetic?'SYNTHETIC. ':''}${packet.trace.outcome}. Evidence ${packet.trace.evidenceIds.join(', ')}. Policy ${packet.trace.policy.id}@${packet.trace.policy.version}. ${packet.trace.conditions.map(c=>`${c.code}: ${c.passed?'met':'not met'}`).join('; ')}`} ]});
  for(const resource of resources){const summary=String(resource.name||resource.description||`${resource.resourceType} ${resource.id}`);resource.text={status:'generated',div:`<div xmlns="http://www.w3.org/1999/xhtml"><p>${synthetic?'SYNTHETIC. ':''}${html(summary)}</p></div>`};}
  return {resourceType:'Bundle',id:id(`bundle:${packet.incident.id}:${packet.incident.state}:${packet.evidence.map(e=>e.id).sort().join(',')}`),meta,type:'collection',timestamp:packet.exportedAt,entry:resources.map(resource=>({fullUrl:`${SYSTEM}/${resource.resourceType}/${resource.id}`,resource}))};
}
