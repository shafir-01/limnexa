import {writeFileSync} from 'node:fs';
import {DbConnection} from '../lib/spacetime/bindings';
import {withConnection} from '../lib/spacetime/connect';
import {ownerToken} from './admin-auth';
async function main(){for(const environment of ['preview','ci']){
  const database=`limnexa-jltls-${environment}`;
  const user=await new Promise<{token:string;identity:import('spacetimedb').Identity}>((done,reject)=>{const timer=setTimeout(()=>reject(new Error('Connection timeout')),15000);DbConnection.builder().withUri('wss://maincloud.spacetimedb.com').withDatabaseName(database).onConnect((conn,identity,token)=>{clearTimeout(timer);conn.disconnect();done({token,identity})}).onConnectError(()=>reject(new Error('Connection failed'))).build()});
  await withConnection(ownerToken(),[],conn=>conn.reducers.grantRole({identity:user.identity,kind:'health'}),database);
  writeFileSync(`.env.health.${environment}.local`,`SPACETIMEDB_TEST_HEALTH_TOKEN=${user.token}\n`,{mode:0o600});console.log(`Provisioned scoped ${environment} surveillance test identity; credential remains in an ignored file.`);
}}
main().catch(()=>{console.error('Health test provisioning failed; no credentials printed.');process.exitCode=1});
