import {Nav,Footer} from '@/components/nav';import {LiveEvidence} from '@/components/live';import {MapPanel} from '@/components/map-panel';
export default function Evidence(){return <><Nav/><main id="main" className="shell page"><div className="workspace-head"><h1>Evidence</h1><span className="badge warn">Synthetic</span></div><MapPanel/><section><LiveEvidence/></section></main><Footer/></>}
