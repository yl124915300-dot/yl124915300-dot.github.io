const CACHE="gamepilot-capture-review-20261016-1";
const SHELL=["./","./index.html","./style.css","./app.mjs","./core.mjs","./manifest.webmanifest","./icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("gamepilot-capture-review-")&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET"||u.origin!==location.origin||!u.pathname.startsWith(new URL("./",location.href).pathname))return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r;}).catch(()=>caches.match(e.request)));
});
