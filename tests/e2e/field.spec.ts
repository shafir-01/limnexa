import {test,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';
test('live dashboards expose evidence and deterministic routing',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/operations');await expect(page.getByText('Live connection',{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Why this was routed'}).first()).toBeVisible();await expect(page.getByText('ecological-scientist',{exact:false}).first()).toBeVisible();await expect(page.getByRole('heading',{name:'Officer decision'})).toHaveCount(0);
  await page.getByRole('link',{name:'Evidence',exact:true}).click();await expect(page.getByRole('heading',{name:'Evidence ledger'})).toBeVisible();await page.getByText('Trust dimensions and provenance').first().click();await expect(page.getByText('provenance completeness',{exact:true}).first()).toBeVisible();expect(errors).toEqual([]);
});
test('typed draft survives reload and an AI outage without fabricated values',async({page})=>{
  await page.goto('/report');await expect(page.getByLabel('Monitoring site')).toBeVisible();await expect(page.getByLabel('Monitoring site').locator('option')).not.toHaveCount(1);
  await page.getByLabel('Monitoring site').selectOption({index:1});const description=`Synthetic offline persistence check ${Date.now()} with directly visible foam.`;
  await page.getByLabel('Describe what you directly observed').fill(description);await page.waitForTimeout(300);await page.reload();await expect(page.getByLabel('Describe what you directly observed')).toHaveValue(description);
  await page.route('**/api/ai/extract',route=>route.fulfill({status:503,json:{error:'AI_UNAVAILABLE'}}));await page.getByRole('button',{name:'Propose fields with AI'}).click();await expect(page.getByText('AI assistance is unavailable. Typed reporting continues normally.')).toBeVisible();await expect(page.getByLabel('Describe what you directly observed')).toHaveValue(description);
  await page.getByRole('button',{name:'Submit confirmed observation'}).click();await expect(page.getByText('Evidence submitted. The original record and its provenance are preserved.')).toBeVisible();await expect(page.getByText(description,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Append correction'}).last().click();await page.getByLabel('Correction reason').fill('Synthetic browser correction of the wording.');await page.getByLabel('Describe what you directly observed').fill(`${description} Corrected.`);await page.getByRole('button',{name:'Submit confirmed observation'}).click();await expect(page.getByText(`${description} Corrected.`,{exact:true})).toBeVisible();await expect(page.getByText(description,{exact:true})).toBeVisible();
});
test('unconfirmed AI proposal cannot silently overwrite the source report',async({page})=>{
  await page.goto('/report');await expect(page.getByLabel('Monitoring site')).toBeVisible();const source='Synthetic direct report: visible foam in the fictional reach.';await page.getByLabel('Describe what you directly observed').fill(source);
  await page.route('**/api/ai/extract',route=>route.fulfill({status:200,json:{proposal:{description:source,category:'wastewater-indicator',confirmed:false}}}));await page.getByRole('button',{name:'Propose fields with AI'}).click();await expect(page.getByText('AI proposal · unconfirmed')).toBeVisible();await expect(page.getByLabel('Observation category')).toHaveValue('other');await page.getByRole('button',{name:'Confirm these fields'}).click();await expect(page.getByLabel('Observation category')).toHaveValue('wastewater-indicator');
});
test('FHIR inspector downloads a source-linked synthetic bundle',async({page})=>{
  await page.goto('/interoperability');await expect(page.getByLabel('Synthetic incident').locator('option')).not.toHaveCount(0);await page.getByRole('button',{name:'Generate evidence Bundle'}).click();await expect(page.getByText('Export contract and reference checks passed.')).toBeVisible();const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download FHIR R4 Bundle'}).click();const download=await downloadPromise;const file=await download.path();expect(file).toBeTruthy();const bundle=JSON.parse(readFileSync(file!,'utf8'));expect(bundle.resourceType).toBe('Bundle');expect(bundle.entry.some((e:{resource:{resourceType:string}})=>e.resource.resourceType==='Provenance')).toBe(true);expect(JSON.stringify(bundle)).not.toContain('DetectedIssue');
});
test('private upload is verified before it is attached to a field draft',async({page})=>{
  test.skip(process.env.TEST_LIVE_MEDIA!=='true','Live private Blob verification runs explicitly with configured storage.');
  await page.goto('/report');await expect(page.getByLabel('Monitoring site').locator('option')).not.toHaveCount(1);await page.getByLabel('Monitoring site').selectOption({index:1});
  await page.getByLabel('Supporting image (private)').setInputFiles({name:'synthetic-pixel.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=','base64')});
  await expect(page.getByText('Private media verified by SHA-256 and attached to this draft.')).toBeVisible({timeout:45000});await expect(page.getByText('1 verified private media artifact(s) attached.')).toBeVisible();
});
test('core rejects unauthenticated HTTP assistance requests',async({request})=>{
  const response=await request.post('/api/voice/session-token');expect(response.status()).toBe(401);expect(await response.json()).toMatchObject({error:'AUTHENTICATION_REQUIRED'});
});
test('report fits a mobile viewport with an accessible main target',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/report');await expect(page.locator('#main')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await expect(page.getByRole('button',{name:'Submit confirmed observation'})).toBeVisible();
});
test('test evidence credentials remain outside the page and public exports',async({page})=>{
  if(!existsSync('.tools/tests/citizen.json'))return;
  const credential=JSON.parse(readFileSync('.tools/tests/citizen.json','utf8')) as {token:string};await page.goto('/interoperability');expect(await page.content()).not.toContain(credential.token);
});
