import { schema, table, t, type ReducerCtx } from 'spacetimedb/server';
import { DEMO_POLICY, assertTransition, contentHash, evaluate, makeEvidence, reportSchema, validateEvidence, type Evidence, type IncidentState, type Policy, type ReportInput, type Trace, type Weather } from '../../../lib/domain/core';

// Public identity, never a secret. The Maincloud owner alone grants roles.
const OWNER = 'c2002c4df62abb104ebc5c17d8a33e16808b5e1fb80ddf845b7fd5d99e6d5dbc';
const POLICY = 'synthetic-wastewater-v1';
const role = table({ name: 'role' }, { identity: t.identity().primaryKey(), kind: t.string() });
const observation = table({ name: 'observation' }, {
  id: t.string().primaryKey(), owner: t.identity(), lineage: t.string(), site: t.string(),
  category: t.string(), description: t.string(), observedAt: t.string(), createdAt: t.timestamp(),
  synthetic: t.bool(), supersedesId: t.string(), correctionReason: t.string(), contentHash: t.string(),
});
const incident = table({ name: 'incident' }, {
  id: t.string().primaryKey(), site: t.string(), state: t.string(), synthetic: t.bool(),
  policyId: t.string(), evidenceIds: t.string(), trace: t.string(), createdAt: t.timestamp(),
});
const incidentEvent = table({ name: 'incident_event' }, {
  id: t.u64().primaryKey().autoInc(), incidentId: t.string(), fromState: t.string(),
  toState: t.string(), actor: t.identity(), reason: t.string(), at: t.timestamp(),
});
const outbox = table({ name: 'outbox' }, {
  id: t.u64().primaryKey().autoInc(), kind: t.string(), aggregateId: t.string(),
  idempotencyKey: t.string().unique(), payload: t.string(), status: t.string(), at: t.timestamp(),
});
const mission = table({ name: 'mission' }, {
  id: t.string().primaryKey(), incidentId: t.string(), site: t.string(), rationale: t.string(),
  state: t.string(), synthetic: t.bool(),
});
const evidenceRecord = table({name:'evidence_record'},{id:t.string().primaryKey(),owner:t.identity(),siteId:t.string(),synthetic:t.bool(),payload:t.string(),contentHash:t.string()});
const validationRecord = table({name:'validation_record'},{id:t.string().primaryKey(),evidenceId:t.string(),eligible:t.bool(),payload:t.string(),at:t.timestamp()});
const policyRecord = table({name:'policy_record'},{id:t.string().primaryKey(),payload:t.string(),synthetic:t.bool()});
const weatherContext = table({name:'weather_context'},{id:t.string().primaryKey(),siteId:t.string(),synthetic:t.bool(),payload:t.string()});
const ruleExecution = table({name:'rule_execution'},{id:t.string().primaryKey(),siteId:t.string(),synthetic:t.bool(),route:t.string(),payload:t.string(),at:t.timestamp()});
const finding = table({name:'finding'},{id:t.string().primaryKey(),incidentId:t.string(),actor:t.identity(),evidenceIds:t.string(),description:t.string(),at:t.timestamp()});
const intervention = table({name:'intervention'},{id:t.string().primaryKey(),incidentId:t.string(),actor:t.identity(),description:t.string(),at:t.timestamp()});
const verification = table({name:'verification'},{id:t.string().primaryKey(),evidenceId:t.string(),actor:t.identity(),verdict:t.string(),reason:t.string(),at:t.timestamp()});
const delivery = table({name:'delivery'},{idempotencyKey:t.string().primaryKey(),outboxId:t.u64(),status:t.string(),attempts:t.u32(),receipt:t.string(),lastError:t.string(),at:t.timestamp()});
const mediaArtifact = table({name:'media_artifact'},{id:t.string().primaryKey(),owner:t.identity(),pathname:t.string(),contentHash:t.string(),mimeType:t.string(),synthetic:t.bool(),at:t.timestamp()});
const monitoringSite=table({name:'monitoring_site'},{id:t.string().primaryKey(),name:t.string(),cityId:t.string(),catchmentId:t.string(),streamId:t.string(),reachId:t.string(),latitude:t.f64(),longitude:t.f64(),synthetic:t.bool()});
const routedTask=table({name:'routed_task'},{idempotencyKey:t.string().primaryKey(),incidentId:t.string(),route:t.string(),status:t.string(),synthetic:t.bool(),at:t.timestamp()});
const db = schema({ role, observation, incident, incidentEvent, outbox, mission,evidenceRecord,validationRecord,policyRecord,weatherContext,ruleExecution,finding,intervention,verification,delivery,mediaArtifact,monitoringSite,routedTask });
export default db;
type Context=ReducerCtx<typeof db.schemaType>;

