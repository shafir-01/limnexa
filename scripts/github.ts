import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
// Use the existing Git credential helper in memory; never print its response.
const output=execFileSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\npath=shafir-01/limnexa.git\n\n',encoding:'utf8',stdio:['pipe','pipe','pipe']});
const credential=Object.fromEntries(output.trim().split(/\r?\n/).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)]}));
if(!credential.password)throw new Error('GitHub credential helper unavailable');
const executable=process.platform==='win32'?resolve('.tools/gh/bin/gh.exe'):'gh';
try{const result=execFileSync(executable,process.argv.slice(2),{env:{...process.env,GH_TOKEN:credential.password},encoding:'utf8',stdio:['ignore','pipe','pipe']});process.stdout.write(result)}catch{console.error('GitHub command failed; credentials were not printed.');process.exitCode=1}
