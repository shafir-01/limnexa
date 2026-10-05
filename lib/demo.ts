import { DEMO_POLICY,evaluatePolicy,makeIncident,type Observation } from './domain';
export const demoObservations:Observation[]=[
  {id:'obs-a',site:'Synthetic Reach A',observedAt:'2026-09-30T09:00:00.000Z',createdAt:'2026-09-30T09:02:00.000Z',description:'Synthetic report of unusual odor and discoloration near an outfall.',category:'wastewater-indicator',sourceId:'demo-contributor-a',synthetic:true,contentHash:'demo-sha256-a'},
  {id:'obs-b',site:'Synthetic Reach A',observedAt:'2026-09-30T09:25:00.000Z',createdAt:'2026-09-30T09:27:00.000Z',description:'Independent synthetic report of unusual odor in the same reach.',category:'wastewater-indicator',sourceId:'demo-contributor-b',synthetic:true,contentHash:'demo-sha256-b'},
  {id:'obs-c',site:'Synthetic Reach B',observedAt:'2026-09-30T10:00:00.000Z',createdAt:'2026-09-30T10:02:00.000Z',description:'Synthetic ecological observation of floating plant matter.',category:'ecological',sourceId:'demo-contributor-c',synthetic:true,contentHash:'demo-sha256-c'},
];
export const demoTrace=evaluatePolicy(demoObservations,DEMO_POLICY);
export const demoIncident=makeIncident(demoTrace,'2026-09-30T09:27:00.000Z');
