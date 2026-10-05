import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
import {FHIR_TARGET} from '../lib/fhir/target';
async function main(){
  mkdirSync('.tools/fhir',{recursive:true});
  const snapshot=JSON.parse(readFileSync('standards/oah/snapshot.json','utf8')) as {artifacts:Record<string,string>};
  for(const [file,digest] of Object.entries(snapshot.artifacts))if(createHash('sha256').update(readFileSync(join('standards/oah',file))).digest('hex')!==digest)throw new Error(`Pinned OAH artifact changed: ${file}`);
  const jar=resolve('.tools/fhir/validator_cli.jar');
  if(!existsSync(jar)){const response=await fetch(`https://github.com/hapifhir/org.hl7.fhir.core/releases/download/${FHIR_TARGET.validatorVersion}/validator_cli.jar`);if(!response.ok)throw new Error('Validator download failed');writeFileSync(jar,new Uint8Array(await response.arrayBuffer()));}
  if(createHash('sha256').update(readFileSync(jar)).digest('hex')!==FHIR_TARGET.validatorSha256)throw new Error('Validator digest mismatch');
  let java=process.env.JAVA_HOME?join(process.env.JAVA_HOME,'bin',process.platform==='win32'?'java.exe':'java'):'java';
  if(existsSync('.tools/fhir/java')){const dir=readdirSync('.tools/fhir/java',{withFileTypes:true}).find(entry=>entry.isDirectory());if(dir)java=resolve('.tools/fhir/java',dir.name,'bin',process.platform==='win32'?'java.exe':'java');}
  const results:Record<string,unknown>={target:FHIR_TARGET,validatedAt:new Date().toISOString(),terminologyServer:'https://tx.fhir.org/r4'};
  for(const fixture of ['valid','invalid']){
    const output=resolve(`.tools/fhir/${fixture}-result.json`),logs:string[]=[];
    await new Promise<void>((done,reject)=>{const child=spawn(java,['-jar',jar,`tests/fixtures/fhir/${fixture}.json`,'-version','4.0.1','-ig','standards/oah','-ig','standards/limnexa','-ig','hl7.fhir.uv.xver-r5.r4#0.1.0','-tx','https://tx.fhir.org/r4','-output',output]);child.stdout.on('data',data=>logs.push(String(data)));child.stderr.on('data',data=>logs.push(String(data)));child.on('error',reject);child.on('close',()=>{writeFileSync(`.tools/fhir/${fixture}-validator.log`,logs.join(''));if(!existsSync(output))reject(new Error('Validator did not produce an OperationOutcome'));else done()});});
    const outcome=JSON.parse(readFileSync(output,'utf8')) as {issue:{severity:string}[]};
    const errors=outcome.issue.filter(i=>['error','fatal'].includes(i.severity)).length,warnings=outcome.issue.filter(i=>i.severity==='warning').length;
    if(fixture==='valid'&&errors||fixture==='invalid'&&!errors)throw new Error(`FHIR ${fixture} gate failed`);
    results[fixture]={errors,warnings,sha256:createHash('sha256').update(readFileSync(`tests/fixtures/fhir/${fixture}.json`)).digest('hex')};
    console.log(`Official FHIR validator: ${fixture} fixture ${errors} errors, ${warnings} warnings (${fixture==='valid'?'accepted':'rejected as required'}).`);
  }
  mkdirSync('docs/validation',{recursive:true});writeFileSync('docs/validation/fhir-result.json',JSON.stringify(results,null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