const PublicEvidence = t.row('PublicEvidence', { id:t.string().primaryKey(), site:t.string(), category:t.string(), description:t.string(), observedAt:t.string(), synthetic:t.bool(), contentHash:t.string() });
const PublicIncident = t.row('PublicIncident', { id:t.string().primaryKey(), site:t.string(), state:t.string(), policyId:t.string(), evidenceIds:t.string(), trace:t.string(), synthetic:t.bool() });

const owner = (ctx: { sender: { toHexString(): string } }) => ctx.sender.toHexString() === OWNER;
const officer = (ctx: any) => owner(ctx) || ctx.db.role.identity.find(ctx.sender)?.kind === 'officer';
function hash(value: string): string { let h = 2166136261; for (let i=0;i<value.length;i++) h=Math.imul(h^value.charCodeAt(i),16777619); return `fnv1a-${(h>>>0).toString(16).padStart(8,'0')}`; }
function clean(value: string, max: number): string { const v=value.trim(); if (!v || v.length>max) throw new Error('VALIDATION_ERROR'); return v; }
const transitions: Record<string,string[]> = { 'investigation-required':['acknowledged'], acknowledged:['investigating'], investigating:['action-recorded'], 'action-recorded':['follow-up-required'], 'follow-up-required':['closed','investigating'], closed:[] };

export const myRole = db.view({ name:'my_role', public:true },t.option(role.rowType),ctx=>ctx.db.role.identity.find(ctx.sender)??undefined);
export const myObservations = db.view({ name:'my_observations', public:true },t.array(observation.rowType),ctx=>[...ctx.db.observation.iter()].filter(o=>o.owner.toHexString()===ctx.sender.toHexString()));
export const reviewObservations = db.view({ name:'review_observations', public:true },t.array(observation.rowType),ctx=>officer(ctx)?[...ctx.db.observation.iter()]:[]);
export const operationsIncidents = db.view({ name:'operations_incidents', public:true },t.array(incident.rowType),ctx=>officer(ctx)?[...ctx.db.incident.iter()]:[]);
export const operationsMissions = db.view({ name:'operations_missions', public:true },t.array(mission.rowType),ctx=>officer(ctx)?[...ctx.db.mission.iter()]:[]);
export const operationsEvents = db.view({ name:'operations_events', public:true },t.array(incidentEvent.rowType),ctx=>officer(ctx)?[...ctx.db.incidentEvent.iter()]:[]);
export const publicDemoEvidence = db.anonymousView({ name:'public_demo_evidence', public:true },t.array(PublicEvidence),ctx=>
  [...ctx.db.observation.iter()].filter(o=>o.synthetic).map(o=>({id:o.id,site:o.site,category:o.category,description:o.description,observedAt:o.observedAt,synthetic:o.synthetic,contentHash:o.contentHash})));
export const publicDemoIncidents = db.anonymousView({ name:'public_demo_incidents', public:true },t.array(PublicIncident),ctx=>
  [...ctx.db.incident.iter()].filter(i=>i.synthetic).map(i=>({id:i.id,site:i.site,state:i.state,policyId:i.policyId,evidenceIds:i.evidenceIds,trace:i.trace,synthetic:i.synthetic})));

export const grantRole = db.reducer({ identity:t.identity(), kind:t.string() },(ctx,{identity,kind})=>{
  if(!owner(ctx)||!['officer','scientist','service'].includes(kind)) throw new Error('AUTHORIZATION_DENIED');
  const existing=ctx.db.role.identity.find(identity);
  if(existing) ctx.db.role.identity.update({...existing,kind}); else ctx.db.role.insert({identity,kind});
});

