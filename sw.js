/* Dragonfarm: Reborn v0.7.2 — scoped, network-first offline support. */
const PREFIX='dragonfarm-reborn-';
const CACHE=PREFIX+'v0.7.2';
const ASSETS=['./','./index.html','./style.css','./game.js','./tutorial.js',
  './world3d.js','./manifest.webmanifest','./icon.svg','./icon-192.png',
  './icon-512.png','./art/island.svg','./art/farm.svg','./art/city.svg'];
const SCOPE=new URL(self.registration.scope);
const ALLOWED=new Set(ASSETS.map(path=>new URL(path,SCOPE).href));
self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())
));
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(names=>Promise.all(names
    .filter(name=>name.startsWith(PREFIX)&&name!==CACHE)
    .map(name=>caches.delete(name)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch', event => {
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==SCOPE.origin) return;
  const lookup=request.mode==='navigate' ? new URL('./index.html',SCOPE).href : request.url;
  if(!ALLOWED.has(lookup)) return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    try {
      const response=await fetch(request);
      if(response.ok) await cache.put(request.mode==='navigate' ? './index.html' : request, response.clone());
      return response;
    } catch(err) {
      const cached=await cache.match(request.mode==='navigate' ? './index.html' : request);
      if(cached) return cached;
      throw err;
    }
  }));
});
