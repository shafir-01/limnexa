import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {DbConnection} from '../../lib/spacetime/bindings';
import {withConnection} from '../../lib/spacetime/connect';
import {ownerToken} from '../../scripts/admin-auth';
import type {Evidence,ReportInput} from '../../lib/domain/core';

const database=process.env.TEST_SPACETIMEDB_DATABASE||'limnexa-jltls-preview';
if(database==='limnexa-jltls')throw new Error('Integration tests must not mutate production.');
function newUser(){return new Promise<{token:string;identity:string}>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Connection timeout')),15000);DbConnection.builder().withUri('wss://maincloud.spacetimedb.com').withDatabaseName(database).onConnect((conn,identity,token)=>{clearTimeout(timer);conn.disconnect();resolve({token,identity:identity.toHexString()})}).onConnectError(()=>{clearTimeout(timer);reject(new Error('Connection error'))}).build()})}
async function main(){
  const admin=process.env.SPACETIMEDB_TEST_RUNNER_TOKEN||ownerToken(),runId=`test-${Date.now()}`,citizen=await newUser(),other=await newUser();
  await withConnection(admin,[],conn=>conn.reducers.seedScenario({runId}),database);
  const siteId=`DEMO-SITE-001-${runId}`;
  const incident=await withConnection(admin,['SELECT * FROM operations_incidents'],conn=>[...conn.db.operationsIncidents.iter()].find(i=>i.site===siteId),database);
  assert(incident);assert.equal(incident.state,'INVESTIGATION_REQUIRED');
  const ecological=await withConnection(admin,['SELECT * FROM operations_incidents'],conn=>[...conn.db.operationsIncidents.iter()].find(i=>i.site===`DEMO-SITE-002-${runId}`),database);assert(ecological);assert.equal(ecological.state,'TRIAGED');assert.equal(JSON.parse(ecological.trace).route,'ecological-scientist');
  await assert.rejects(withConnection(citizen.token,[],conn=>conn.reducers.advanceIncident({incidentId:incident.id,toState:'ACKNOWLEDGED',reason:'Unauthorized',recordId:'',closureRationale:''}),database));
  const input:ReportInput={id:crypto.randomUUID(),siteId,reachId:'DEMO-REACH-001',description:'Synthetic integration citizen report for immutable provenance checks.',category:'other',observedAt:new Date().toISOString(),latitude:59.3293,longitude:18.0686,gpsAccuracyM:12,protocolVersion:'field-v1',mediaHashes:[],measurement:null,supersedesId:'',correctionReason:'',missionId:''};
  for(let retry=0;retry<2;retry++)await withConnection(citizen.token,[],conn=>conn.reducers.createReport({payload:JSON.stringify(input)}),database);
  const mine=await withConnection(citizen.token,['SELECT * FROM my_evidence'],conn=>[...conn.db.myEvidence.iter()],database);assert.equal(mine.filter(e=>e.id===input.id).length,1);
  const theirs=await withConnection(other.token,['SELECT * FROM my_evidence','SELECT * FROM science_evidence','SELECT * FROM operations_incidents'],conn=>({mine:[...conn.db.myEvidence.iter()],science:[...conn.db.scienceEvidence.iter()],operations:[...conn.db.operationsIncidents.iter()]}),database);assert.equal(theirs.mine.length+theirs.science.length+theirs.operations.length,0);
  const revision={...input,id:crypto.randomUUID(),supersedesId:input.id,correctionReason:'Synthetic correction preserves the original',description:'Synthetic corrected observation for immutable provenance checks.'};
  await assert.rejects(withConnection(other.token,[],conn=>conn.reducers.appendRevision({payload:JSON.stringify(revision)}),database));
  await withConnection(citizen.token,[],conn=>conn.reducers.appendRevision({payload:JSON.stringify(revision)}),database);
  const revised=await withConnection(citizen.token,['SELECT * FROM my_evidence'],conn=>[...conn.db.myEvidence.iter()].map(e=>JSON.parse(e.payload) as Evidence),database);assert(revised.some(e=>e.id===input.id&&e.description===input.description));assert(revised.some(e=>e.id===revision.id&&e.supersedesId===input.id));
  async function advance(toState:string,recordId=''){await withConnection(admin,[],conn=>conn.reducers.advanceIncident({incidentId:incident!.id,toState,reason:`Synthetic integration ${toState}`,recordId,closureRationale:''}),database)}
  await advance('ACKNOWLEDGED');await advance('INVESTIGATING');
  await assert.rejects(advance('CONFIRMED'));
  const findingId=crypto.randomUUID();await withConnection(admin,[],conn=>conn.reducers.recordFinding({id:findingId,incidentId:incident.id,evidenceIds:incident.evidenceIds,description:'Synthetic professional investigation finding linked to the original evidence.'}),database);await advance('CONFIRMED',findingId);await advance('ACTION_REQUIRED');
  await assert.rejects(advance('ACTIONED'));
  const interventionId=crypto.randomUUID();await withConnection(admin,[],conn=>conn.reducers.recordIntervention({id:interventionId,incidentId:incident.id,description:'Synthetic intervention recorded for integration verification; no real action claimed.'}),database);await advance('ACTIONED',interventionId);await advance('FOLLOW_UP');
  await assert.rejects(advance('CLOSED'));
  const followUp={...input,id:crypto.randomUUID(),missionId:`mission-${incident.id}`,observedAt:new Date(Date.now()+1000).toISOString(),description:'Synthetic independent post-action observation for the follow-up mission.'};
  await withConnection(other.token,[],conn=>conn.reducers.createReport({payload:JSON.stringify(followUp)}),database);
  await assert.rejects(advance('CLOSED'));
  await withConnection(admin,[],conn=>conn.reducers.recordExpertVerification({id:crypto.randomUUID(),evidenceId:followUp.id,verdict:'accepted',reason:'Synthetic expert verification of post-action evidence.'}),database);await advance('CLOSED');
  const closed=await withConnection(admin,['SELECT * FROM operations_incidents','SELECT * FROM operations_missions'],conn=>({state:conn.db.operationsIncidents.id.find(incident.id)?.state,mission:conn.db.operationsMissions.id.find(`mission-${incident.id}`)?.state}),database);assert.deepEqual(closed,{state:'CLOSED',mission:'complete'});
  await withConnection(admin,[],conn=>conn.reducers.refreshMonitoring({}),database);
  // Exercise delivery duplication using the separately provisioned service identity.
  const env=process.env.SPACETIMEDB_TEST_SERVICE_TOKEN?{SPACETIMEDB_SERVICE_TOKEN:process.env.SPACETIMEDB_TEST_SERVICE_TOKEN}:Object.fromEntries(readFileSync('.env.service.preview.local','utf8').trim().split(/\r?\n/).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)]}));
  const outbox=await withConnection(env.SPACETIMEDB_SERVICE_TOKEN,['SELECT * FROM service_outbox'],conn=>[...conn.db.serviceOutbox.iter()].find(o=>o.aggregateId===incident.id),database);assert(outbox);
  await withConnection(env.SPACETIMEDB_SERVICE_TOKEN,[],async conn=>{await conn.reducers.claimOutbox({id:outbox.id});await conn.reducers.deliverTask({outboxId:outbox.id});await conn.reducers.deliverTask({outboxId:outbox.id});await conn.reducers.completeDelivery({id:outbox.id,status:'delivered',receipt:'integration-idempotency-proof',errorCode:''})},database);
  const deliveries=await withConnection(undefined,['SELECT * FROM demo_tasks'],conn=>[...conn.db.demoTasks.iter()].filter(t=>t.idempotencyKey===outbox.idempotencyKey),database);assert.equal(deliveries.length,1);
  mkdirSync('.tools/tests',{recursive:true});writeFileSync('.tools/tests/citizen.json',JSON.stringify(citizen));
  const results={database,runId,incidentId:incident.id,status:'passed',checks:['unauthorized transition denied','private views scoped','retry idempotent','append-only correction','confirmation requires finding','action requires intervention','closure requires verified follow-up','negative ecological routing','inbox delivery idempotent']};
  mkdirSync('docs/validation',{recursive:true});writeFileSync('docs/validation/integration-result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}
main().catch(error=>{console.error(`Integration failed: ${error instanceof Error?error.message:'unknown error'}`);process.exitCode=1});
