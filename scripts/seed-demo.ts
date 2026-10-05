import {withConnection} from '../lib/spacetime/connect';
import {ownerToken} from './admin-auth';
const database=process.argv[2],runId=process.argv[3]||`demo-${Date.now()}`;
if(!database)throw new Error('Usage: tsx scripts/seed-demo.ts DATABASE [RUN_ID]');
withConnection(ownerToken(),[],async conn=>{await conn.reducers.seedScenario({runId});await conn.reducers.refreshMonitoring({})},database).then(()=>console.log(`Seeded synthetic inputs via production reducers: ${runId} in ${database}. Previous evidence was preserved.`)).catch(()=>{console.error('Demo seeding failed. Credentials were not printed.');process.exitCode=1});
