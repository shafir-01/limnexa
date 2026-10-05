import {readFileSync,writeFileSync} from 'node:fs';
const service=readFileSync('.env.service.preview.local','utf8');
const existing=readFileSync('.env.local','utf8').split(/\r?\n/).filter(line=>!line.startsWith('SPACETIMEDB_')&&!line.startsWith('NEXT_PUBLIC_SPACETIMEDB_')&&!line.startsWith('CRON_SECRET='));
writeFileSync('.env.local',`${existing.join('\n')}\n${service}\nNEXT_PUBLIC_SPACETIMEDB_DATABASE=limnexa-jltls-preview\nNEXT_PUBLIC_SPACETIMEDB_SERVER=wss://maincloud.spacetimedb.com\n`,{mode:0o600});
console.log('Local runtime now uses the isolated preview database. Secret values were not printed.');
