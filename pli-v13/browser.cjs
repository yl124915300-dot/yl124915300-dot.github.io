const {chromium}=require("playwright");const fs=require("node:fs");const path=require("node:path");
(async()=>{
 const root=__dirname,publicMode=process.env.PLI_PUBLIC==="1",base=publicMode?"https://yl124915300-dot.github.io/pli-v13/":"http://127.0.0.1:8765/pli-v13/";
 const report={base,publicMode,checks:[],screenshots:[],checkedAt:new Date().toISOString()};const check=(name,ok,detail)=>report.checks.push({name,pass:!!ok,...(detail?{detail}: {})});const browser=await chromium.launch({headless:true});
 for(const [device,viewport]of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]]){
  const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[],external=[];
  page.on("pageerror",e=>errors.push(e.message));page.on("request",r=>{if(new URL(r.url()).origin!==new URL(base).origin)external.push(r.url());});
  await page.goto(base,{waitUntil:"networkidle",timeout:45000});await page.locator('#health[data-ready="true"]').waitFor({timeout:10000});await page.evaluate(()=>document.fonts.ready);
  check(device+" real model labelled",await page.locator("#provenance").textContent().then(x=>x.includes("Qwen3-4B")&&x.includes("Apache-2.0")));
  check(device+" offline boundary",await page.locator("body").textContent().then(x=>x.includes("不是实时聊天")&&x.includes("净到账")));
  check(device+" ten events",await page.locator("#case option").count()===10);
  for(let i=1;i<=10;i++){
   await page.locator("#case").selectOption(String(i));
   check(device+" event "+i+" independently replayed",await page.locator("#health").getAttribute("data-replay")==="true");
   check(device+" event "+i+" no overflow",await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   check(device+" event "+i+" has review",!(await page.locator("#case-review").textContent()).includes("待审查"));
  }
  await page.locator("#stage").evaluate(x=>{x.value="0";x.dispatchEvent(new Event("input",{bubbles:true}));});
  check(device+" initial state navigable",(await page.locator("#stage-label").textContent()).includes("初始状态"));
  await page.locator("#next").click();check(device+" next navigation",await page.locator("#health").getAttribute("data-stage")==="1");
  check(device+" explicit stale marker",await page.locator("#freshness").textContent().then(x=>x.includes("STALE")||x.includes("FRESH")));
  check(device+" zero external requests",external.length===0,external.join(","));
  check(device+" zero JS errors",errors.length===0,errors.join(","));
  const filename=(publicMode?"public-":"")+device+".png";await page.screenshot({path:path.join(root,"evidence",filename),fullPage:true});report.screenshots.push(filename);
  // Untrusted evidence text must remain inert, including on the public origin.
  let dialogs=0;page.on("dialog",async d=>{dialogs++;await d.dismiss();});
  await page.route("**/pli-v13/evidence/results.json",async route=>{const r=await route.fetch();const rows=await r.json();rows[0].model_output.candidates[0].description='<img id="xss-proof" src=x onerror=alert(1)>';await route.fulfill({json:rows});});
  await page.reload({waitUntil:"networkidle"});await page.locator('#health[data-ready="true"]').waitFor();
  check(device+" model output XSS inert",dialogs===0&&await page.locator("#xss-proof").count()===0&&(await page.locator("#candidates").textContent()).includes("<img"));
  await context.close();
 }
 await browser.close();report.passed=report.checks.filter(x=>x.pass).length;report.failed=report.checks.filter(x=>!x.pass).length;fs.mkdirSync(path.join(root,"evidence"),{recursive:true});fs.writeFileSync(path.join(root,"evidence",(publicMode?"public-":"")+"browser.json"),JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(report.failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});