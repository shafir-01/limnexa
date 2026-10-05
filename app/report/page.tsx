import {Nav,Footer} from '@/components/nav';
import {ConnectionStatus} from '@/components/live';
import {ReportForm} from '@/components/report-form';
export default function Report(){return <><Nav/><main id="main" className="shell page"><ConnectionStatus/><h1>Record what you observed.</h1><p className="muted">Describe visible or sensed conditions. Do not guess unseen chemicals, pathogens, or causes. Your draft stays on this device until submission succeeds.</p><ReportForm/><p className="muted small">Voice transcription supplements structured field capture; review every transcript before confirming it.</p></main><Footer/></>}
