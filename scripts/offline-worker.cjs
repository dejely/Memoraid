exports.createOfflineWorker = (
  version,
  paths,
) => `const CACHE='memoraid-shell-${version}';const ASSETS=${JSON.stringify(paths)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('memoraid-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;if(event.request.mode==='navigate'){event.respondWith(caches.open(CACHE).then(c=>c.match('/index.html')).then(r=>{if(!r)return fetch(event.request);const headers=new Headers(r.headers);headers.delete('content-encoding');headers.delete('content-length');return new Response(r.body,{status:r.status,statusText:r.statusText,headers});}));return;}if(ASSETS.includes(url.pathname))event.respondWith(caches.open(CACHE).then(c=>c.match(url.pathname)).then(r=>r||fetch(event.request)));});`;
