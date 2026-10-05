const CACHE='limnexa-shell-v1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/report','/icon.svg'])));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/.well-known/'))return;
  if(url.pathname.startsWith('/_next/static/')){event.respondWith(caches.open(CACHE).then(async cache=>{const prior=await cache.match(request);if(prior)return prior;const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response}));return;}
  if(request.mode==='navigate'&&url.pathname==='/report')event.respondWith(fetch(request).then(async response=>{if(response.ok)(await caches.open(CACHE)).put('/report',response.clone());return response}).catch(()=>caches.match('/report')));
});
