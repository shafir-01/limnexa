import {mkdirSync,writeFileSync} from 'node:fs';
import {fixture} from '../lib/fhir/fixture';
import {toBundle} from '../lib/fhir/map';
mkdirSync('tests/fixtures/fhir',{recursive:true});
const valid=toBundle(fixture());
writeFileSync('tests/fixtures/fhir/valid.json',JSON.stringify(valid,null,2));
const invalid=structuredClone(valid);delete invalid.entry.find(e=>e.resource.resourceType==='Observation')!.resource.status;
writeFileSync('tests/fixtures/fhir/invalid.json',JSON.stringify(invalid,null,2));
