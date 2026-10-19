// Boundary only: no credential field, fetch call, or enabled remote provider.
export class DisconnectedProvider {
 status="LLM_NOT_CONNECTED";
 async reason(){return {status:this.status,proposals:[],claims:[],uncertainty:["没有已核验的免费云端模型连接。"]};}
}
const fields=(o,a)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).length===a.length&&a.every(k=>Object.hasOwn(o,k));
export function validateOutput(value,context){
 const fail=()=>{throw Error("UNTRUSTED_MODEL_OUTPUT");};
 if(!fields(value,["status","proposals","claims","uncertainty"])||!["LLM_NOT_CONNECTED","UNVERIFIED_MODEL_OUTPUT"].includes(value.status))fail();
 if(!Array.isArray(value.proposals)||value.proposals.length>6||!Array.isArray(value.claims)||value.claims.length>20||!Array.isArray(value.uncertainty)||!value.uncertainty.length||!value.uncertainty.every(x=>typeof x==="string"&&x.length<2000))fail();
 for(const p of value.proposals){
  if(!fields(p,["action","profileId","costCents","sourceEventIds","uncertainty"])||p.action!=="simulate_plan"||!context.profileIds.includes(p.profileId)||!Number.isSafeInteger(p.costCents)||p.costCents<0||p.costCents>(context.availableCents[p.profileId]??0)||typeof p.uncertainty!=="string"||!p.uncertainty)fail();
  if(!Array.isArray(p.sourceEventIds)||!p.sourceEventIds.length||!p.sourceEventIds.every(x=>context.eventIds.includes(x)))fail();
 }
 for(const c of value.claims)if(!fields(c,["text","sourceEventIds","uncertainty"])||typeof c.text!=="string"||c.text.length>2000||typeof c.uncertainty!=="string"||!c.uncertainty||!Array.isArray(c.sourceEventIds)||!c.sourceEventIds.length||!c.sourceEventIds.every(x=>context.eventIds.includes(x)))fail();
 if(value.status==="LLM_NOT_CONNECTED"&&(value.proposals.length||value.claims.length))fail();
 return structuredClone(value);
}
export const providerEvidence={
 status:"LLM_NOT_CONNECTED",
 checkedAt:"2026-10-19",
 checkedTools:"No callable general text-inference endpoint in the connected tool inventory",
 githubModels:"Retired July 30, 2026 according to current official documentation",
 source:"https://docs.github.com/en/github-models",
 caveat:"No inference request succeeded. This does not prove every possible external service is unavailable. No new service, agreement, key or paid resource was created."
};
