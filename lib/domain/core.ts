import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { z } from 'zod';

export const RULE_VERSION = 'wastewater-2.0.0';
export const VALIDATOR_VERSION = 'trust-2.0.0';
export const measurementSchema = z.object({ indicator:z.enum(['dissolved-oxygen','temperature','pH','conductivity']), value:z.number().finite(), unit:z.string().min(1).max(20), instrumentId:z.string().min(1).max(120), calibrationDate:z.string().datetime() });
export const reportSchema = z.object({
  id:z.string().min(3).max(100), siteId:z.string().min(3).max(120), reachId:z.string().min(3).max(120),
  description:z.string().trim().min(15).max(2000), category:z.enum(['wastewater-indicator','ecological','other']),
  observedAt:z.string().datetime(), latitude:z.number().min(-90).max(90), longitude:z.number().min(-180).max(180),
  gpsAccuracyM:z.number().nonnegative().max(10000).nullable(), protocolVersion:z.literal('field-v1'),
  mediaHashes:z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(5),
  measurement:measurementSchema.nullable(), supersedesId:z.string().max(100), correctionReason:z.string().max(1000),
  missionId:z.string().max(100),
}).strict();
export type ReportInput = z.infer<typeof reportSchema>;
export const siteSchema=z.object({id:z.string().min(3).max(120),name:z.string().min(3).max(200),cityId:z.string().min(3).max(120),catchmentId:z.string().min(3).max(120),streamId:z.string().min(3).max(120),reachId:z.string().min(3).max(120),latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),synthetic:z.boolean()}).strict();
export type SiteInput=z.infer<typeof siteSchema>;
export type Evidence = ReportInput & { ownerId:string; sourceLineageId:string; sourceVerified?:boolean; siteDistanceM?:number; synthetic:boolean; kind:'citizen-report'|'instrument-measurement'; submittedAt:string; contentHash:string };
export type Assertion = { dimension:string; status:'pass'|'warn'|'fail'|'unknown'|'not_applicable'; code:string; details:Record<string,string|number|boolean>; validatorVersion:string };
export type Validation = { evidenceId:string; assertions:Assertion[]; eligible:boolean; eligibility:'usable_for_rule_evaluation'|'requires_review'|'rejected_for_analysis'; version:string };
export type Policy = { id:string; version:string; status:'synthetic-demonstration'|'configured-local'; synthetic:boolean; source:{title:string;uri:string;retrievedAt:string}; minIndependent:number; windowMinutes:number; maxGpsAccuracyM:number; rainMinimumMm:number; ecologicalOxygenMaximumMgL:number };
export const policySchema=z.object({id:z.string().min(3).max(100),version:z.string().regex(/^\d+\.\d+\.\d+$/),status:z.enum(['synthetic-demonstration','configured-local']),synthetic:z.boolean(),source:z.object({title:z.string().min(10).max(500),uri:z.string().url(),retrievedAt:z.string().date()}),minIndependent:z.number().int().min(2).max(100),windowMinutes:z.number().int().min(1).max(10080),maxGpsAccuracyM:z.number().positive().max(10000),rainMinimumMm:z.number().nonnegative().finite(),ecologicalOxygenMaximumMgL:z.number().nonnegative().finite()}).strict().refine(p=>p.synthetic===(p.status==='synthetic-demonstration'),'Policy status must match synthetic flag');
export type Weather = { id:string; siteId:string; observedAt:string; precipitationMm:number; synthetic:boolean; source:string; methodVersion:string };
export type Trace = { id:string; ruleVersion:string; policy:Policy; executedAt:string; evidenceIds:string[]; weatherIds:string[]; conditions:{code:string;passed:boolean;detail:string}[]; independentLineages:number; outcome:'INVESTIGATION_REQUIRED'|'ECOLOGICAL_REVIEW'|'INSUFFICIENT_EVIDENCE'; route:'environmental-officer'|'ecological-scientist'|'none' };
export const DEMO_POLICY:Policy={id:'LIMNEXA_DEMO_POLICY_V1',version:'1.0.0',status:'synthetic-demonstration',synthetic:true,source:{title:'Synthetic demonstration parameters; not environmental standards',uri:'https://limnexa.example/policies/synthetic-v1',retrievedAt:'2026-10-05'},minIndependent:2,windowMinutes:120,maxGpsAccuracyM:100,rainMinimumMm:5,ecologicalOxygenMaximumMgL:4};

