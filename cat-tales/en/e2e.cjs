const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},permissions:['microphone','camera'],locale:'en-US'});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',err=>errors.push(String(err)));
  await page.addInitScript(()=>{
   class FakeRecognizer{
    constructor(){this.lang='';this.interimResults=true;this.continuous=false;this.listening=false;window.__enRec=this;}
    start(){this.listening=true;setTimeout(()=>{if(this.listening)this.onstart?.();},5);}
    stop(){if(!this.listening)return;this.listening=false;setTimeout(()=>this.onend?.(),5);}
    emit(msg){this.onresult?.({resultIndex:0,results:[{isFinal:true,0:{transcript:msg}}]});}
   }
   window.SpeechRecognition=FakeRecognizer;window.webkitSpeechRecognition=FakeRecognizer;
   window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
   Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],cancel:()=>{},speak:u=>setTimeout(()=>u.onend?.(),60)},configurable:true});
  });
  const site=process.env.CAT_TALES_EN_TEST_URL||'http://127.0.0.1:8765/cat-tales/en/';
  await page.goto(site,{waitUntil:'domcontentloaded'});
  await page.locator('#system-status').waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert.match(await page.title(),/Cat Tales/);
  assert.equal(await page.locator('.cat-tabs').isVisible(),true);
  assert.equal(await page.locator('#start').isDisabled(),true);
  assert.equal(await page.locator('#enable-sound').isDisabled(),true);
  assert.equal(await page.locator('#enable-vision').isDisabled(),true);
  const x=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(x<=2,'mobile overflow: '+x);
  await page.locator('#cat-name').fill('Mochi');
  assert.match(await page.locator('#cat-buddy-label').innerText(),/Mochi/);
  await page.locator('#message-input').fill('Mochi just ate but keeps meowing by the door');
  await page.locator('#send').click();await page.waitForTimeout(150);
  assert.match(await page.locator('#messages').innerText(),/recently ate/);
  await page.locator('#cat-keepsake summary').click();
  await page.locator('#cat-note-make').click();
  const note=await page.locator('#cat-note-text').inputValue();
  assert.match(note,/Mochi/);assert.match(note,/owner-reported/);assert.match(note,/not a verified meow translation/);
  assert.equal(await page.locator('#cat-note-copy').isEnabled(),true);
  await page.locator('#reset').click();
  assert.equal(await page.locator('#cat-note-text').inputValue(),'');
  await page.locator('#message-input').fill("My cat can't pee and is crying.");
  await page.locator('#send').click();await page.waitForTimeout(100);
  assert.match(await page.locator('#messages').innerText(),/emergency veterinarian/);
  await page.locator('#mic-consent').check();
  assert.equal(await page.locator('#start').isEnabled(),true);
  await page.locator('#start').click();await page.waitForTimeout(600);
  assert.equal(await page.locator('#stop').isEnabled(),true);
  assert.equal(await page.evaluate(()=>window.__enRec?.lang),'en-US');
  await page.evaluate(()=>window.__enRec.emit('My cat is looking at the window.'));
  await page.waitForTimeout(450);
  assert.match(await page.locator('#messages').innerText(),/looking at the window/);
  assert.equal(await page.locator('#enable-sound').isEnabled(),true);
  await page.locator('#camera').click();await page.waitForTimeout(650);
  assert.equal(await page.locator('#camera-box').isVisible(),true);
  assert.equal(await page.locator('#enable-vision').isDisabled(),true);
  await page.locator('#vision-consent').check();
  assert.equal(await page.locator('#enable-vision').isEnabled(),true);
  await page.locator('#stop').click();
  assert.equal(await page.locator('#camera-box').isVisible(),false);
  assert.equal(await page.locator('#stop').isDisabled(),true);
  assert.equal(await page.locator('#enable-sound').isDisabled(),true);
  assert.deepEqual(errors,[],'no JavaScript page errors');
  await context.close();
  const desktop=await browser.newContext({viewport:{width:1280,height:800}});
  const wide=await desktop.newPage();await wide.goto(site,{waitUntil:'domcontentloaded'});
  assert.equal(await wide.locator('.cat-tabs').isVisible(),false);
  assert.ok(await wide.locator('#senses').isVisible());
  const dx=await wide.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(dx<=2,'desktop overflow: '+dx);
  await desktop.close();
  console.log('CAT_TALES_EN_PASS: English context, urgent care, privacy, consent, mobile/desktop and live voice/camera flow');
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});