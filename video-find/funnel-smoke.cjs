/* Real Chromium UI -> session five-step telemetry regression.
 * Explicit synthetic QA; no external visitor or conversion evidence.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
async function main(){
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1120,height:800}});
  const errors=[];page.on('pageerror',err=>errors.push(String(err)));
  const host='http://127.0.0.1:8765';
  const requestUrls=[];page.on('request',r=>requestUrls.push(r.url()));
  await page.goto(host+'/?utm_source=directory&utm_medium=directory',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.FrameFindFunnel);
  const initial=await page.evaluate(()=>FrameFindFunnel.inspect());
  assert.equal(initial.qa,true,'Automation must never be collected as real traffic');
  assert.equal(initial.serverConfigured,false,'No invented collector endpoint');
  assert.equal(initial.source,'directory');
  assert.ok(initial.steps.visit);
  const video='https://www.youtube.com/watch?v=jfKfPfyJRdk';
  await page.locator('#home-video-url').fill(video);
  await page.locator('#home-video-form button').click();
  await page.waitForURL('**/video-find/**',{timeout:17000});
  await page.waitForFunction(()=>!!window.FrameFindFunnel&&!!window.FrameFindQA,{timeout:15000});
  const afterVideo=await page.evaluate(()=>FrameFindFunnel.inspect());
  assert.equal(afterVideo.source,'directory','Attribution must survive owned homepage -> finder');
  assert.ok(afterVideo.steps.video_submitted);
  assert.equal(afterVideo.events.filter(e=>e.stage==='video_submitted').length,1);
  const png=await page.evaluate(async()=>{
    const c=document.createElement('canvas');c.width=700;c.height=400;
    const p=c.getContext('2d');p.fillStyle='white';p.fillRect(0,0,700,400);
    p.fillStyle='black';p.fillRect(100,80,270,240);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#screenshot-file').setInputFiles({name:'sample.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await page.waitForFunction(()=>FrameFindQA.getSnapshot().hasFrame,{timeout:12000});
  const frame=page.locator('#frame-canvas');await frame.scrollIntoViewIfNeeded();
  const box=await frame.boundingBox();
  await page.mouse.move(box.x+box.width*.15,box.y+box.height*.3);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.50,box.y+box.height*.8,{steps:8});
  await page.mouse.up();
  const afterSelection=await page.evaluate(()=>FrameFindFunnel.inspect());
  assert.ok(afterSelection.steps.item_selected);
  await page.locator('#category').fill('backpack');
  await page.locator('#item-description').fill('black commuter backpack');
  await page.locator('#search-products').click();
  assert.equal(await page.locator('#retailer-results .retailer-card').count(),4);
  let snapshot=await page.evaluate(()=>FrameFindFunnel.inspect());
  assert.ok(snapshot.steps.product_search);
  assert.ok(!snapshot.steps.merchant_outbound);
  const pop=page.waitForEvent('popup');
  await page.locator('#retailer-results .retailer-card a').first().click();
  const opened=await pop;await opened.close();
  snapshot=await page.evaluate(()=>FrameFindFunnel.inspect());
  assert.ok(snapshot.steps.merchant_outbound);
  assert.equal(snapshot.events.filter(e=>e.stage==='merchant_outbound').length,1);
  assert.equal(snapshot.events.find(e=>e.stage==='merchant_outbound').merchant,'google');
  assert.deepEqual(Object.keys(snapshot.steps).sort(),[
    'item_selected','merchant_outbound','product_search','video_submitted','visit'
  ]);
  assert.equal(snapshot.events.length,5,'One event for each funnel stage');
  assert.ok(!JSON.stringify(snapshot).includes('jfKfPfyJRdk'),'Never keep original video URL in telemetry');
  assert.ok(!JSON.stringify(snapshot).includes('black commuter'),'Never keep shopper free text in telemetry');
  assert.ok(!requestUrls.some(u=>u.includes('/collect')),'QA must not transmit telemetry');
  assert.deepEqual(errors,[]);
  console.log('PASS 5-step real UI synthetic funnel: page view, source submit, item selection, retailer search, user-initiated outgoing click');
  const demo=await browser.newPage({viewport:{width:1000,height:850}});
  await demo.goto(host+'/video-find/?demo=1',{waitUntil:'domcontentloaded'});
  await demo.waitForFunction(()=>FrameFindQA?.getSnapshot().selection?.origin==='demo-illustration',{timeout:15000});
  await demo.locator('#search-products').click();
  const d=await demo.evaluate(()=>FrameFindFunnel.inspect());
  assert.equal(d.steps.item_selected,undefined);
  assert.equal(d.steps.product_search,undefined);
  assert.equal(d.steps.merchant_outbound,undefined);
  console.log('PASS internal demo never becomes a purported real buyer search');
  await demo.close();await page.close();
 }finally{await browser.close();}
 console.log('PASS browser flow instrumentation tests; no verified public visitor or merchant purchase established.');
}
main().catch(e=>{console.error(e.stack||String(e));process.exit(1);});