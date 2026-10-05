import {Nav,Footer} from '@/components/nav';
import {ConnectionStatus,ReportForm} from '@/components/live';
export default function Report(){return <><Nav/><main className="shell page"><ConnectionStatus/><h1>Record what you observed.</h1><p className="muted">Describe visible or sensed conditions. Do not guess unseen chemicals, pathogens, or causes. Your draft stays on this device until submission succeeds.</p><ReportForm/><p className="muted small">Voice transcription is optional and requires a rotated ElevenLabs key. Typed capture remains available.</p></main><Footer/></>}
