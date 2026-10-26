/* True Playwright static-page/merchant choice exercise.
 * User actions and prices in the synthetic test are NOT independent human sales.
 */
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
async function main(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 let count=0;
 const test=async(name,fn)=>{await fn();count++;console.log('PASS '+name+' (synthetic buyer, no real sale)');};
 try{
  const context=await browser.newContext({viewport:{width:1160,height:850}});
  const page=await context.newPage();
  const errs=[];page.on('pageerror',e=>errs.push(String(e)));
  const base='http://127.0.0.1:8765';
  await page.goto(base+'/video-find/heated-throw-50x60/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.FrameFindHotQA?.getState().loaded,{timeout:16000});
  await test('dated source catalog not invented shop prices',async()=>{
   const res=await page.request.get(base+'/video-find/prebreakout/heated-throw-us-2026-10.json');
   assert.equal(res.status(),200);
   const d=await res.json();
   assert.equal(d.asOf,'2026-10-26');
   assert.equal(d.sellers.length,4);
   assert.ok(d.sellers.every(x=>x.observedOn==='2026-10-26'&&x.url.startsWith('https://')&&['available','unavailable','variant_uncertain'].includes(x.availability)));
   assert.equal(d.sellers.find(s=>s.id==='bedsure-basic').observedPriceUSD,null);
   assert.equal(d.sellers.find(s=>s.id==='bedsure-preheat').observedPriceUSD,37.94);
   assert.equal(d.hotSignals.length,3);
   assert.match(d.predictionDisclaimer,/not a forecast/i);
   assert.match(await page.locator('#compare-status').innerText(),/2 of 2 available-at-check offers/);
   assert.equal(await page.locator('#pilot-results a.outbound').count(),2);
   assert.equal(await page.locator('#pilot-watchlist a.outbound').count(),2);
   assert.match(await page.locator('main').innerText(),/not live/ig);
  });
  await test('budget 35 excludes out-of-stock 29.99 item and ambiguous 37.94 variant',async()=>{
   await page.locator('#budget-max').selectOption('35');
   assert.deepEqual((await page.evaluate(()=>FrameFindHotQA.getState())).shown,['sunbeam-basic']);
   assert.match(await page.locator('#pilot-results').innerText(),/\$29\.97/);
   assert.doesNotMatch(await page.locator('#pilot-results').innerText(),/\$29\.99/);
   assert.doesNotMatch(await page.locator('#pilot-results').innerText(),/\$42\.99/);
  });
  await test('preheat and long auto-off limit matches different SKU',async()=>{
   await page.locator('#budget-max').selectOption('50');
   await page.locator('#needs-preheat').check();
   await page.locator('#needs-long').check();
   assert.deepEqual((await page.evaluate(()=>FrameFindHotQA.getState())).shown,[]);
   assert.match(await page.locator('#pilot-results').innerText(),/No confirmed available-at-check/);
   await page.locator('#official-only').check();
   assert.equal(await page.locator('#pilot-results a.outbound').count(),0);
   await page.locator('#budget-max').selectOption('150');
   assert.deepEqual((await page.evaluate(()=>FrameFindHotQA.getState())).shown,['bedsure-official']);
  });
  await test('real merchant URLs and honest safety/affiliate disclosure',async()=>{
   await page.locator('#official-only').uncheck();
   await page.locator('#needs-preheat').uncheck();
   await page.locator('#needs-long').uncheck();
   await page.locator('#budget-max').selectOption('150');
   const urls=await page.locator('#pilot-results a.outbound').evaluateAll(as=>as.map(a=>a.href));
   assert.equal(urls.length,2);
   for(const u of urls){
    const url=new URL(u);
    assert.equal(url.protocol,'https:');
    assert.ok(['www.walmart.com','bedsurehome.com'].includes(url.hostname),u);
    assert.equal(url.searchParams.has('affiliate'),false);
    assert.equal(url.searchParams.has('ref'),false);
   }
   assert.match(await page.locator('main').innerText(),/Melinora/);
   assert.match(await page.locator('main').textContent(),/No commission program/i);
   assert.ok(await page.locator('a[href*="cpsc.gov"]').count()>=1);
   assert.match(await page.locator('#pilot-watchlist').innerText(),/NOT CURRENTLY PURCHASABLE/);
   assert.match(await page.locator('#pilot-watchlist').innerText(),/EXACT SIZE NOT VERIFIED/);
  });
  await test('shoppable researched video intent flows back into FrameFind without URL server upload',async()=>{
   const video='https://www.youtube.com/watch?v=jfKfPfyJRdk';
   await page.locator('#source-video').fill(video);
   await page.locator('#video-handoff button').click();
   await page.waitForURL('**/video-find/**',{timeout:16000});
   await page.waitForFunction(()=>document.querySelector('#video-url')?.value==='https://www.youtube.com/watch?v=jfKfPfyJRdk',{timeout:15000});
   assert.equal(await page.locator('#video-url').inputValue(),video);
   assert.match(await page.locator('#item-description').inputValue(),/heated throw/i);
   assert.equal(new URL(page.url()).hash,'');
   assert.equal(new URL(page.url()).searchParams.get('utm_source'),'heated_throw_guide');
   assert.deepEqual(errs,[]);
  });
  await context.close();
 }finally{await browser.close();}
 console.log('PASS '+count+'/5 specific winter-buyer page browser scenarios. Real users, checkout, live price feed and actual affiliate commissions remain UNVERIFIED.');
}
main().catch(e=>{console.error(e.stack||e);process.exit(1);});