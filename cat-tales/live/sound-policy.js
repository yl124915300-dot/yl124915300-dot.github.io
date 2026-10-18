/* YAMNet research-only candidate gate; scores are uncalibrated, not probabilities. */
(function(root){"use strict";
const CAT=/^(cat|meow|purr|caterwaul)$/i;
const NOISE=/speech|conversation|narration|television|radio|music|dog|bark|alarm|clock|crying|baby|infant|laugh|keyboard|typing|typewriter|telephone|ringing|siren|bell/i;
function assess(top,previousStreak,workerCatTop){
 const items=Array.isArray(top)?top.filter(x=>x&&typeof x.label==="string"&&Number.isFinite(x.score)):[];
 const first=items[0]||null;
 const negative=items.some(x=>NOISE.test(x.label)&&x.score>=.30);
 const catTop=Boolean(workerCatTop)&&Boolean(first)&&CAT.test(first.label)&&first.score>=.40&&!negative;
 const streak=catTop?Math.min(5,Math.max(0,Number(previousStreak)||0)+1):0;
 return {streak,catCandidate:streak>=2,negative,first};
}
const api={assess};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
root.CatTalesSoundPolicy=api;
})(typeof window!=="undefined"?window:globalThis);