type Input = {id:string;site:string;category:string;description:string;observedAt:string;lineage:string;synthetic:boolean;supersedesId:string;correctionReason:string};
function add(ctx:any,input:Input){
  const id=clean(input.id,100),site=clean(input.site,120),description=clean(input.description,2000);
  if(description.length<15||!['wastewater-indicator','ecological','other'].includes(input.category)||!/^\d{4}-\d\d-\d\dT/.test(input.observedAt)) throw new Error('VALIDATION_ERROR');
  if(ctx.db.observation.id.find(id)) throw new Error('CONFLICT');
  if(input.supersedesId){ const previous=ctx.db.observation.id.find(input.supersedesId); if(!previous||previous.owner.toHexString()!==ctx.sender.toHexString()||!input.correctionReason.trim()) throw new Error('AUTHORIZATION_DENIED'); }
  const row={...input,id,site,description,owner:ctx.sender,createdAt:ctx.timestamp,contentHash:hash(JSON.stringify(input))};
  ctx.db.observation.insert(row);
  if(!input.synthetic||input.category!=='wastewater-indicator')return;
  const relevant=[...ctx.db.observation.iter()].filter((o:typeof row)=>o.synthetic&&o.site===site&&o.category===input.category&&!o.supersedesId);
  const lineages=new Set(relevant.map((o:typeof row)=>o.lineage));
  const checks=[{name:'category',passed:relevant.length>0},{name:'independent-lineages',passed:lineages.size>=2},{name:'provenance',passed:relevant.every((o:typeof row)=>!!o.contentHash)}];
  if(!checks.every(c=>c.passed))return;
  const incidentId=`inc-${hash(site+POLICY)}`;
  if(ctx.db.incident.id.find(incidentId))return;
  const evidenceIds=relevant.map((o:typeof row)=>o.id);
  ctx.db.incident.insert({id:incidentId,site,state:'investigation-required',synthetic:true,policyId:POLICY,evidenceIds:evidenceIds.join(','),trace:JSON.stringify({policyVersion:'1.0.0',checks,independentSources:lineages.size,evidenceIds}),createdAt:ctx.timestamp});
  ctx.db.incidentEvent.insert({id:0n,incidentId,fromState:'',toState:'investigation-required',actor:ctx.sender,reason:'Synthetic policy passed',at:ctx.timestamp});
  ctx.db.outbox.insert({id:0n,kind:'incident-opened',aggregateId:incidentId,idempotencyKey:`${incidentId}:opened`,payload:JSON.stringify({incidentId}),status:'pending',at:ctx.timestamp});
}
export const submitObservation=db.reducer({id:t.string(),site:t.string(),category:t.string(),description:t.string(),observedAt:t.string(),supersedesId:t.string(),correctionReason:t.string()},(ctx,input)=>add(ctx,{...input,lineage:ctx.sender.toHexString(),synthetic:false}));
export const seedDemo=db.reducer(ctx=>{
  if(!owner(ctx))throw new Error('AUTHORIZATION_DENIED');
  const entries=[
    {id:'demo-a',site:'Synthetic Reach A',category:'wastewater-indicator',description:'Synthetic report of unusual odor and discoloration near an outfall.',observedAt:'2026-09-30T09:00:00.000Z',lineage:'demo-source-a'},
    {id:'demo-b',site:'Synthetic Reach A',category:'wastewater-indicator',description:'Independent synthetic report of unusual odor in the same reach.',observedAt:'2026-09-30T09:25:00.000Z',lineage:'demo-source-b'},
    {id:'demo-c',site:'Synthetic Reach B',category:'ecological',description:'Synthetic ecological observation of floating plant matter.',observedAt:'2026-09-30T10:00:00.000Z',lineage:'demo-source-c'},
  ];
  for(const entry of entries)if(!ctx.db.observation.id.find(entry.id))add(ctx,{...entry,synthetic:true,supersedesId:'',correctionReason:''});
});
export const transitionIncident=db.reducer({incidentId:t.string(),toState:t.string(),reason:t.string()},(ctx,{incidentId,toState,reason})=>{
  if(!officer(ctx))throw new Error('AUTHORIZATION_DENIED');
  const current=ctx.db.incident.id.find(incidentId);
  if(!current||!transitions[current.state]?.includes(toState))throw new Error('ILLEGAL_STATE_TRANSITION');
  clean(reason,1000);
  ctx.db.incident.id.update({...current,state:toState});
  ctx.db.incidentEvent.insert({id:0n,incidentId,fromState:current.state,toState,actor:ctx.sender,reason,at:ctx.timestamp});
  ctx.db.outbox.insert({id:0n,kind:'incident-transition',aggregateId:incidentId,idempotencyKey:`${incidentId}:${toState}:${ctx.timestamp}`,payload:JSON.stringify({incidentId,toState}),status:'pending',at:ctx.timestamp});
  if(toState==='follow-up-required'){
    const id=`mission-${incidentId}`;
    if(!ctx.db.mission.id.find(id))ctx.db.mission.insert({id,incidentId,site:current.site,rationale:'Collect a new independent observation after action; one before/after pair cannot establish causation.',state:'open',synthetic:current.synthetic});
  }
});

