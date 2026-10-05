import {authenticatedIdentity,bearer} from '@/lib/spacetime/connect';
import {launchPending} from '@/lib/workflows/launch';
export async function POST(request:Request){
  const traceId=crypto.randomUUID();
  try{const identity=await authenticatedIdentity(bearer(request));if(!['officer','scientist','admin'].includes(identity.role))return Response.json({error:'AUTHORIZATION_DENIED',traceId},{status:403});}catch{return Response.json({error:'AUTHENTICATION_REQUIRED',traceId},{status:401})}
  try{return Response.json({runs:await launchPending(),traceId})}catch{return Response.json({error:'EXTERNAL_RETRYABLE_FAILURE',traceId},{status:503})}
}
