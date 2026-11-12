// Independent cloud restoration is an engineering check, never semantic third-party review.
import fs from "node:fs";
import assert from "node:assert/strict";
import {seed,controls,apply} from "./gate.mjs";
import {apply as legacyApply} from "../pli-v13/gate.mjs";
const checks=[];const check=(name,f)=>{try{f();checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.message});}};
const arms=["baseline","fixed-sampling","fixed-greedy"];
for(const arm of arms){
 const dir=new URL("./evidence/"+arm+"/",import.meta.url);
 const rows=JSON.parse(fs.readFileSync(new URL("results.json",dir)));
 const final=JSON.parse(fs.readFileSync(new URL("checkpoint.json",dir)));
 let m=seed();
 check(arm+": thirty actual model attempts",()=>assert.equal(rows.length,30));
 for(const row of rows){
  const p=controls(m,row.input,row.at);m=p.memory;
  check(arm+":"+row.input.id+": continuous checkpoint",()=>assert.deepEqual(m,row.checkpoint_before));
  check(arm+":"+row.input.id+": continuous projection",()=>assert.deepEqual(p.state,row.before));
  if(row.model_output){
   let out;
   if(arm==="baseline"){out=legacyApply(m,{id:row.input.id,text:row.input.text},row.model_output,row.at);out.code=out.decisions?.[0]?.code||out.status;}
   else out=apply(m,row.input,row.model_output,row.at);
   check(arm+":"+row.input.id+": raw output deterministically restored",()=>assert.deepEqual(out,row.gate));m=out.memory;
  }
  check(arm+":"+row.input.id+": no external actions or cash",()=>{assert.equal(row.gate.externalExecution,false);assert.equal(row.gate.state.realTransactions,0);assert.equal(row.gate.state.netIncome,0);});
 }
 check(arm+": final checkpoint",()=>assert.deepEqual(m,final.memory));
}
const report={kind:"SEPARATE_CLOUD_RAW_OUTPUT_REPLAY_NOT_SEMANTIC_REVIEW",passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,checks};
fs.writeFileSync(new URL("./evidence/restoration.json",import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.passed,failed:report.failed}));if(report.failed)process.exitCode=1;
