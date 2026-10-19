import fs from "node:fs";
const read=n=>JSON.parse(fs.readFileSync("pli-v12/evidence/"+n+".json","utf8"));
const phase=process.argv[2]||"ci",names=phase==="public"?["unit","browser","restore","public-browser","public-http"]:["unit","browser","restore"];
const suites=names.map(n=>{const x=read(n);return {name:n,total:x.total,failed:x.failed};});
const report={at:new Date().toISOString(),phase,total:suites.reduce((a,s)=>a+s.total,0),failed:suites.reduce((a,s)=>a+s.failed,0),suites,llm:"LLM_NOT_CONNECTED",realLLMInferenceRequests:0,realTransactions:0,netIncome:0,ciRun:process.env.GITHUB_SERVER_URL+"/"+process.env.GITHUB_REPOSITORY+"/actions/runs/"+process.env.GITHUB_RUN_ID,limitations:["Synthetic structured-field rules only; free text needs clarification","Browser storage is browser-local; no shared private backend","Cross-job restoration uses versioned synthetic JSON, not a production database","Official feeds remain in the V1.1 observer; V1.2 does not treat user events as REAL_PUBLIC"]};
fs.writeFileSync("pli-v12/evidence/"+(phase==="public"?"public-summary":"summary")+".json",JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(report.failed)process.exitCode=1;
