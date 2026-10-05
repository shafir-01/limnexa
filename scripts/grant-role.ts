import {Identity} from 'spacetimedb';
import {withConnection} from '../lib/spacetime/connect';
import {ownerToken} from './admin-auth';
const [database,identity,kind]=process.argv.slice(2);
if(!database||!identity||!['officer','scientist'].includes(kind||''))throw new Error('Usage: tsx scripts/grant-role.ts DATABASE IDENTITY officer|scientist');
withConnection(ownerToken(),[],conn=>conn.reducers.grantRole({identity:Identity.fromString(identity),kind:kind!}),database).then(()=>console.log(`Granted ${kind} to the specified device identity in ${database}.`)).catch(()=>{console.error('Role grant failed; credentials were not printed.');process.exitCode=1});
