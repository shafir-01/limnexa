import type {FhirBundle} from './map';
export async function deliverBundle(bundle:FhirBundle,idempotencyKey:string,configuration:{url:string;token?:string},transport:typeof fetch=fetch){
  const base=new URL(configuration.url);
  if(base.username||base.password||base.protocol!=='https:'&&!(base.protocol==='http:'&&['localhost','127.0.0.1'].includes(base.hostname)))throw new Error('FHIR_DESTINATION_INVALID');
  const response=await transport(`${base.href.replace(/\/$/,'')}/Bundle/${bundle.id}`,{method:'PUT',headers:{'content-type':'application/fhir+json','idempotency-key':idempotencyKey,...(configuration.token?{authorization:`Bearer ${configuration.token}`}:{})},body:JSON.stringify(bundle),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(response.status>=500||response.status===429?'FHIR_DESTINATION_RETRYABLE':'FHIR_DESTINATION_REJECTED');
  return `fhir:${bundle.id}:${response.status}`;
}
