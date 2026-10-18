/* Actual webcam-frame optical inference smoke in headless Chrome.
   A rights-checked upstream cat/dog photograph is painted into a canvas MediaStream.
   Browser model must really detect it in consecutive frames.
   It is a synthetic camera feed, NOT a test on a real household cat. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--use-fake-ui-for-media-stream']});
  try {
    const context=await browser.newContext({permissions:['camera']});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    await page.goto('http://127.0.0.1:8765/cat-tales/live/',{waitUntil:'domcontentloaded'});
    await page.evaluate(async()=>{
      const img=new Image();
      img.src='./vision-fixture.jpg';await img.decode();
      const canvas=document.createElement('canvas');canvas.width=640;canvas.height=416;
      const ctx=canvas.getContext('2d');
      const paint=()=>ctx.drawImage(img,0,0,640,416);
      paint();window.__fakeVisionInterval=setInterval(paint,80);
      const stream=canvas.captureStream(12);
      const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia=async options=>options&&options.video?stream:original(options);
    });
    await page.locator('#camera').click();
    await page.waitForFunction(()=>document.querySelector('#camera-box')&&!document.querySelector('#camera-box').classList.contains('hidden'),null,{timeout:12000});
    assert.equal(await page.locator('#enable-vision').isDisabled(),true);
    await page.locator('#vision-consent').check();
    assert.equal(await page.locator('#enable-vision').isEnabled(),true);
    await page.locator('#enable-vision').click();
    await page.waitForFunction(()=>['已检测到候选猫物体','运行失败','加载失败'].includes(document.getElementById('vision-status').textContent),null,{timeout:45000});
    const status=await page.locator('#vision-status').innerText();
    if(status!=='已检测到候选猫物体')throw Error('Vision live model not ready: '+status+' '+await page.locator('#vision-detail').innerText());
    await page.locator('#message-input').fill('你从摄像头画面检测到猫了吗');
    await page.locator('#send').click();
    await page.waitForFunction(()=>document.querySelector('#messages').textContent.includes('EfficientDet'),null,{timeout:8000});
    const reply=await page.locator('#messages').innerText();
    assert.match(reply,/无法判断它在做什么/);
    await page.locator('#camera').click();
    assert.equal(await page.locator('#enable-vision').isDisabled(),true);
    assert.match(await page.locator('#vision-status').innerText(),/未运行/);
    await page.locator('#message-input').fill('镜头里还有猫吗');
    await page.locator('#send').click();
    await page.waitForTimeout(300);
    assert.match(await page.locator('#messages').innerText(),/没有来自真实视觉模型/);
    await page.evaluate(()=>clearInterval(window.__fakeVisionInterval));
    assert.deepEqual(errors,[]);
    console.log('VISION_CAMERA_PIPELINE_PASS: synthetic camera stream → 2 actual frames → cat object candidates → bounded dialogue → teardown');
  } finally {await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
