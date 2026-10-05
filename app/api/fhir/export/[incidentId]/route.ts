import {authenticatedIdentity,bearer} from '@/lib/spacetime/connect';
import {loadExport} from '@/lib/fhir/load';
import {FHIR_TARGET} from '@/lib/fhir/target';
export async function GET(request:Request,context:{params:Promise<{incidentId:string}>}){
  const traceId=crypto.randomUUID(),{incidentId}=await context.params;
  if(!/^inc-[a-f0-9]{24}$/.test(incidentId))return Response.json({error:'VALIDATION_ERROR',traceId},{status:400});
  let allowPrivate=false;
  if(request.headers.has('authorization')){try{const identity=await authenticatedIdentity(bearer(request));allowPrivate=['officer','scientist','admin'].includes(identity.role)}catch{return Response.json({error:'AUTHENTICATION_REQUIRED',traceId},{status:401})}}
  try{return Response.json({...await loadExport(incidentId,allowPrivate),target:FHIR_TARGET,traceId},{headers:{'cache-control':'no-store'}})}catch{return Response.json({error:'EXPORT_NOT_AVAILABLE',traceId},{status:404})}
}
