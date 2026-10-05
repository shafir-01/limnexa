import {get} from '@vercel/blob';
import {bearer,withConnection} from '@/lib/spacetime/connect';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params;
    const media=await withConnection(bearer(request),['SELECT * FROM my_media'],conn=>conn.db.myMedia.id.find(id));
    if(!media)return Response.json({error:'AUTHORIZATION_DENIED'},{status:403});
    const blob=await get(media.pathname,{access:'private'});
    if(!blob||blob.statusCode!==200)return Response.json({error:'MEDIA_NOT_FOUND'},{status:404});
    return new Response(blob.stream,{headers:{'content-type':media.mimeType,'cache-control':'private, no-store','x-content-type-options':'nosniff','content-disposition':'inline'}});
  }catch{return Response.json({error:'AUTHENTICATION_OR_MEDIA_UNAVAILABLE'},{status:401})}
}
