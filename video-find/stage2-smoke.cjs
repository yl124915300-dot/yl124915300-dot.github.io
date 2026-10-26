/* FrameFind stage 2 real browser evidence.
 * PWA share POST is synthetic, not a real Android system share event.
 * Actual in-browser Tesseract OCR reads our generated image, not a real buyer screenshot.
 */
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {Buffer}=require('node:buffer');
async function main(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1200,height:850},acceptDownloads:true,serviceWorkers:'allow'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:8765/video-find/',{waitUntil:'domcontentloaded',timeout:20000});
  const manifest=await page.evaluate(async()=>await (await fetch('/video-find/manifest.webmanifest')).json());
  assert.equal(manifest.share_target.method,'POST');
  assert.equal(manifest.share_target.action,'/video-find/share');
  assert.equal(manifest.share_target.enctype,'multipart/form-data');
  assert.equal(manifest.share_target.params.text,'text');
  assert.equal(manifest.scope,'/video-find/');
  assert.ok(manifest.icons.some(icon=>icon.sizes==='192x192'&&icon.type==='image/png'),'Missing 192px app icon');
  assert.ok(manifest.icons.some(icon=>icon.sizes==='512x512'&&icon.type==='image/png'),'Missing 512px app icon');
  for(const size of [192,512]){
    const got=await page.evaluate(async size=>{
      const img=new Image();
      img.src='/video-find/icon-'+size+'.png';
      await img.decode();
      return {w:img.naturalWidth,h:img.naturalHeight};
    },size);
    assert.deepEqual(got,{w:size,h:size},'PWA icon cannot render');
  }
  const bookmarklet=await page.locator('#framefind-bookmarklet').getAttribute('href');
  assert.ok(bookmarklet?.startsWith('javascript:'),'Desktop bookmarklet should be explicitly draggable');
  assert.ok(bookmarklet.includes('#shared='),'Desktop bookmarklet must use private fragment handoff');
  console.log('PASS manifest accepts share-target, PNG icons render and desktop shortcut targets private fragment');
  await page.waitForFunction(()=>navigator.serviceWorker?.controller!==null,null,{timeout:22000}).catch(async()=>{
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!navigator.serviceWorker?.controller,null,{timeout:13000});
  });
  // Force controlled navigation to verify the installed PWA POST path is intercepted.
  const shared='https://www.youtube.com/watch?v=jfKfPfyJRdk';
  await Promise.all([
    page.waitForNavigation({waitUntil:'domcontentloaded',timeout:20000}),
    page.evaluate((u)=>{
      const form=document.createElement('form');
      form.method='POST';form.enctype='multipart/form-data';form.action='/video-find/share';
      const title=document.createElement('input');title.name='title';title.value='example share';
      const text=document.createElement('input');text.name='text';text.value='I saw this in a video '+u;
      form.append(title,text);document.body.append(form);form.submit();
    },shared)
  ]);
  await page.waitForFunction(()=>document.querySelector('#video-url')?.value?.startsWith('https://www.youtube.com/watch?v='),null,{timeout:12000});
  assert.equal(await page.locator('#video-url').inputValue(),shared);
  assert.match(await page.locator('#share-intake').innerText(),/received/i);
  assert.equal(new URL(page.url()).search,'','No shared URL in host-visible query');
  assert.equal(new URL(page.url()).hash,'','Shared URL fragment must be scrubbed after client read');
  assert.equal(await page.locator('#source-embed iframe').count(),0,'Shared link must not automatically autoplay');
  console.log('PASS service-worker POST share locally receives URL and scrubs browser URL (simulated Android source)');
  const encoded=await page.evaluate(async()=>{
    const can=document.createElement('canvas');
    can.width=950;can.height=250;
    const g=can.getContext('2d');
    g.fillStyle='#ffffff';g.fillRect(0,0,950,250);
    g.fillStyle='#101010';g.font='bold 105px Arial';
    g.fillText('SONY RX420',40,167);
    g.strokeStyle='#dedede';g.strokeRect(1,1,948,248);
    return can.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#screenshot-file').setInputFiles({name:'test-label.png',mimeType:'image/png',buffer:Buffer.from(encoded,'base64')});
  await page.waitForFunction(()=>window.FrameFindQA.getSnapshot().hasFrame,null,{timeout:10000});
  await page.locator('#frame-canvas').scrollIntoViewIfNeeded();
  const box=await page.locator('#frame-canvas').boundingBox();
  await page.mouse.move(box.x+box.width*.03,box.y+box.height*.12);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.94,box.y+box.height*.94,{steps:5});
  await page.mouse.up();
  assert.equal(await page.locator('#read-label').isEnabled(),true);
  assert.equal(await page.locator('#use-ocr').isDisabled(),true);
  await page.locator('#read-label').click();
  await page.waitForFunction(()=>{
    const t=document.querySelector('#ocr-status')?.textContent||'';
    return /Text candidate:|OCR unavailable:|No legible brand/.test(t);
  },null,{timeout:90000});
  const ocrState=await page.locator('#ocr-status').innerText();
  if(!ocrState.startsWith('Text candidate:'))throw Error('Actual browser OCR failed: '+ocrState);
  assert.match(ocrState,/SONY/i,'OCR failed to detect exact visible brand letters');
  assert.match(ocrState,/(RX420|RX42O)/i,'OCR failed to detect distinct model-like text');
  assert.equal(await page.locator('#item-description').inputValue(),'','OCR must not silently modify user search');
  await page.locator('#use-ocr').click();
  assert.match(await page.locator('#item-description').inputValue(),/SONY/i);
  await page.locator('#category').fill('camera');
  await page.locator('#search-products').click();
  assert.equal(await page.locator('#retailer-results a').count(),4);
  console.log('PASS actual local Tesseract OCR identifies visible brand/model and only inserts upon explicit shopper acceptance');
  assert.deepEqual(errors,[],'Uncaught JS exceptions: '+errors.join(';'));
  await context.close();
 }finally{await browser.close();}
 console.log('PASS stage-2 three independent synthetic/browser checks. Unproven: native Android OS share UI, real user traffic, SKU match, paid purchase or commission.');
}
main().catch(e=>{console.error(e.stack||String(e));process.exit(1);});
