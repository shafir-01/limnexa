import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const environment=process.argv[2];
if(!['preview','production'].includes(environment||''))throw new Error('Usage: tsx scripts/sync-runtime.ts preview|production');
const values=Object.fromEntries(readFileSync(`.env.service.${environment}.local`,'utf8').trim().split(/\r?\n/).map(line=>{const index=line.indexOf('=');return [line.slice(0,index),line.slice(index+1)]}));
Object.assign(values,{NEXT_PUBLIC_SPACETIMEDB_DATABASE:values.SPACETIMEDB_DATABASE,SPACETIMEDB_SERVER:'wss://maincloud.spacetimedb.com',NEXT_PUBLIC_SPACETIMEDB_SERVER:'wss://maincloud.spacetimedb.com'});
for(const [name,value] of Object.entries(values)){
  const secret=['SPACETIMEDB_SERVICE_TOKEN','CRON_SECRET'].includes(name);
  try{
    execFileSync(process.execPath,[resolve('node_modules/vercel/dist/vc.js'),'env','add',name,environment!,secret?'--sensitive':'--no-sensitive','--force','--yes','--scope','shafir-2f05a117'],{input:value,stdio:['pipe','pipe','pipe']});
    console.log(`Configured ${name} for ${environment}`);
  }catch{console.error(`Failed to configure ${name}; provider output withheld to protect runtime secrets.`);process.exit(1)}
}
