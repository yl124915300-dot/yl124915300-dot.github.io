/* Cat Tales v2.2 — object detection evidence gate. No behavioral or vocal inference. */
(function(root){"use strict";
function evaluate(detections,previousStreak){
 const items=(Array.isArray(detections)?detections:[]).map(d=>{
   const c=d&&Array.isArray(d.categories)?d.categories[0]:null;
   return c?{label:String(c.categoryName||c.displayName||"").toLowerCase(),score:Number(c.score)||0}:null;
 }).filter(Boolean);
 const cats=items.filter(x=>x.label==="cat").sort((a,b)=>b.score-a.score);
 const dogs=items.filter(x=>x.label==="dog").sort((a,b)=>b.score-a.score);
 const cat=cats[0]||null,dog=dogs[0]||null;
 const hit=!!(cat&&cat.score>=.60);
 const streak=hit?Math.min(5,Math.max(0,Number(previousStreak)||0)+1):0;
 return {catCandidate:streak>=2,catScore:cat?cat.score:null,oneFrameCat:hit,
   dogCandidate:!!(dog&&dog.score>=.60),dogScore:dog?dog.score:null,
   anyDetected:items.length>0,streak};
}
const api={evaluate};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
root.CatTalesVisionPolicy=api;
})(typeof window!=="undefined"?window:globalThis);
