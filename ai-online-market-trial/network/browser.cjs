const {chromium}=require('playwright');
const {readFileSync,mkdirSync,writeFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
const assert=require('node:assert/strict');
const base='https://yl124915300-dot.github.io/ai-online-market-trial/network/';
const hash=s=>createHash('sha256').update(s).digest('hex');
(async()=>{
  const expected=hash(readFileSync('ai-online-market-trial/network/app.js'));
  let ready=false,lastError;
  for(let i=0;i<18;i++){try{const r=await fetch(base+'app.js',{signal:AbortSignal.timeout(10000),cache:'no-store'});if(r.ok&&hash(await r.text())===expected){ready=true;break;}}catch(e){lastError=e.message;}await new Promise(r=>setTimeout(r,5000));}
  assert(ready,'Deployed app checksum did not match current source: '+lastError);
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle',timeout:45000});
  await page.waitForFunction(()=>!document.querySelector('#directory-status').textContent.includes('读取公开授权中'),{timeout:30000});
  assert.match(await page.locator('h1').innerText(),/人类授权/);
  const grantUrl=new URL(await page.locator('#join-collector').getAttribute('href'));
  const grant=JSON.parse(grantUrl.searchParams.get('payload'));
  assert.equal(grantUrl.hostname,'github.com');
  assert.equal(grant.kind,'agent-grant');assert.equal(grant.role,'collector');
  assert(grant.scopes.includes('asset.execute'));assert(Date.parse(grant.expiresAt)>Date.now());
  const directory=await page.locator('#directory-status').innerText();
  assert(!directory.includes('读取失败'),directory);
  const collectorCount=await page.locator('#collector option').count();
  const reviewerCount=await page.locator('#reviewer option').count();
  if(collectorCount>1&&reviewerCount>1){
    await page.locator('#collector').selectOption({index:1});await page.locator('#reviewer').selectOption({index:1});
    const taskUrl=new URL(await page.locator('#create-task').getAttribute('href'));
    const task=JSON.parse(taskUrl.searchParams.get('payload'));
    assert.equal(task.goal,'audit-ai-online-public-contract');
    assert.notEqual(task.collector,task.reviewer);assert.equal(task.authorizeReplies,true);
  }
  assert.deepEqual(errors,[]);
  mkdirSync('network-evidence',{recursive:true});
  await page.screenshot({path:'network-evidence/public-page.png',fullPage:true});
  const result={url:page.url(),at:new Date().toISOString(),deployedChecksum:expected,sourceCommit:process.env.GITHUB_SHA,
    invitationFormVerified:true,directoryReadback:directory,tasksReadback:await page.locator('#tasks').innerText(),
    taskHandoffVerified:collectorCount>1&&reviewerCount>1,independentOwnersVerified:0,verifiedSales:0,errors};
  writeFileSync('network-evidence/public-browser.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
