// Public publisher screenshots are replay evidence, never a live-game run.
import {chromium} from "playwright";
import {spawn} from "node:child_process";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import assert from "node:assert/strict";
const sourceContext="https://store.steampowered.com/app/2868840/Slay_the_Spire_2/";
const api="https://store.steampowered.com/api/appdetails?appids=2868840&l=english";
const out="test-results";
await mkdir(out,{recursive:true});
const report={schema:1,environment:"GitHub-hosted Chromium; public still-image replay; no game process",
 codeCommit:process.env.GITHUB_SHA||"unknown",singleScreenshotAdvice:"FAIL",liveGameLoop:"NOT_RUN",
 manualStateTranscription:false,labelsSuppliedToRecognizer:false,frames:[],failures:[]};
const server=spawn("python3",["launch.py","--port","8796","--no-browser"],{stdio:["ignore","pipe","inherit"]});
await new Promise((resolve,reject)=>{server.stdout.once("data",resolve);server.once("error",reject);});
const browser=await chromium.launch({headless:true}),page=await browser.newPage();
try {
 await page.goto("http://127.0.0.1:8796/");
 const response=await fetch(api,{signal:AbortSignal.timeout(30000)});assert.ok(response.ok);
 const listing=(await response.json())["2868840"];assert.equal(listing.success,true);
 // Discovery is replaced by a hash-pinned manifest after inspection. No lookup data enters recognition.
 const manifest=listing.data.screenshots.slice(0,4).map(s=>({id:"steam-"+s.id,url:s.path_full,context:sourceContext}));
 for(const source of manifest){
   const r=await fetch(source.url,{signal:AbortSignal.timeout(30000)});assert.ok(r.ok);
   const bytes=Buffer.from(await r.arrayBuffer());assert.ok(bytes.length<15*1024*1024);
   const sha256=createHash("sha256").update(bytes).digest("hex");
   const result=await page.evaluate(async ({base64,sha256})=>{
     const {recognizeScreenshot,screenshotAdvice}=await import("./recognition.mjs");
     const bitmap=await createImageBitmap(await (await fetch("data:image/jpeg;base64,"+base64)).blob());
     const canvas=document.createElement("canvas");canvas.width=bitmap.width;canvas.height=bitmap.height;
     canvas.getContext("2d").drawImage(bitmap,0,0);bitmap.close();
     const w=await Tesseract.createWorker("eng",1,{
       workerPath:new URL("vendor/tesseract/worker.min.js",location.href).href,
       corePath:new URL("vendor/core/",location.href).href,langPath:new URL("vendor/lang",location.href).href,cacheMethod:"none"});
     let data;try {data=await recognizeScreenshot(canvas,w,sha256);}finally{await w.terminate();}
     const preview=document.createElement("canvas");preview.width=960;preview.height=Math.round(canvas.height*960/canvas.width);
     preview.getContext("2d").drawImage(canvas,0,0,preview.width,preview.height);
     return {...data,advice:screenshotAdvice(data.observation),preview:preview.toDataURL("image/jpeg",.65).split(",")[1]};
   },{base64:bytes.toString("base64"),sha256});
   // Small attributed review preview for this discovery run only; originals are not shipped in the app.
   console.log("REVIEW_IMAGE "+source.id+" "+result.preview);
   delete result.preview;
   const record={...source,sha256,retrievedAt:new Date().toISOString(),gameBuild:"unknown official promotional build",
     rights:{owner:"Mega Crit",basis:"Official publisher promotional screenshot; limited attributed technical review",
       policy:"https://www.megacrit.com/content-policy/",redistributionLicense:"NOT_ASSERTED",trainingUse:false},
     ...result,expectedLabels:null,labelStatus:"UNREVIEWED"};
   report.frames.push(record);
   console.log("FRAME_RESULT "+JSON.stringify(record));
 }
 assert.equal(new Set(report.frames.map(f=>f.sha256)).size,4);
 report.sourceIntegrity="FOUR_DISTINCT_IMAGES_RETRIEVED";
 report.failures.push("No independently reviewed complete-state labels yet.",
   "Card cost/effective values, enemy intents, block, status and relic effects are not automatically complete.",
   "No verified screenshot-to-correct-action result; no real player or continuous game session.");
} catch(e){report.failures.push(e.message);throw e;}
finally {
 await writeFile(out+"/real-benchmark.json",JSON.stringify(report,null,2));
 console.log("BENCHMARK_SUMMARY "+JSON.stringify({frames:report.frames.length,singleScreenshotAdvice:report.singleScreenshotAdvice,liveGameLoop:report.liveGameLoop,failures:report.failures}));
 await browser.close();server.kill();
}
