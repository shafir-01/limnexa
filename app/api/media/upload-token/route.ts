import {handleUpload,type HandleUploadBody} from '@vercel/blob/client';
import {authenticatedIdentity,bearer,withConnection} from '@/lib/spacetime/connect';
import {mediaMetadata,verifyAndRegister} from '@/lib/blob/media';
export async function POST(request:Request){
  const traceId=crypto.randomUUID();
  try{
    const body=await request.json() as HandleUploadBody;
    const result=await handleUpload({request,body,onBeforeGenerateToken:async(pathname,clientPayload)=>{
      const identity=await authenticatedIdentity(bearer(request));
      const metadata=mediaMetadata.parse(JSON.parse(clientPayload||'null'));
      if(pathname!==`evidence/${identity.identity}/${metadata.id}`)throw new Error('AUTHORIZATION_DENIED');
      const site=await withConnection(bearer(request),['SELECT * FROM monitoring_sites'],conn=>conn.db.monitoringSites.id.find(metadata.siteId));
      if(!site)throw new Error('SITE_RESOLUTION_REQUIRED');
      return {allowedContentTypes:[metadata.mimeType],maximumSizeInBytes:10*1024*1024,validUntil:Date.now()+5*60000,addRandomSuffix:false,allowOverwrite:false,tokenPayload:JSON.stringify({owner:identity.identity,metadata})};
    },onUploadCompleted:async({blob,tokenPayload})=>{const receipt=JSON.parse(tokenPayload||'null');await verifyAndRegister(blob.pathname,receipt.owner,receipt.metadata)}});
    return Response.json(result,{headers:{'cache-control':'no-store'}});
  }catch{return Response.json({error:'MEDIA_UPLOAD_FAILED',traceId},{status:400})}
}
