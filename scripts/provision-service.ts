import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {DbConnection} from '../lib/spacetime/bindings';
import type {Identity} from 'spacetimedb';

const database=process.argv[2];
const environment=process.argv[3];
if(!database||!['preview','production'].includes(environment||''))throw new Error('Usage: tsx scripts/provision-service.ts DATABASE preview|production');
function connect(token?:string){return new Promise<{conn:DbConnection;token:string;identity:Identity}>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Connection timed out')),15000);DbConnection.builder().withUri('wss://maincloud.spacetimedb.com').withDatabaseName(database).withToken(token).onConnect((conn,identity,issuedToken)=>{clearTimeout(timer);resolve({conn,token:issuedToken,identity})}).onConnectError(()=>{clearTimeout(timer);reject(new Error('Connection failed'))}).build()})}
async function main(){
  const executable=path.join(process.env.LOCALAPPDATA||'', 'SpacetimeDB','spacetime.exe');
  // Capture the owner credential in memory only. Never log or persist it.
  const authOutput=execFileSync(executable,['login','show','--token'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  const ownerToken=authOutput.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0];
  if(!ownerToken)throw new Error('SpacetimeDB CLI owner authentication is unavailable');
  const service=await connect();
  const owner=await connect(ownerToken);
  try{
    await owner.conn.reducers.grantRole({identity:service.identity,kind:'service'});
    const filename=`.env.service.${environment}.local`;
    writeFileSync(filename,`SPACETIMEDB_SERVICE_TOKEN=${service.token}\nSPACETIMEDB_DATABASE=${database}\nCRON_SECRET=${randomBytes(32).toString('hex')}\n`,{mode:0o600});
    console.log(`Provisioned restricted service identity ${service.identity.toHexString()} for ${database}. Credentials stored in ignored ${filename}.`);
  }finally{service.conn.disconnect();owner.conn.disconnect()}
}
main().catch(()=>{console.error('Service provisioning failed. No credentials were printed.');process.exitCode=1});
