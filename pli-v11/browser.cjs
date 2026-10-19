const {chromium}=require("playwright");
const fs=require("fs"),path=require("path"),assert=require("assert/strict");
(async()=>{
  const root=__dirname,out=path.join(root,"evidence");
  fs.mkdirSync(out,{recursive:true});
  const base=process.env.PLI_PUBLIC_URL||"http://127.0.0.1:8765/pli-v11/";
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1365,height:1000}});
  const page=await context.newPage(),errors=[],checks=[];
  page.on("pageerror",e=>errors.push(String(e)));
  const check=(name,ok)=>{assert.ok(ok,name);checks.push({name,result:"PASS"});};
  const response=await page.goto(base,{waitUntil:"networkidle"});
  check("ANONYMOUS_HTTP_200",response.status()===200);
  await page.waitForFunction(()=>document.querySelectorAll("#profiles .card").length===6);
  check("SIX_SYNTHETIC_CARDS",await page.locator("#profiles .card").count()===6);
  check("TWO_SOURCE_CARDS",await page.locator("#sources .card").count()===2);
  check("FRESHNESS_VISIBLE",!(await page.locator("#freshness").innerText()).includes("正在读取"));
  const remote=await context.request.get(base+"data.json");
  const data=await remote.json();
  check("REAL_EVENT_PROVENANCE",data.events.every(e=>e.evidence==="REAL_PUBLIC"&&e.raw_sha256&&e.batch_sha256));
  check("LIVE_DECISION_SAMPLES",data.events.length===0||await page.locator(".decision").count()>0);
  await page.selectOption("#profile","S2");
  await page.selectOption("#kind","weather");
  check("PROFILE_FILTER",await page.locator(".decision strong").evaluateAll(els=>els.every(e=>e.textContent.startsWith("西雅图配送员"))));
  await page.selectOption("#profile","all");await page.selectOption("#kind","all");
  check("NO_PUBLIC_ACTION_CONTROLS",await page.locator("form,textarea,input").count()===0);
  await page.screenshot({path:path.join(out,process.env.PLI_PUBLIC_URL?"public-desktop.png":"desktop.png"),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  check("MOBILE_NO_HORIZONTAL_OVERFLOW",await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(out,process.env.PLI_PUBLIC_URL?"public-mobile.png":"mobile.png"),fullPage:true});
  // Interception affects this isolated browser only; fixtures are never written as live data.
  const stale=structuredClone(data);stale.generated_at="2000-01-01T00:00:00Z";
  await page.route("**/data.json?*",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(stale)}));
  await page.click("#reload");
  await page.waitForFunction(()=>document.querySelector("#freshness").textContent.includes("快照已过期"));
  check("STALE_SNAPSHOT_VISIBLE",true);
  check("STALE_SUPPRESSES_ALL_ACTIVE_PROPOSALS",await page.locator(".proposed").count()===0);
  check("STALE_PROFILE_COUNTS_ZERO",await page.locator("#profiles .badge").evaluateAll(es=>es.every(e=>e.textContent.includes("当前有效提议 0"))));
  check("NO_BROWSER_SCRIPT_ERRORS",errors.length===0);
  const report={result:"PASS",at:new Date().toISOString(),url:base,anonymous:true,authCookies:(await context.cookies()).length,
    checks,sourceCounts:data.sources.map(s=>({name:s.name,result:s.result,accepted:s.accepted})),snapshotAt:data.generated_at,
    testsUseBrowserOnlyFixtureForStaleness:true};
  fs.writeFileSync(path.join(out,process.env.PLI_PUBLIC_URL?"public-browser.json":"browser.json"),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
