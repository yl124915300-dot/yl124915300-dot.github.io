/* Cat Tales LIVE v2.2: opt-in, entirely local EfficientDet-Lite0 cat presence evidence. */
(function(root){"use strict";
const $=id=>document.getElementById(id);
const policy=root.CatTalesVisionPolicy,temporal=root.CatTalesMotionPolicy;
const s={camera:false,loading:false,running:false,detector:null,timer:null,epoch:0,last:null,streak:0,motion:temporal.initial(),ownerReport:null};
const video=$("camera-video");
const button=$("enable-vision"),consent=$("vision-consent");
const label=$("vision-status"),detail=$("vision-detail"),candidate=$("vision-candidate"),fused=$("fused-status");
const motionStatus=$("motion-status"),motionDetail=$("motion-detail"),ownerNote=$("motion-owner-note");
const reportButtons=[...document.querySelectorAll("[data-motion-owner]")];
function resetMotionUI(){
 motionStatus.textContent="No continuous-frame position evidence yet";
 motionDetail.textContent="At least three valid cat detections in continuous frames are needed. Box motion does not prove the cat moved.";
 ownerNote.textContent="You have not identified the source of motion.";
 reportButtons.forEach(b=>{b.disabled=true;b.setAttribute("aria-pressed","false");});
}
function renderMotion(){
 const m=s.motion;
 reportButtons.forEach(b=>b.disabled=!s.running||!s.last||!s.last.catCandidate);
 if(m.status==="frame_position_shift"){
  motionStatus.textContent="A cat detection box changed position";
  motionDetail.textContent="Across approximately "+m.seconds+" seconds the box center shifted. The camera, cropping, or detection error could cause this; it does not prove walking or a response.";
 }else if(m.status==="no_large_frame_shift"){
  motionStatus.textContent="No major detection-box movement observed";
  motionDetail.textContent="Across approximately "+m.seconds+" seconds the box center barely shifted. That cannot prove the cat was motionless.";
 }else if(m.status==="multiple_cats"){
  motionStatus.textContent="Multiple cats: identity cannot be tracked";
  motionDetail.textContent="Individual cats cannot be reliably matched across frames; position changes are not calculated.";
 }else if(m.status==="collecting"){
  motionStatus.textContent="Collecting video frames ("+m.count+"/3 minimum)";
  motionDetail.textContent="Wait for at least three frames; don't infer behavior yet.";
 }else{
  motionStatus.textContent="No continuous-frame position evidence yet";
  motionDetail.textContent="No stable single-cat target; no motion conclusion is supported.";
 }
}

function show(labelText,body,visionText){
 label.textContent=labelText;
 detail.textContent=body;
 candidate.textContent=visionText||"No current visual-model evidence";
}
function getFresh(){
 if(!s.camera||!s.running||!consent.checked||!s.last||document.hidden||Date.now()-s.last.at>6500)return null;
 return Object.assign({verified:true,model:"EfficientDet-Lite0"},s.last);
}
function refreshFusion(){
 const vision=getFresh();
 const sound=typeof root.CatTalesLiveEvidence==="function"?root.CatTalesLiveEvidence():null;
 if(vision&&vision.catCandidate&&sound&&sound.catCandidate&&Date.now()-sound.at<=5000&&Math.abs(vision.at-sound.at)<=5000){
   fused.textContent="Possible cat image and sound candidates overlap in time, but the sound source is unverified. Observe the mouth and confirm yourself.";
 }else if(vision&&vision.catCandidate&&sound&&sound.verified&&Date.now()-sound.at<=5000){
   fused.textContent="Visual and audio classifiers both have results, but they do not jointly confirm that the visible cat vocalized.";
 }else fused.textContent="No corroborated audio-visual evidence. The app will not claim that the cat vocalized.";
}
function stopModel(){
 s.epoch++;
 if(s.timer!==null){clearInterval(s.timer);s.timer=null;}
 if(s.detector){try{s.detector.close();}catch(e){}}
 s.detector=null;s.running=false;s.loading=false;s.last=null;s.streak=0;s.motion=temporal.initial();s.ownerReport=null;
 resetMotionUI();
}
function onCameraChange(on){
 if(!on){
   stopModel();s.camera=false;button.disabled=true;button.textContent="Enable on-device cat detection";
   show("Not running","Camera closed; visual detection stopped.");
 }else{
   s.camera=true;s.streak=0;s.last=null;s.motion=temporal.initial();s.ownerReport=null;resetMotionUI();
   show("Not running","Camera is preview only until you separately enable analysis.");
   button.disabled=!consent.checked;
 }
 refreshFusion();
}
function tick(){
 if(!s.running||!s.camera||document.hidden||!video.srcObject){
   if(s.running){stopModel();show("Stopped","Vision analysis stopped when the camera or page closed.");}
   return;
 }
 if(video.readyState<2||!video.videoWidth)return;
 try{
   const result=s.detector.detectForVideo(video,performance.now());
   const d=policy.evaluate(result&&result.detections,s.streak);
   s.streak=d.streak;
   s.motion=temporal.advance(s.motion,result&&result.detections,video.videoWidth,video.videoHeight,Date.now());
   s.last={at:Date.now(),catCandidate:d.catCandidate,catScore:d.catScore,
     dogCandidate:d.dogCandidate,dogScore:d.dogScore,oneFrameCat:d.oneFrameCat,
     hasFrame:true,motionStatus:s.motion.status,motionSeconds:s.motion.seconds,ownerReport:s.ownerReport};
   renderMotion();
   if(d.catCandidate){
     show("Possible cat object detected","A cat-shaped object appeared in two consecutive samples. Uncalibrated model score: "+
       d.catScore.toFixed(2)+". This does not establish vocalizing or emotions.",
       "Visual candidate: cat (sound source unverified)");
   }else if(d.oneFrameCat){
     show("Unconfirmed single frame","One frame suggests a cat-shaped object. Waiting for another; one frame is not confirmation.",
       "One-frame cat candidate (unconfirmed)");
   }else if(d.dogCandidate){
     show("Other animal candidate","A dog-shaped object was detected; no stable cat candidate has been confirmed.",
       "Visual candidate: dog (no stable cat)");
   }else{
     show("No stable cat candidate","No stable cat detection in the frame. Occlusion, lighting or model limits may explain this.",
       "No stable cat detected");
   }
   refreshFusion();
 }catch(error){
   stopModel();button.disabled=!s.camera||!consent.checked;button.textContent="Retry on-device vision";
   show("Inference error","Local visual inference failed: "+String(error&&error.message||error).slice(0,140));
   refreshFusion();
 }
}
async function enable(){
 if(s.running){
   stopModel();button.textContent="Enable on-device cat detection";button.disabled=!s.camera||!consent.checked;
   show("Stopped","On-device analysis stopped; the camera preview may remain open.");refreshFusion();return;
 }
 if(!s.camera||!video.srcObject||!consent.checked||s.loading)return;
 s.loading=true;const token=++s.epoch;
 button.disabled=true;button.textContent="Loading vision model...";
 show("Loading","Fetching site-hosted MediaPipe and EfficientDet-Lite0 assets. Video frames stay on this device.");
 try{
   const mod=await import(new URL("../live/vision-vendor/vision_bundle.mjs",document.baseURI).href);
   const fileset=await mod.FilesetResolver.forVisionTasks(new URL("../live/vision-vendor/wasm",document.baseURI).href);
   const detector=await mod.ObjectDetector.createFromOptions(fileset,{
     baseOptions:{modelAssetPath:new URL("../live/vision-vendor/efficientdet_lite0.tflite",document.baseURI).href,delegate:"CPU"},
     runningMode:"VIDEO",scoreThreshold:.35,maxResults:8
   });
   if(token!==s.epoch||!s.camera||!consent.checked||!video.srcObject||document.hidden){
     try{detector.close();}catch(e){}return;
   }
   s.detector=detector;s.loading=false;s.running=true;s.streak=0;s.last=null;s.motion=temporal.initial();s.ownerReport=null;resetMotionUI();
   button.disabled=false;button.textContent="■ Stop visual detection";
   show("Sampling","Vision model active. Samples about one frame every two seconds for cat/dog-shaped objects only.");
   tick();s.timer=setInterval(tick,2100);
 }catch(error){
   if(token!==s.epoch)return;
   stopModel();button.disabled=!s.camera||!consent.checked;button.textContent="Retry on-device vision";
   show("Load failed","Vision model could not start: "+String(error&&error.message||error).slice(0,160));
 }
}
consent.addEventListener("change",()=>{
 if(!consent.checked&&(s.running||s.loading)){
   stopModel();button.textContent="Enable on-device cat detection";
   show("Not authorized","Visual analysis stopped after you withdrew consent.");
 }
 button.disabled=!s.camera||(!consent.checked&&!s.running)||s.loading;
 refreshFusion();
});
const ownerLabels={cat_self:"I saw the cat move on its own",camera:"I moved the phone/camera",unsure:"I cannot tell what moved"};
reportButtons.forEach(button=>button.addEventListener("click",()=>{
 if(!s.running||!s.last||!s.last.catCandidate)return;
 const key=button.dataset.motionOwner;
 if(!Object.hasOwn(ownerLabels,key))return;
 s.ownerReport={key,text:ownerLabels[key],at:Date.now()};
 s.last.ownerReport=s.ownerReport;
 ownerNote.textContent="[Owner report] "+ownerLabels[key]+". This is your observation, not a model or scientific conclusion.";
 reportButtons.forEach(b=>b.setAttribute("aria-pressed",String(b===button)));
}));
button.addEventListener("click",()=>{void enable();});
function clearOwnerReport(){
 s.ownerReport=null;if(s.last)s.last.ownerReport=null;
 ownerNote.textContent="You have not identified the source of motion.";
 reportButtons.forEach(b=>b.setAttribute("aria-pressed","false"));
}
root.CatTalesVision={getFresh,onCameraChange,refreshFusion,stopModel,clearOwnerReport};
})(typeof window!=="undefined"?window:globalThis);
