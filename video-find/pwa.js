/* FrameFind user-initiated Android share-to-app support.
   A shared video URL is transferred by a service worker POST, then placed in
   a URL fragment (not sent to hosting logs) and removed as soon as the page reads it.
   Never auto-play, scrape, download or analyze third-party content. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const status=$('install-status'),button=$('install-app');
let installEvent=null;
function show(text){status.textContent=text;}
function validateVideoUrl(raw){
 try{
  const url=new URL(String(raw||''));
  if(url.protocol!=='https:'||url.username||url.password||url.href.length>2048)return null;
  return url.href;
 }catch(e){return null;}
}
function receiveShared(){
 if(!location.hash.startsWith('#shared='))return;
 const val=location.hash.slice('#shared='.length);
 // Do not retain potentially sensitive source video URLs in the address bar history.
 try{history.replaceState(history.state,'',location.pathname+location.search);}catch(e){}
 let shared='';
 try{shared=decodeURIComponent(val);}catch(e){}
 const url=validateVideoUrl(shared);
 const banner=$('share-intake');
 banner.hidden=false;
 if(url){
  $('video-url').value=url;
  banner.textContent='Video link received from your device share menu. Press “Open source” to confirm the link. No video has been downloaded.';
  $('video-url').focus({preventScroll:true});
  $('video-url').scrollIntoView({block:'center',behavior:'instant'});
 }else{
  banner.textContent='This share did not include a valid public HTTPS video URL. Paste a link or upload a screenshot to continue.';
 }
}
receiveShared();
const shortcut=$('framefind-bookmarklet');
if(shortcut){
 // Runs only when the shopper clicks their own bookmark on an HTTPS video page.
 // The original URL is passed in the fragment, not as a network query or scraped frame.
 shortcut.href="javascript:(function(){var u=location.href;if(u.slice(0,6)!=='https:')return;location.assign('https://yl124915300-dot.github.io/video-find/#shared='+encodeURIComponent(u));})()";
 shortcut.title='Drag to your bookmarks bar, then click while watching a public video';
}
if('serviceWorker' in navigator){
 navigator.serviceWorker.register('/video-find/sw.js',{scope:'/video-find/'})
  .then(()=>{if(!window.matchMedia('(display-mode: standalone)').matches)
    show('Share-to-FrameFind is supported on some installed Android browsers. Use your browser’s Install app menu when available. Not supported in every device.');})
  .catch(()=>show('App installation could not be registered. Normal video links and screenshots still work.'));
}else show('This browser cannot install FrameFind as a share target. Use Copy link and paste into the finder.');
window.addEventListener('beforeinstallprompt',event=>{
 event.preventDefault();
 installEvent=event;
 button.hidden=false;
 show('Install FrameFind to send supported video links here from your device Share menu.');
});
button.addEventListener('click',async()=>{
 if(!installEvent)return;
 const e=installEvent;installEvent=null;button.hidden=true;
 try{
  await e.prompt();
  const choice=await e.userChoice;
  show(choice?.outcome==='accepted'?'Install accepted by browser. Once added, use the video Share menu to open FrameFind.':'Install dismissed. Use the finder in your browser at any time.');
 }catch(err){show('Install not available on this browser. Normal link input still works.');}
});
window.addEventListener('appinstalled',()=>{button.hidden=true;show('FrameFind installed. Sharing from another video app is supported where the system provides a Share target.');});
window.FrameFindShareQA=Object.freeze({
 version:'20261026-v1',
 receiveShared,
 validateVideoUrl
});
})();