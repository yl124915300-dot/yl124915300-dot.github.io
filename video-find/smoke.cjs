/* Deterministic actual-browser checks. All simulated shopper clicks are test events, not real traffic.
 * One public, rights-checked MediaPipe photo is a model-functionality fixture, not an actual buyer's product.
 */
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
async function main(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-fake-ui-for-media-stream']});
 let passed=0;
 const checks=[];
 async function test(name,fn){await fn();passed++;checks.push(name);console.log('PASS '+name+' (automated synthetic QA)');}
 try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route('https://www.youtube-nocookie.com/**',route=>route.abort());
 await page.goto('http://127.0.0.1:8765/video-find/',{waitUntil:'domcontentloaded',timeout:20000});
 await test('free landing with no fake ads or product revenue',async()=>{
  assert.match(await page.title(),/FrameFind/);
  assert.equal(await page.locator('#retailer-results .retailer-card').count(),0);
  assert.equal(await page.locator('#source-embed iframe').count(),0);
  assert.match(await page.locator('#business').innerText(),/Not monetized/);
  assert.match(await page.locator('#business').innerText(),/Not yet enabled/);
 });
 await test('original image demo and manual frame selection',async()=>{
  await page.locator('#try-demo').click();
  await page.waitForFunction(()=>window.FrameFindQA?.getSnapshot().hasFrame,{timeout:10000});
  const q=await page.evaluate(()=>window.FrameFindQA.getSnapshot());
  assert.equal(q.selection.label,'backpack');
  assert.equal(q.selection.origin,'demo-illustration');
  assert.equal(await page.locator('#category').inputValue(),'backpack');
  assert.match(await page.locator('#recognition-status').innerText(),/NOT visually recognized by AI/);
  const canvas=page.locator('#frame-canvas');const r=await canvas.boundingBox();
  await page.mouse.move(r.x+r.width*.45,r.y+r.height*.4);
  await page.mouse.down();
  await page.mouse.move(r.x+r.width*.68,r.y+r.height*.65,{steps:5});
  await page.mouse.up();
  assert.equal((await page.evaluate(()=>window.FrameFindQA.getSnapshot())).selection.origin,'manual');
 });
 await test('real retailer search without prices or invented commission',async()=>{
  await page.locator('#category').fill('backpack');
  await page.locator('#item-description').fill('black unbranded daypack');
  await page.locator('#search-products').click();
  const cards=page.locator('#retailer-results .retailer-card');
  assert.equal(await cards.count(),4);
  const hrefs=await cards.locator('a').evaluateAll(as=>as.map(a=>a.href));
  assert.equal(hrefs.length,4);
  for(const href of hrefs){
    assert.ok(/^https:\/\/(www\.)?(google\.com|amazon\.com|ebay\.com|walmart\.com)\//.test(href),href);
    assert.match(decodeURIComponent(href),/black unbranded daypack/);
  }
  assert.match(await page.locator('#search-summary').innerText(),/not an AI-verified branded product/i);
  assert.doesNotMatch(await cards.innerText(),/\$\d{2,}/);
  assert.match(await cards.first().innerText(),/NOT AN AFFILIATE LINK/);
 });
 await test('public social URLs do not scrape protected frames',async()=>{
  await page.locator('#video-url').fill('https://www.youtube.com/watch?v=jfKfPfyJRdk');
  await page.locator('#load-url').click();
  assert.equal(await page.locator('#source-embed iframe').count(),1);
  assert.match(await page.locator('#source-status').innerText(),/does not expose video pixels/i);
  const before=await page.evaluate(()=>window.FrameFindQA.getSnapshot());
  assert.equal(before.sourceType,'youtube');
  assert.equal(before.selection.origin,'manual');
  await page.locator('#video-url').fill('javascript:alert(1)');
  await page.locator('#load-url').click();
  assert.match(await page.locator('#source-status').innerText(),/Only public HTTPS/i);
  assert.equal(await page.locator('#source-link').getAttribute('href'),'https://www.youtube.com/watch?v=jfKfPfyJRdk');
 });
 await test('uploaded screenshot really runs locally hosted EfficientDet model',async()=>{
  await page.locator('#screenshot-file').setInputFiles('video-find/vision-fixture.jpg');
  await page.waitForFunction(()=>window.FrameFindQA.getSnapshot().hasFrame,{timeout:10000});
  await page.locator('#detect').click();
  await page.waitForFunction(()=>window.FrameFindQA.getSnapshot().detectorReady || document.querySelector('#recognition-status').textContent.includes('unavailable'),{timeout:45000});
  const snapshot=await page.evaluate(()=>window.FrameFindQA.getSnapshot());
  if(!snapshot.detectorReady)throw Error(await page.locator('#recognition-status').innerText());
  const candidates=await page.locator('#detect-candidates button').allTextContents();
  assert.ok(candidates.some(x=>/cat|dog/i.test(x)),'Expected cat/dog candidates from actual EfficientDet inference: '+candidates);
  assert.match(await page.locator('#recognition-status').innerText(),/NOT brand or exact product identification/i);
 });
 await test('local MP4 time selection and actual pixel extraction',async()=>{
  assert.ok(fs.existsSync('video-find/vision-fixture.mp4'),'Missing local video fixture');
  await page.locator('#clip-file').setInputFiles('video-find/vision-fixture.mp4');
  await page.waitForFunction(()=>document.querySelector('#local-video').readyState>=2&&document.querySelector('#time-controls').hidden===false,{timeout:14000});
  await page.locator('#frame-time').fill('1');
  await page.locator('#freeze').click();
  await page.waitForFunction(()=>document.querySelector('#frame-state').textContent==='Video frame selected',{timeout:15000});
  assert.equal((await page.evaluate(()=>window.FrameFindQA.getSnapshot())).sourceType,'local');
 });
 await test('screen share only after user gesture with functional frame capture',async()=>{
  await page.evaluate(async()=>{
    const img=new Image();img.src='./vision-fixture.jpg';await img.decode();
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=400;
    const ctx=canvas.getContext('2d');
    const paint=()=>ctx.drawImage(img,0,0,640,400);
    paint();window.__fixtureTimer=setInterval(paint,80);
    navigator.mediaDevices.getDisplayMedia=async()=>canvas.captureStream(8);
  });
  await page.locator('#share-screen').click();
  await page.waitForFunction(()=>document.querySelector('#capture-tab').disabled===false,{timeout:10000});
  await page.locator('#capture-tab').click();
  await page.waitForFunction(()=>document.querySelector('#frame-state').textContent==='User-approved tab frame',{timeout:10000});
  assert.equal((await page.evaluate(()=>window.FrameFindQA.getSnapshot())).activeShare,false);
  await page.evaluate(()=>clearInterval(window.__fixtureTimer));
 });
 await test('mobile deep-link intent and UK shopping sources',async()=>{
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true});
  await mobile.goto('http://127.0.0.1:8765/video-find/?q=red%20running%20shoes&m=UK',{waitUntil:'domcontentloaded'});
  assert.equal(await mobile.locator('#item-description').inputValue(),'red running shoes');
  assert.equal(await mobile.locator('#market').inputValue(),'UK');
  await mobile.locator('#search-products').click();
  const hrefs=await mobile.locator('#retailer-results a').evaluateAll(as=>as.map(a=>a.href));
  assert.ok(hrefs.some(h=>h.includes('amazon.co.uk/s?k=')));
  assert.ok(hrefs.some(h=>h.includes('ebay.co.uk/sch/i.html')));
  assert.ok(hrefs.some(h=>h.includes('johnlewis.com/search?')));
  assert.ok(await mobile.locator('#frame-canvas').isVisible());
  await mobile.close();
 });
 assert.deepEqual(errors,[],'Unexpected browser JavaScript exceptions');
 }finally{await browser.close();}
 console.log('PASS '+passed+'/'+checks.length+' browser checks; tested local AI frame detection and retail search URLs. NOT tested: independent human visitors, shopping checkout, price APIs, active ad revenue, subscription billing, affiliate payout.');
}
main().catch(e=>{console.error(e.stack||e);process.exit(1);});