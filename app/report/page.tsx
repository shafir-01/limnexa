import {Nav,Footer} from '@/components/nav';import {ConnectionStatus} from '@/components/live';import {ReportForm} from '@/components/report-form';
export default function Report(){return <><Nav/><main id="main" className="shell page"><div className="workspace-head"><h1>New report</h1><ConnectionStatus/></div><ReportForm/></main><Footer/></>}
