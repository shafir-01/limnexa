import {FatalError,RetryableError,sleep} from 'workflow';
import {serviceToken,withConnection} from '../spacetime/connect';
import {loadExport} from '../fhir/load';
import {deliverBundle} from '../fhir/delivery';
import type {Trace} from '../domain/core';
import {fetchRain} from '../weather/open-meteo';

async function claim(id:string){
  'use step';
  return withConnection(serviceToken(),['SELECT * FROM service_outbox'],async conn=>{
    const message=[...conn.db.serviceOutbox.iter()].find(m=>m.id===BigInt(id));
    if(!message)throw new FatalError('OUTBOX_NOT_FOUND');
    if(['delivered','dead'].includes(message.status))return null;
    try{await conn.reducers.claimOutbox({id:message.id})}catch{throw new RetryableError('OUTBOX_LEASE_UNAVAILABLE',{retryAfter:'5m'})}
    return {id,messageKind:message.kind,idempotencyKey:message.idempotencyKey,aggregateId:message.aggregateId,payload:message.payload};
  });
}
async function deliver(message:{id:string;messageKind:string;idempotencyKey:string;aggregateId:string;payload:string}){
  'use step';
  if(message.messageKind==='weather-enrichment'){
    const site=await withConnection(serviceToken(),['SELECT * FROM service_sites'],conn=>conn.db.serviceSites.id.find(message.aggregateId));
    if(!site||site.synthetic)throw new FatalError('REAL_WEATHER_SITE_REQUIRED');
    const input=JSON.parse(message.payload) as {periodMinutes:number};
    const weather=await fetchRain(site,input.periodMinutes);
    await withConnection(serviceToken(),[],conn=>conn.reducers.storeWeather({payload:JSON.stringify(weather)}));
    return `weather:${weather.id}`;
  }
  if(message.messageKind==='fhir-export'){
    const destination=process.env.FHIR_DESTINATION_URL;if(!destination)throw new FatalError('FHIR_DESTINATION_NOT_CONFIGURED');
    const snapshot=JSON.parse(message.payload) as {state:string;trace:Trace;evidenceIds:string};
    const {bundle}=await loadExport(message.aggregateId,true,snapshot);
    return deliverBundle(bundle,message.idempotencyKey,{url:destination,...(process.env.FHIR_DESTINATION_TOKEN?{token:process.env.FHIR_DESTINATION_TOKEN}:{})});
  }
  return withConnection(serviceToken(),['SELECT * FROM service_outbox'],async conn=>{
    // Delivery to the responsibility inbox is idempotent in the reducer. HTTP
    // integrations use the same key when a destination is configured.
    await conn.reducers.deliverTask({outboxId:BigInt(message.id)});
    return `responsibility-inbox:${message.idempotencyKey}`;
  });
}
async function timeoutCheck(incidentId:string){
  'use step';
  await withConnection(serviceToken(),[],conn=>conn.reducers.flagAcknowledgementTimeout({incidentId}));
}
async function acknowledge(id:string,receipt:string){
  'use step';
  await withConnection(serviceToken(),['SELECT * FROM service_outbox'],conn=>conn.reducers.completeDelivery({id:BigInt(id),status:'delivered',receipt,errorCode:''}));
}
async function recordFailure(id:string,errorCode:string){
  'use step';
  await withConnection(serviceToken(),['SELECT * FROM service_outbox'],conn=>conn.reducers.completeDelivery({id:BigInt(id),status:'retry',receipt:'',errorCode}));
}
export async function dispatchOutbox(id:string){
  'use workflow';
  const message=await claim(id);if(!message)return {status:'already-delivered'};
  try{
    const receipt=await deliver(message);
    await acknowledge(id,receipt);
    if(message.messageKind==='environmental-task'){await sleep('10m');await timeoutCheck(message.aggregateId);}
    return {status:'delivered',receipt};
  }catch(error){
    const errorCode=error instanceof Error&&error.message.includes('FHIR_DESTINATION_NOT_CONFIGURED')?'FHIR_DESTINATION_NOT_CONFIGURED':'EXTERNAL_RETRYABLE_FAILURE';
    await recordFailure(id,errorCode);
    return {status:'retry'};
  }
}
