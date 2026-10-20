// Isolated browser fixtures only; no real owner registration or model inference.
const {chromium}=require('playwright');
const {readFileSync}=require('node:fs');
const assert=require('node:assert/strict');
const root='ai-online-market-trial/network/';
const repo='yl124915300-dot/yl124915300-dot.github.io';
const fence=String.fromCharCode(96).repeat(3);
function grant(n,id,role,name){
  const scopes=['directory.read','task.reply','artifact.publish',...(role==='collector'?['public-contract.read','asset.execute']:[])];
  const data={kind:'agent-grant',agent:name,role,capabilities:[role==='collector'?'public-contract-inventory':'public-contract-review'],scopes,expiresAt:new Date(Date.now()+864e5).toISOString().replace(/\.\d{3}Z$/,'Z'),ownerAttestation:'I control this account and authorize this Agent',publicOnly:true};
  return {number:n,title:'[AI Online owner] fixture',body:fence+'json\n'+JSON.stringify(data)+'\n'+fence,state:'open',created_at:new Date(Date.now()-864e5).toISOString(),html_url:'https://github.com/'+repo+'/issues/'+n,user:{type:'User',id,login:'isolated-fixture-'+id}};
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const fixtures=[grant(1,101,'collector','collector'),grant(2,101,'reviewer','reviewer'),grant(3,202,'reviewer','reviewer'),grant(4,303,'collector','duplicate'),grant(5,303,'collector','duplicate')];
 await page.route('https://api.github.com/**',r=>r.fulfill({json:fixtures}));
 await page.route('https://ai-online-fixture.invalid/**',r=>{
   const path=new URL(r.request().url()).pathname;
   const file=path.endsWith('app.js')?'app.js':'index.html';
   return r.fulfill({body:readFileSync(root+file,'utf8'),contentType:file.endsWith('.js')?'text/javascript':'text/html'});
 });
 await page.goto('https://ai-online-fixture.invalid/');
 await page.waitForFunction(()=>document.querySelector('#directory-status').textContent.includes('项当前有效'));
 assert.equal(await page.locator('#directory article').count(),3);
 assert.match(await page.locator('#directory-help').innerText(),/2/);
 await page.locator('#agent-name').fill('a'.repeat(38));
 let url=new URL(await page.locator('#join-reviewer').getAttribute('href'));
 assert.equal(url.searchParams.get('template'),'ai-online-owner.yml');
 assert.equal(JSON.parse(url.searchParams.get('payload')).agent.length,40);
 await page.locator('#agent-name').fill('x');
 assert.equal(await page.locator('#join-reviewer').getAttribute('href'),null);
 assert.match(await page.locator('#join-error').innerText(),/2–38/);
 await page.locator('#collector').selectOption('gh:101:collector');
 await page.locator('#reviewer').selectOption('gh:101:reviewer');
 assert.equal(await page.locator('#create-task').isVisible(),false);
 await page.locator('#reviewer').selectOption('gh:202:reviewer');
 url=new URL(await page.locator('#create-task').getAttribute('href'));
 assert.equal(JSON.parse(url.searchParams.get('payload')).requireDifferentOwners,true);
 await page.locator('#reviewer').selectOption('gh:101:reviewer');
 await page.locator('#different-owners').uncheck();
 url=new URL(await page.locator('#create-task').getAttribute('href'));
 assert.equal(JSON.parse(url.searchParams.get('payload')).requireDifferentOwners,false);
 assert.match(await page.locator('#model-status').innerText(),/NOT_CONNECTED/);
 assert.match(await page.locator('#public-notice').innerText(),/公开/);
 await page.locator('#refresh').click();
 await page.waitForTimeout(100);
 assert.equal(await page.locator('#collector option').count(),2);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({evidenceClass:'ISOLATED_BROWSER_FIXTURE',realOwnersVerified:0,modelInferenceVerified:false,registrationBoundary:true,duplicateIsolation:true,crossAccountHandoff:true,refreshNoDuplication:true}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
