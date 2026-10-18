const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,
   args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--no-sandbox']});
 try{
  const context=await browser.newContext({permissions:['microphone','camera']});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{
    class FakeRecognizer {
      constructor(){this.lang='zh-CN';this.continuous=false;this.interimResults=true;this.listening=false;window.__fakeRecognizer=this;}
      start(){this.listening=true;setTimeout(()=>{if(this.listening&&this.onstart)this.onstart();},5);}
      stop(){if(!this.listening)return;this.listening=false;setTimeout(()=>{if(this.onend)this.onend();},5);}
      emit(text){if(this.onresult)this.onresult({resultIndex:0,results:[{isFinal:true,0:{transcript:text}}]});}
    }
    Object.defineProperty(window,'SpeechRecognition',{value:FakeRecognizer,configurable:true});
    Object.defineProperty(window,'webkitSpeechRecognition',{value:FakeRecognizer,configurable:true});
    window.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
    Object.defineProperty(window,'speechSynthesis',{value:{
      getVoices:()=>[],cancel:()=>{},speak:(u)=>{setTimeout(()=>{if(u.onend)u.onend();},50);}
    },configurable:true});
  });
  await page.goto('http://127.0.0.1:8765/cat-tales/live/',{waitUntil:'networkidle'});
  assert.match(await page.title(),/猫猫物语 LIVE/);
  assert.equal(await page.locator('#start').isDisabled(),true);
  await page.locator('#message-input').fill('你好');
  await page.locator('#send').click();
  await page.waitForTimeout(250);
  let texts=await page.locator('#messages').innerText();
  assert.match(texts,/我是猫猫物语/);
  await page.locator('#mic-consent').check();
  assert.equal(await page.locator('#start').isEnabled(),true);
  await page.locator('#start').click();
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('#stop').isEnabled(),true);
  await page.evaluate(()=>window.__fakeRecognizer&&window.__fakeRecognizer.emit('它刚吃完还在门口叫'));
  await page.waitForTimeout(1200);
  texts=await page.locator('#messages').innerText();
  assert.match(texts,/它刚吃完还在门口叫/);
  assert.match(texts,/刚吃过|加餐/);
  await page.locator('#message-input').fill('然后呢');
  await page.locator('#send').click();
  await page.waitForTimeout(450);
  texts=await page.locator('#messages').innerText();
  assert.match(texts,/不必为了测试再加餐/);
  await page.locator('#manual-mode').check();
  assert.equal(await page.locator('#listen-once').isEnabled(),true);
  const count=await page.locator('#messages .bubble').count();
  await page.locator('#listen-once').click();await page.waitForTimeout(150);
  await page.evaluate(()=>window.__fakeRecognizer&&window.__fakeRecognizer.emit('喵'));
  await page.waitForTimeout(320);
  assert.equal(await page.locator('#messages .bubble').count(),count);
  await page.locator('#listen-once').click();await page.waitForTimeout(150);
  await page.evaluate(()=>window.__fakeRecognizer&&window.__fakeRecognizer.emit('它过来了'));
  await page.waitForTimeout(600);
  texts=await page.locator('#messages').innerText();
  assert.match(texts,/主人观察/);
  assert.equal(await page.locator('#enable-vision').isDisabled(),true);
  await page.locator('#message-input').fill('你从摄像头画面检测到猫了吗');await page.locator('#send').click();
  await page.waitForTimeout(280);
  assert.match(await page.locator('#messages').innerText(),/没有来自真实视觉模型/);
  await page.locator('#camera').click();
  await page.waitForTimeout(700);
  assert.equal(await page.locator('#enable-vision').isDisabled(),true);
  await page.locator('#vision-consent').check();
  assert.equal(await page.locator('#enable-vision').isEnabled(),true);

  assert.equal(await page.locator('#camera-box').isVisible(),true);
  await page.locator('#camera').click();
  assert.equal(await page.locator('#camera-box').isVisible(),false);
  assert.equal(await page.locator('#enable-vision').isDisabled(),true);
  assert.match(await page.locator('#vision-candidate').innerText(),/尚无实时视觉证据/);
  assert.equal(await page.locator('#enable-sound').isEnabled(),true);
  assert.match(await page.locator('#sound-candidate').innerText(),/尚无真实模型结果/);
  await page.locator('#camera').click();await page.waitForTimeout(500);
  assert.equal(await page.locator('#camera-box').isVisible(),true);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(250);
  assert.equal(await page.locator('#camera-box').isVisible(),false);
  assert.match(await page.locator('#system-status').innerText(),/自动结束/);
  assert.equal(await page.locator('#start').isEnabled(),true);
  assert.match(await page.locator('#connection').innerText(),/未开始/);
  await page.locator('#reset').click();
  assert.equal(await page.locator('#messages .bubble').count(),1);
  await page.locator('#message-input').fill('然后呢');await page.locator('#send').click();await page.waitForTimeout(280);
  assert.match(await page.locator('#messages').innerText(),/还不确定/);
  assert.deepEqual(errors,[]);
  console.log('E2E PASS: text dialogue, mic opt-in, voice exchange, camera controls, model gating, stop and clear');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