const DemoEvidenceRow=t.row('DemoEvidenceRow',{id:t.string().primaryKey(),siteId:t.string(),reachId:t.string(),description:t.string(),category:t.string(),observedAt:t.string(),latitude:t.f64(),longitude:t.f64(),sourceLineageId:t.string(),kind:t.string(),synthetic:t.bool(),contentHash:t.string(),validation:t.string()});
const DemoDeliveryRow=t.row('DemoDeliveryRow',{id:t.u64().primaryKey(),kind:t.string(),aggregateId:t.string(),status:t.string()});
export const demoEvidence=db.anonymousView({name:'demo_evidence',public:true},t.array(DemoEvidenceRow),ctx=>[...ctx.db.evidenceRecord.iter()].filter(r=>r.synthetic).map(r=>{
  const e=JSON.parse(r.payload) as Evidence;
  return {id:e.id,siteId:e.siteId,reachId:e.reachId,description:e.description,category:e.category,observedAt:e.observedAt,latitude:e.latitude,longitude:e.longitude,sourceLineageId:e.sourceLineageId,kind:e.kind,synthetic:true,contentHash:e.contentHash,validation:ctx.db.validationRecord.id.find(`validation-${e.id}`)?.payload??'{}'};
}));
export const demoIncidents=db.anonymousView({name:'demo_incidents',public:true},t.array(PublicIncident),ctx=>[...ctx.db.incident.iter()].filter(i=>i.synthetic&&i.policyId===DEMO_POLICY.id).map(i=>({id:i.id,site:i.site,state:i.state,policyId:i.policyId,evidenceIds:i.evidenceIds,trace:i.trace,synthetic:true})));
export const demoMissions=db.anonymousView({name:'demo_missions',public:true},t.array(mission.rowType),ctx=>[...ctx.db.mission.iter()].filter(m=>m.synthetic));
export const demoDeliveries=db.anonymousView({name:'demo_deliveries',public:true},t.array(DemoDeliveryRow),ctx=>[...ctx.db.outbox.iter()].filter(o=>ctx.db.incident.id.find(o.aggregateId)?.synthetic).map(o=>({id:o.id,kind:o.kind,aggregateId:o.aggregateId,status:o.status})));
export const monitoringSites=db.anonymousView({name:'monitoring_sites',public:true},t.array(monitoringSite.rowType),ctx=>[...ctx.db.monitoringSite.iter()].map(s=>({...s,latitude:s.synthetic?s.latitude:Math.round(s.latitude*100)/100,longitude:s.synthetic?s.longitude:Math.round(s.longitude*100)/100})));
export const myEvidence=db.view({name:'my_evidence',public:true},t.array(evidenceRecord.rowType),ctx=>[...ctx.db.evidenceRecord.iter()].filter(e=>e.owner.toHexString()===ctx.sender.toHexString()));
export const scienceEvidence=db.view({name:'science_evidence',public:true},t.array(evidenceRecord.rowType),ctx=>owner(ctx)||['officer','scientist'].includes(ctx.db.role.identity.find(ctx.sender)?.kind??'')?[...ctx.db.evidenceRecord.iter()]:[]);
export const scienceValidation=db.view({name:'science_validation',public:true},t.array(validationRecord.rowType),ctx=>owner(ctx)||['officer','scientist'].includes(ctx.db.role.identity.find(ctx.sender)?.kind??'')?[...ctx.db.validationRecord.iter()]:[]);
export const serviceOutbox=db.view({name:'service_outbox',public:true},t.array(outbox.rowType),ctx=>ctx.db.role.identity.find(ctx.sender)?.kind==='service'?[...ctx.db.outbox.iter()]:[]);
export const serviceIncidents=db.view({name:'service_incidents',public:true},t.array(incident.rowType),ctx=>ctx.db.role.identity.find(ctx.sender)?.kind==='service'?[...ctx.db.incident.iter()]:[]);
export const serviceEvidence=db.view({name:'service_evidence',public:true},t.array(evidenceRecord.rowType),ctx=>ctx.db.role.identity.find(ctx.sender)?.kind==='service'?[...ctx.db.evidenceRecord.iter()]:[]);
export const demoTasks=db.anonymousView({name:'demo_tasks',public:true},t.array(routedTask.rowType),ctx=>[...ctx.db.routedTask.iter()].filter(task=>task.synthetic));
export const myTasks=db.view({name:'my_tasks',public:true},t.array(routedTask.rowType),ctx=>{
  const kind=ctx.db.role.identity.find(ctx.sender)?.kind;
  return [...ctx.db.routedTask.iter()].filter(task=>owner(ctx)||kind==='officer'&&task.route==='environmental-officer'||kind==='scientist'&&task.route==='ecological-scientist');
});

