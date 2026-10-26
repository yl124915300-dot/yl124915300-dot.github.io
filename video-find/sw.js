/* FrameFind on-device PWA share target.
 * Only handles an explicitly user-shared URL and same-origin app shell.
 * It never fetches, downloads, or stores third-party video/images.
 */
'use strict';
const CACHE='framefind-shell-20261026-v3';
const SHELL=[
 '/video-find/',
 '/video-find/style.css',
 '/video-find/app.js',
 '/video-find/ocr.js',
 '/video-find/manifest.webmanifest',
 '/video-find/pwa.js',
 '/video-find/demo-frame.svg',
 '/video-find/icon.svg'
];
function extractVideoUrl(parts){
 for(const raw of parts){
  const s=String(raw||'').trim().slice(0,4096);
  const candidates=[s,...(s.match(/https:\/\/[^\s<>"']+/g)||[])];
  for(let value of candidates){
   value=value.replace(/[),.;]+$/g,'');
   if(value.length>2048)continue;
   try{
    const u=new URL(value);
    if(u.protocol==='https:'&&!u.username&&!u.password&&u.host)return u.toString();
   }catch(e){}
  }
 }
 return '';
}
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('framefind-shell-')&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);
 if(u.origin!==self.location.origin)return;
 if(event.request.method==='POST'&&u.pathname==='/video-find/share'){
  event.respondWith((async()=>{
   try{
    const fd=await event.request.formData();
    const link=extractVideoUrl([fd.get('url'),fd.get('text'),fd.get('title')]);
    // Fragment is never transmitted to the GitHub Pages host. App removes it after reading.
    const target='/video-find/'+(link?'#shared='+encodeURIComponent(link):'#shared=invalid');
    return Response.redirect(new URL(target,self.location.origin).href,303);
   }catch(e){
    return Response.redirect(new URL('/video-find/#shared=invalid',self.location.origin).href,303);
   }
  })());
  return;
 }
 if(event.request.method!=='GET')return;
 if(u.pathname==='/video-find/'||SHELL.includes(u.pathname)){
  event.respondWith((async()=>{
   try{
    const fresh=await fetch(event.request);
    if(fresh.ok&&u.pathname.startsWith('/video-find/')){
     const copy=fresh.clone(),cache=await caches.open(CACHE);
     // Cache only static path without user-supplied query; no input video links saved.
     if(!u.search)event.waitUntil(cache.put(u.pathname,copy));
    }
    return fresh;
   }catch(e){
    const cache=await caches.open(CACHE);
    return await cache.match(u.pathname)||new Response('FrameFind offline. Connect to search merchant catalogs.',{status:503});
   }
  })());
 }
});