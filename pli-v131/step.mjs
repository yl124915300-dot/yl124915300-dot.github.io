import fs from "node:fs";
import {seed,snapshot,extract,controls,apply} from "./gate.mjs";
import {apply as legacyApply,seed as legacySeed} from "../pli-v13/gate.mjs";
const [op,now]=process.argv.slice(2),v=op==="init"?{}:JSON.parse(fs.readFileSync(0,"utf8"));
if(op==="init")console.log(JSON.stringify({memory:seed()}));
if(op==="prepare"){const r=controls(v.memory,v.input,now);console.log(JSON.stringify({...r,parsed:extract(v.input)}));}
if(op==="apply")console.log(JSON.stringify(apply(v.memory,v.input,v.output,now)));
if(op==="legacy"){const r=legacyApply(v.memory,{id:v.input.id,text:v.input.text},v.output,now);console.log(JSON.stringify({...r,code:r.decisions?.[0]?.code||r.status}));}
if(op==="state")console.log(JSON.stringify(snapshot(v.memory,now)));
