import {describe,it,expect} from 'vitest';
import {DEMO_POLICY,evaluatePolicy,makeIncident,transition} from './domain';
import {demoObservations} from './demo';
describe('evidence to action',()=>{
  it('requires independent sources',()=>{const same=demoObservations.slice(0,2).map(o=>({...o,sourceId:'same'}));expect(evaluatePolicy(same,DEMO_POLICY).decision).toBe('insufficient-evidence');});
  it('keeps ecological report from health route',()=>{expect(evaluatePolicy([demoObservations[2]!],DEMO_POLICY).decision).toBe('insufficient-evidence');});
  it('rejects illegal transitions',()=>{expect(()=>transition(makeIncident(evaluatePolicy(demoObservations,DEMO_POLICY),'2026-10-01T00:00:00Z'),'closed','officer','done','2026-10-01T00:01:00Z')).toThrow('ILLEGAL_STATE_TRANSITION');});
  it('records authorized transition history',()=>{const incident=makeIncident(evaluatePolicy(demoObservations,DEMO_POLICY),'2026-10-01T00:00:00Z');expect(transition(incident,'acknowledged','officer','accepted','2026-10-01T00:01:00Z').history).toHaveLength(2);});
});
