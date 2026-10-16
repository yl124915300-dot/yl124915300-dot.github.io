// Pixel-derived observations only. No fixture labels or source IDs enter this module.
const finite = n => typeof n === "number" && Number.isFinite(n);
const normalized = s => s.normalize("NFKC").replace(/[|]/g,"1").replace(/\s+/g," ").trim();
export const REGIONS = [
  {id:"hud",box:[0,0,0.6,0.09],psm:"11"},
  {id:"energy",box:[0,0.68,0.23,0.24],psm:"11"},
  {id:"hand",box:[0.18,0.72,0.64,0.28],psm:"11"},
  {id:"battlefield",box:[0.12,0.23,0.82,0.5],psm:"11"},
  {id:"turn",box:[0.80,0.72,0.20,0.26],psm:"11"}
];
const lexicon = [
 ["Strike",/\bStrike\b|打击/iu],["Defend",/\bDefend\b|防御/iu],
 ["Bash",/\bBash\b|痛击/iu],["Anger",/\bAnger\b|愤怒/iu],
 ["Survivor",/\bSurvivor\b|生存者/iu],["Unleash",/\bUnleash\b/iu],
 ["Zap",/\bZap\b|电击/iu],["Dualcast",/\bDualcast\b|双重施放/iu]
];
function boxOf(line){return line.bbox||{x0:0,y0:0,x1:0,y1:0};}
function evidence(line,region,pass) {
 return {text:line.text,confidence:line.confidence,bbox:boxOf(line),region,pass};
}
function flatten(data) {
 return (data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>p.lines||[]));
}
export function parseObservations(scans,meta) {
 const lines=scans.flatMap(s=>(s.lines||flatten(s.data||{})).map(l=>({...l,region:s.region,pass:s.pass})));
 function read(region,pattern,convert) {
   const found=[];
   for(const l of lines.filter(l=>l.region===region)) {
     const text=normalized(l.text||""),m=text.match(pattern);
     if(!m||!finite(l.confidence)||l.confidence<80)continue;
     const value=convert(m);
     if(value!==null)found.push({value,evidence:evidence(l,l.region,l.pass)});
   }
   const groups=new Map();
   for(const f of found){const key=JSON.stringify(f.value);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(f);}
   if(groups.size!==1)return {value:null,confidence:0,reason:groups.size?"conflicting OCR values":"not read at confidence >= 80",evidence:found};
   const group=[...groups.values()][0],passes=new Set(group.map(x=>x.evidence.pass));
   if(passes.size<2)return {value:null,confidence:0,reason:"no agreement between two pixel preprocessing passes",evidence:group};
   return {value:group[0].value,confidence:Math.min(...group.map(x=>x.evidence.confidence)),evidence:group};
 }
 const ratio=m=>{const current=Number(m[1]),max=Number(m[2]);return max>0&&current>=0&&current<=max&&max<=999?{current,max}:null;};
 const hp=read("hud",/\b(\d{1,3})\s*\/\s*(\d{1,3})\b/u,ratio);
 const energy=read("energy",/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/u,m=>{const n=Number(m[1]),max=Number(m[2]);return n<=max&&max<=10?{current:n,max}:null;});
 const turn=read("turn",/(?:End\s*Turn|结束回合)\s*([1-9]\d?)/iu,m=>Number(m[1]));
 const cards=[];
 // Keep separate boxes; repeated identical cards are not deduplicated by name.
 for(const l of lines.filter(l=>l.region==="hand"&&finite(l.confidence)&&l.confidence>=80)){
   const text=normalized(l.text||""),match=lexicon.filter(([,p])=>p.test(text));
   if(match.length!==1)continue;
   const name=match[0][0],b=boxOf(l);
   let card=cards.find(c=>c.name===name&&Math.abs(c.bbox.x0-b.x0)<meta.width*0.045&&Math.abs(c.bbox.y0-b.y0)<meta.height*0.08);
   if(!card){card={name,bbox:b,evidence:[],cost:null,effectiveValue:null};cards.push(card);}
   card.evidence.push(evidence(l,l.region,l.pass));
 }
 for(const c of cards){c.confirmed=new Set(c.evidence.map(e=>e.pass)).size>=2;c.confidence=c.confirmed?Math.min(...c.evidence.map(e=>e.confidence)):0;}
 const enemies=[];
 for(const l of lines.filter(l=>l.region==="battlefield"&&finite(l.confidence)&&l.confidence>=80)){
   const m=normalized(l.text||"").match(/\b(\d{1,3})\s*\/\s*(\d{1,3})\b/u),value=m&&ratio(m);
   if(!value||boxOf(l).x0<meta.width*0.42)continue; // player/allies are not enemy HP candidates
   const b=boxOf(l);
   let e=enemies.find(e=>Math.abs(e.bbox.x0-b.x0)<meta.width*.035&&Math.abs(e.bbox.y0-b.y0)<meta.height*.05);
   if(!e){e={hpCandidates:[],bbox:b,evidence:[],intent:null,block:null,statuses:null};enemies.push(e);}
   e.hpCandidates.push(value);e.evidence.push(evidence(l,l.region,l.pass));
 }
 for(const e of enemies){
   const values=new Set(e.hpCandidates.map(x=>JSON.stringify(x)));
   e.confirmed=values.size===1&&new Set(e.evidence.map(x=>x.pass)).size>=2;
   e.hp=e.confirmed?e.hpCandidates[0]:null;e.confidence=e.confirmed?Math.min(...e.evidence.map(x=>x.confidence)):0;
   delete e.hpCandidates;
 }
 const intentText=lines.filter(l=>l.region==="battlefield"&&/\d+\s*[x×]\s*\d+|攻击|attack|逃跑|escape/iu.test(l.text||"")).map(l=>evidence(l,l.region,l.pass));
 const missing=["player.block","completeHand","card.costsAndEffectiveValues","completeBattlefield","enemy.intentsAndBlock","statusesAndRelicEffects","exactGamePatch"];
 if(hp.value===null)missing.push("player.hp");if(energy.value===null)missing.push("player.energy");if(turn.value===null)missing.push("turn");
 return {schema:1,frameHash:meta.frameHash,width:meta.width,height:meta.height,
   player:{hp,energy,block:{value:null,reason:"absence of block is not zero"}},
   turn,hand:{cards:cards.sort((a,b)=>a.bbox.x0-b.bbox.x0),complete:false},
   enemies:enemies.sort((a,b)=>a.bbox.x0-b.bbox.x0),intentText,
   statuses:{value:null,reason:"icon effects/absence cannot be certified by text OCR"},
   gate:{status:"ABSTAIN",missing,reason:"Partial observations cannot establish all mechanics needed by the basic-card policy."}};
}
export function screenshotAdvice(observation) {
 if(!observation?.gate||observation.gate.status!=="COMPLETE")
   return {status:"ABSTAIN",errors:observation?.gate?.missing||["No pixel-derived state"],explanation:"No complete automatic state. Do not use OCR confidence as state completeness."};
 // A COMPLETE issuer has not been validated. Fail closed even if input claims completeness.
 return {status:"ABSTAIN",errors:["No validated complete-state recognizer is installed."]};
}
export function compareObservations(before,after) {
 if(!before?.frameHash||!after?.frameHash||before.frameHash===after.frameHash)
   return {status:"INCONCLUSIVE",reason:"Two different frame hashes are required.",realActionVerified:false};
 const changes=[],unknown=[];
 for(const key of ["hp","energy"]){
   const a=before.player?.[key]?.value,b=after.player?.[key]?.value;
   if(!a||!b){unknown.push("player."+key);continue;}
   if(a.max!==b.max){unknown.push("player."+key+": maximum changed");continue;}
   if(a.current!==b.current)changes.push({field:"player."+key,from:a.current,to:b.current,delta:b.current-a.current});
 }
 const a=before.turn?.value,b=after.turn?.value;
 if(a!==null&&a!==undefined&&b!==null&&b!==undefined){if(a!==b)changes.push({field:"turn",from:a,to:b});}else unknown.push("turn");
 // Enemy identity cannot be inferred safely from list order after a death/summon.
 unknown.push("enemyIdentity","completeHand","statuses");
 return {status:changes.length?"OBSERVED_CHANGE":"INCONCLUSIVE",changes,unknown,realActionVerified:false,
   reason:"Pixel-derived field changes do not prove the requested action, its cause or a live game loop."};
}
export async function recognizeScreenshot(canvas,worker,frameHash,{onProgress=()=>{}}={}) {
 const scans=[];
 for(const region of REGIONS){
   const [rx,ry,rw,rh]=region.box,x=Math.floor(rx*canvas.width),y=Math.floor(ry*canvas.height);
   const width=Math.min(canvas.width-x,Math.ceil(rw*canvas.width)),height=Math.min(canvas.height-y,Math.ceil(rh*canvas.height));
   for(const pass of ["color","contrast"]){
     const crop=document.createElement("canvas"),scale=2;
     crop.width=width*scale;crop.height=height*scale;
     const ctx=crop.getContext("2d",{willReadFrequently:true});ctx.drawImage(canvas,x,y,width,height,0,0,crop.width,crop.height);
     if(pass==="contrast"){
       const pixels=ctx.getImageData(0,0,crop.width,crop.height);
       for(let i=0;i<pixels.data.length;i+=4){
         const v=.299*pixels.data[i]+.587*pixels.data[i+1]+.114*pixels.data[i+2];
         const g=Math.min(255,Math.max(0,(v-90)*1.8));
         pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=g;
       }ctx.putImageData(pixels,0,0);
     }
     await worker.setParameters({tessedit_pageseg_mode:region.psm});
     const {data}=await worker.recognize(crop,{}, {text:true,blocks:true});
     const lines=flatten(data).map(l=>({...l,bbox:{x0:x+l.bbox.x0/scale,y0:y+l.bbox.y0/scale,x1:x+l.bbox.x1/scale,y1:y+l.bbox.y1/scale}}));
     scans.push({region:region.id,pass,lines,text:data.text,confidence:data.confidence});
     onProgress(region.id,pass);
   }
 }
 return {observation:parseObservations(scans,{width:canvas.width,height:canvas.height,frameHash}),scans};
}
