// Labels are evaluation inputs in Node only; the browser recognizer receives pixels and a hash.
import {chromium} from "playwright";
import {spawn} from "node:child_process";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import assert from "node:assert/strict";
const manifest=JSON.parse(await readFile("benchmarks/manifest.json","utf8"));
await mkdir("test-results",{recursive:true});
let event={};if(process.env.GITHUB_EVENT_PATH)event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,"utf8"));
const report={schema:2,environment:"GitHub-hosted Chromium; public still-image replay; no game process",
 codeCommit:event.pull_request?.head?.sha||process.env.GITHUB_SHA||"unknown",runnerCommit:process.env.GITHUB_SHA||"unknown",
 sourceManifestSha256:createHash("sha256").update(JSON.stringify(manifest)).digest("hex"),
 scope:manifest.scope,annotation:manifest.annotation,rights:manifest.rights,
 singleScreenshotAdvice:"FAIL",liveGameLoop:"NOT_RUN",realActionVerification:"NOT_RUN",
 manualRuntimeStateTranscription:false,labelsSuppliedToRecognizer:false,frames:[],failures:[],
 metrics:{correctFields:0,wrongFields:0,abstainedFields:0,unknownReferenceFields:0,cardNamesRecovered:0,knownCardNames:0}};
const server=spawn("python3",["launch.py","--port","8796","--no-browser"],{stdio:["ignore","pipe","inherit"]});
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error("Launcher startup timeout")),10000);
 server.stdout.once("data",()=>{clearTimeout(timer);resolve();});server.once("error",e=>{clearTimeout(timer);reject(e);});});
