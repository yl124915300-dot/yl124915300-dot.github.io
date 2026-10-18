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
 motionStatus.textContent="尚无连续画面位置证据";
 motionDetail.textContent="至少需要3次有效猫目标检测，且期间保持画面连续。框的位置变化不等于猫主动走动。";
 ownerNote.textContent="主人尚未确认变化来源。";
 reportButtons.forEach(b=>{b.disabled=true;b.setAttribute("aria-pressed","false");});
}
function renderMotion(){
 const m=s.motion;
 reportButtons.forEach(b=>b.disabled=!s.running||!s.last||!s.last.catCandidate);
 if(m.status==="frame_position_shift"){
  motionStatus.textContent="猫目标在画面中的位置有变化";
  motionDetail.textContent="连续约"+m.seconds+"秒的猫目标检测框中心出现位置差异。也可能是镜头移动、裁切或检测误差；这不能证明猫咪走路、转头或回应了你。";
 }else if(m.status==="no_large_frame_shift"){
  motionStatus.textContent="未观察到明显的检测框位置变化";
  motionDetail.textContent="连续约"+m.seconds+"秒检测框中心变化较小；不能据此说猫咪完全没动或没有改变姿态。";
 }else if(m.status==="multiple_cats"){
  motionStatus.textContent="多只猫：无法关联同一目标";
  motionDetail.textContent="连续帧中的猫目标身份无法确定，因此不计算位置变化。";
 }else if(m.status==="collecting"){
  motionStatus.textContent="收集连续画面（"+m.count+"/3帧起）";
  motionDetail.textContent="等待至少3帧，先不猜猫咪动作。";
 }else{
  motionStatus.textContent="尚无连续画面位置证据";
  motionDetail.textContent="当前缺乏稳定的单猫目标，不能推断任何动作。";
 }
}

