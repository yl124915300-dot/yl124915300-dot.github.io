/* Only compares normalized detector boxes across frames. Never infers a cat action. */
(function(root){"use strict";
function initial(){return {samples:[],status:"no_evidence",distance:null,seconds:0,count:0};}
function advance(previous,detections,width,height,now){
 const time=Number(now),W=Number(width),H=Number(height);
 if(!Number.isFinite(time)||!Number.isFinite(W)||!Number.isFinite(H)||W<=0||H<=0)return {...initial(),status:"invalid_frame"};
 const cats=(Array.isArray(detections)?detections:[]).filter(d=>{
  const c=d&&Array.isArray(d.categories)?d.categories[0]:null;
  return c&&String(c.categoryName||c.displayName||"").toLowerCase()==="cat"&&Number(c.score)>=.60;
 });
 if(cats.length>1)return {...initial(),status:"multiple_cats"};
 if(!cats.length)return {...initial(),status:"no_cat"};
 const b=cats[0].boundingBox||{};
 if(![b.originX,b.originY,b.width,b.height].every(Number.isFinite)||b.width<=0||b.height<=0)return {...initial(),status:"invalid_box"};
 const point={x:Math.max(0,Math.min(1,(b.originX+b.width/2)/W)),y:Math.max(0,Math.min(1,(b.originY+b.height/2)/H)),time};
 const prev=previous&&Array.isArray(previous.samples)?previous.samples:[];
 const last=prev.at(-1);
 let samples=last&&time>last.time&&time-last.time<=4500?prev.filter(p=>time-p.time<=10000):[];
 samples=[...samples,point].slice(-6);
 if(samples.length<3||time-samples[0].time<3000)return {samples,status:"collecting",distance:null,seconds:0,count:samples.length};
 const a=samples[0],z=samples.at(-1),distance=Math.hypot(z.x-a.x,z.y-a.y);
 return {samples,status:distance>=.12?"frame_position_shift":"no_large_frame_shift",distance:Math.round(distance*1000)/1000,seconds:Math.round((z.time-a.time)/100)/10,count:samples.length};
}
const api={initial,advance};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
root.CatTalesMotionPolicy=api;
})(typeof window!=="undefined"?window:globalThis);
