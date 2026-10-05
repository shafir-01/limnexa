import {writeFileSync} from 'node:fs';
import {DbConnection} from '../lib/spacetime/bindings';
import {withConnection} from '../lib/spacetime/connect';
import {ownerToken} from './admin-auth';
async function main(){
  const database='limnexa-jltls-preview';
  const runner=await new Promise<{token:string;identity:import('spacetimedb').Identity}>((done,reject)=>{const timer=setTimeout(()=>reject(new Error('Connection timeout')),15000);DbConnection.builder().withUri('wss://maincloud.spacetimedb.com').withDatabaseName(database).onConnect((conn,identity,token)=>{clearTimeout(timer);conn.disconnect();done({token,identity})}).onConnectError(()=>reject(new Error('Connection failed'))).build()});
  await withConnection(ownerToken(),[],async conn=>{await conn.reducers.grantRole({identity:runner.identity,kind:'officer'});await conn.reducers.grantDemoSeeder({identity:runner.identity,reason:'Local preview browser verification of synthetic lifecycle inputs'})},database);
  writeFileSync('.env.e2e.preview.local',`SPACETIMEDB_TEST_RUNNER_TOKEN=${runner.token}\n`,{mode:0o600});console.log('Preview test identity provisioned; credential stored only in ignored .env.e2e.preview.local.');
}
main().catch(()=>{console.error('Preview provisioning failed; no credentials printed.');process.exitCode=1});
