import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
export function ownerToken(){
  const executable=process.env.SPACETIME_CLI||(process.platform==='win32'?join(process.env.LOCALAPPDATA||'','SpacetimeDB','spacetime.exe'):'spacetime');
  const output=execFileSync(executable,['login','show','--token'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  const token=output.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0];
  if(!token)throw new Error('CLI owner login is required');return token;
}
