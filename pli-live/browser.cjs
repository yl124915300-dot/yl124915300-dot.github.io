const {chromium}=require("playwright");
const fs=require("fs");
const assert=require("node:assert/strict");
(async()=>{
 const browser=await chromium.launch({headless:true});
 const expected=JSON.parse(fs.readFileSync("pli-live/evidence/expected-data.json","utf8"));
 const url="https://yl124915300-dot.github.io/pli-live/?accept="+process.env.GITHUB_RUN_ID;
 const report={pass:false,classification:"ANONYMOUS_PUBLIC_REAL_BROWSER",run_id:process.env.GITHUB_RUN_ID,url,desktop:false,mobile:false,checks:[],synthetic_ui_checks:[]};
 for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]]){
  const context=await browser.newContext({viewport,serviceWorkers:"block"});
  const page=await context.newPage();const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto(url,{waitUntil:"networkidle",timeout:60000});
  await page.waitForFunction(()=>document.body.dataset.state&&document.body.dataset.state!=="FAILED",{timeout:20000});
  assert.equal(await page.title(),"PLI · 真实事件闭环");
  assert.equal(await page.locator("button,input,textarea,form").count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.match(await page.locator("body").innerText(),/LLM_NOT_AUTONOMOUS/);
  assert.match(await page.locator("body").innerText(),/真实交易 0/);
  assert.match(await page.locator("#runs").innerText(),new RegExp(process.env.GITHUB_RUN_ID));
  const response=await context.request.get("https://yl124915300-dot.github.io/pli-live/data.json?qa="+process.env.GITHUB_RUN_ID);
  assert.equal(response.status(),200);
  const actual=await response.json();
  assert.deepEqual(actual,expected);
  const now=Date.now();const age=now-Date.parse(expected.generated_at);
  const n=age>=7200000?0:expected.proposals.filter(p=>p.status==="PROPOSED"&&Date.parse(p.valid_until)>now&&expected.source_receipts[p.source].ok).length;
  assert.equal(await page.locator('[data-proposal="valid"]').count(),n);
  assert.equal(errors.length,0);
  await page.screenshot({path:"pli-live/evidence/"+name+".png",fullPage:true});
  report[name]=true;report.checks.push({viewport:name,real_valid_proposals:n,overflow:false,js_errors:errors});
  // Explicit synthetic browser time only; never writes repository or event state.
  await page.evaluate(()=>{latest.generated_at="2000-01-01T00:00:00Z";render();});
  assert.equal(await page.locator("body").getAttribute("data-state"),"STALE");
  assert.equal(await page.locator('[data-proposal="valid"]').count(),0);
  assert.match(await page.locator("#proposals").innerText(),/已关闭/);
  report.synthetic_ui_checks.push({viewport:name,case:"SYNTHETIC_OLD_SNAPSHOT",pass:true});
  await context.close();
 }
 const context=await browser.newContext();
 await context.route("**/pli-live/data.json*",r=>r.abort("failed"));
 const page=await context.newPage();await page.goto(url);
 await page.waitForFunction(()=>document.body.dataset.state==="FAILED");
 assert.equal(await page.locator('[data-proposal="valid"]').count(),0);
 report.synthetic_ui_checks.push({case:"SYNTHETIC_NETWORK_FAILURE",pass:true});
 await context.close();await browser.close();report.pass=true;
 fs.writeFileSync("pli-live/evidence/browser.json",JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exit(1)});