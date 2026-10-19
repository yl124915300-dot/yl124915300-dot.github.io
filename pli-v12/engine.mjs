// Deterministic SYNTHETIC simulator. No network, real-account, or payment executor.
export const VERSION="1.2.0", MODE="LLM_NOT_CONNECTED";
export const profiles=[
{id:"S1",label:"纽约通勤者",county:"NYC061",budgetCents:10000},
{id:"S2",label:"西雅图配送员",county:"WAC033",budgetCents:10000},
{id:"S3",label:"洛杉矶旅客",county:"CAC037",budgetCents:10000},
{id:"S4",label:"旧金山家庭",county:"CAC075",budgetCents:10000},
{id:"S5",label:"迈阿密店主",county:"FLC086",budgetCents:10000},
{id:"S6",label:"芝加哥学生",county:"ILC031",budgetCents:10000}
].map(p=>({...p,classification:"SYNTHETIC"}));
const kinds=["plan","expense","constraint","cancel","note"];
const categories=["travel","work","household","study","other"];
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const plain=o=>o!==null&&typeof o==="object"&&!Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype;
const keys=(o,allowed)=>plain(o)&&Object.keys(o).every(k=>allowed.includes(k));
const id=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,80}$/.test(x);
const dt=x=>typeof x==="string"&&/^\d{4}-\d\d-\d\dT/.test(x)&&Number.isFinite(Date.parse(x));
const clone=x=>JSON.parse(JSON.stringify(x));
export const canonical=x=>JSON.stringify(x);
export function validateEvent(e){
 if(!keys(e,["id","kind","classification","evidence","source","at","expiresAt","profileIds","county","text","payload","operation"]))throw Error("EVENT_SCHEMA");
 if(!id(e.id)||!kinds.includes(e.kind)||e.classification!=="SYNTHETIC"||e.evidence!=="SYNTHETIC"||e.source!=="user_simulation"||e.operation!=="simulate")throw Error("SYNTHETIC_ONLY");
 if(!dt(e.at)||!dt(e.expiresAt)||Date.parse(e.expiresAt)<=Date.parse(e.at)||Date.parse(e.expiresAt)-Date.parse(e.at)>604800000)throw Error("TIME_SCHEMA");
 if(!Array.isArray(e.profileIds)||e.profileIds.length<1||e.profileIds.length>6||new Set(e.profileIds).size!==e.profileIds.length||!e.profileIds.every(x=>profiles.some(p=>p.id===x)))throw Error("PROFILE_SCHEMA");
 if(typeof e.county!=="string"||!/^([A-Z]{2}C\d{3}|\*)$/.test(e.county))throw Error("REGION_SCHEMA");
 if(typeof e.text!=="string"||!e.text.trim()||e.text.length>6000)throw Error("TEXT_SCHEMA");
 const p=e.payload;
 if(!keys(p,["amountCents","category","slot","targetId","blocked"]))throw Error("PAYLOAD_SCHEMA");
 if(own(p,"amountCents")&&(!Number.isSafeInteger(p.amountCents)||p.amountCents<0||p.amountCents>100000000))throw Error("AMOUNT_SCHEMA");
 if(own(p,"category")&&!categories.includes(p.category))throw Error("CATEGORY_SCHEMA");
 if(own(p,"slot")&&(!id(p.slot)))throw Error("SLOT_SCHEMA");
 if(own(p,"targetId")&&!id(p.targetId))throw Error("TARGET_SCHEMA");
 if(own(p,"blocked")&&typeof p.blocked!=="boolean")throw Error("BLOCK_SCHEMA");
 const expected={plan:["amountCents","category","slot"],expense:["amountCents","category"],constraint:["category","blocked"],cancel:["targetId"],note:[]}[e.kind];
 if(Object.keys(p).length!==expected.length||!expected.every(k=>own(p,k)))throw Error("KIND_PAYLOAD_SCHEMA");
 return clone(e);
}
export function fresh(){return {version:VERSION,classification:"SYNTHETIC",journal:[]};}
function expire(s,now,cause){
 for(const p of Object.values(s.people)){
  for(const c of Object.values(p.constraints))if(c.active&&Date.parse(c.expiresAt)<=now){c.active=false;s.history.push({cause,profileId:p.id,targetId:c.id,change:"CONSTRAINT_EXPIRED"});}
  for(const plan of Object.values(p.plans))if(plan.status==="PROPOSED"&&Date.parse(plan.expiresAt)<=now){plan.status="EXPIRED";plan.lastCause=cause;s.history.push({cause,profileId:p.id,targetId:plan.id,change:"EXPIRED"});}
 }
}
function available(p){return p.budgetCents-p.spentCents-Object.values(p.plans).filter(x=>x.status==="PROPOSED").reduce((a,x)=>a+x.amountCents,0);}
export function project(memory,now){
 validateMemory(memory);
 if(!dt(now))throw Error("INVALID_CLOCK");
 const s={version:VERSION,mode:MODE,asOf:now,classification:"SYNTHETIC",people:Object.fromEntries(profiles.map(p=>[p.id,{...p,spentCents:0,plans:{},constraints:{},expenses:{}}])),decisions:[],history:[],realTransactions:0,netIncome:0};
 for(const entry of memory.journal){
  if(Date.parse(entry.observedAt)>Date.parse(now))continue;
  const e=entry.event,t=Date.parse(entry.observedAt);
  expire(s,t,e.id);
  const timeBad=Date.parse(e.at)>t+60000||Date.parse(e.expiresAt)<=t;
  for(const pid of e.profileIds){
   const p=s.people[pid],before={spentCents:p.spentCents,availableCents:available(p)};
   let status="RECORDED",reason="synthetic_input_only",changed=[];
   if(timeBad){status="REJECTED_TIME";reason="expired_or_future";}
   else if(e.county!=="*"&&e.county!==p.county){status="NO_MATCH";reason="exact_county_mismatch";}
   else if(e.kind==="note"){status="NEEDS_CLARIFICATION";reason="LLM_NOT_CONNECTED_no_free_text_inference";}
   else if(e.kind==="plan"){
    const conflict=Object.values(p.plans).some(x=>x.status==="PROPOSED"&&x.slot===e.payload.slot);
    const blocked=Object.values(p.constraints).some(x=>x.active&&x.category===e.payload.category);
    if(blocked){status="BLOCKED_CONSTRAINT";reason="active_constraint";}
    else if(conflict){status="BLOCKED_CONFLICT";reason="slot_already_reserved";}
    else if(e.payload.amountCents>available(p)){status="BLOCKED_BUDGET";reason="insufficient_simulated_budget";}
    else{status="PROPOSED";reason="within_budget_and_constraints";}
    p.plans[e.id]={id:e.id,...clone(e.payload),status,expiresAt:e.expiresAt,createdBy:e.id,lastCause:e.id,text:e.text};changed.push(e.id);
   }else if(e.kind==="expense"){
    if(e.payload.amountCents>p.budgetCents-p.spentCents){status="BLOCKED_BUDGET";reason="simulated_spend_exceeds_total";}
    else{
     p.expenses[e.id]={id:e.id,...clone(e.payload),active:true};
     p.spentCents+=e.payload.amountCents;status="SIMULATED_EXPENSE";
     // Revoke newest reserved plans first; no actual money moves.
     for(const plan of Object.values(p.plans).reverse()){
      if(available(p)>=0)break;
      if(plan.status==="PROPOSED"){plan.status="REVOKED_BUDGET";plan.lastCause=e.id;changed.push(plan.id);}
     }
    }
   }else if(e.kind==="constraint"){
    p.constraints[e.id]={id:e.id,...clone(e.payload),active:e.payload.blocked,expiresAt:e.expiresAt};
    if(!e.payload.blocked)for(const c of Object.values(p.constraints))if(c.category===e.payload.category)c.active=false;
    if(e.payload.blocked)for(const plan of Object.values(p.plans))if(plan.status==="PROPOSED"&&plan.category===e.payload.category){plan.status="REVOKED_CONSTRAINT";plan.lastCause=e.id;changed.push(plan.id);}
    status=e.payload.blocked?"CONSTRAINT_ADDED":"CONSTRAINT_CLEARED";
   }else if(e.kind==="cancel"){
    const target=e.payload.targetId;
    if(p.plans[target]){p.plans[target].status="CANCELLED";p.plans[target].lastCause=e.id;changed.push(target);status="CANCELLED";}
    else if(p.expenses[target]?.active){p.spentCents-=p.expenses[target].amountCents;p.expenses[target].active=false;changed.push(target);status="SIMULATED_REFUND";}
    else if(p.constraints[target]?.active){p.constraints[target].active=false;changed.push(target);status="CONSTRAINT_CANCELLED";}
    else {status="TARGET_NOT_ACTIVE";reason="unknown_or_already_cancelled";}
   }
   const after={spentCents:p.spentCents,availableCents:available(p)};
   const d={id:e.id+":"+pid,eventId:e.id,profileId:pid,status,reason,source:{classification:"SYNTHETIC",source:e.source,eventId:e.id},uncertainty:"用户输入未经现实核验；规则仅理解结构化字段。",before,after,changed,externalExecution:false};
   s.decisions.push(d);s.history.push({cause:e.id,profileId:pid,change:status,before,after,targets:changed});
  }
 }
 expire(s,Date.parse(now),"clock:"+now);
 for(const p of Object.values(s.people)){p.availableCents=available(p);p.reservedCents=p.budgetCents-p.spentCents-p.availableCents;}
 return s;
}
export function append(memory,event,now){
 validateMemory(memory);
 const e=validateEvent(event);
 if(!dt(now))throw Error("INVALID_CLOCK");
 if(memory.journal.length>=300)throw Error("JOURNAL_LIMIT_300");
 if(memory.journal.some(x=>x.event.id===e.id))throw Error("DUPLICATE_EVENT");
 const last=memory.journal.at(-1);
 if(last&&Date.parse(now)<Date.parse(last.observedAt))throw Error("CLOCK_ROLLBACK");
 const next=clone(memory);next.journal.push({event:e,observedAt:now});
 return {memory:next,state:project(next,now)};
}
export function validateMemory(m){
 if(!keys(m,["version","classification","journal"])||m.version!==VERSION||m.classification!=="SYNTHETIC"||!Array.isArray(m.journal)||m.journal.length>300)throw Error("MEMORY_SCHEMA");
 let prior=-Infinity;const ids=new Set();
 for(const x of m.journal){
  if(!keys(x,["event","observedAt"])||!dt(x.observedAt)||Date.parse(x.observedAt)<prior)throw Error("JOURNAL_SCHEMA");
  validateEvent(x.event);if(ids.has(x.event.id))throw Error("DUPLICATE_EVENT");
  ids.add(x.event.id);prior=Date.parse(x.observedAt);
 }
 return true;
}
export function restore(raw){if(typeof raw!=="string"||raw.length>2000000)throw Error("CHECKPOINT_SIZE");const m=JSON.parse(raw);validateMemory(m);return clone(m);}
export function checkpoint(m){validateMemory(m);return JSON.stringify(m);}
export function gateExternalAction(){return {allowed:false,code:"DENIED_EXTERNAL_EXECUTION",executed:false};}
