/* V2.5 CRYSTAL PAW regression — real photos, transparency, opt-in effects and safe controls. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
 const origin=(process.env.CAT_TALES_CRYSTAL_ORIGIN||'http://127.0.0.1:8765').replace(/\/$/,'');
 try{
  for(const variant of [{path:'/cat-tales/en/',language:'en'},{path:'/cat-tales/live/',language:'zh-CN'}]){
   const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.goto(origin+variant.path,{waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('html').getAttribute('lang'),variant.language);
   assert.equal(await page.locator('body').getAttribute('class'),'crystal-paw');
   const peek=page.locator('#cat-real-peek');
   await peek.waitFor({state:'attached'});
   // Real photography is a required feature, not just a decorative URL string.
   await page.waitForFunction(() => {
     const imgs=[...document.querySelectorAll('.hero-cat-photo,.cat-photo-peek img')];
     return imgs.length===2 && imgs.every(img=>img.complete && img.naturalWidth>0);
   },null,{timeout:20000});
   assert.equal(await peek.getAttribute('aria-hidden'),'true','decorative cats should stay out of assistive text');
   assert.equal(await page.locator('#cat-cameo-toggle').getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('#start').isDisabled(),true,'original mic permission gate');
   assert.equal(await page.locator('#enable-sound').isDisabled(),true,'original local model gate');
   assert.equal(await page.locator('#enable-vision').isDisabled(),true,'original camera model gate');
   const css=await page.locator('.card').first().evaluate(el=>{
     const style=getComputedStyle(el);
     return {backdrop:style.backdropFilter||style.webkitBackdropFilter,background:style.backgroundImage};
   });
   assert.ok(css.backdrop&&css.backdrop!=='none','frosted glass must be applied');
   assert.match(css.background,/gradient/);
   assert.equal(await page.locator('.hero-cat-photo').getAttribute('width'),'482');
   assert.ok(await page.locator('.photo-credits a').count()>=3,'photographer and CC license must be credited');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert.ok(overflow<=2,'mobile page must not scroll sideways: '+variant.language+' '+overflow);
   await page.locator('#cat-cameo-toggle').scrollIntoViewIfNeeded();
   assert.equal(await peek.evaluate(el=>getComputedStyle(el).pointerEvents),'none');
   await page.locator('#cat-cameo-toggle').click();
   assert.equal(await page.locator('#cat-cameo-toggle').getAttribute('aria-pressed'),'false');
   await page.locator('#message-input').fill('My cat is quiet');
   await page.locator('#send').click();
   await page.waitForTimeout(350);
   assert.equal(await peek.getAttribute('data-visible'),'false','cat photo stays away when opted out');
   await page.locator('#cat-cameo-toggle').click();
   assert.equal(await page.locator('#cat-cameo-toggle').getAttribute('aria-pressed'),'true');
   await page.locator('#message-input').fill(variant.language==='en'?'My cat is sitting by the door':'我家猫坐在门口');
   await page.locator('#send').click();
   await page.waitForTimeout(400);
   assert.equal(await peek.getAttribute('data-visible'),'true','cat photo should briefly peek after an intentional action');
   const overlap=await page.evaluate(()=>{
      const cat=document.getElementById('cat-real-peek').getBoundingClientRect();
      const main=document.getElementById('start').getBoundingClientRect();
      return cat.left<main.right&&cat.right>main.left&&cat.top<main.bottom&&cat.bottom>main.top;
   });
   assert.equal(overlap,false,'photograph should not cover main start button');
   await page.waitForTimeout(2300);
   assert.equal(await peek.getAttribute('data-visible'),'false','cat photo should leave, no endless cycle');
   assert.deepEqual(errors,[],'no browser console errors');
   await context.close();
   const quiet=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
   const calm=await quiet.newPage();
   await calm.goto(origin+variant.path,{waitUntil:'domcontentloaded'});
   assert.equal(await calm.locator('#cat-cameo-toggle').isDisabled(),true,'reduced motion honored');
   assert.equal(await calm.locator('.cat-photo-peek').evaluate(el=>getComputedStyle(el).display),'none');
   assert.equal(await calm.locator('.orb').evaluate(el=>getComputedStyle(el).animationName),'none');
   await quiet.close();
  }
  const journal=await browser.newContext({viewport:{width:390,height:844}});
  const jp=await journal.newPage();
  await jp.goto(origin+'/cat-tales/app/',{waitUntil:'domcontentloaded'});
  assert.ok(await jp.locator('.hero-cat-photo').count()===1,'journal should have actual photographic cat');
  assert.equal(await jp.locator('body').getAttribute('class'),'crystal-paw');
  assert.equal(await jp.locator('#analyze').isDisabled(),true,'journal consent gate preserved');
  assert.equal(await jp.locator('.card').first().evaluate(el=>getComputedStyle(el).backdropFilter==='none'),false);
  await journal.close();
  console.log('CAT_TALES_CRYSTAL_PASS: English/Chinese real-photo UI, tap-only peeks, mobile glass, reduced motion, consent and legacy journal');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