function ensurePolicy(ctx:Context){const id=`${DEMO_POLICY.id}@${DEMO_POLICY.version}`;if(!ctx.db.policyRecord.id.find(id))ctx.db.policyRecord.insert({id,payload:JSON.stringify(DEMO_POLICY),synthetic:true});}
function persistEvidence(ctx:Context,untrusted:unknown,synthetic:boolean,lineage:string):Evidence{
  const input=reportSchema.parse(untrusted);
  const existing=ctx.db.evidenceRecord.id.find(input.id);
  if(existing){
    const e=JSON.parse(existing.payload) as Evidence;
    const {ownerId:ignoredOwner,sourceLineageId:ignoredLineage,synthetic:ignoredSynthetic,kind:ignoredKind,submittedAt:ignoredTime,contentHash:ignoredHash,...raw}=e;
    if(existing.owner.toHexString()!==ctx.sender.toHexString()||contentHash(raw)!==contentHash(input))throw new Error('CONFLICT');
    return e;
  }
  if(input.supersedesId){
    const previous=ctx.db.evidenceRecord.id.find(input.supersedesId);
    if(!previous||previous.owner.toHexString()!==ctx.sender.toHexString())throw new Error('AUTHORIZATION_DENIED');
    const original=JSON.parse(previous.payload) as Evidence;
    if(original.synthetic!==synthetic)throw new Error('CONFLICT');
    if([...ctx.db.evidenceRecord.iter()].some(r=>(JSON.parse(r.payload) as Evidence).supersedesId===input.supersedesId))throw new Error('REVISION_CONFLICT');
    lineage=original.sourceLineageId;
  }
  const e=makeEvidence(input,{identity:ctx.sender.toHexString(),lineage,synthetic},ctx.timestamp.toISOString());
  const v=validateEvidence(e,ctx.timestamp.toISOString(),DEMO_POLICY);
  ctx.db.evidenceRecord.insert({id:e.id,owner:ctx.sender,siteId:e.siteId,synthetic,payload:JSON.stringify(e),contentHash:e.contentHash});
  ctx.db.validationRecord.insert({id:`validation-${e.id}`,evidenceId:e.id,eligible:v.eligible,payload:JSON.stringify(v),at:ctx.timestamp});
  return e;
}
function runPolicy(ctx:Context,siteId:string,policy:Policy):Trace{
  const evidence=[...ctx.db.evidenceRecord.iter()].map(r=>JSON.parse(r.payload) as Evidence);
  const weather=[...ctx.db.weatherContext.iter()].map(w=>JSON.parse(w.payload) as Weather);
  const trace=evaluate(evidence,weather,policy,siteId,ctx.timestamp.toISOString());
  if(!ctx.db.ruleExecution.id.find(trace.id))ctx.db.ruleExecution.insert({id:trace.id,siteId,synthetic:policy.synthetic,route:trace.route,payload:JSON.stringify(trace),at:ctx.timestamp});
  if(trace.outcome==='INSUFFICIENT_EVIDENCE')return trace;
  const active=[...ctx.db.incident.iter()].find(i=>i.site===siteId&&i.policyId===policy.id&&!['CLOSED','DISMISSED'].includes(i.state));
  if(active)return trace;
  const id=`inc-${trace.id.slice(0,24)}`,state=trace.outcome==='INVESTIGATION_REQUIRED'?'INVESTIGATION_REQUIRED':'TRIAGED';
  ctx.db.incident.insert({id,site:siteId,state,synthetic:policy.synthetic,policyId:policy.id,evidenceIds:trace.evidenceIds.join(','),trace:JSON.stringify(trace),createdAt:ctx.timestamp});
  ctx.db.incidentEvent.insert({id:0n,incidentId:id,fromState:'TRIAGED',toState:state,actor:ctx.sender,reason:`${trace.ruleVersion}; ${trace.route}`,at:ctx.timestamp});
  ctx.db.outbox.insert({id:0n,kind:trace.route==='environmental-officer'?'environmental-task':'ecological-task',aggregateId:id,idempotencyKey:`${id}:route`,payload:JSON.stringify({incidentId:id,route:trace.route,traceId:trace.id,synthetic:policy.synthetic}),status:'pending',at:ctx.timestamp});
  return trace;
}
export const createReport=db.reducer({payload:t.string()},(ctx,{payload})=>{
  if(payload.length>12000)throw new Error('VALIDATION_ERROR');
  const input=reportSchema.parse(JSON.parse(payload));
  const site=ctx.db.monitoringSite.id.find(input.siteId);
  if(!site||site.reachId!==input.reachId)throw new Error('SITE_RESOLUTION_REQUIRED');
  const e=persistEvidence(ctx,input,site.synthetic,ctx.sender.toHexString());
  if(site.synthetic){ensurePolicy(ctx);runPolicy(ctx,e.siteId,DEMO_POLICY);return;}
  // Real-world rules activate only when a sourced local policy is configured.
  for(const record of ctx.db.policyRecord.iter())if(!record.synthetic)runPolicy(ctx,e.siteId,JSON.parse(record.payload) as Policy);
});
export const appendRevision=db.reducer({payload:t.string()},(ctx,{payload})=>{
  if(payload.length>12000)throw new Error('VALIDATION_ERROR');
  const input=JSON.parse(payload) as ReportInput;
  if(!input.supersedesId)throw new Error('REVISION_PARENT_REQUIRED');
  const previous=ctx.db.evidenceRecord.id.find(input.supersedesId);if(!previous)throw new Error('CONFLICT');
  persistEvidence(ctx,input,previous.synthetic,ctx.sender.toHexString());
});
export const recordExpertVerification=db.reducer({id:t.string(),evidenceId:t.string(),verdict:t.string(),reason:t.string()},(ctx,{id,evidenceId,verdict,reason})=>{
  if(!owner(ctx)&&!['officer','scientist'].includes(ctx.db.role.identity.find(ctx.sender)?.kind??''))throw new Error('AUTHORIZATION_DENIED');
  if(!ctx.db.evidenceRecord.id.find(evidenceId)||!['accepted','rejected'].includes(verdict))throw new Error('VALIDATION_ERROR');
  clean(reason,1000);ctx.db.verification.insert({id,evidenceId,verdict,reason,actor:ctx.sender,at:ctx.timestamp});
});
export const recordFinding=db.reducer({id:t.string(),incidentId:t.string(),evidenceIds:t.string(),description:t.string()},(ctx,input)=>{
  if(!officer(ctx))throw new Error('AUTHORIZATION_DENIED');
  const i=ctx.db.incident.id.find(input.incidentId);
  if(!i||i.state!=='INVESTIGATING'||!input.evidenceIds.split(',').every(id=>ctx.db.evidenceRecord.id.find(id)))throw new Error('EVIDENCE_INELIGIBLE');
  clean(input.description,2000);ctx.db.finding.insert({...input,actor:ctx.sender,at:ctx.timestamp});
});
export const recordIntervention=db.reducer({id:t.string(),incidentId:t.string(),description:t.string()},(ctx,input)=>{
  if(!officer(ctx))throw new Error('AUTHORIZATION_DENIED');
  if(ctx.db.incident.id.find(input.incidentId)?.state!=='ACTION_REQUIRED')throw new Error('ILLEGAL_STATE_TRANSITION');
  clean(input.description,2000);ctx.db.intervention.insert({...input,actor:ctx.sender,at:ctx.timestamp});
});
export const advanceIncident=db.reducer({incidentId:t.string(),toState:t.string(),reason:t.string(),recordId:t.string(),closureRationale:t.string()},(ctx,{incidentId,toState,reason,recordId,closureRationale})=>{
  if(!officer(ctx))throw new Error('AUTHORIZATION_DENIED');
  const current=ctx.db.incident.id.find(incidentId);if(!current)throw new Error('CONFLICT');
  const f=ctx.db.finding.id.find(recordId),action=ctx.db.intervention.id.find(recordId);
  const linkedMission=ctx.db.mission.id.find(`mission-${incidentId}`);
  const actions=[...ctx.db.intervention.iter()].filter(a=>a.incidentId===incidentId);
  const latestAction=actions.reduce((latest,a)=>a.at.microsSinceUnixEpoch>latest?a.at.microsSinceUnixEpoch:latest,0n);
  const followUp=[...ctx.db.evidenceRecord.iter()].map(r=>JSON.parse(r.payload) as Evidence).filter(e=>e.missionId===linkedMission?.id&&e.siteId===current.site&&Date.parse(e.observedAt)*1000>Number(latestAction)&&ctx.db.validationRecord.id.find(`validation-${e.id}`)?.eligible&&[...ctx.db.verification.iter()].some(v=>v.evidenceId===e.id&&v.verdict==='accepted'));
  assertTransition(current.state as IncidentState,toState as IncidentState,{role:owner(ctx)?'admin':'officer',reason,findingId:f?.incidentId===incidentId?f.id:undefined,supportingEvidenceIds:f?.evidenceIds.split(',').filter(Boolean),interventionId:action?.incidentId===incidentId?action.id:undefined,followUpEvidenceIds:followUp.map(e=>e.id),authorizedClosureRationale:closureRationale});
  ctx.db.incident.id.update({...current,state:toState});
  ctx.db.incidentEvent.insert({id:0n,incidentId,fromState:current.state,toState,actor:ctx.sender,reason,at:ctx.timestamp});
  ctx.db.outbox.insert({id:0n,kind:'incident-status',aggregateId:incidentId,idempotencyKey:`${incidentId}:${toState}:${ctx.timestamp.microsSinceUnixEpoch}`,payload:JSON.stringify({incidentId,toState,recordId,reason}),status:'pending',at:ctx.timestamp});
  if(toState==='FOLLOW_UP'&&!linkedMission)ctx.db.mission.insert({id:`mission-${incidentId}`,incidentId,site:current.site,rationale:'Collect independent post-action evidence. An expert must verify it before outcome assessment.',state:'open',synthetic:current.synthetic});
  if(toState==='CLOSED'&&linkedMission)ctx.db.mission.id.update({...linkedMission,state:'complete'});
});

