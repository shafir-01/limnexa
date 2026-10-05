import { schema, table, t } from 'spacetimedb/server';

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
const db = schema({ role, observation, incident, incidentEvent, outbox, mission });
export default db;

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
  if(!owner(ctx)||!['officer','scientist'].includes(kind)) throw new Error('AUTHORIZATION_DENIED');
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
