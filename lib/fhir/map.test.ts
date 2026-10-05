import {describe,it,expect} from 'vitest';
import {toBundle} from './map';
import {fixture} from './fixture';
describe('FHIR mapping boundary',()=>{
  it('includes environmental resources and provenance with no patient or DetectedIssue',()=>{const bundle=toBundle(fixture());expect(bundle.entry.map(e=>e.resource.resourceType)).toEqual(['Location','Organization','Observation','Provenance','Task','Communication']);expect(JSON.stringify(bundle)).not.toContain('private-citizen-identity');expect(JSON.stringify(bundle)).not.toContain('private-source')});
  it('exports only eligible evidence and never derives a numeric reading from text',()=>{const packet=fixture();packet.validations[0]!.eligible=false;expect(toBundle(packet).entry.some(e=>e.resource.resourceType==='Observation')).toBe(false)});
  it('labels every resource synthetic and preserves declared quantities',()=>{const bundle=toBundle(fixture());for(const e of bundle.entry)expect(e.resource.meta).toMatchObject({tag:[{code:'synthetic'}]});expect(bundle.entry.find(e=>e.resource.resourceType==='Observation')?.resource.valueQuantity).toMatchObject({value:3,code:'mg/L'})});
});
