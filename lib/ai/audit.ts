import {Identity} from 'spacetimedb';
import {contentHash} from '../domain/core';
import {serviceToken,withConnection} from '../spacetime/connect';
export async function reserve(identity:string,purpose:string,model:string,input:unknown){
  const id=crypto.randomUUID();
  await withConnection(serviceToken(),[],conn=>conn.reducers.reserveAssistance({id,ownerIdentity:Identity.fromString(identity),purpose,model,inputHash:contentHash(input)}));
  return id;
}
export async function finish(id:string,status:'completed'|'unavailable',payload:unknown){await withConnection(serviceToken(),[],conn=>conn.reducers.completeAssistance({id,status,payload:JSON.stringify(payload)}));}