export function canonical(value:unknown):string {
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
  return `{${Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,item])=>`${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
}
export function contentHash(value:unknown):string{return bytesToHex(sha256(new TextEncoder().encode(canonical(value))));}
export function distanceMeters(a:{latitude:number;longitude:number},b:{latitude:number;longitude:number}):number{const rad=Math.PI/180,dlat=(a.latitude-b.latitude)*rad,dlon=(a.longitude-b.longitude)*rad,h=Math.sin(dlat/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dlon/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));}
export function makeEvidence(input:unknown,actor:{identity:string;lineage:string;synthetic:boolean;sourceVerified?:boolean;siteDistanceM?:number},now:string):Evidence {
  const report=reportSchema.parse(input);
  if(report.supersedesId&&!report.correctionReason.trim())throw new Error('REVISION_REASON_REQUIRED');
  const body={...report,ownerId:actor.identity,sourceLineageId:actor.lineage,sourceVerified:actor.sourceVerified??actor.synthetic,...(actor.siteDistanceM!==undefined?{siteDistanceM:actor.siteDistanceM}:{}),synthetic:actor.synthetic,kind:report.measurement?'instrument-measurement' as const:'citizen-report' as const,submittedAt:now};
  return {...body,contentHash:contentHash(body)};
}
export function validateEvidence(e:Evidence,now:string,policy:Pick<Policy,'windowMinutes'|'maxGpsAccuracyM'>):Validation {
  const assertion=(dimension:string,status:Assertion['status'],code:string,details:Assertion['details']={}):Assertion=>({dimension,status,code,details,validatorVersion:VALIDATOR_VERSION});
  const observed=Date.parse(e.observedAt),executed=Date.parse(now),ageMinutes=(executed-observed)/60000;
  const measure=e.measurement;
  const expectedUnit=measure?({'dissolved-oxygen':'mg/L',temperature:'Cel',pH:'[pH]',conductivity:'uS/cm'} as const)[measure.indicator]:null;
  const physical=measure?measure.indicator==='pH'?measure.value>=0&&measure.value<=14:measure.indicator==='temperature'?measure.value>=-100&&measure.value<=100:measure.value>=0:true;
  const assertions:Assertion[]=[
    assertion('acquisition_quality','pass',measure?'DECLARED_INSTRUMENT_MEASUREMENT':'DIRECT_CITIZEN_REPORT'),
    assertion('protocol_adherence',e.protocolVersion==='field-v1'?'pass':'fail','PROTOCOL_FIELD_V1'),
    assertion('spatial_integrity',e.gpsAccuracyM===null||e.gpsAccuracyM>policy.maxGpsAccuracyM||(e.siteDistanceM??0)>policy.maxGpsAccuracyM?'warn':'pass',e.gpsAccuracyM===null?'GPS_ACCURACY_UNKNOWN':(e.siteDistanceM??0)>policy.maxGpsAccuracyM?'OUTSIDE_CONFIGURED_SITE_RADIUS':'GPS_ACCURACY_RECORDED',{siteId:e.siteId,reachId:e.reachId,accuracyM:e.gpsAccuracyM??-1,siteDistanceM:e.siteDistanceM??-1}),
    assertion('temporal_integrity',ageMinutes< -5?'fail':ageMinutes>policy.windowMinutes?'warn':'pass',ageMinutes< -5?'FUTURE_TIME':ageMinutes>policy.windowMinutes?'STALE_FOR_POLICY':'TIME_WITHIN_WINDOW',{ageMinutes}),
    assertion('instrument_integrity',!measure?'not_applicable':measure.unit!==expectedUnit?'fail':Date.parse(measure.calibrationDate)>observed?'fail':'pass',!measure?'NO_INSTRUMENT_CLAIM':measure.unit!==expectedUnit?'UNIT_MISMATCH':'CALIBRATION_RECORDED'),
    assertion('physical_plausibility',physical?'pass':'fail',physical?'BROAD_DATA_BOUNDS_PASS':'IMPOSSIBLE_VALUE'),
    assertion('completeness','pass','REQUIRED_FIELDS_PRESENT'),
    assertion('corroboration','unknown','RULE_CHECKS_INDEPENDENT_LINEAGE'),
    assertion('media_support',e.mediaHashes.length?'unknown':'not_applicable',e.mediaHashes.length?'MEDIA_REQUIRES_VISIBLE_FEATURE_REVIEW':'NO_MEDIA'),
    assertion('provenance_completeness',e.contentHash!==contentHash(Object.fromEntries(Object.entries(e).filter(([key])=>key!=='contentHash')))?'fail':e.synthetic||e.sourceVerified?'pass':'warn',e.synthetic||e.sourceVerified?'CONTENT_HASH_AND_SOURCE_LINEAGE':'UNVERIFIED_CONTRIBUTOR_LINEAGE'),
  ];
  const failed=assertions.some(a=>a.status==='fail'),reviewRequired=assertions.some(a=>a.code==='STALE_FOR_POLICY'||a.dimension==='spatial_integrity'&&a.status==='warn');
  return {evidenceId:e.id,assertions,eligible:!failed&&!reviewRequired,eligibility:failed?'rejected_for_analysis':reviewRequired?'requires_review':'usable_for_rule_evaluation',version:VALIDATOR_VERSION};
}
export function latestEvidence(evidence:Evidence[]):Evidence[]{
  const superseded=new Set(evidence.map(e=>e.supersedesId).filter(Boolean));
  return evidence.filter(e=>!superseded.has(e.id));
}
// Connected components ensure a copied media artifact or shared source lineage
// cannot count as independent corroboration, even through a chain of copies.
export function independentGroups(evidence:Evidence[]):number {
  const parents=evidence.map((_,i)=>i);
  const root=(i:number):number=>parents[i]===i?i:root(parents[i]!);
  for(let i=0;i<evidence.length;i++)for(let j=i+1;j<evidence.length;j++){
    const a=evidence[i]!,b=evidence[j]!;
    const copied=a.mediaHashes.some(h=>b.mediaHashes.includes(h));
    if(a.sourceLineageId===b.sourceLineageId||copied)parents[root(j)]=root(i);
  }
  return new Set(parents.map((_,i)=>root(i))).size;
}
export function evaluate(evidence:Evidence[],weather:Weather[],policy:Policy,siteId:string,now:string):Trace {
  const candidates=latestEvidence(evidence).filter(e=>e.siteId===siteId&&e.synthetic===policy.synthetic&&(e.synthetic||e.sourceVerified===true)&&validateEvidence(e,now,policy).eligible);
  const wastewater=candidates.filter(e=>e.category==='wastewater-indicator');
  const independent=independentGroups(wastewater);
  const context=weather.filter(w=>w.siteId===siteId&&w.synthetic===policy.synthetic&&Date.parse(w.observedAt)<=Date.parse(now)&&Date.parse(now)-Date.parse(w.observedAt)<=policy.windowMinutes*60000);
  const conditions=[
    {code:'VALIDATED_REPORTS',passed:wastewater.length>=policy.minIndependent,detail:`${wastewater.length} eligible reports`},
    {code:'INDEPENDENT_LINEAGES',passed:independent>=policy.minIndependent,detail:`${independent} independent groups; policy requires ${policy.minIndependent}`},
    {code:'STORED_WEATHER_CONTEXT',passed:context.some(w=>w.precipitationMm>=policy.rainMinimumMm),detail:`Stored rainfall must meet ${policy.rainMinimumMm} mm in this ${policy.status} policy`},
    {code:'SAME_REACH',passed:new Set(wastewater.map(e=>e.reachId)).size===1,detail:'Reports agree on one canonical reach'},
  ];
  const ecological=candidates.some(e=>e.category==='ecological'&&e.measurement?.indicator==='dissolved-oxygen'&&e.measurement.unit==='mg/L'&&e.measurement.value<=policy.ecologicalOxygenMaximumMgL);
  const outcome:Trace['outcome']=conditions.every(c=>c.passed)?'INVESTIGATION_REQUIRED':ecological?'ECOLOGICAL_REVIEW':'INSUFFICIENT_EVIDENCE';
  const body={ruleVersion:RULE_VERSION,policy,executedAt:now,evidenceIds:candidates.map(e=>e.id).sort(),weatherIds:context.map(w=>w.id).sort(),conditions,independentLineages:independent,outcome,route:outcome==='INVESTIGATION_REQUIRED'?'environmental-officer' as const:outcome==='ECOLOGICAL_REVIEW'?'ecological-scientist' as const:'none' as const};
  return {id:contentHash(body),...body};
}

