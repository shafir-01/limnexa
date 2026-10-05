import {Nav,Footer} from '@/components/nav';
import {FhirInspector} from '@/components/fhir-inspector';
export default function Interoperability(){return <><Nav/><main id="main" className="shell page"><span className="badge blue">Interoperability boundary</span><h1>Standards exchange</h1><p className="muted">Validated source evidence travels with its provenance and operational context.</p><FhirInspector/></main><Footer/></>}
