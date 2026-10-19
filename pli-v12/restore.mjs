import fs from "node:fs";import assert from "node:assert/strict";import crypto from "node:crypto";
import {restore,project,append,checkpoint} from "./engine.mjs";import {event} from "./scenarios.mjs";
const checks=[];
for(const name of ["travel","household"]){
 const raw=fs.readFileSync("pli-v12/state/"+name+".json","utf8"),saved=JSON.parse(raw),m=restore(JSON.stringify(saved.memory));
 assert.deepEqual(project(m,saved.asOf),saved.expected);checks.push({name:name+" separate-job exact recovery",result:"PASS"});
 for(const [i,frame]of saved.frames.entries())assert.deepEqual(project({...m,journal:m.journal.slice(0,i+1)},frame.at),frame.state);
 checks.push({name:name+" all causal frames recover",result:"PASS"});
 const r=append(m,event("after_restore_"+name,"note",{}, {profileIds:[name==="travel"?"S1":"S4"]},saved.asOf),saved.asOf);
 assert.equal(r.memory.journal.length,m.journal.length+1);checks.push({name:name+" continues after recovery",result:"PASS"});
 assert.equal(checkpoint(restore(checkpoint(m))),checkpoint(m));checks.push({name:name+" serialization roundtrip",result:"PASS"});
 console.log(name+" CHECKPOINT_SHA256 "+crypto.createHash("sha256").update(raw).digest("hex"));
}
const report={at:new Date().toISOString(),total:checks.length,failed:0,independentCloudJob:true,checks};
fs.writeFileSync("pli-v12/evidence/restore.json",JSON.stringify(report,null,2));console.log(JSON.stringify(report));
