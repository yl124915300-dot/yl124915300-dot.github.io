/* Opt-in, in-browser label/model OCR. Never sends a screenshot or crop to a server.
 * Tesseract.js v7 runtime/lang traineddata are downloaded from open-source CDN
 * only after the shopper explicitly clicks Read label. Results are editable hints,
 * not proof of brand/model/merchant identity.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
let worker=null,initializing=null,busy=false;
let resultText='',resultNonce=-1;
function status(s){$('ocr-status').textContent=s;}
function clean(s){
 return String(s||'').normalize('NFKC')
   .replace(/[^\p{L}\p{N}\-_. /]/gu,' ')
   .replace(/\s+/g,' ').trim().slice(0,130);
}
function reset(){
 resultText='';resultNonce=-1;$('use-ocr').disabled=true;
}
async function getOCR(){
 if(worker)return worker;
 if(initializing)return initializing;
 initializing=(async()=>{
  if(!window.Tesseract){
   status('Downloading pinned open-source OCR runtime. This downloads code and model data, not your photo.');
   await new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js';
    script.crossOrigin='anonymous';
    script.onload=resolve;
    script.onerror=()=>reject(new Error('OCR runtime could not be downloaded'));
    document.head.append(script);
   });
  }
  if(typeof window.Tesseract?.createWorker!=='function')throw Error('OCR runtime unavailable');
  status('Loading English OCR recognition data in your browser…');
  worker=await window.Tesseract.createWorker('eng',1,{
   logger:e=>{
    if(busy&&e?.status==='recognizing text'&&Number.isFinite(e.progress))
      status('Reading visible label… '+Math.round(e.progress*100)+'%');
   }
  });
  return worker;
 })();
 try{return await initializing;}
 finally{initializing=null;}
}
async function readLabel(){
 if(busy)return;
 const bridge=window.FrameFindOCRBridge;
 if(!bridge)return status('Please load a selected image frame first.');
 let crop;
 try{crop=bridge.crop();}
 catch(e){status('First select the small region with the label/model. '+String(e.message||e));return;}
 const nonce=bridge.nonce();
 busy=true;reset();$('read-label').disabled=true;
 status('Analyzing the selected crop on your device. English letters and model numbers work best.');
 try{
  // Upscale tiny cropped lettering for OCR; caps protect low-memory phones.
  const scale=Math.min(3,1600/Math.max(1,crop.width),1000/Math.max(1,crop.height));
  const target=document.createElement('canvas');
  target.width=Math.max(crop.width,Math.round(crop.width*Math.max(1,scale)));
  target.height=Math.max(crop.height,Math.round(crop.height*Math.max(1,scale)));
  const ctx=target.getContext('2d');
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(crop,0,0,target.width,target.height);
  const w=await getOCR();
  const r=await w.recognize(target);
  if(bridge.nonce()!==nonce){
   status('You changed the selected item. OCR result discarded to avoid a wrong product match.');return;
  }
  const text=clean(r?.data?.text);
  if(text.length<3){
   status('No legible brand/model text was found. Try a sharper zoomed frame or type what you can read.');return;
  }
  resultText=text;resultNonce=nonce;
  $('use-ocr').disabled=false;
  status('Text candidate: “'+text+'”. This may contain OCR errors. Inspect the frame before adding it to the merchant search.');
 }catch(err){
  status('OCR unavailable: '+String(err?.message||err).slice(0,130)+'. Manual text entry and retailer searches still work.');
 }finally{busy=false;$('read-label').disabled=false;}
}
function useText(){
 if(!resultText||window.FrameFindOCRBridge?.nonce()!==resultNonce){
  reset();status('Selection changed. Rerun OCR before applying text.');return;
 }
 const inp=$('item-description');
 const current=inp.value.trim();
 inp.value=[current,resultText].filter(Boolean).join(' ').slice(0,160);
 inp.dispatchEvent(new Event('input',{bubbles:true}));
 status('OCR candidate added to the search description. Please correct mistakes or false model numbers before searching.');
}
$('read-label').addEventListener('click',readLabel);
$('use-ocr').addEventListener('click',useText);
window.addEventListener('pagehide',()=>{
 try{if(worker)void worker.terminate();}catch(e){}
},{once:true});
window.FrameFindOCRQA=Object.freeze({getStatus:()=>({busy,loaded:!!worker,text:resultText,nonce:resultNonce}),clean});
})();