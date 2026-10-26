/* Real browser QA. The vendor on-device EfficientDet model actually infers a rights-checked
   image. Screen-share QA paints that still image onto a synthetic MediaStream. No real
   third-party live playback, independent buyers, purchases or payout is proven. */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
async function main(){
  const browser=await chromium.launch({headless:true,args:['--use-fake-ui-for-media-stream','--no-sandbox']});
  let passed=0;
  try{
    const page=await browser.newPage({viewport:{width:1280,height:840}});
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto('http://127.0.0.1:8765/live-la/',{waitUntil:'domcontentloaded',timeout:20000});
    await page.waitForFunction(()=>document.querySelector('#match-status')?.textContent.includes('loaded'));
    assert.equal(await page.locator('#cards .offer').count(),0,'Do not recommend paid products without need');
    assert.equal(await page.locator('iframe').count(),1,'Optional third-party player remains available');
    assert.equal(await page.locator('iframe').isVisible(),false,'Broken autoplay must not be shown as proven live playback');
    assert.match(await page.locator('#video-status').innerText(),/external/i);
    assert.equal(await page.locator('#nws-rain').count(),0,'Old weather-claim widget removed');
    await page.locator('[data-goal="family"]').click();
    await page.locator('#budget').selectOption('50');
    await page.locator('#planner button[type="submit"]').click();
    const family=await page.locator('#cards').innerText();
    assert.match(family,/Aquarium of the Pacific/);
    assert.doesNotMatch(family,/Big Bus|Hollywood Sign/);
    assert.equal(await page.locator('#cards a[href^="https://klook.tpo.lv/"]').count(),1);
    console.log('PASS intent→known offer budget match (synthetic user)');passed++;
    await page.locator('[data-goal="beach"]').click();
    assert.match(await page.locator('#cards').innerText(),/Free general access/);
    assert.equal(await page.locator('#cards a[href^="https://klook.tpo.lv/"]').count(),0,'No paid pitch for free pier');
    await page.locator('#buyer-text').fill('I need a replacement printer cartridge, not a tour');
    await page.locator('#planner button[type="submit"]').click();
    assert.equal(await page.locator('#cards a[href^="https://klook.tpo.lv/"]').count(),0,'Unknown user need must not get an unrelated affiliate ad');
    console.log('PASS no paid advertising when intent is unknown/free (synthetic user)');passed++;
    await page.locator('#try-inline').click();
    assert.equal(await page.locator('#embed-wrap').isVisible(),true);
    assert.match(await page.locator('iframe').getAttribute('src'),/youtube-nocookie.com\/embed/);
    await page.locator('#player-failed').click();
    assert.equal(await page.locator('#embed-wrap').isVisible(),false);
    assert.match(await page.locator('#video-status').innerText(),/reported unavailable/);
    console.log('PASS honest player failure fallback without fake playback');passed++;
    await page.locator('#vision-upload').setInputFiles('live-la/vision-fixture.jpg');
    await page.waitForFunction(()=>document.querySelector('#vision-output').textContent.includes('cat')||document.querySelector('#vision-status').textContent.includes('failed'),null,{timeout:45000});
    const vision=await page.locator('#vision-output').innerText();
    if(!vision.includes('cat'))throw Error('On-device model did not detect a cat: '+vision+'; status '+await page.locator('#vision-status').innerText());
    assert.match(await page.locator('#vision-output').innerText(),/no purchase intent inferred/i);
    console.log('PASS actual local EfficientDet image inference (rights-checked sample, not a real user)');passed++;
    await page.evaluate(async()=>{
      const img=new Image();img.src='./vision-fixture.jpg';await img.decode();
      const canvas=document.createElement('canvas');
      canvas.width=640;canvas.height=416;
      const ctx=canvas.getContext('2d');
      const paint=()=>ctx.drawImage(img,0,0,canvas.width,canvas.height);
      paint();window.__liveCAMfixture=setInterval(paint,80);
      const stream=canvas.captureStream(8);
      navigator.mediaDevices.getDisplayMedia=async()=>stream;
    });
    await page.locator('#screen-capture').click();
    await page.waitForFunction(()=>document.querySelector('#vision-output').textContent.includes('cat')&&document.querySelector('#stop-capture').disabled===false,null,{timeout:25000});
    assert.equal(await page.locator('#vision-preview').isVisible(),true,'Local video preview must be visible');
    await page.locator('#stop-capture').click();
    assert.equal(await page.locator('#stop-capture').isDisabled(),true);
    console.log('PASS local video MediaStream inference / stop (synthetic frames, not a third-party stream)');passed++;
    assert.deepEqual(errors,[],'Script errors on desktop: '+errors.join('; '));
    const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true});
    await mobile.goto('http://127.0.0.1:8765/live-la/?goal=walk&budget=30',{waitUntil:'domcontentloaded'});
    await mobile.waitForFunction(()=>document.querySelector('#match-status')?.textContent.includes('loaded'));
    assert.equal(await mobile.locator('#goal').inputValue(),'walk');
    assert.match(await mobile.locator('#cards').innerText(),/Hollywood Sign/);
    assert.ok(await mobile.locator('#screen-capture').isVisible());
    console.log('PASS mobile high-intent deep link (synthetic visitor)');passed++;
    await mobile.close();await page.close();
  }finally{await browser.close();}
  console.log('PASS '+passed+'/6 grounded browser QA scenarios. Unverified: inline external stream, independent acquisition, real sale, commission rights and payout.');
}
main().catch(e=>{console.error(e.stack||String(e));process.exit(1);});