export const incidentStates=['CANDIDATE','VALIDATING','TRIAGED','INVESTIGATION_REQUIRED','ACKNOWLEDGED','INVESTIGATING','CONFIRMED','ACTION_REQUIRED','ACTIONED','FOLLOW_UP','CLOSED','DISMISSED'] as const;
export type IncidentState=typeof incidentStates[number];
export const allowedTransitions:Record<IncidentState,readonly IncidentState[]>={CANDIDATE:['VALIDATING'],VALIDATING:['TRIAGED','DISMISSED'],TRIAGED:['INVESTIGATION_REQUIRED','DISMISSED'],INVESTIGATION_REQUIRED:['ACKNOWLEDGED'],ACKNOWLEDGED:['INVESTIGATING'],INVESTIGATING:['CONFIRMED','DISMISSED'],CONFIRMED:['ACTION_REQUIRED','FOLLOW_UP'],ACTION_REQUIRED:['ACTIONED'],ACTIONED:['FOLLOW_UP'],FOLLOW_UP:['CLOSED','INVESTIGATING'],CLOSED:[],DISMISSED:[]};
export type TransitionProof={role:'officer'|'admin'|'scientist'|'citizen'|'ai';reason:string;findingId?:string;supportingEvidenceIds?:string[];interventionId?:string;followUpEvidenceIds?:string[];authorizedClosureRationale?:string};
export function assertTransition(from:IncidentState,to:IncidentState,proof:TransitionProof):void {
  if(!allowedTransitions[from]?.includes(to))throw new Error('ILLEGAL_STATE_TRANSITION');
  if(!['admin','officer'].includes(proof.role))throw new Error('AUTHORIZATION_DENIED');
  if(!proof.reason.trim())throw new Error('TRANSITION_REASON_REQUIRED');
  if(to==='CONFIRMED'&&(!proof.findingId||!proof.supportingEvidenceIds?.length))throw new Error('FINDING_EVIDENCE_REQUIRED');
  if(to==='ACTIONED'&&!proof.interventionId)throw new Error('INTERVENTION_REQUIRED');
  if(to==='CLOSED'&&!proof.followUpEvidenceIds?.length&&!proof.authorizedClosureRationale?.trim())throw new Error('FOLLOW_UP_EVIDENCE_REQUIRED');
}
