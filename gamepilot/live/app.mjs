import {Session,blankState} from "./core.mjs";
const $=id=>document.getElementById(id),session=new Session();
const canvas=$("frame"),ctx=canvas.getContext("2d",{willReadFrequently:true});
let stream=null,worker=null,workerLanguage="",sampling=false,lastSmall=null,installEvent=null;
const small=document.createElement("canvas");small.width=64;small.height=36;
const smallCtx=small.getContext("2d",{willReadFrequently:true});
$("state").value=JSON.stringify(blankState(),null,2);
function status(s){$("status").textContent=s;}
function revoke(s){session.revoke(s);$("advice").textContent="ABSTAIN — "+s;$("acted").disabled=true;}
function invalidate(s){session.invalidate(s);$("advice").textContent="ABSTAIN — "+s;$("acted").disabled=true;}
function resetInput(){$("state").value=JSON.stringify(blankState(),null,2);$("text").textContent="No OCR result for this frame.";}
async function digest(blob){return [...new Uint8Array(await crypto.subtle.digest("SHA-256",await blob.arrayBuffer()))].map(v=>v.toString(16).padStart(2,"0")).join("");}
function asBlob(){return new Promise(resolve=>canvas.toBlob(resolve,"image/png"));}
async function setFrame(draw,source){
  const previous=session.frame,transcript=$("state").value;
  session.begin();revoke("New image; previous review cleared.");const revision=session.revision;
  resetInput();$("advise").disabled=true;$("verify").disabled=true;$("ocr").disabled=true;
  draw();const at=Date.now(),blob=await asBlob(),hash=await digest(blob);
  if(!session.acceptFrame(revision,{hash,at,source,width:canvas.width,height:canvas.height}))return;
  if(source==="display"&&previous?.source==="display"&&previous.hash===hash)$("state").value=transcript;
  $("advise").disabled=source!=="display"||!!session.pending;$("verify").disabled=!session.pending||source!=="display";$("ocr").disabled=false;
  status(source==="display"?"Fresh frame. Review within 15 seconds.":"Imported file: OCR/replay only; no live advice.");
}
async function capture(){
  const v=$("video");
  const track=stream?.getVideoTracks()[0];
  if(!track||track.readyState!=="live"||track.muted||v.readyState<2){invalidate("No active, unmuted source frame.");$("advise").disabled=true;$("verify").disabled=true;return;}
  await setFrame(()=>{canvas.width=v.videoWidth;canvas.height=v.videoHeight;ctx.drawImage(v,0,0);smallCtx.drawImage(v,0,0,64,36);lastSmall=new Uint8ClampedArray(smallCtx.getImageData(0,0,64,36).data);},"display");
}
function stop(){
  stream?.getTracks().forEach(t=>t.stop());stream=null;$("video").srcObject=null;session.pending=null;lastSmall=null;
  $("capture").disabled=true;$("stop").disabled=true;$("advise").disabled=true;$("verify").disabled=true;
  invalidate("Sharing stopped. Start a new frame and review.");status("Capture permission released.");
}
$("share").onclick=async()=>{
  stop();
  try{
    status("Choose the game window in the browser prompt.");
    stream=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:5},audio:false});
    const track=stream.getVideoTracks()[0];track.addEventListener("ended",stop,{once:true});
    track.addEventListener("mute",()=>{invalidate("Capture source muted");$("advise").disabled=true;$("verify").disabled=true;});
    $("video").srcObject=stream;status("Waiting for the first shared frame.");await $("video").play();
    $("capture").disabled=false;$("stop").disabled=false;await capture();
  }catch(e){stop();status("No shared window: "+e.message);}
};
$("capture").onclick=()=>capture().catch(e=>{invalidate("Capture failed");status(e.message);});
$("stop").onclick=stop;
$("file").onchange=async()=>{
  const file=$("file").files[0];if(!file)return;
  stop();invalidate("Image import started");resetInput();$("advise").disabled=true;$("ocr").disabled=true;
  const importRevision=session.revision;
  if(file.size>15*1024*1024){status("Image too large (maximum 15 MB).");return;}
  try{
    const bitmap=await createImageBitmap(file);
    if(importRevision!==session.revision){bitmap.close();return;}
    if(bitmap.width*bitmap.height>16000000)throw Error("Image exceeds 16 megapixels.");
    await setFrame(()=>{canvas.width=bitmap.width;canvas.height=bitmap.height;ctx.drawImage(bitmap,0,0);},"file");
    bitmap.close();
  }catch(e){invalidate("Image import failed");status(e.message);}
};
async function getWorker(){
  const lang=$("language").value;
  if(worker&&workerLanguage!==lang){await worker.terminate();worker=null;}
  if(!worker){
    if(!globalThis.Tesseract)throw Error("Bundled OCR missing. Use the cloud-built archive or run npm run vendor.");
    worker=await Tesseract.createWorker(lang,1,{
      workerPath:new URL("vendor/tesseract/worker.min.js",location.href).href,
      corePath:new URL("vendor/core/",location.href).href,
      langPath:new URL("vendor/lang",location.href).href,
      cacheMethod:"none",
      logger:m=>{if(m.status==="recognizing text")status("OCR "+Math.round(m.progress*100)+"%");}
    });workerLanguage=lang;
  }
  return worker;
}
$("ocr").onclick=async()=>{
  revoke("OCR in progress; review after reading.");const revision=session.revision,hash=session.frame?.hash;
  $("ocr").disabled=true;
  try{
    const blob=await asBlob(),w=await getWorker(),result=await w.recognize(blob);
    if(revision!==session.revision||hash!==session.frame?.hash)return;
    $("text").textContent=result.data.text||"(No readable text; abstain.)";
    session.events.push({type:"ocr",frameHash:hash,engine:"Tesseract.js 7.0.0",confidence:result.data.confidence,
      textLength:result.data.text.length,completeRecognition:false});
    status("OCR finished. Verify all fields; completeness is not automatically detected.");
  }catch(e){if(revision===session.revision){revoke("OCR failed");status(e.message);}}
  finally{$("ocr").disabled=!session.frame;}
};
$("state").addEventListener("input",()=>revoke("State edited; check again."));
function state(){return JSON.parse($("state").value);}
function show(r){$("advice").textContent=JSON.stringify(r,null,2);}
$("advise").onclick=()=>{
  try{const r=session.confirm(session.revision,state());show(r);$("acted").disabled=r.status!=="REVIEWED_CANDIDATE";}
  catch(e){revoke("Invalid state: "+e.message);}
};
$("acted").onclick=()=>{
  if(session.startAction()){revoke("Perform the move yourself, then capture and review the new frame.");$("verify").disabled=false;}
  else revoke("Candidate expired. Capture again.");
};
$("verify").onclick=()=>{try{show(session.verify(state()));$("verify").disabled=!session.pending;}catch(e){revoke("Invalid post-action state: "+e.message);}};
$("export").onclick=()=>{
  const blob=new Blob([JSON.stringify(session.report(),null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="gamepilot-private-review.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvent=e;$("install").hidden=false;});
$("install").onclick=async()=>{await installEvent?.prompt();installEvent=null;$("install").hidden=true;};
setInterval(async()=>{
  if(session.advice&&Date.now()>session.advice.expires)revoke("15-second frame window expired.");
  if(!stream||sampling||$("video").readyState<2)return;
  sampling=true;
  try{
    smallCtx.drawImage($("video"),0,0,64,36);
    const current=smallCtx.getImageData(0,0,64,36).data;
    if(lastSmall){
      let diff=0;for(let i=0;i<current.length;i+=4)diff+=Math.abs(current[i]-lastSmall[i])+Math.abs(current[i+1]-lastSmall[i+1])+Math.abs(current[i+2]-lastSmall[i+2]);
      if(diff/(64*36*3)>1){invalidate("Shared image changed; capture and review again.");$("advise").disabled=true;$("verify").disabled=true;}
    }
    lastSmall=new Uint8ClampedArray(current);
  }finally{sampling=false;}
},250);
document.addEventListener("visibilitychange",()=>{if(document.hidden)invalidate("Companion hidden; capture and review again.");});
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(e=>status("Install cache unavailable: "+e.message));
