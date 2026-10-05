const CACHE='limnexa-shell-v2';
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE),response=await fetch('/report');
    if(!response.ok)throw new Error('Report shell unavailable');
    const html=await response.clone().text();await cache.put('/report',response);
    const assets=[...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"<>]+)"/g)].map(match=>match[1]))];
    await cache.addAll(['/icon.svg',...assets]);await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('limnexa-shell-')&&key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim()})())});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/.well-known/'))return;
  if(url.pathname.startsWith('/_next/static/')){event.respondWith(caches.open(CACHE).then(async cache=>{const prior=await cache.match(request);if(prior)return prior;const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response}));return;}
  if(request.mode==='navigate'&&url.pathname==='/report')event.respondWith(fetch(request).then(async response=>{if(response.ok)(await caches.open(CACHE)).put('/report',response.clone());return response}).catch(()=>caches.match('/report')));
});
