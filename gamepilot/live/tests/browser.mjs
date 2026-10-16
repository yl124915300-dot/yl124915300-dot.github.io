import {chromium} from "playwright";
import {spawn} from "node:child_process";
import {mkdir,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import assert from "node:assert/strict";
const server=spawn("python3",["launch.py","--port","8795","--no-browser"],{stdio:["ignore","pipe","inherit"]});
await new Promise((resolve,reject)=>{server.stdout.once("data",resolve);server.once("error",reject);});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
const errors=[],remote=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("request",r=>{if(!r.url().startsWith("http://127.0.0.1:8795/")&&!r.url().startsWith("blob:")&&!r.url().startsWith("data:"))remote.push(r.url());});
await mkdir("test-results",{recursive:true});
const report={environment:"GitHub-hosted Chromium/Linux; no game process",syntheticOCR:"NOT_RUN",realScreenshotOCR:"NOT_RUN",
 screenSharePermission:"NOT_RUN",installationUI:"NOT_RUN",completeRecognition:"FAIL",liveGameLoop:"NOT_RUN",independentPlayer:"NOT_RUN"};
try {
 await page.goto("http://127.0.0.1:8795/");
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.reload();
 const uri=await page.evaluate(()=>{
   const c=document.createElement("canvas");c.width=1000;c.height=220;
   const x=c.getContext("2d");x.fillStyle="white";x.fillRect(0,0,c.width,c.height);
   x.fillStyle="black";x.font="72px Arial";x.fillText("Strike 6 Defend 5",35,130);return c.toDataURL("image/png");
 });
 await page.locator("#file").setInputFiles({name:"synthetic-engine-smoke.png",mimeType:"image/png",buffer:Buffer.from(uri.split(",")[1],"base64")});
 await page.waitForFunction(()=>!document.getElementById("ocr").disabled);
 await page.click("#ocr");
 await page.waitForFunction(()=>document.getElementById("status").textContent.startsWith("OCR finished"),{},{timeout:120000});
 const text=await page.locator("#text").innerText();
 assert.match(text,/Strike/i);assert.match(text,/Defend/i);
 assert.equal(await page.locator("#advise").isDisabled(),true);
 report.syntheticOCR="PASS";
 report.syntheticNote="Artificial text image; confirms actual bundled OCR execution only.";
 const url="https://github.com/user-attachments/assets/72b8fafe-b2ec-41b1-98fc-41a7c2c87b07";
 try {
   const response=await fetch(url);if(!response.ok)throw Error("Source HTTP "+response.status);
   const bytes=Buffer.from(await response.arrayBuffer());
   assert.ok(bytes.length<15*1024*1024);
   report.source={url,context:"https://github.com/Torch1230/CombatSolver/issues/239",claimedPatch:"111.0 (issue author report)",
     sha256:createHash("sha256").update(bytes).digest("hex"),retrievedAt:new Date().toISOString()};
   await page.locator("#file").setInputFiles({name:"public-game-screenshot.png",mimeType:"image/png",buffer:bytes});
   await page.waitForFunction(()=>!document.getElementById("ocr").disabled);
   await page.click("#ocr");
   await page.waitForFunction(()=>document.getElementById("status").textContent.startsWith("OCR finished"),{},{timeout:120000});
   report.realScreenshotOCR="PASS_INPUT_ONLY";
   report.recognizedTextLength=(await page.locator("#text").innerText()).length;
   assert.equal(await page.locator("#advise").isDisabled(),true);
   assert.match(await page.locator("#advice").innerText(),/ABSTAIN/);
   report.realScreenshotAdvice="ABSTAIN; no automated object completeness or confirmed state";
 } catch(e) {report.realScreenshotOCR="NOT_RUN_OR_FAILED";report.sourceError=e.message;throw e;}
 await page.locator("#state").fill('{"game":"STS2"}');
 assert.match(await page.locator("#advice").innerText(),/ABSTAIN/);
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 await page.screenshot({path:"test-results/companion-ui.png",fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
 report.browserChecks="PASS";report.screenshotUploads=0;report.externalBrowserRequests=0;
 console.log(JSON.stringify(report,null,2));
} finally {
 await writeFile("test-results/cloud-evidence.json",JSON.stringify(report,null,2));
 await browser.close();server.kill();
}
