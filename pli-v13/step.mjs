import {seed,apply} from "./gate.mjs";import {project} from "../pli-v12/engine.mjs";import fs from "node:fs";
const [op,now]=process.argv.slice(2);if(op==="init")console.log(JSON.stringify({memory:seed(now)}));else {const v=JSON.parse(fs.readFileSync(0,"utf8"));console.log(JSON.stringify(op==="state"?project(v,now):apply(v.memory,v.input,v.output,now)));}
