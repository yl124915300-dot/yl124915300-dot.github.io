// Screenshot evidence and a deliberately narrow, human-reviewed basic-card policy.
export function blankState() {
  return {game:"STS2",patch:"",encounter:"",turn:null,player:{hp:null,block:null,energy:null},
    enemies:[],hand:[],review:{completeBattlefield:false,completeHand:false,plainMechanics:false}};
}
const int=(n,min=0,max=999)=>Number.isInteger(n)&&n>=min&&n<=max;
export function validate(s) {
  const errors=[];
  if(s?.game!=="STS2"||!s.patch?.trim()||!s.encounter?.trim()||!int(s.turn,1)) errors.push("Game, patch, encounter and turn are required.");
  if(!s?.player||!int(s.player.hp,1)||!int(s.player.block)||!int(s.player.energy,0,10)) errors.push("Check player HP, block and energy.");
  if(!Array.isArray(s?.enemies)||s.enemies.length<1||s.enemies.length>5) errors.push("Confirm every living enemy (1–5).");
  if(!Array.isArray(s?.hand)||s.hand.length>10) errors.push("Confirm the entire hand (0–10).");
  const ids=new Set();
  for(const e of Array.isArray(s?.enemies)?s.enemies:[]) {
    if(!e||typeof e!=="object"){errors.push("Invalid enemy entry.");continue;}
    if(typeof e.id!=="string"||!e.id||ids.has(e.id)) errors.push("Enemy IDs must be unique and stable within this encounter.");
    ids.add(e.id);
    if(!int(e.hp,1)||!int(e.block)||!int(e.attack)||!int(e.hits,0,20)||e.intent!=="attack") errors.push("Only fully confirmed, plain attack intents are supported.");
  }
  ids.clear();
  for(const c of Array.isArray(s?.hand)?s.hand:[]) {
    if(!c||typeof c!=="object"){errors.push("Invalid card entry.");continue;}
    if(typeof c.id!=="string"||!c.id||ids.has(c.id)) errors.push("Each card needs its own stable ID.");
    ids.add(c.id);
    if(!["Strike","Defend"].includes(c.name)||c.cost!==1||!int(c.value,1,50))
      errors.push("Only cost-1 Strike/Defend with screenshot-confirmed effective values are supported.");
  }
  if(!s?.review||!["completeBattlefield","completeHand","plainMechanics"].every(k=>s.review[k]===true))
    errors.push("Review the whole battlefield, whole hand and absence of mechanics outside this policy.");
  return [...new Set(errors)];
}
const copy=s=>JSON.parse(JSON.stringify(s));
function play(s,c,target) {
  const n=copy(s);n.player.energy-=c.cost;n.hand=n.hand.filter(x=>x.id!==c.id);
  if(c.name==="Defend") n.player.block+=c.value;
  else {
    const e=n.enemies.find(x=>x.id===target);
    const absorbed=Math.min(e.block,c.value);e.block-=absorbed;e.hp-=c.value-absorbed;
    n.enemies=n.enemies.filter(x=>x.hp>0);
  }
  return n;
}
const loss=s=>Math.max(0,s.enemies.reduce((v,e)=>v+e.attack*e.hits,0)-s.player.block);
function rank(s) {
  return [s.enemies.length===0?1:0,-loss(s),-s.enemies.reduce((v,e)=>v+e.hp+e.block,0),s.player.energy];
}
function better(a,b){for(let i=0;i<a.length;i++){if(a[i]!==b[i])return a[i]>b[i];}return false;}
export function plan(s) {
  const errors=validate(s);if(errors.length)return {status:"ABSTAIN",errors};
  let best={state:s,actions:[],rank:rank(s)},visited=0,overflow=false;
  const seen=new Map();
  function search(n,actions) {
    if(++visited>20000){overflow=true;return;}
    const key=JSON.stringify([n.player,n.enemies,n.hand.map(c=>c.id).sort()]);
    if(seen.has(key))return;seen.set(key,true);
    const r=rank(n);if(better(r,best.rank))best={state:n,actions,rank:r};
    const unique=new Set();
    for(const c of n.hand) {
      if(c.cost>n.player.energy||!n.enemies.length)continue;
      const sig=JSON.stringify([c.name,c.value]);if(unique.has(sig))continue;unique.add(sig);
      for(const target of c.name==="Strike"?n.enemies.map(e=>e.id):[null]) {
        search(play(n,c,target),[...actions,{cardId:c.id,name:c.name,target,value:c.value}]);
        if(overflow)return;
      }
    }
  }
  search(s,[]);
  if(overflow)return {status:"ABSTAIN",errors:["Search limit reached. No partial result is presented."]};
  if(loss(best.state)>=s.player.hp)return {status:"ABSTAIN",errors:["No surviving supported line under the confirmed attack intents. Human review required."]};
  if(!best.actions.length)return {status:"ABSTAIN",errors:["No supported beneficial play. End Turn and other cards need human judgment."]};
  const action=best.actions[0],c=s.hand.find(x=>x.id===action.cardId);
  return {status:"REVIEWED_CANDIDATE",action,expected:play(s,c,action.target),projectedDamageThisTurn:loss(best.state),
    explanation:"First step of the lowest immediate-damage basic-card line; ties prefer less enemy HP. No future turns, gold, escape, relics, powers, summons or random effects modeled."};
}
const signature=s=>JSON.stringify({game:s.game,patch:s.patch,encounter:s.encounter,turn:s.turn,player:s.player,
  enemies:[...s.enemies].sort((a,b)=>a.id.localeCompare(b.id)),hand:[...s.hand].sort((a,b)=>a.id.localeCompare(b.id))});