function show(labelText,body,visionText){
 label.textContent=labelText;
 detail.textContent=body;
 candidate.textContent=visionText||"尚无实时视觉证据";
}
function getFresh(){
 if(!s.camera||!s.running||!consent.checked||!s.last||document.hidden||Date.now()-s.last.at>6500)return null;
 return Object.assign({verified:true,model:"EfficientDet-Lite0"},s.last);
}
function refreshFusion(){
 const vision=getFresh();
 const sound=typeof root.CatTalesLiveEvidence==="function"?root.CatTalesLiveEvidence():null;
 if(vision&&vision.catCandidate&&sound&&sound.catCandidate&&Date.now()-sound.at<=5000&&Math.abs(vision.at-sound.at)<=5000){
   fused.textContent="同一时间窗内存在猫的画面候选和猫声候选，但无法确认声音来自画面中的猫。请观察嘴部动作并由主人确认。";
 }else if(vision&&vision.catCandidate&&sound&&sound.verified&&Date.now()-sound.at<=5000){
   fused.textContent="视觉模型检出了猫；声音模型也有分类结果，但两者没有共同确认猫咪发声。";
 }else fused.textContent="尚无可联合复核的声音与画面证据；不会自动确认猫在发声。";
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
   stopModel();s.camera=false;button.disabled=true;button.textContent="启用本地猫咪视觉识别";
   show("未运行","摄像头已关闭，画面识别也已停止。");
 }else{
   s.camera=true;s.streak=0;s.last=null;s.motion=temporal.initial();s.ownerReport=null;resetMotionUI();
   show("未运行","摄像头只作本地预览，点击启用前不会分析画面。");
   button.disabled=!consent.checked;
 }
 refreshFusion();
}
function tick(){
 if(!s.running||!s.camera||document.hidden||!video.srcObject){
   if(s.running){stopModel();show("已停止","离开或关闭摄像头后不再分析画面。");}
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
     show("已检测到候选猫物体","连续两次画面检测到疑似猫的物体轮廓，模型分数 "+
       d.catScore.toFixed(2)+"（未经校准）。这不证明猫正在叫，也不解释它的情绪。",
       "画面候选：猫（未确认声源）");
   }else if(d.oneFrameCat){
     show("候选待复核","一帧检测到疑似猫物体，等待下一帧；不会因为单帧就确认。",
       "单帧疑似猫（待复核）");
   }else if(d.dogCandidate){
     show("非猫候选","模型当前更明确地检测到狗的物体轮廓，尚未确认画面里有猫。",
       "画面候选：狗（未发现稳定猫候选）");
   }else{
     show("暂无猫候选","本帧没有形成稳定的猫检测结果。可能是遮挡、光线或模型局限；不等于没有猫。",
       "未检出稳定猫候选");
   }
   refreshFusion();
 }catch(error){
   stopModel();button.disabled=!s.camera||!consent.checked;button.textContent="重试本地视觉检测";
   show("运行失败","本地视觉模型推理失败："+String(error&&error.message||error).slice(0,140));
   refreshFusion();
 }
}
async function enable(){
 if(s.running){
   stopModel();button.textContent="启用本地猫咪视觉识别";button.disabled=!s.camera||!consent.checked;
   show("已停止","已经关闭本地画面分析，摄像头预览可以继续。");refreshFusion();return;
 }
 if(!s.camera||!video.srcObject||!consent.checked||s.loading)return;
 s.loading=true;const token=++s.epoch;
 button.disabled=true;button.textContent="正在加载视觉模型…";
 show("模型加载中","正在从本站获取已固定的 MediaPipe 运行库与 EfficientDet-Lite0 模型（本地推理，不上传画面）。");
 try{
   const mod=await import(new URL("./vision-vendor/vision_bundle.mjs",document.baseURI).href);
   const fileset=await mod.FilesetResolver.forVisionTasks(new URL("./vision-vendor/wasm",document.baseURI).href);
   const detector=await mod.ObjectDetector.createFromOptions(fileset,{
     baseOptions:{modelAssetPath:new URL("./vision-vendor/efficientdet_lite0.tflite",document.baseURI).href,delegate:"CPU"},
     runningMode:"VIDEO",scoreThreshold:.35,maxResults:8
   });
   if(token!==s.epoch||!s.camera||!consent.checked||!video.srcObject||document.hidden){
     try{detector.close();}catch(e){}return;
   }
   s.detector=detector;s.loading=false;s.running=true;s.streak=0;s.last=null;s.motion=temporal.initial();s.ownerReport=null;resetMotionUI();
   button.disabled=false;button.textContent="■ 停止画面识别";
   show("正在取样","视觉模型已经运行。每约2秒读取一帧，只查找猫、狗等物体轮廓。");
   tick();s.timer=setInterval(tick,2100);
 }catch(error){
   if(token!==s.epoch)return;
   stopModel();button.disabled=!s.camera||!consent.checked;button.textContent="重试本地视觉检测";
   show("加载失败","视觉模型未启动："+String(error&&error.message||error).slice(0,160));
 }
}
consent.addEventListener("change",()=>{
 if(!consent.checked&&(s.running||s.loading)){
   stopModel();button.textContent="启用本地猫咪视觉识别";
   show("未授权","取消视觉分析授权后，已经停止分析。");
 }
 button.disabled=!s.camera||(!consent.checked&&!s.running)||s.loading;
 refreshFusion();
});
const ownerLabels={cat_self:"我亲眼看到猫自己换了位置",camera:"我移动了手机或镜头",unsure:"我无法确定是谁在移动"};
reportButtons.forEach(button=>button.addEventListener("click",()=>{
 if(!s.running||!s.last||!s.last.catCandidate)return;
 const key=button.dataset.motionOwner;
 if(!Object.hasOwn(ownerLabels,key))return;
 s.ownerReport={key,text:ownerLabels[key],at:Date.now()};
 s.last.ownerReport=s.ownerReport;
 ownerNote.textContent="【主人报告】"+ownerLabels[key]+"。这不是模型得出的行为结论，也不是科学标签。";
 reportButtons.forEach(b=>b.setAttribute("aria-pressed",String(b===button)));
}));
button.addEventListener("click",()=>{void enable();});
root.CatTalesVision={getFresh,onCameraChange,refreshFusion,stopModel};
})(typeof window!=="undefined"?window:globalThis);
