/* Live LA: consent-only local image and screen/camera object detection.
 * Reuses first-party, version-fixed MediaPipe + EfficientDet assets already installed for Cat Tales.
 * Does not access, record, or extract protected third-party players.
 * MediaPipe reports object candidates, never mind-reading, purchase intent or confirmed availability.
 */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const state={detector:null,video:null,stream:null,mode:'IMAGE',clock:null,busy:false,loading:null,last:[],lastAt:0};
  const output=$('vision-output'),preview=$('vision-preview'),status=$('vision-status');
  function say(message){status.textContent=message;}
  function summary(results,source){
    const list=(results?.detections||[]).map(d=>({
      label:String(d.categories?.[0]?.categoryName||'unknown').toLowerCase(),
      score:Number(d.categories?.[0]?.score||0)
    })).filter(x=>x.label!=='unknown'&&x.score>=0.4).sort((a,b)=>b.score-a.score).slice(0,8);
    state.last=list;state.lastAt=Date.now();
    output.textContent=list.length?'Object candidates: '+list.map(x=>x.label+' '+Math.round(x.score*100)+'%').join(', ')+'; no purchase intent inferred.':'No clear object candidates. Try a brighter frame or tell us what you want.';
    document.dispatchEvent(new CustomEvent('livevision:objects',{detail:{labels:list,source,at:state.lastAt}}));
    return list;
  }
  async function init(){
    if(state.detector)return state.detector;
    if(state.loading)return state.loading;
    say('Loading local object recognition model from this website…');
    const path='/cat-tales/live/vision-vendor/';
    state.loading=(async()=>{
      const mp=await import(path+'vision_bundle.mjs');
      const fileset=await mp.FilesetResolver.forVisionTasks(path+'wasm');
      const detector=await mp.ObjectDetector.createFromOptions(fileset,{
        baseOptions:{modelAssetPath:path+'efficientdet_lite0.tflite',delegate:'CPU'},
        runningMode:'IMAGE',scoreThreshold:.4,maxResults:8
      });
      state.detector=detector;
      return detector;
    })();
    try{return await state.loading;}finally{state.loading=null;}
  }
  async function mode(next){
    if(state.mode!==next){await state.detector.setOptions({runningMode:next});state.mode=next;}
  }
  function stop(){
    if(state.clock){clearInterval(state.clock);state.clock=null;}
    if(state.stream){state.stream.getTracks().forEach(t=>t.stop());state.stream=null;}
    if(preview.srcObject){preview.pause();preview.srcObject=null;}
    preview.hidden=true;
    $('stop-capture').disabled=true;
    $('camera-capture').disabled=false;
    $('screen-capture').disabled=false;
    say('Local capture stopped; no live video is being analyzed.');
  }
  async function start(kind){
    if(state.busy)return;
    state.busy=true;
    stop();
    $('screen-capture').disabled=true;$('camera-capture').disabled=true;
    try{
      if(!navigator.mediaDevices)throw Error('Browser capture is unavailable. Upload a screenshot instead.');
      const stream=kind==='screen'
        ?await navigator.mediaDevices.getDisplayMedia({video:{frameRate:5},audio:false})
        :await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
      state.stream=stream;
      stream.getVideoTracks()[0].addEventListener('ended',stop,{once:true});
      preview.srcObject=stream;preview.hidden=false;preview.muted=true;
      await preview.play();
      await init();
      await mode('VIDEO');
      $('stop-capture').disabled=false;$('camera-capture').disabled=true;$('screen-capture').disabled=true;
      say('Local scene sampling is active. One frame approximately every 3 seconds; no upload.');
      let ticking=false;
      async function tick(){
        if(ticking||!state.stream||document.hidden||preview.readyState<2)return;
        ticking=true;
        try{
          const results=state.detector.detectForVideo(preview,performance.now());
          summary(results,kind);
        }catch(e){say('Vision inference stopped: '+String(e.message||e));stop();}
        finally{ticking=false;}
      }
      await tick();state.clock=setInterval(tick,3000);
    }catch(err){
      if(state.stream)stop();
      say('Capture/model was not started: '+String(err.message||err).slice(0,180));
      $('screen-capture').disabled=false;$('camera-capture').disabled=false;
    }finally{state.busy=false;}
  }
  async function uploaded(file){
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024){
      say('Choose a PNG, JPG or WebP screenshot under 8 MB.');return;
    }
    if(state.stream)stop();
    $('vision-upload').disabled=true;
    let img=null;
    try{
      const detector=await init();
      await mode('IMAGE');
      img=await createImageBitmap(file);
      summary(detector.detect(img),'screenshot');
      say('Screenshot analyzed on your device. The model does not know if this frame is live or when it was taken.');
    }catch(err){say('Image recognition failed: '+String(err.message||err).slice(0,180));}
    finally{if(img)img.close();$('vision-upload').disabled=false;}
  }
  $('camera-capture').addEventListener('click',()=>start('camera'));
  $('screen-capture').addEventListener('click',()=>start('screen'));
  $('stop-capture').addEventListener('click',stop);
  $('vision-upload').addEventListener('change',e=>uploaded(e.target.files?.[0]));
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.stream)stop();});
  window.addEventListener('pagehide',stop,{once:true});
  window.LiveVision={getEvidence:()=>({labels:state.last.slice(),at:state.lastAt,live:!!state.stream}),stop};
})();