export const seedFlagship=db.reducer(ctx=>{
  if(!owner(ctx))throw new Error('AUTHORIZATION_DENIED');
  if(ctx.db.evidenceRecord.id.find('demo-v2-a'))return;
  ensurePolicy(ctx);
  for(const site of [
    {id:'DEMO-SITE-001',name:'Synthetic Reach A',cityId:'DEMO-CITY',catchmentId:'DEMO-CATCHMENT',streamId:'DEMO-STREAM-001',reachId:'DEMO-REACH-001',latitude:59.3293,longitude:18.0686,synthetic:true},
    {id:'DEMO-SITE-002',name:'Synthetic Reach B',cityId:'DEMO-CITY',catchmentId:'DEMO-CATCHMENT',streamId:'DEMO-STREAM-001',reachId:'DEMO-REACH-002',latitude:59.335,longitude:18.076,synthetic:true},
  ])if(!ctx.db.monitoringSite.id.find(site.id))ctx.db.monitoringSite.insert(site);
  const now=ctx.timestamp.toISOString(),observedAt=new Date(ctx.timestamp.toDate().getTime()-1800000).toISOString();
  const base:ReportInput={id:'demo-v2-a',siteId:'DEMO-SITE-001',reachId:'DEMO-REACH-001',description:'Synthetic citizen report: visible foam and sewage-like odour near a fictional outfall.',category:'wastewater-indicator',observedAt,latitude:59.3293,longitude:18.0686,gpsAccuracyM:12,protocolVersion:'field-v1',mediaHashes:[],measurement:null,supersedesId:'',correctionReason:'',missionId:''};
  persistEvidence(ctx,base,true,'DEMO-CITIZEN-A');
  persistEvidence(ctx,{...base,id:'demo-v2-b',description:'Independent synthetic citizen report: visible foam and an unusual odour in the same fictional reach.'},true,'DEMO-CITIZEN-B');
  const w:Weather={id:'DEMO-WEATHER-001',siteId:base.siteId,observedAt:now,precipitationMm:8,synthetic:true,source:'Synthetic scenario input; no real weather claim',methodVersion:'demo-weather-v1'};
  if(!ctx.db.weatherContext.id.find(w.id))ctx.db.weatherContext.insert({id:w.id,siteId:w.siteId,synthetic:true,payload:JSON.stringify(w)});
  runPolicy(ctx,base.siteId,DEMO_POLICY);
  const ecological={...base,id:'demo-v2-ecology',siteId:'DEMO-SITE-002',reachId:'DEMO-REACH-002',category:'ecological' as const,description:'Synthetic instrument observation of dissolved oxygen for the ecological negative control.',measurement:{indicator:'dissolved-oxygen' as const,value:3,unit:'mg/L',instrumentId:'DEMO-PROBE-001',calibrationDate:new Date(ctx.timestamp.toDate().getTime()-86400000).toISOString()}};
  persistEvidence(ctx,ecological,true,'DEMO-INSTRUMENT-A');runPolicy(ctx,ecological.siteId,DEMO_POLICY);
});

