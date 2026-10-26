/* FrameFind owned acquisition funnel QA. These are synthetic browser actions,
 * NOT independent site visitors, rankings, purchased clicks or sales.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ORIGIN='http://127.0.0.1:8765';
async function main(){
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1200,height:780}});
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    const outgoing=[];
    page.on('request',r=>outgoing.push(r.url()));
    await page.goto(ORIGIN+'/',{waitUntil:'domcontentloaded',timeout:20000});
    assert.match(await page.title(),/FrameFind AI/);
    assert.equal(await page.locator('#home-video-form').count(),1);
    assert.equal(await page.locator('a[href="/video-find/"]').count()>0,true);
    assert.equal(await page.locator('a[href*="find-model-number-from-video"]').count(),1);
    await page.locator('#home-video-url').fill('http://example.com/video.mp4');
    await page.locator('#home-video-form button').click();
    assert.match(await page.locator('#home-video-status').innerText(),/public HTTPS video link/);
    assert.equal(new URL(page.url()).pathname,'/');
    console.log('PASS acquisition homepage rejects non-HTTPS video inputs');

    const shared='https://www.youtube.com/watch?v=jfKfPfyJRdk';
    await page.locator('#home-video-url').fill(shared);
    await page.locator('#home-video-form button').click();
    await page.waitForURL('**/video-find/**',{timeout:15000});
    await page.waitForFunction(()=>document.querySelector('#video-url')?.value==='https://www.youtube.com/watch?v=jfKfPfyJRdk',{timeout:15000});
    assert.equal(await page.locator('#video-url').inputValue(),shared);
    assert.equal(new URL(page.url()).hash,'','Incoming video URL must be scrubbed from address bar');
    assert.equal(new URL(page.url()).searchParams.get('utm_source'),'homepage');
    assert.equal(await page.locator('#source-embed iframe').count(),0,'No automatic third-party video playback');
    assert.ok(outgoing.filter(u=>u.startsWith(ORIGIN)).every(u=>!u.includes('jfKfPfyJRdk')),"No user's video URL in first-party request URLs");
    console.log('PASS homepage direct video handoff, source campaign tag and URL fragment removal');

    await page.goto(ORIGIN+'/',{waitUntil:'domcontentloaded'});
    await page.evaluate(()=>{
      Object.defineProperty(navigator,'share',{value:undefined,configurable:true});
      Object.defineProperty(navigator,'clipboard',{value:{writeText:async s=>{window.__lastCopied=s;}},configurable:true});
    });
    await page.locator('#share-home').click();
    const copied=await page.evaluate(()=>window.__lastCopied);
    assert.match(copied,/utm_source=user_share/);
    assert.match(copied,/utm_medium=referral/);
    assert.doesNotMatch(copied,/watch\?v=|https%3A%2F%2Fwww.youtube.com/);
    console.log('PASS voluntary referral link contains campaign source but no original video');

    const guides=['find-youtube-product','find-tiktok-product','find-product-from-screenshot','find-model-number-from-video'];
    for(const path of guides){
      const response=await page.goto(ORIGIN+'/video-find/'+path+'/',{waitUntil:'domcontentloaded'});
      assert.equal(response.status(),200);
      assert.equal(await page.locator('link[rel="canonical"]').count(),1);
      assert.ok(await page.locator('a[href^="/video-find/"]').count()>0);
    }
    const guide=await page.locator('main').innerText();
    assert.match(guide,/model number/i);
    assert.match(guide,/Read label\/model/);
    assert.match(guide,/no evidence/i);
    console.log('PASS four distinct search-intent guides publicly resolve to existing actual tool');

    const xml=await (await page.request.get(ORIGIN+'/sitemap.xml')).text();
    assert.ok(xml.includes('video-find/find-model-number-from-video/'));
    assert.deepEqual(errors,[]);
    console.log('PASS 5/5 synthetic acquisition/first-touch QA checks; real external indexing, visitor reach and checkout unverified.');
    await page.close();
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e.stack||e);process.exit(1);});