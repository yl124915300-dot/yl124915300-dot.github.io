import {fresh,append,project,gateExternalAction} from "../pli-v12/engine.mjs";
import {validateOutput} from "../pli-v12/provider.mjs";
const exact=(x,ks)=>x&&Object.getPrototypeOf(x)===Object.prototype&&Object.keys(x).length===ks.length&&ks.every(k=>Object.hasOwn(x,k));
const str=(x,n)=>typeof x==="string"&&x.length>0&&x.length<=n;
export function seed(now){
 const e={id:"initial_household_constraint",kind:"constraint",classification:"SYNTHETIC",evidence:"SYNTHETIC",source:"user_simulation",operation:"simulate",at:now,expiresAt:new Date(Date.parse(now)+7200000).toISOString(),profileIds:["S1"],county:"*",text:"SYNTHETIC household activity is blocked pending clarification.",payload:{category:"household",blocked:true}};
 return append(fresh(),e,now).memory;
}
export function validate(v,text){
 if(!exact(v,["facts","assumptions","unknowns","impact","candidates"]))throw Error("SCHEMA");
 if(!Array.isArray(v.facts)||v.facts.length<1||v.facts.length>3||!v.facts.every(x=>str(x,180)&&text.includes(x)))throw Error("UNGROUNDED_FACT");
 for(const k of ["assumptions","unknowns"])if(!Array.isArray(v[k])||v[k].length>(k==="unknowns"?3:2)||!v[k].every(x=>str(x,160)))throw Error("SCHEMA");
 if(!v.unknowns.length||!str(v.impact,220)||!Array.isArray(v.candidates)||!v.candidates.length||v.candidates.length>2)throw Error("SCHEMA");
 for(const c of v.candidates)if(!exact(c,["action","description","category","cost_cents","evidence_quote","rationale"])||!["simulate_plan","ask","pay","order","send_message","cancel_real"].includes(c.action)||!["travel","work","household","study","other"].includes(c.category)||!Number.isSafeInteger(c.cost_cents)||c.cost_cents< -1||c.cost_cents>100000||!str(c.description,150)||!str(c.rationale,180)||typeof c.evidence_quote!=="string"||c.evidence_quote.length>180)throw Error("SCHEMA");
 return v;
}
export function apply(memory,input,raw,now){
 const before=project(memory,now); let v;
 try{v=validate(raw,input.text);}catch(e){return {memory,state:before,status:"REJECTED_MODEL_OUTPUT",error:e.message,decisions:[],externalExecution:false};}
 const decisions=[];let next=memory;
 for(const [i,c] of v.candidates.entries()){
  if(c.action!=="simulate_plan"){decisions.push({candidate:i,code:c.action==="ask"?"NEEDS_CLARIFICATION":gateExternalAction().code,executed:false});continue;}
  const quote=c.evidence_quote;
  if(!quote||!input.text.includes(quote)){decisions.push({candidate:i,code:"REJECTED_EVIDENCE",executed:false});continue;}
  const prices=[...quote.matchAll(/\$(\d+(?:\.\d{1,2})?)/g)].map(x=>Math.round(Number(x[1])*100));
  const supported=c.cost_cents===0?(/\bfree\b|\$0\b/i.test(quote)):prices.includes(c.cost_cents);
  if(c.cost_cents<0||!supported){decisions.push({candidate:i,code:"REJECTED_UNKNOWN_OR_UNSUPPORTED_COST",executed:false});continue;}
  const current=project(next,now),pid="S1",eid=input.id+"_"+i;
  // V1.2 provider validates provenance and budget, then unchanged V1.2 rules enforce constraints/conflicts.
  try{validateOutput({status:"UNVERIFIED_MODEL_OUTPUT",proposals:[{action:"simulate_plan",profileId:pid,costCents:c.cost_cents,sourceEventIds:[input.id],uncertainty:v.unknowns.join("; ")}],claims:v.facts.map(text=>({text,sourceEventIds:[input.id],uncertainty:"SYNTHETIC input quote; no real-world verification"})),uncertainty:v.unknowns},{profileIds:[pid],availableCents:{[pid]:current.people[pid].availableCents},eventIds:[input.id]});}
  catch{decisions.push({candidate:i,code:"REJECTED_V12_PROVIDER_BUDGET_OR_SCHEMA",executed:false});continue;}
  const event={id:eid,kind:"plan",classification:"SYNTHETIC",evidence:"SYNTHETIC",source:"user_simulation",operation:"simulate",at:now,expiresAt:new Date(Date.parse(now)+7200000).toISOString(),profileIds:[pid],county:"*",text:c.description,payload:{amountCents:c.cost_cents,category:c.category,slot:input.id}};
  const out=append(next,event,now);next=out.memory;
  decisions.push({candidate:i,code:out.state.decisions.at(-1).status,eventId:eid,executed:false,syntheticOnly:true,evidenceQuote:quote});
 }
 return {memory:next,state:project(next,now),status:"VALIDATED_UNTRUSTED_MODEL_OUTPUT",decisions,externalExecution:false};
}
