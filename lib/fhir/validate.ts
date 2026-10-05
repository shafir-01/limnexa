import {z} from 'zod';
const resource=z.object({resourceType:z.enum(['Location','Organization','Observation','Provenance','Task','Communication']),id:z.string().regex(/^[A-Za-z0-9-.]{1,64}$/),meta:z.object({tag:z.array(z.object({system:z.string().url(),code:z.enum(['synthetic','environmental'])}))})}).passthrough();
const schema=z.object({resourceType:z.literal('Bundle'),id:z.string(),type:z.literal('collection'),timestamp:z.string().datetime(),entry:z.array(z.object({fullUrl:z.string().url(),resource}))});
export function validateExport(input:unknown){
  const bundle=schema.parse(input);
  const refs=new Set(bundle.entry.map(e=>`${e.resource.resourceType}/${e.resource.id}`));
  if(refs.size!==bundle.entry.length)throw new Error('FHIR_DUPLICATE_RESOURCE');
  function visit(value:unknown):void{if(!value||typeof value!=='object')return;if(Array.isArray(value)){value.forEach(visit);return;}for(const [key,item] of Object.entries(value)){if(key==='reference'&&typeof item==='string'&&!refs.has(item))throw new Error('FHIR_UNRESOLVED_REFERENCE');visit(item)}}
  for(const entry of bundle.entry){visit(entry.resource);if(entry.resource.resourceType==='Observation'&&(entry.resource.status!=='final'||!entry.resource.code||!entry.resource.subject||!entry.resource.effectiveDateTime))throw new Error('FHIR_INVALID_OBSERVATION');}
  return {status:'passed' as const,scope:'Runtime export contract and internal reference integrity; official HL7 validation is a separate fixture/CI gate',resourceCount:bundle.entry.length};
}