export function compare(expected,observed) {
  // A terminal screen cannot be inferred from a missing enemy list.
  const errors=validate(observed);
  if(errors.length)return {status:"ABSTAIN",errors};
  return {status:signature(expected)===signature(observed)?"HUMAN_REVIEWED_MATCH":"MISMATCH"};
}
export class Session {
  constructor(){this.revision=0;this.frame=null;this.advice=null;this.pending=null;this.events=[];this.previousHash=null;}
  revoke(reason){this.revision++;this.advice=null;this.events.push({type:"revoke",reason,at:Date.now()});return this.revision;}
  invalidate(reason){if(this.frame)this.frame.valid=false;return this.revoke(reason);}
  begin(){return this.invalidate("New image or capture attempt");}
  acceptFrame(token,frame){
    if(token!==this.revision)return false;
    this.previousHash=this.frame?.hash||this.previousHash;
    this.frame={...frame,valid:true};this.events.push({type:"frame",...frame});return true;
  }
  confirm(token,state,now=Date.now()){
    this.advice=null;
    if(this.pending)return {status:"ABSTAIN",errors:["Compare the previous action outcome before requesting another candidate."]};
    if(token!==this.revision||!this.frame?.valid) return {status:"ABSTAIN",errors:["The image changed. Review it again."]};
    if(this.frame.source!=="display"||now-this.frame.at>15000||now<this.frame.at)
      return {status:"ABSTAIN",errors:["Advice requires a shared-window frame captured within 15 seconds. File imports are OCR/replay evidence only."]};
    const result=plan(state);
    if(result.status==="REVIEWED_CANDIDATE"){this.advice={...result,revision:token,expires:this.frame.at+15000,state:copy(state),frameHash:this.frame.hash};
      this.events.push({type:"candidate",frameHash:this.frame.hash,action:copy(result.action),expected:copy(result.expected),humanTranscription:true});}
    return result;
  }
  startAction(now=Date.now()){
    if(!this.advice||this.advice.revision!==this.revision||now>this.advice.expires){this.revoke("Expired");return false;}
    this.pending={expected:this.advice.expected,before:this.frame.hash,encounter:this.advice.state.encounter};
    this.events.push({type:"player_action_pending",frameHash:this.frame.hash,action:copy(this.advice.action),at:now});
    this.revoke("Waiting for player action and a new image");return true;
  }
  verify(state,now=Date.now()){
    if(!this.pending||!this.frame?.valid||this.frame.source!=="display"||this.frame.hash===this.pending.before||
       now-this.frame.at>15000||now<this.frame.at)return {status:"ABSTAIN",errors:["A fresh, different shared-window frame is required."]};
    const result=compare(this.pending.expected,state);
    this.events.push({type:"post_action",before:this.pending.before,after:this.frame.hash,...result});
    this.pending=null;this.revoke("Post-action check complete; review next decision");return result;
  }
  report(){return {schema:1,scope:"Research capture add-on; not recovered V5 integration",real_game_acceptance:"NOT_RUN",
    independent_player_review:"NOT_RUN",events:this.events};}
}
