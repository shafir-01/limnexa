import {Nav,Footer} from '@/components/nav';import {LiveEvidence} from '@/components/live';
import {MapPanel} from '@/components/map-panel';
export default function Evidence(){return <><Nav/><main id="main" className="shell page"><span className="badge warn">Synthetic demonstration</span><h1>Evidence ledger</h1><p className="muted">Original reports remain distinct from policy decisions. No report below claims a measured contaminant.</p><MapPanel/><section><LiveEvidence/></section></main><Footer/></>}
