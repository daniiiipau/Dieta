const CACHE='dieta-v3-blu-originale';const ASSETS=['./','./index.html','./style.css','./app.js','./manifest.webmanifest','./icon-originale.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||!ASSETS.some(p=>new URL(p,self.registration.scope).pathname===u.pathname))return;e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request)));});


