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

 // Synthetic display stream exercises the actual UI lifecycle; this is not game access.
 await page.evaluate(()=>{
   const c=document.createElement("canvas");c.width=1000;c.height=400;c.style.cssText="position:fixed;left:-2000px";document.body.append(c);window.__sourceCanvas=c;const x=c.getContext("2d");window.__captureEvents=[];
   window.__paintCapture=color=>{window.__captureColor=color;x.fillStyle=color;x.fillRect(0,0,1000,400);x.fillStyle="black";x.font="50px Arial";x.fillText("Synthetic UI fixture only",30,100);};
   window.__paintCapture("white");
   navigator.mediaDevices.getDisplayMedia=async()=>{window.__captureEvents.push("requested");const s=c.captureStream(0);window.__sourceStream=s;const track=s.getVideoTracks()[0];for(const type of ["mute","unmute","ended"])track.addEventListener(type,()=>window.__captureEvents.push(type));window.__captureTimer=setInterval(()=>{window.__paintCapture(window.__captureColor);track.requestFrame();},100);return s;};
   if(!navigator.mediaDevices.getDisplayMedia.toString().includes("__captureEvents"))throw Error("Synthetic capture override unavailable");
 });
 await page.click("#share");
 await page.waitForFunction(()=>!document.getElementById("advise").disabled);
 const reviewed={game:"STS2",patch:"SYNTHETIC-UI",encounter:"synthetic-only",turn:1,
   player:{hp:20,block:0,energy:1},enemies:[{id:"e1",hp:20,block:0,intent:"attack",attack:8,hits:1}],
   hand:[{id:"c1",name:"Strike",cost:1,value:6},{id:"c2",name:"Defend",cost:1,value:5}],
   review:{completeBattlefield:true,completeHand:true,plainMechanics:true}};
 await page.locator("#state").fill(JSON.stringify(reviewed));
 await page.click("#advise");
 await page.waitForFunction(()=>document.getElementById("advice").textContent.includes("REVIEWED_CANDIDATE"));
 assert.match(await page.locator("#advice").innerText(),/Defend/);
 await page.click("#acted");
 await page.evaluate(()=>window.__paintCapture("#ffeecc"));
 await page.waitForFunction(()=>document.getElementById("advice").textContent.includes("Shared image changed"));
 assert.equal(await page.locator("#acted").isDisabled(),true);
 await page.click("#capture");
 await page.waitForFunction(()=>!document.getElementById("verify").disabled);
 const observed=structuredClone(reviewed);observed.player.energy=0;observed.player.block=5;observed.hand=observed.hand.filter(c=>c.id!=="c2");
 await page.locator("#state").fill(JSON.stringify(observed));
 await page.click("#verify");
 await page.waitForFunction(()=>document.getElementById("advice").textContent.includes("HUMAN_REVIEWED_MATCH"));
 await page.click("#stop");
 await page.evaluate(()=>clearInterval(window.__captureTimer));
 assert.equal(await page.locator("#advise").isDisabled(),true);
 report.syntheticDisplayLifecycle="PASS; mocked display stream, no real game or screen permission";
 // Delayed older decoding must not replace the newer import.
 await page.evaluate(()=>{
   const original=createImageBitmap;
   window.createImageBitmap=async file=>{
     const image=await original(file);if(file.name==="older.png")await new Promise(r=>setTimeout(r,250));return image;
   };
 });
 const tiny=await page.evaluate(()=>{
   return ["red","blue"].map(color=>{const c=document.createElement("canvas");c.width=20;c.height=20;
     const x=c.getContext("2d");x.fillStyle=color;x.fillRect(0,0,20,20);return c.toDataURL("image/png").split(",")[1];});
 });
 await page.locator("#file").setInputFiles({name:"older.png",mimeType:"image/png",buffer:Buffer.from(tiny[0],"base64")});
 await page.locator("#file").setInputFiles({name:"newer.png",mimeType:"image/png",buffer:Buffer.from(tiny[1],"base64")});
 await page.waitForTimeout(500);
 assert.deepEqual(await page.evaluate(()=>Array.from(document.getElementById("frame").getContext("2d").getImageData(0,0,1,1).data)),[0,0,255,255]);
 report.importRace="PASS";

 const url="https://github.com/user-attachments/assets/72b8fafe-b2ec-41b1-98fc-41a7c2c87b07";
 try {
   const response=await fetch(url);if(!response.ok)throw Error("Source HTTP "+response.status);
   const bytes=Buffer.from(await response.arrayBuffer());
   assert.ok(bytes.length<15*1024*1024);
   report.source={url,context:"https://github.com/Torch1230/CombatSolver/issues/239",claimedPatch:"111.0 (issue author report)",
     sha256:createHash("sha256").update(bytes).digest("hex"),retrievedAt:new Date().toISOString()};
   await page.selectOption("#language","chi_sim+eng");
   report.realScreenshotLanguage="chi_sim+eng";
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
} catch(e) {
 report.failure=e.message;report.dom=await page.evaluate(()=>({status:document.getElementById("status").textContent,advice:document.getElementById("advice").textContent,video:{ready:document.getElementById("video").readyState,width:document.getElementById("video").videoWidth},captureEvents:window.__captureEvents,trackState:window.__sourceStream?.getVideoTracks()[0]?.readyState}));
 console.log(JSON.stringify(report,null,2));throw e;
} finally {
 await writeFile("test-results/cloud-evidence.json",JSON.stringify(report,null,2));
 await browser.close();server.kill();
}
