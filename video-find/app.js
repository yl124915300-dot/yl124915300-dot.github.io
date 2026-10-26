/* FrameFind beta: first-party client-only video-frame object recognition and commerce search.
 * No claimed rights to scrape platform videos. No invented prices, SKU identity, commissions or conversions.
 */
(function(){
'use strict';
const el=id=>document.getElementById(id);
const state={source:null,videoURL:null,videoObjectURL:null,screen:null,frame:null,selection:null,drag:null,
  detections:[],detector:null,detectorLoading:null,demo:false,lastQuery:null,sourceType:'none',selectionNonce:0};
const view=el('frame-canvas'),ctx=view.getContext('2d');
const labels={
  backpack:'backpack',handbag:'handbag',suitcase:'luggage',bottle:'water bottle',
  cup:'cup',chair:'chair',couch:'sofa','cell phone':'smartphone',laptop:'laptop',
  'dining table':'table',tie:'necktie',umbrella:'umbrella','sports ball':'sports ball',
  skateboard:'skateboard','tennis racket':'tennis racket',bicycle:'bicycle',
  book:'book',clock:'clock',vase:'vase','potted plant':'indoor plant',
  keyboard:'keyboard',mouse:'computer mouse',remote:'remote control',
  'hair drier':'hair dryer',toothbrush:'toothbrush',scissors:'scissors',
  'teddy bear':'teddy bear','wine glass':'wine glass',refrigerator:'refrigerator',
  microwave:'microwave',oven:'oven',toaster:'toaster',sink:'sink',tv:'television'
};
const NONPRODUCT=new Set(['person','car','truck','bus','motorcycle','train','airplane','boat','traffic light',
  'stop sign','fire hydrant','parking meter','bench','bird','cat','dog','horse','sheep','cow','elephant',
  'bear','zebra','giraffe','banana','apple','sandwich','orange','broccoli','carrot','hot dog','pizza',
  'donut','cake','toilet','bed','kite','surfboard','skis','snowboard','frisbee']);
function say(id,message){el(id).textContent=message;}
function logSafe(e){return String(e&&e.message||e||'unknown').slice(0,170);}
function q(s){return String(s||'').trim().replace(/\s+/g,' ').slice(0,160);}
function parsePublicUrl(raw){
  const url=new URL(String(raw||'').trim());
  if(url.protocol!=='https:')throw Error('Only public HTTPS video URLs are accepted.');
  if(url.username||url.password)throw Error('Do not paste credentials in a video URL.');
  if(url.toString().length>2048)throw Error('Video URL is too long.');
  return url;
}
function sourceDescriptor(url){
  const host=url.hostname.toLowerCase().replace(/^www\./,'').replace(/^m\./,'');
  const direct=/\.(mp4|webm|ogg)$/i.test(url.pathname);
  if(direct)return {type:'direct',description:'Direct video file · frame extraction only if CORS allows'};
  if(host==='youtube.com'||host==='youtube-nocookie.com'||host==='youtu.be'){
    let id='';
    if(host==='youtu.be')id=url.pathname.split('/')[1]||'';
    else if(url.pathname==='/watch')id=url.searchParams.get('v')||'';
    else id=(url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)||[])[1]||'';
    if(/^[A-Za-z0-9_-]{11}$/.test(id))return {type:'youtube',id,description:'YouTube link · embed may not allow capture'};
  }
  if(/(^|\.)((instagram|tiktok|douyin|bilibili|xiaohongshu|twitter|x|vimeo|facebook)\.com)$/.test(host)||
     ['b23.tv','v.douyin.com','vt.tiktok.com','vm.tiktok.com','youtu.be'].includes(host))
    return {type:'external',description:'Platform video · open the original, then share a tab or screenshot'};
  return {type:'external',description:'External URL · capture only with your permission'};
}
function hideAllSources(){
  el('source-embed').replaceChildren();el('source-embed').hidden=true;
  const v=el('local-video');v.pause();v.removeAttribute('src');v.load();v.hidden=true;
  el('time-controls').hidden=true;
  if(state.videoObjectURL){URL.revokeObjectURL(state.videoObjectURL);state.videoObjectURL=null;}
}
function showSourceLink(url,description){
  const link=el('source-link');link.href=url;link.textContent='Open original video';
  say('source-type',description);el('source-link-wrap').hidden=false;
}
function setVideoObject(url,isRemote){
  hideAllSources();
  const v=el('local-video');v.hidden=false;v.crossOrigin='anonymous';
  v.src=url;v.load();
  v.onloadedmetadata=()=>{
    const duration=Number.isFinite(v.duration)?v.duration:0;
    el('frame-time').max=String(Math.min(duration,86400));el('frame-time').value='0';
    el('time-controls').hidden=duration<=0;
    say('source-status',isRemote?'Direct video loaded. This site may freeze frames only if the source permits cross-origin canvas access.':'Local video ready. Drag the slider to the item, then freeze that frame.');
  };
  v.onerror=()=>say('source-status','Playback failed or format unsupported. Try a screenshot or explicit live-tab share.');
}
async function loadURL(){
  try{
    const url=parsePublicUrl(el('video-url').value);
    const desc=sourceDescriptor(url);
    state.source=url.toString();state.sourceType=desc.type;
    window.FrameFindFunnel?.emit('video_submitted',{channel:'video_link'});
    showSourceLink(url.toString(),desc.description);
    hideAllSources();
    if(desc.type==='direct'){
      setVideoObject(url.toString(),true);
    }else if(desc.type==='youtube'){
      const frame=document.createElement('iframe');
      frame.title='Optional original YouTube player; frames are not directly accessible';
      frame.referrerPolicy='strict-origin-when-cross-origin';
      frame.allow='accelerometer;autoplay;encrypted-media;gyroscope;picture-in-picture';
      frame.allowFullscreen=true;
      frame.src='https://www.youtube-nocookie.com/embed/'+desc.id+'?rel=0';
      el('source-embed').append(frame);el('source-embed').hidden=false;
      say('source-status','YouTube video linked. If the player fails, click “Open original video”. To select a frame, use a screenshot or explicitly share the playing tab. The embedded player does not expose video pixels to this site.');
    }else{
      say('source-status','External platform source linked. Open original and pause on the item; use a screenshot or browser tab share. We will not scrape or bypass protections.');
    }
  }catch(err){say('source-status',logSafe(err));}
}
function fileVideo(file){
  if(!file)return;
  if(file.size>110*1024*1024){say('source-status','Choose a local clip no larger than 110 MB. It is not uploaded.');return;}
  if(!(/^video\/(mp4|webm|quicktime)$/.test(file.type))){
    say('source-status','Please choose an MP4, WebM or MOV file supported by your browser.');return;
  }
  state.sourceType='local';state.source='';el('source-link-wrap').hidden=true;
  window.FrameFindFunnel?.emit('video_submitted',{channel:'local_video'});
  hideAllSources();
  const u=URL.createObjectURL(file);
  state.videoObjectURL=u;
  const v=el('local-video');
  v.hidden=false;v.removeAttribute('crossorigin');v.src=u;v.load();
  v.onloadedmetadata=()=>{
    const dur=Number.isFinite(v.duration)?v.duration:0;
    el('frame-time').max=String(Math.min(dur,86400));el('frame-time').value='0';
    el('time-controls').hidden=dur<=0;
    say('source-status','Local file loaded. Select the time, then capture the product frame. File stays in this browser.');
  };
  v.onerror=()=>say('source-status','Your browser could not decode this local video. Use a screenshot or MP4/WebM.');
}
function formatTime(t){const x=Math.max(0,Math.floor(Number(t)||0));return Math.floor(x/60)+':'+String(x%60).padStart(2,'0');}
function adaptTime(){
  const t=Number(el('frame-time').value);
  say('time-label',formatTime(t));
  const v=el('local-video');
  if(Number.isFinite(t)&&v.readyState>=1&&Number.isFinite(v.duration))v.currentTime=Math.min(t,v.duration);
}
async function freeze(){
  const v=el('local-video');
  if(v.hidden||v.readyState<2){say('frame-help','No decodable frame ready. Wait for video, or upload a screenshot.');return;}
  try{await frameFrom(v,v.videoWidth,v.videoHeight,'video');}
  catch(err){say('frame-help','Could not read frame (possibly cross-origin protected): '+logSafe(err)+'. Upload a screenshot or share the tab instead.');}
}
async function share(){
  stopSharing();
  try{
    if(!navigator.mediaDevices?.getDisplayMedia)throw Error('This browser does not support tab sharing.');
    const stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
    state.screen=stream;
    window.FrameFindFunnel?.emit('video_submitted',{channel:'tab_share'});
    const v=el('shared-video');v.srcObject=stream;v.hidden=false;
    await v.play();
    stream.getTracks().forEach(t=>t.addEventListener('ended',stopSharing,{once:true}));
    el('capture-tab').disabled=false;el('stop-screen').disabled=false;
    say('source-status','Tab capture approved by you. Pause at the target frame, return here, then select Capture current tab frame.');
  }catch(err){say('source-status','Screen share not started: '+logSafe(err));}
}
function stopSharing(){
  const s=state.screen;state.screen=null;
  if(s)s.getTracks().forEach(t=>t.stop());
  const v=el('shared-video');v.pause();v.srcObject=null;v.hidden=true;
  el('capture-tab').disabled=true;el('stop-screen').disabled=true;
}
async function frameFrom(drawable,w,h,origin){
  if(!w||!h)throw Error('Empty image frame');
  const scale=Math.min(1,960/w,650/h),cw=Math.max(1,Math.round(w*scale)),ch=Math.max(1,Math.round(h*scale));
  const off=document.createElement('canvas');off.width=cw;off.height=ch;
  const oc=off.getContext('2d',{willReadFrequently:true});
  oc.drawImage(drawable,0,0,cw,ch);
  // This immediately rejects cross-origin tainted sources rather than falsely offering frame AI.
  oc.getImageData(0,0,1,1);
  state.frame=off;state.selection=null;state.detections=[];state.demo=origin==='demo';state.selectionNonce++;
  // A new frame must never inherit the previous item's category or brand; false matches cost trust.
  el('category').value='';el('item-description').value='';
  view.width=cw;view.height=ch;
  el('frame-placeholder').hidden=true;el('detect').disabled=false;
  say('frame-state',origin==='demo'?'Illustrated demo':origin==='video'?'Video frame selected':origin==='screen'?'User-approved tab frame':'Image selected');
  say('frame-help','Drag a rectangle around the item, then run AI detection. You can also type the brand/model or object name yourself.');
  renderFrame();renderCandidates();el('frame-canvas').focus({preventScroll:true});
}
async function captureShared(){
  const v=el('shared-video');
  if(!state.screen||v.readyState<2){say('frame-help','Share a live tab first.');return;}
  try{await frameFrom(v,v.videoWidth,v.videoHeight,'screen');stopSharing();}
  catch(err){say('frame-help','Tab frame capture failed: '+logSafe(err));}
}
async function readImageFile(file){
  if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>12*1024*1024){
    say('frame-help','Select a PNG/JPG/WebP screenshot under 12 MB.');return;
  }
  let bmp=null;
  try{bmp=await createImageBitmap(file);await frameFrom(bmp,bmp.width,bmp.height,'screenshot');
    window.FrameFindFunnel?.emit('video_submitted',{channel:'screenshot'});}
  catch(err){say('frame-help','Unable to read screenshot: '+logSafe(err));}
  finally{if(bmp)bmp.close();}
}
async function demo(){
  const img=new Image();
  img.src='./demo-frame.svg';
  try{
    await img.decode();
    await frameFrom(img,img.naturalWidth,img.naturalHeight,'demo');
    // This region and label are part of our ORIGINAL illustration, not an AI prediction.
    state.selection={x:124,y:74,width:166,height:256,label:'backpack',origin:'demo-illustration'};state.selectionNonce++;
    el('category').value='backpack';
    el('item-description').value='black unbranded daypack';
    say('recognition-status','Illustrated demo: “backpack” was pre-labelled by the author, NOT visually recognized by AI. Replace with your own frame for a genuine model result.');
    renderFrame();el('start').scrollIntoView({behavior:'auto',block:'start'});
  }catch(err){say('frame-help','Demo frame could not load: '+logSafe(err));}
}
function drawRectangle(box,selected,label){
  if(!box)return;
  ctx.save();ctx.lineWidth=Math.max(2,view.width/320)*(selected?1.5:1);
  ctx.strokeStyle=selected?'#17e1bc':'#f6d278';
  ctx.fillStyle=selected?'rgba(10,202,165,0.16)':'rgba(246,210,120,.04)';
  ctx.fillRect(box.x,box.y,box.width,box.height);ctx.strokeRect(box.x,box.y,box.width,box.height);
  if(label){ctx.font='bold '+Math.max(12,view.width/55)+'px system-ui';
    const pad=6,y=Math.max(17,box.y),width=Math.min(view.width-box.x,ctx.measureText(label).width+pad*2);
    ctx.fillStyle=selected?'#0b5b4d':'#625227';ctx.fillRect(box.x,Math.max(0,y-19),width,20);
    ctx.fillStyle='white';ctx.fillText(label,box.x+pad,Math.max(14,y-4));
  }ctx.restore();
}
function renderFrame(){
  el('download-crop').disabled=!state.frame||!state.selection;
  el('copy-crop').disabled=!state.frame||!state.selection;
  el('read-label').disabled=!state.frame||!state.selection;
  if(!state.frame)return;
  ctx.clearRect(0,0,view.width,view.height);ctx.drawImage(state.frame,0,0);
  for(const d of state.detections)drawRectangle(d.box,false,d.label+' '+Math.round(d.score*100)+'%');
  if(state.selection)drawRectangle(state.selection,true,state.selection.label||'Selected item');
  if(state.drag?.active)drawRectangle(normalized(state.drag.start,state.drag.current),true,'Your region');
}
function coords(event){
  const rect=view.getBoundingClientRect();
  const x=(event.clientX-rect.left)*view.width/rect.width;
  const y=(event.clientY-rect.top)*view.height/rect.height;
  return {x:Math.max(0,Math.min(view.width,x)),y:Math.max(0,Math.min(view.height,y))};
}
function normalized(a,b){return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(a.x-b.x),height:Math.abs(a.y-b.y)};}
function intersectRatio(a,b){
  const x=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x));
  const y=Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
  return x*y / Math.max(1,a.width*a.height+b.width*b.height-x*y);
}
function chooseDetection(d){
  state.selection={...d.box,label:d.label,score:d.score,origin:'model'};state.selectionNonce++;
  if(labels[d.label])el('category').value=labels[d.label];
  else if(!NONPRODUCT.has(d.label))el('category').value=d.label;
  else el('category').value='';
  say('recognition-status','AI found a candidate "'+d.label+'" ('+Math.round(d.score*100)+'% confidence). This is a category suggestion, NOT brand or exact product identification.');
  renderFrame();renderCandidates();
}
function renderCandidates(){
  const c=el('detect-candidates');c.replaceChildren();
  for(const d of state.detections){
    const btn=document.createElement('button');btn.type='button';
    btn.textContent=d.label+' '+Math.round(d.score*100)+'%';
    btn.className=state.selection?.origin==='model'&&state.selection?.label===d.label?'active':'';
    btn.addEventListener('click',()=>{
      chooseDetection(d);
      window.FrameFindFunnel?.emit('item_selected',{channel:state.demo?'demo':state.sourceType==='local'?'local_video':'screenshot',userChosen:true});
    });c.append(btn);
  }
}
function onPointerDown(event){
  if(!state.frame)return;
  event.preventDefault();view.setPointerCapture(event.pointerId);
  const pt=coords(event);state.drag={active:true,start:pt,current:pt};renderFrame();
}
function onPointerMove(event){
  if(!state.drag?.active)return;
  state.drag.current=coords(event);renderFrame();
}
function onPointerUp(event){
  if(!state.drag?.active)return;
  const box=normalized(state.drag.start,coords(event));state.drag=null;
  if(box.width<12||box.height<12){say('frame-help','Draw a larger rectangle around the item.');renderFrame();return;}
  state.selection={...box,label:'Selected region',origin:'manual'};state.selectionNonce++;
  window.FrameFindFunnel?.emit('item_selected',{channel:state.demo?'demo':state.sourceType==='local'?'local_video':'screenshot',userChosen:true});
  const candidates=state.detections.filter(d=>intersectRatio(box,d.box)>.27);
  if(candidates.length){candidates.sort((a,b)=>intersectRatio(box,b.box)-intersectRatio(box,a.box));chooseDetection(candidates[0]);}
  else{el('category').value='';say('recognition-status','You selected an exact region. Press AI detect objects and, if necessary, type the object category and brand/model.');}
  renderFrame();
}
function croppedItem(){
  if(!state.frame||!state.selection)throw Error('Select the product rectangle first.');
  const src=state.frame,b=state.selection;
  const x=Math.max(0,Math.floor(b.x)),y=Math.max(0,Math.floor(b.y));
  const w=Math.min(src.width-x,Math.max(1,Math.ceil(b.width)));
  const h=Math.min(src.height-y,Math.max(1,Math.ceil(b.height)));
  if(w<12||h<12)throw Error('This selection is too small. Draw a larger rectangle.');
  const crop=document.createElement('canvas');crop.width=w;crop.height=h;
  crop.getContext('2d').drawImage(src,x,y,w,h,0,0,w,h);
  return crop;
}
function pngBlob(canvas){
  return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image encoder failed')),'image/png'));
}
async function saveCrop(){
  try{
    const blob=await pngBlob(croppedItem()),href=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=href;link.download='framefind-selected-item.png';
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(href),2500);
    say('frame-help','Selected product image saved locally. For a harder exact match, you may choose to upload this crop to a visual-search service yourself.');
  }catch(err){say('frame-help','Could not save selected item image: '+logSafe(err));}
}
async function copyCrop(){
  try{
    if(!window.ClipboardItem||!navigator.clipboard?.write)throw Error('Image clipboard is unavailable in this browser. Use Save selected item image instead.');
    const blob=await pngBlob(croppedItem());
    await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
    say('frame-help','Selected object image copied. You may paste it into a separate visual-search service; this site has not sent it anywhere.');
  }catch(err){say('frame-help','Copy did not complete: '+logSafe(err));}
}
function clearSelection(){
  state.selection=null;state.drag=null;state.selectionNonce++;
  el('category').value='';renderFrame();renderCandidates();
  say('recognition-status','Selection cleared. Draw a new box or choose a detected object.');
}
async function detector(){
  if(state.detector)return state.detector;
  if(state.detectorLoading)return state.detectorLoading;
  state.detectorLoading=(async()=>{
    const base='/cat-tales/live/vision-vendor/';
    const mp=await import(base+'vision_bundle.mjs');
    const fileset=await mp.FilesetResolver.forVisionTasks(base+'wasm');
    const obj=await mp.ObjectDetector.createFromOptions(fileset,{
      baseOptions:{modelAssetPath:base+'efficientdet_lite0.tflite',delegate:'CPU'},
      scoreThreshold:.35,runningMode:'IMAGE',maxResults:12
    });
    state.detector=obj;return obj;
  })();
  try{return await state.detectorLoading;}finally{state.detectorLoading=null;}
}
async function runDetector(){
  if(!state.frame){say('recognition-status','First select a frame.');return;}
  el('detect').disabled=true;say('recognition-status','Loading existing on-device object detection model and analyzing selected frame…');
  try{
    const mdl=await detector();
    const out=mdl.detect(state.frame);
    state.detections=(out.detections||[]).map(d=>{
      const cat=d.categories?.[0]||{},b=d.boundingBox||{};
      return {label:String(cat.categoryName||'').toLowerCase(),score:Number(cat.score||0),
        box:{x:Number(b.originX||0),y:Number(b.originY||0),width:Number(b.width||0),height:Number(b.height||0)}};
    }).filter(x=>x.label&&x.score>=.35&&x.box.width>0&&x.box.height>0)
    .sort((a,b)=>b.score-a.score).slice(0,10);
    if(state.detections.length){
      let choice=state.detections[0];
      if(state.selection&&state.selection.origin==='manual'){
        const inBox=state.detections.filter(d=>intersectRatio(state.selection,d.box)>.2);
        if(!inBox.length){
          renderFrame();renderCandidates();
          say('recognition-status','The object detector found other objects, but none clearly overlaps your selected item. We kept your selection. Type the item category and visible details; do not use the unrelated AI label.');
          return;
        }
        choice=inBox.sort((a,b)=>intersectRatio(state.selection,b.box)-intersectRatio(state.selection,a.box))[0];
      }
      chooseDetection(choice);
      say('frame-help','Detected '+state.detections.length+' candidate object(s). Choose the object in the chips or draw a different region. Add brand/model clues before comparing merchants.');
    }else{
      say('recognition-status','The model found no confident known object in this frame. Select the exact region and type the product name or visible model; do not assume an exact match.');
      renderFrame();renderCandidates();
    }
  }catch(err){
    say('recognition-status','Object detection unavailable: '+logSafe(err)+'. Your manual object selection and typed search still work.');
  }finally{el('detect').disabled=false;}
}
function make(tag,cls,txt){
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(txt!==undefined)node.textContent=txt;
  return node;
}
function stores(term,market){
  const encoded=encodeURIComponent(term);
  const uk=market==='UK';
  return [
    {brand:'Google Shopping',subtitle:'Compare stores and visible prices on Google Shopping itself',
      href:'https://www.google.com/search?tbm=shop&q='+encoded},
    {brand:'Amazon '+(uk?'UK':'US'),subtitle:'Search current retailer inventory, models and delivery conditions',
      href:'https://www.amazon.'+(uk?'co.uk':'com')+'/s?k='+encoded},
    {brand:'eBay '+(uk?'UK':'US'),subtitle:'Check multiple listings and seller condition; not all are new products',
      href:'https://www.ebay.'+(uk?'co.uk':'com')+'/sch/i.html?_nkw='+encoded},
    uk?{brand:'John Lewis UK',subtitle:'Search an established UK retailer; coverage varies by product',
        href:'https://www.johnlewis.com/search?search-term='+encoded}:
      {brand:'Walmart',subtitle:'Check live Walmart search listings, stock and pickup options',
        href:'https://www.walmart.com/search?q='+encoded}
  ];
}
function analyzeQuery(){
  const category=q(el('category').value).slice(0,60);
  const details=q(el('item-description').value);
  if(!category&&!details){say('search-summary','Enter the visible item type, brand or description first. A selected frame by itself does not prove a precise product.');return;}
  if(category&&NONPRODUCT.has(category.toLowerCase())&&!details){
    say('search-summary','That object category is not a specific purchasable product. Tell us the exact item in the frame (e.g. jacket, helmet or shoes).');return;
  }
  const string=[details,category].filter(Boolean).join(' ').replace(/\b(\w+)(\s+\1\b)+/gi,'$1').trim().slice(0,180);
  if(string.length<3){say('search-summary','Please add a more specific item name to reduce irrelevant searches.');return;}
  const market=el('market').value;
  const out=el('retailer-results');out.replaceChildren();
  for(const store of stores(string,market)){
    const card=make('article','retailer-card');
    card.append(make('div','site','RETAILER SEARCH · NOT AN AFFILIATE LINK'));
    card.append(make('h3',null,store.brand));
    card.append(make('p',null,store.subtitle));
    const a=make('a',null,'View current matches at '+store.brand);
    a.href=store.href;a.target='_blank';a.rel='noopener noreferrer nofollow';
    const brand=store.brand.toLowerCase();
    a.dataset.ffMerchant=brand.includes('google')?'google':brand.includes('amazon')?'amazon':brand.includes('ebay')?'ebay':brand.includes('walmart')?'walmart':brand.includes('john lewis')?'johnlewis':'other';
    a.addEventListener('click',()=>{
      window.FrameFindFunnel?.emit('merchant_outbound',{channel:state.demo?'demo':state.sourceType==='local'?'local_video':'screenshot',merchant:a.dataset.ffMerchant});
    });
    card.append(a);out.append(card);
  }
  state.lastQuery=string;
  window.FrameFindFunnel?.emit('product_search',{channel:state.demo?'demo':state.sourceType==='local'?'local_video':state.sourceType==='youtube'||state.sourceType==='external'?'video_link':'screenshot',valid:out.children.length>0});
  const demoNote=state.demo?'The supplied original illustration is a demonstration, not an AI-verified branded product. ':'';
  say('search-summary',demoNote+'Search phrase: "'+string+'". Compare actual listings at the retailers. No current price, stock, exact model match or commission is implied.');
  el('results').scrollIntoView({behavior:'smooth',block:'start'});
}
async function shareResult(){
  const url=new URL('/video-find/',location.origin);
  url.searchParams.set('utm_source','user_share');
  url.searchParams.set('utm_medium','referral');
  url.searchParams.set('utm_campaign','framefind_video');
  if(state.lastQuery)url.searchParams.set('q',state.lastQuery);
  url.searchParams.set('m',el('market').value);
  // Deliberately do not embed user's potentially private original video URL or image in a share link.
  try{
    if(navigator.share){await navigator.share({title:'FrameFind · find a product from a video frame',url:url.toString()});}
    else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url.toString());}
    else{window.prompt('Copy this link',url.toString());}
    say('share-status','Ready to share. Video URL and screenshot were not added to the shared link.');
  }catch(err){if(err.name!=='AbortError')say('share-status','Copy this safe link: '+url.toString());}
}
function fromQuery(){
  const p=new URLSearchParams(location.search),term=p.get('q'),market=p.get('m');
  if(term)el('item-description').value=q(term);
  if(market==='UK')el('market').value='UK';
  // Demo is an explicitly requested, first-party illustration, not an external video.
  if(p.get('demo')==='1')queueMicrotask(()=>{void demo();});
  // We never automatically fetch or open a video URL passed via search parameters.
}
el('load-url').addEventListener('click',loadURL);
el('video-url').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();loadURL();}});
el('clip-file').addEventListener('change',e=>fileVideo(e.target.files?.[0]));
el('frame-time').addEventListener('input',adaptTime);
el('freeze').addEventListener('click',freeze);
el('share-screen').addEventListener('click',share);
el('stop-screen').addEventListener('click',stopSharing);
el('capture-tab').addEventListener('click',captureShared);
el('screenshot-file').addEventListener('change',e=>readImageFile(e.target.files?.[0]));
el('try-demo').addEventListener('click',demo);
el('try-demo-hero').addEventListener('click',demo);
el('detect').addEventListener('click',runDetector);
el('clear-selection').addEventListener('click',clearSelection);
el('download-crop').addEventListener('click',saveCrop);
el('copy-crop').addEventListener('click',copyCrop);
el('search-products').addEventListener('click',analyzeQuery);
el('share-result').addEventListener('click',shareResult);
view.addEventListener('pointerdown',onPointerDown);
view.addEventListener('pointermove',onPointerMove);
view.addEventListener('pointerup',onPointerUp);
view.addEventListener('pointercancel',()=>{state.drag=null;renderFrame();});
const zone=el('drop-zone');
zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragover');});
zone.addEventListener('dragleave',()=>zone.classList.remove('dragover'));
zone.addEventListener('drop',e=>{
  e.preventDefault();zone.classList.remove('dragover');
  const file=Array.from(e.dataTransfer?.files||[]).find(f=>f.type.startsWith('image/'));
  if(file)readImageFile(file);
});
document.addEventListener('paste',e=>{
  if(document.activeElement===el('item-description')||document.activeElement===el('video-url')||document.activeElement===el('category'))return;
  const file=Array.from(e.clipboardData?.files||[]).find(f=>f.type.startsWith('image/'));
  if(file){e.preventDefault();readImageFile(file);}
});
window.addEventListener('pagehide',()=>{stopSharing();hideAllSources();},{once:true});
fromQuery();
window.FrameFindOCRBridge=Object.freeze({crop:()=>croppedItem(),nonce:()=>state.selectionNonce});
window.FrameFindQA=Object.freeze({getSnapshot:()=>({
  hasFrame:!!state.frame,selection:state.selection?{label:state.selection.label,origin:state.selection.origin}:null,
  detectorReady:!!state.detector,lastQuery:state.lastQuery,sourceType:state.sourceType,
  activeShare:!!state.screen
})});
})();