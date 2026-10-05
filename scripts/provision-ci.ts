import {DbConnection} from '../lib/spacetime/bindings';
import {withConnection} from '../lib/spacetime/connect';
import {ownerToken} from './admin-auth';
import {writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
const database='limnexa-jltls-ci';
function issue(){return new Promise<{identity:import('spacetimedb').Identity;token:string}>((done,reject)=>{const timer=setTimeout(()=>reject(new Error('Identity connection timed out')),15000);DbConnection.builder().withUri('wss://maincloud.spacetimedb.com').withDatabaseName(database).onConnect((conn,identity,token)=>{clearTimeout(timer);conn.disconnect();done({identity,token})}).onConnectError(()=>{clearTimeout(timer);reject(new Error('Identity connection failed'))}).build()})}
async function main(){
  const runner=await issue(),service=await issue();
  await withConnection(ownerToken(),[],async conn=>{await conn.reducers.grantRole({identity:runner.identity,kind:'officer'});await conn.reducers.grantDemoSeeder({identity:runner.identity,reason:'CI-only synthetic scenario input seeding in the isolated test database'});await conn.reducers.grantRole({identity:service.identity,kind:'service'})},database);
  const values={SPACETIMEDB_TEST_RUNNER_TOKEN:runner.token,SPACETIMEDB_TEST_SERVICE_TOKEN:service.token};
  writeFileSync('.env.ci.local',Object.entries(values).map(([key,value])=>`${key}=${value}`).join('\n')+'\n',{mode:0o600});
  console.log('Provisioned isolated CI runner and service identities. Credentials are in ignored .env.ci.local.');
  if(process.argv.includes('--github')){
    // Reuse the credential helper already authorized for this exact repository.
    // Capture its output only in memory; never print it or persist the owner key.
    const output=execFileSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\npath=shafir-01/limnexa.git\n\n',encoding:'utf8',stdio:['pipe','pipe','pipe']});
    const credential=Object.fromEntries(output.trim().split(/\r?\n/).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)]}));
    if(!credential.password)throw new Error('GitHub credential helper is unavailable');
    const gh=process.platform==='win32'?resolve('.tools/gh/bin/gh.exe'):'gh';
    for(const [name,value] of Object.entries(values)){execFileSync(gh,['secret','set',name,'--repo','shafir-01/limnexa'],{input:value,env:{...process.env,GH_TOKEN:credential.password},stdio:['pipe','pipe','pipe']});console.log(`Configured repository Actions secret ${name}`);}
  }
}
main().catch(()=>{console.error('CI provisioning failed. No credentials were printed.');process.exitCode=1});