const browser=await chromium.launch({headless:true}),page=await browser.newPage();
const errors=[],remote=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("request",r=>{if(!r.url().startsWith("http://127.0.0.1:8796/")&&!r.url().startsWith("blob:")&&!r.url().startsWith("data:"))remote.push(r.url());});
page.on("console",m=>{if(m.text().startsWith("SCAN_PROGRESS"))console.log(m.text());});
function assess(observation,reference) {
 const checks=[];
 const actual={hp:observation.player.hp.value,energy:observation.player.energy.value,turn:observation.turn.value};
 for(const key of ["hp","energy","turn"]){
   const expected=reference[key],value=actual[key];
   const status=expected===null?(value===null?"REFERENCE_UNKNOWN":"WRONG"):value===null?"ABSTAIN":JSON.stringify(value)===JSON.stringify(expected)?"CORRECT":"WRONG";
   checks.push({field:key,expected,value,status});
 }
 const candidates=observation.enemies.filter(e=>e.confirmed).map(e=>e.hp),remaining=[...reference.enemyHP];
 for(const value of candidates){
   const index=remaining.findIndex(x=>JSON.stringify(x)===JSON.stringify(value));
   checks.push({field:"enemyHP",value,status:index>=0?"CORRECT":"WRONG"});if(index>=0)remaining.splice(index,1);
 }
 for(const expected of remaining)checks.push({field:"enemyHP",expected,value:null,status:"ABSTAIN"});
 const names=observation.hand.cards.filter(c=>c.confirmed).map(c=>c.name),known=[...reference.knownCardNames];
 let recovered=0;
 for(const name of names){const index=known.indexOf(name);if(index>=0){known.splice(index,1);recovered++;}
   else if(reference.completeHandLabel)checks.push({field:"cardName",value:name,status:"WRONG"});}
 return {checks,cardNamesRecovered:recovered,knownCardNames:reference.knownCardNames.length,missingKnownCards:known,
   referenceIsCompleteState:false};
}
try {
 await page.goto("http://127.0.0.1:8796/");
 assert.equal((await page.request.get("http://127.0.0.1:8796/recognition.mjs")).status(),200);
 for(const source of manifest.frames){
   const response=await fetch(source.url,{signal:AbortSignal.timeout(30000)});assert.ok(response.ok);
   const bytes=Buffer.from(await response.arrayBuffer());assert.ok(bytes.length<15*1024*1024);
   const sha256=createHash("sha256").update(bytes).digest("hex");
   assert.equal(sha256,source.sha256,"Source bytes changed; do not silently relabel "+source.id);
   const started=Date.now();
   let timer;
   const result=await Promise.race([page.evaluate(async ({base64,sha256})=>{
     const {recognizeScreenshot,screenshotAdvice}=await import("./recognition.mjs");
     const bitmap=await createImageBitmap(new Blob([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))]));
     const canvas=document.createElement("canvas");canvas.width=bitmap.width;canvas.height=bitmap.height;
     canvas.getContext("2d").drawImage(bitmap,0,0);bitmap.close();
     const worker=await Tesseract.createWorker("eng",1,{
       workerPath:new URL("vendor/tesseract/worker.min.js",location.href).href,
       corePath:new URL("vendor/core/",location.href).href,langPath:new URL("vendor/lang",location.href).href,cacheMethod:"none"});
     let data;try {data=await recognizeScreenshot(canvas,worker,sha256,{onProgress:(region,pass)=>console.log("SCAN_PROGRESS "+region+" "+pass)});}
     finally{await worker.terminate();}
     return {...data,advice:screenshotAdvice(data.observation)};
   },{base64:bytes.toString("base64"),sha256}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error("Per-frame OCR exceeded 90 seconds")),90000);})]).finally(()=>clearTimeout(timer));
   assert.equal(result.observation.width,source.width);assert.equal(result.observation.height,source.height);
   assert.equal(result.advice.status,"ABSTAIN"); // No complete-state recognizer or verified actionable policy exists.
   const evaluation=assess(result.observation,source.reference);
   for(const c of evaluation.checks){
     if(c.status==="CORRECT")report.metrics.correctFields++;
     if(c.status==="WRONG")report.metrics.wrongFields++;
     if(c.status==="ABSTAIN")report.metrics.abstainedFields++;
     if(c.status==="REFERENCE_UNKNOWN")report.metrics.unknownReferenceFields++;
   }
   report.metrics.cardNamesRecovered+=evaluation.cardNamesRecovered;report.metrics.knownCardNames+=evaluation.knownCardNames;
   const record={id:source.id,url:source.url,context:source.context,sha256,retrievedAt:new Date().toISOString(),
     gameBuild:source.gameBuild,elapsedMs:Date.now()-started,...result,evaluation};
   report.frames.push(record);
   console.log("FRAME_RESULT "+JSON.stringify(record));
   if(source.id===manifest.frames[0].id){
     // Actual app button, file import and export path; no manual state is filled.
     await page.locator("#file").setInputFiles({name:"official-public-replay.jpg",mimeType:"image/jpeg",buffer:bytes});
     await page.waitForFunction(()=>!document.getElementById("auto").disabled);
     await page.click("#auto");
     await page.waitForFunction(()=>document.getElementById("status").textContent.startsWith("Automatic reading finished"),{},{timeout:90000});
     const ui=JSON.parse(await page.locator("#recognition").innerText());
     assert.deepEqual(ui.observation.player.hp.value,result.observation.player.hp.value);
     assert.match(await page.locator("#advice").innerText(),/ABSTAIN/);
     assert.equal(await page.locator("#acted").isDisabled(),true);
     report.automaticImportUI="PASS; screenshot replay, not a live game";
   }
 }
 assert.equal(new Set(report.frames.map(f=>f.sha256)).size,4);
 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
 report.sourceIntegrity="PASS: 4 fixed URLs, hashes and dimensions";
 report.externalBrowserRequests=remote.length;
 assert.equal(report.metrics.wrongFields,0,"A labeled field was wrongly accepted.");
 assert.ok(report.metrics.correctFields>0,"No labeled field was recovered.");
 report.failures.push("No screenshot produced a verified actionable recommendation (0/4).",
   "Card costs/effective values, complete hand/enemy coverage, intents, block, statuses and relic effects remain incomplete.",
   "Labels are partial model visual annotations on a development set; independent human review and held-out generalization are NOT_RUN.",
   "No related original before/after action pair, real player execution or continuous game session was tested.");
} catch(e){report.failures.push(e.message);throw e;}
finally {
 await writeFile("test-results/real-benchmark.json",JSON.stringify(report,null,2));
 const summary={frames:report.frames.length,metrics:report.metrics,automaticImportUI:report.automaticImportUI,
   singleScreenshotAdvice:report.singleScreenshotAdvice,liveGameLoop:report.liveGameLoop,failures:report.failures};
 console.log("BENCHMARK_SUMMARY "+JSON.stringify(summary));
 if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,
   "### GamePilot screenshot capability\n\n\`\`\`json\n"+JSON.stringify(summary,null,2)+"\n\`\`\`\n\nEngineering checks are distinct from screenshot advice and real-game acceptance.\n",{flag:"a"});
 await browser.close();server.kill();
}
