import {get} from '@vercel/blob';
import {createHash} from 'node:crypto';
import {Identity} from 'spacetimedb';
import {z} from 'zod';
import {serviceToken,withConnection} from '../spacetime/connect';
import {hasEmbeddedMetadata} from './metadata';
export const mediaMetadata=z.object({id:z.string().uuid(),siteId:z.string().min(3).max(120),contentHash:z.string().regex(/^[a-f0-9]{64}$/),mimeType:z.enum(['image/jpeg','image/png','image/webp'])}).strict();
export async function verifyAndRegister(pathname:string,owner:string,untrusted:unknown){
  const metadata=mediaMetadata.parse(untrusted);
  if(!pathname.startsWith(`evidence/${owner}/${metadata.id}`)||pathname.includes('..'))throw new Error('AUTHORIZATION_DENIED');
  const result=await get(pathname,{access:'private'});
  if(!result||result.statusCode!==200||result.blob.size>10*1024*1024||result.blob.contentType!==metadata.mimeType)throw new Error('MEDIA_VALIDATION_FAILED');
  const bytes=await new Response(result.stream).arrayBuffer();
  const actual=createHash('sha256').update(new Uint8Array(bytes)).digest('hex');
  if(actual!==metadata.contentHash)throw new Error('MEDIA_HASH_MISMATCH');
  // MIME metadata alone is untrusted. Check the supported binary signatures.
  const b=new Uint8Array(bytes);
  const signature=metadata.mimeType==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:metadata.mimeType==='image/png'?b.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':new TextDecoder().decode(b.slice(0,4))==='RIFF'&&new TextDecoder().decode(b.slice(8,12))==='WEBP';
  if(!signature)throw new Error('MEDIA_TYPE_MISMATCH');
  if(hasEmbeddedMetadata(b,metadata.mimeType))throw new Error('MEDIA_METADATA_MUST_BE_REMOVED');
  await withConnection(serviceToken(),[],conn=>conn.reducers.registerMedia({...metadata,ownerIdentity:Identity.fromString(owner),pathname}));
  return {id:metadata.id,contentHash:actual};
}