export const claimOutbox=db.reducer({id:t.u64()},(ctx,{id})=>{
  if(ctx.db.role.identity.find(ctx.sender)?.kind!=='service')throw new Error('AUTHORIZATION_DENIED');
  const message=ctx.db.outbox.id.find(id);if(!message)throw new Error('CONFLICT');
  const prior=ctx.db.delivery.idempotencyKey.find(message.idempotencyKey);if(prior?.status==='delivered')return;
  if(prior?.status==='processing'&&ctx.timestamp.microsSinceUnixEpoch-prior.at.microsSinceUnixEpoch<300000000n)throw new Error('DELIVERY_LEASE_ACTIVE');
  const row={idempotencyKey:message.idempotencyKey,outboxId:id,status:'processing',attempts:(prior?.attempts??0)+1,receipt:prior?.receipt??'',lastError:'',at:ctx.timestamp};
  if(prior)ctx.db.delivery.idempotencyKey.update(row);else ctx.db.delivery.insert(row);
  ctx.db.outbox.id.update({...message,status:'processing'});
});
export const completeDelivery=db.reducer({id:t.u64(),status:t.string(),receipt:t.string(),errorCode:t.string()},(ctx,{id,status,receipt,errorCode})=>{
  if(ctx.db.role.identity.find(ctx.sender)?.kind!=='service'||!['delivered','retry','dead'].includes(status))throw new Error('AUTHORIZATION_DENIED');
  const message=ctx.db.outbox.id.find(id);if(!message)throw new Error('CONFLICT');
  const prior=ctx.db.delivery.idempotencyKey.find(message.idempotencyKey);if(!prior)throw new Error('DELIVERY_NOT_CLAIMED');
  if(prior.status==='delivered')return;
  ctx.db.delivery.idempotencyKey.update({...prior,status,receipt:receipt.slice(0,500),lastError:errorCode.slice(0,100),at:ctx.timestamp});
  ctx.db.outbox.id.update({...message,status});
});
export const deliverTask=db.reducer({outboxId:t.u64()},(ctx,{outboxId})=>{
  if(ctx.db.role.identity.find(ctx.sender)?.kind!=='service')throw new Error('AUTHORIZATION_DENIED');
  const message=ctx.db.outbox.id.find(outboxId);if(!message)throw new Error('CONFLICT');
  const i=ctx.db.incident.id.find(message.aggregateId);if(!i)throw new Error('CONFLICT');
  if(ctx.db.routedTask.idempotencyKey.find(message.idempotencyKey))return;
  const trace=JSON.parse(i.trace) as Trace;
  const route=trace.route;
  if(!['ecological-scientist','environmental-officer'].includes(route))throw new Error('RESPONSIBILITY_NOT_CONFIGURED');
  ctx.db.routedTask.insert({idempotencyKey:message.idempotencyKey,incidentId:i.id,route,status:'available',synthetic:i.synthetic,at:ctx.timestamp});
});
