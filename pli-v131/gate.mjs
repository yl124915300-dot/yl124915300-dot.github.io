// V1.3.1 deterministic boundary. Only SYNTHETIC state; no external executor.
import {fresh,append,project,profiles} from "../pli-v12/engine.mjs";
import {validateOutput} from "../pli-v12/provider.mjs";
const clone=x=>JSON.parse(JSON.stringify(x));
const cats=["travel","work","household","study","other"];
const pid=x=>profiles.some(p=>p.id===x);
export function cents(s){
 if(typeof s!=="string"||!/^(0|[1-9]\d{0,5})(\.\d{1,2})?$/.test(s))throw Error("AMBIGUOUS_MONEY");
 const [a,b=""]=s.split(".");const n=Number(a)*100+Number(b.padEnd(2,"0"));
 if(!Number.isSafeInteger(n)||n>10000000)throw Error("MONEY_RANGE");return n;
}
export function category(object){
 const hits=[
 ["travel",/\b(bus|taxi|ferry|tram|train|shuttle|ticket|coach|ride)\b/i],
 ["work",/\b(workroom|studio|meeting|workspace|office|workshop room)\b/i],
 ["study",/\b(lesson|textbook|course|study|badge|printer|notes|tutoring)\b/i],
 ["household",/\b(kitchen|cleaning|laundry|household|cooking)\b/i]
 ].filter(([,r])=>r.test(object)).map(([c])=>c);
 return hits.length===1?hits[0]:hits.length?"ambiguous":"other";
}
const norm=s=>s.toLowerCase().trim().replace(/^(?:the|an?|confirmed)\s+/,"").replace(/\s+/g," ");
export function extract(input){
 const options=[],issues=[],seen=new Map();
 if(!input||!pid(input.profileId)||!Array.isArray(input.sources)||input.sources.length>12)return {options,issues:["INPUT_SCOPE"]};
 for(const [si,s] of input.sources.entries()){
  if(s.eventId!==input.id||s.profileId!==input.profileId||s.kind!=="SYNTHETIC_INPUT_QUOTE"||s.status!=="known"||typeof s.id!=="string"||typeof s.text!=="string"||!input.text.includes(s.text)){
   issues.push("UNVERIFIED_OR_WRONG_SCOPE_SOURCE:"+si);continue;
  }
  const clauses=s.text.split(/(?<=[.!?])\s+|;\s*|,\s*|\s+(?:and|while|but)\s+/i);
  for(const [ci,clause] of clauses.entries()){
   // Narrow explicit object-price syntax. All other money mentions remain unparsed.
   const m=/^(?:the\s+|a\s+|an\s+)?([A-Za-z][A-Za-z0-9 -]{1,60}?)\s+(?:costs|is priced at)\s+(\$(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?|free)\.?$/i.exec(clause.trim());
   const f=/^(?:the\s+|a\s+|an\s+)?([A-Za-z][A-Za-z0-9 -]{1,60}?)\s+is\s+free\.?$/i.exec(clause.trim());
   if(!m&&!f){if(/\$|\bfree\b/i.test(clause))issues.push("UNPARSED_PRICE:"+s.id+":"+ci);continue;}
   const object=norm((m||f)[1]),cat=category(object);
   if(/\b(or|maybe|probably|about|approximately|not|unknown|refund|balance|deposit|discount)\b/i.test(object)||cat==="ambiguous"){issues.push("AMBIGUOUS_OBJECT");continue;}
   let amount;try{amount=!m||m[2].toLowerCase()==="free"?0:cents(m[2].slice(1));}catch{issues.push("AMBIGUOUS_MONEY");continue;}
   const item={id:s.id+"_"+ci,sourceId:s.id,eventId:input.id,profileId:input.profileId,object,category:cat,amountCents:amount,quote:s.text,clause:clause.trim(),provenance:"SYNTHETIC_INPUT_QUOTE"};
   if(seen.has(object)&&seen.get(object)!==amount)issues.push("CONTRADICTORY_PRICE:"+object);
   seen.set(object,amount);options.push(item);
  }
 }
 if(new Set(input.sources.map(s=>s.id)).size!==input.sources.length)issues.push("DUPLICATE_SOURCE");
 return {options,issues};
}
const exact=(x,keys)=>x&&Object.getPrototypeOf(x)===Object.prototype&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
export function validate(v,input){
 if(!exact(v,["action","profileId","category","optionId","sourceIds","facts","assumptions","unknowns","targetPlanId","rationale"]))throw Error("SCHEMA");
 if(!["simulate_plan","ask","hold","revoke_plan","pay","order","send_message","cancel_real"].includes(v.action)||!cats.includes(v.category)||v.profileId!==input.profileId)throw Error("PROFILE_OR_SCHEMA");
 for(const k of ["optionId","targetPlanId","rationale"])if(typeof v[k]!=="string"||v[k].length>220)throw Error("SCHEMA");
 for(const k of ["sourceIds","facts","assumptions","unknowns"])if(!Array.isArray(v[k])||v[k].length>4||!v[k].every(s=>typeof s==="string"&&s.length<=240))throw Error("SCHEMA");
 if(!v.unknowns.length||!v.rationale)throw Error("SCHEMA");
 const sources=input.sources.filter(s=>s.eventId===input.id&&s.profileId===input.profileId&&s.kind==="SYNTHETIC_INPUT_QUOTE"&&s.status==="known"&&input.text.includes(s.text));
 if(!v.facts.every(q=>sources.some(s=>s.text===q)))throw Error("UNGROUNDED_FACT");
 if(!v.sourceIds.every(id=>sources.some(s=>s.id===id)))throw Error("UNGROUNDED_SOURCE");
 return v;
}
export function seed(){return fresh();}
export function snapshot(memory,now){return project(memory,now);}
function event(input,now,kind,payload,suffix=""){
 return {id:input.id+suffix,kind,classification:"SYNTHETIC",evidence:"SYNTHETIC",source:"user_simulation",operation:"simulate",at:now,expiresAt:new Date(Date.parse(now)+7200000).toISOString(),profileIds:[input.profileId],county:"*",text:input.text,payload};
}
// Explicit simulator ledger controls are separately validated input, never model-authored.
export function controls(memory,input,now){
 let m=memory;const log=[];
 for(const [i,c] of (input.controls||[]).entries()){
  if(!exact(c,["kind","quote","category"])||!cats.includes(c.category)||!input.text.includes(c.quote))throw Error("CONTROL_SCHEMA");
  if(c.kind==="expense"){
   const r=/^SYNTHETIC ledger: (S[1-6]) spent \$(\d+(?:\.\d{1,2})?)\.$/.exec(c.quote);
   if(!r||r[1]!==input.profileId)throw Error("CONTROL_SCOPE");
   const o=append(m,event(input,now,"expense",{amountCents:cents(r[2]),category:c.category},"_ctl"+i),now);m=o.memory;log.push(o.state.decisions.at(-1));
  }else if(c.kind==="constraint"){
   if(c.quote!=="SYNTHETIC constraint: "+input.profileId+" blocks "+c.category+".")throw Error("CONTROL_SCOPE");
   const o=append(m,event(input,now,"constraint",{category:c.category,blocked:true},"_ctl"+i),now);m=o.memory;log.push(o.state.decisions.at(-1));
  }else throw Error("CONTROL_KIND");
 }
 return {memory:m,state:project(m,now),log};
}
export function apply(memory,input,raw,now){
 const unchanged=(code,detail="")=>({memory,state:project(memory,now),code,detail,externalExecution:false,realTransactions:0,netIncomeUSD:0});
 let v;try{v=validate(raw,input);}catch(e){return unchanged("HOLD",e.message);}
 if(["pay","order","send_message","cancel_real"].includes(v.action))return unchanged("DENIED_EXTERNAL_EXECUTION");
 if(v.action==="ask"||v.action==="hold")return unchanged(v.action.toUpperCase());
 const parsed=extract(input);
 if(v.action==="revoke_plan"){
  const phrase="Revoke tentative plan "+v.targetPlanId+".";
  const p=project(memory,now).people[input.profileId].plans[v.targetPlanId];
  if(!input.text.includes(phrase)||!p||p.status!=="PROPOSED"||!v.sourceIds.length||!v.sourceIds.some(id=>input.sources.some(s=>s.id===id&&s.text===phrase))||v.optionId!=="")return unchanged("HOLD","UNSUPPORTED_REVOCATION");
  const o=append(memory,event(input,now,"cancel",{targetId:v.targetPlanId},"_revoke"),now);
  return {memory:o.memory,state:o.state,code:"REVOKED_TENTATIVE",externalExecution:false,realTransactions:0,netIncomeUSD:0};
 }
 if(parsed.issues.length)return unchanged("HOLD",parsed.issues.join(";"));
 const o=parsed.options.find(o=>o.id===v.optionId);
 if(!o||v.category!==o.category||v.targetPlanId!==""||!v.sourceIds.includes(o.sourceId)||!v.facts.includes(o.quote))return unchanged("HOLD","OPTION_CATEGORY_EVIDENCE_MISMATCH");
 const state=project(memory,now),p=state.people[input.profileId];
 if(Object.values(p.constraints).some(c=>c.active&&c.category===o.category))return unchanged("HOLD","BLOCKED_CONSTRAINT");
 if(o.amountCents>p.availableCents)return unchanged("HOLD","BLOCKED_BUDGET");
 try{validateOutput({status:"UNVERIFIED_MODEL_OUTPUT",proposals:[{action:"simulate_plan",profileId:input.profileId,costCents:o.amountCents,sourceEventIds:[input.id],uncertainty:v.unknowns.join("; ")}],claims:v.facts.map(text=>({text,sourceEventIds:[input.id],uncertainty:"Synthetic source quote only"})),uncertainty:v.unknowns},{profileIds:[input.profileId],availableCents:{[input.profileId]:p.availableCents},eventIds:[input.id]});}catch{return unchanged("HOLD","V12_PROVIDER");}
 const out=append(memory,event(input,now,"plan",{amountCents:o.amountCents,category:o.category,slot:input.slot||input.id},"_plan"),now);
 const code=out.state.decisions.at(-1).status;
 if(code!=="PROPOSED")return unchanged("HOLD",code);
 return {memory:out.memory,state:out.state,code:"PROPOSED",option:o,externalExecution:false,realTransactions:0,netIncomeUSD:0};
}
