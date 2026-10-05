import { DbConnection } from './bindings';

export async function withConnection<T>(token:string|undefined,queries:string[],work:(connection:DbConnection)=>Promise<T>|T,database=process.env.SPACETIMEDB_DATABASE||process.env.NEXT_PUBLIC_SPACETIMEDB_DATABASE||'limnexa-jltls'):Promise<T>{
  const connection=await new Promise<DbConnection>((resolve,reject)=>{
    const timer=setTimeout(()=>{active?.disconnect();reject(new Error('SPACETIMEDB_TIMEOUT'))},15000);
    const active=DbConnection.builder()
      .withUri(process.env.SPACETIMEDB_SERVER||'wss://maincloud.spacetimedb.com')
      .withDatabaseName(database).withToken(token)
      .onConnect(conn=>{
        conn.subscriptionBuilder().onApplied(()=>{clearTimeout(timer);resolve(conn)}).onError(()=>{clearTimeout(timer);conn.disconnect();reject(new Error('SUBSCRIPTION_DENIED'))}).subscribe(queries);
      }).onConnectError(()=>{clearTimeout(timer);reject(new Error('AUTHENTICATION_OR_CONNECTION_FAILED'))}).build();
  });
  try{return await work(connection)}finally{connection.disconnect()}
}

export function bearer(request:Request):string{
  const value=request.headers.get('authorization');
  if(!value?.startsWith('Bearer ')||value.length>10000)throw new Error('AUTHENTICATION_REQUIRED');
  return value.slice(7);
}
export async function authenticatedIdentity(token:string):Promise<{identity:string;role:string}>{
  return withConnection(token,['SELECT * FROM my_role'],conn=>{if(!conn.identity)throw new Error('AUTHENTICATION_REQUIRED');return {identity:conn.identity.toHexString(),role:[...conn.db.myRole.iter()][0]?.kind||'citizen'}});
}
export function serviceToken():string{const token=process.env.SPACETIMEDB_SERVICE_TOKEN;if(!token)throw new Error('SERVICE_NOT_CONFIGURED');return token}
