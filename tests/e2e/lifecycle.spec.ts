import {test,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';
import {withConnection} from '../../lib/spacetime/connect';
test.beforeEach(async({page})=>{await page.route('**/api/workflows/outbox/trigger',route=>route.fulfill({status:200,json:{runs:[]}}))});
const database=process.env.TEST_SPACETIMEDB_DATABASE||'limnexa-jltls-preview';
const file=database==='limnexa-jltls-ci'?'.env.ci.local':'.env.e2e.preview.local';
const runner=process.env.SPACETIMEDB_TEST_RUNNER_TOKEN||(existsSync(file)?readFileSync(file,'utf8').split(/\r?\n/).find(l=>l.startsWith('SPACETIMEDB_TEST_RUNNER_TOKEN='))?.split('=').slice(1).join('='):undefined);
test('officer UI records findings, intervention, verified follow-up and closure',async({browser,context})=>{
  test.skip(!runner,'A narrowly scoped officer test identity is required.');
  const runId=`ui-${Date.now()}`,siteId=`DEMO-SITE-001-${runId}`;
  await withConnection(runner,[],conn=>conn.reducers.seedScenario({runId}),database);
  const storageState=await context.storageState();const officer=await browser.newContext({storageState});await officer.addInitScript(token=>localStorage.setItem('limnexa-spacetime-token',token),runner!);
  const page=await officer.newPage();await page.goto('/operations');
  // This browser test verifies domain/UI behavior; durable hosted dispatch has
  // its own release probe and is not repeatedly charged by each transition.
  await page.route('**/api/workflows/outbox/trigger',route=>route.fulfill({status:200,json:{runs:[]}}));
  const incident=page.locator('article.two').filter({has:page.getByRole('heading',{name:siteId,exact:true})});
  await expect(incident.getByRole('heading',{name:'Officer decision'})).toBeVisible();
  async function move(state:string){await incident.getByLabel('Reason for the decision').fill(`Synthetic UI review for ${state}`);await incident.getByRole('button',{name:state.replaceAll('_',' '),exact:true}).click();await expect(incident.getByText(`Recorded ${state}.`,{exact:true})).toBeVisible()}
  await move('ACKNOWLEDGED');await move('INVESTIGATING');
  await incident.getByLabel('Investigation finding supported by the linked evidence').fill('Synthetic officer finding supported by the original evidence packet.');await move('CONFIRMED');await move('ACTION_REQUIRED');
  await incident.getByLabel('Intervention actually performed').fill('Synthetic intervention; no real environmental action claimed.');await move('ACTIONED');await move('FOLLOW_UP');
  const citizen=await browser.newContext({storageState,geolocation:{latitude:59.3293,longitude:18.0686,accuracy:12},permissions:['geolocation']});const capture=await citizen.newPage();await capture.route('**/api/workflows/outbox/trigger',route=>route.fulfill({status:200,json:{runs:[]}}));
  const id=await withConnection(runner,['SELECT * FROM operations_incidents'],conn=>[...conn.db.operationsIncidents.iter()].find(i=>i.site===siteId)?.id,database);expect(id).toBeTruthy();
  await capture.goto(`/report?site=${siteId}&mission=mission-${id}`);await expect(capture.getByLabel('Monitoring site')).toHaveValue(siteId);await capture.getByRole('button',{name:'Capture GPS position and accuracy'}).click();await expect(capture.getByText(/GPS captured with 12 m/)).toBeVisible();
  const description=`Synthetic post-action UI follow-up ${runId}.`;await capture.getByLabel('Describe what you directly observed').fill(description);await capture.getByRole('button',{name:'Submit confirmed observation'}).click();await expect(capture.getByText(description,{exact:true})).toBeVisible();
  await page.goto('/science');const evidence=page.locator('article.card').filter({has:page.getByText(description,{exact:true})});await evidence.getByLabel('Professional review rationale').fill('Synthetic expert review verifies the independent post-action record.');await evidence.getByRole('button',{name:'Accept evidence',exact:true}).click();await expect(evidence.getByText('Expert review recorded: accepted')).toBeVisible();
  await page.goto('/operations');await move('CLOSED');await expect(incident.getByText('CLOSED',{exact:true})).toBeVisible();await officer.close();await citizen.close();
});
test('installed report shell queues offline and reconnects exactly once',async({page,context})=>{
  test.skip(process.env.TEST_PWA!=='true'&&!process.env.CI,'Requires the production build so the service worker is enabled.');
  await page.goto('/report');await expect(page.getByLabel('Monitoring site').locator('option')).not.toHaveCount(1);await page.getByLabel('Monitoring site').selectOption({index:1});
  await page.evaluate(async()=>{await navigator.serviceWorker.ready});await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  const description=`Synthetic queued offline record ${Date.now()}`;await page.getByLabel('Describe what you directly observed').fill(description);await page.waitForTimeout(300);
  await context.setOffline(true);await page.reload();await expect(page.getByLabel('Describe what you directly observed')).toHaveValue(description);await page.getByRole('button',{name:'Submit confirmed observation'}).click();await expect(page.getByText('Offline: your observation is queued on this device and will sync once connected.')).toBeVisible();
  await page.reload();await expect(page.getByRole('button',{name:'Queued for synchronization'})).toBeVisible();await context.setOffline(false);await expect(page.getByText('Evidence submitted. The original record and its provenance are preserved.')).toBeVisible({timeout:45000});await expect(page.getByText(description,{exact:true})).toHaveCount(1);await page.reload();await expect(page.getByText(description,{exact:true})).toHaveCount(1);
});
