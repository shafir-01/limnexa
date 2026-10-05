import { z } from 'zod';

export const observationInput = z.object({
  site: z.string().trim().min(3).max(120),
  observedAt: z.string().datetime(),
  description: z.string().trim().min(15).max(2000),
  category: z.enum(['wastewater-indicator','ecological','other']),
  sourceId: z.string().trim().min(3),
  synthetic: z.boolean(),
});
export type ObservationInput = z.infer<typeof observationInput>;
export type Observation = ObservationInput & { id:string; createdAt:string; contentHash:string; supersedesId?:string; correctionReason?:string };
export type TrustVector = { completeness:'pass'|'review'; provenance:'pass'|'review'; independence:'pass'|'review'; temporal:'pass'|'review' };
export type Policy = { id:string; version:string; synthetic:boolean; minIndependentReports:number; category:'wastewater-indicator'; source:string };
export type RuleTrace = { policyId:string; policyVersion:string; evidenceIds:string[]; independentSources:number; checks:{name:string;passed:boolean;detail:string}[]; decision:'investigation-required'|'insufficient-evidence' };
export type IncidentState = 'investigation-required'|'acknowledged'|'investigating'|'action-recorded'|'follow-up-required'|'closed';
export type Incident = { id:string; state:IncidentState; trace:RuleTrace; history:{state:IncidentState;actor:string;at:string;reason:string}[] };
export const DEMO_POLICY:Policy={id:'synthetic-wastewater-v1',version:'1.0.0',synthetic:true,minIndependentReports:2,category:'wastewater-indicator',source:'Synthetic demonstration policy; no scientific or public-health threshold claim'};

export function validateObservation(input:ObservationInput):TrustVector {return {completeness:input.description.length>=15?'pass':'review',provenance:input.sourceId?'pass':'review',independence:'review',temporal:new Date(input.observedAt).getTime()<=Date.now()?'pass':'review'};}
export function evaluatePolicy(evidence:Observation[],policy:Policy):RuleTrace {
  const relevant=evidence.filter(e=>e.category===policy.category&&e.synthetic===policy.synthetic);
  const sources=new Set(relevant.map(e=>e.sourceId));
  const checks=[{name:'Category match',passed:relevant.length>0,detail:`${relevant.length} matching reports`},{name:'Independent lineages',passed:sources.size>=policy.minIndependentReports,detail:`${sources.size} distinct sources; policy requires ${policy.minIndependentReports}`},{name:'Evidence provenance',passed:relevant.every(e=>!!e.contentHash),detail:'All included reports carry a content hash'}];
  return {policyId:policy.id,policyVersion:policy.version,evidenceIds:relevant.map(e=>e.id),independentSources:sources.size,checks,decision:checks.every(c=>c.passed)?'investigation-required':'insufficient-evidence'};
}
const ALLOWED:Record<IncidentState,IncidentState[]>={'investigation-required':['acknowledged'],'acknowledged':['investigating'],'investigating':['action-recorded'],'action-recorded':['follow-up-required'],'follow-up-required':['closed','investigating'],'closed':[]};
export function transition(incident:Incident,to:IncidentState,actor:string,reason:string,at:string):Incident {if(!ALLOWED[incident.state].includes(to))throw new Error('ILLEGAL_STATE_TRANSITION');if(!actor.trim()||!reason.trim())throw new Error('VALIDATION_ERROR');return {...incident,state:to,history:[...incident.history,{state:to,actor,reason,at}]};}
export function makeIncident(trace:RuleTrace,at:string):Incident {if(trace.decision!=='investigation-required')throw new Error('EVIDENCE_INELIGIBLE');return {id:`inc-${trace.evidenceIds.join('-')}`,state:'investigation-required',trace,history:[{state:'investigation-required',actor:'deterministic-rule',at,reason:`Policy ${trace.policyId}@${trace.policyVersion} passed`}]};}
export function monitoringGap(incident:Incident,observations:Observation[]):string {const latest=Math.max(...observations.filter(o=>incident.trace.evidenceIds.includes(o.id)).map(o=>new Date(o.observedAt).getTime()));return Number.isFinite(latest)?`Re-measure at the same site after action. Last supporting observation: ${new Date(latest).toISOString()}.`:'Collect a new site observation with traceable provenance.';}
