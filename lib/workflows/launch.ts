import {start} from 'workflow/api';
import {serviceToken,withConnection} from '../spacetime/connect';
import {dispatchOutbox} from './outbox';
export async function launchPending(siteId?:string){
  return withConnection(serviceToken(),['SELECT * FROM service_outbox','SELECT * FROM service_dispatch_launches','SELECT * FROM service_incidents'],async conn=>{
    const messages=[...conn.db.serviceOutbox.iter()].filter(m=>{
      const prior=conn.db.serviceDispatchLaunches.outboxId.find(m.id);
      return (!siteId||m.aggregateId===siteId||conn.db.serviceIncidents.id.find(m.aggregateId)?.site===siteId)&&['pending','retry','processing'].includes(m.status)&&(!prior||Date.now()-Number(prior.at.microsSinceUnixEpoch/1000n)>=900000);
    }).slice(0,20);
    const runs=[];
    for(const message of messages){
      const launchId=crypto.randomUUID();
      try{await conn.reducers.reserveDispatch({id:message.id,launchId})}catch{continue}
      const run=await start(dispatchOutbox,[message.id.toString()]);
      await conn.reducers.recordDispatchRun({id:message.id,launchId,runId:run.runId});
      runs.push({outboxId:message.id.toString(),runId:run.runId});
    }
    return runs;
  });
}
