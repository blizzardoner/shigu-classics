const CACHE='shigu-20261116130449133';
const SHELL=["./","./app.js","./content/g8a1.js","./content/g8a2.js","./content/g8a3.js","./content/g8a4.js","./content/g8b1.js","./content/g8b2.js","./content/g8b3.js","./content/g8b4.js","./content/g9a1.js","./content/g9a2.js","./content/g9b1.js","./content/g9b2.js","./content/g9b3.js","./content/g9b4.js","./content/grade8a.js","./content/grade8b.js","./content/grade9.js","./domain.js","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./icons/maskable-512.png","./index.html","./lessons.js","./manifest.webmanifest","./styles.css"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('shigu-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;}).catch(()=>caches.match(event.request).then(hit=>hit||(event.request.mode==='navigate'?caches.match('./index.html'):Response.error()))));
});
