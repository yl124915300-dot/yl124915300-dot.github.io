const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
 try{
   const page=await browser.newPage();
   const errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('LanguageModel API languages'))console.log('BROWSER_ERROR',m.text().slice(0,240));});
   await page.goto('http://127.0.0.1:8765/cat-tales/live/',{waitUntil:'domcontentloaded'});
   const result=await page.evaluate(async()=>{
      const mod=await import('./vision-vendor/vision_bundle.mjs');
      const fileset=await mod.FilesetResolver.forVisionTasks('./vision-vendor/wasm');
      const detector=await mod.ObjectDetector.createFromOptions(fileset,{
        baseOptions:{modelAssetPath:'./vision-vendor/efficientdet_lite0.tflite',delegate:'CPU'},
        runningMode:'IMAGE',scoreThreshold:.25,maxResults:10
      });
      const img=new Image();
      img.src='./vision-fixture.jpg';
      await img.decode();
      const r=detector.detect(img);
      const labels=(r.detections||[]).map(x=>({
        label:x.categories&&x.categories[0]&&x.categories[0].categoryName,
        score:x.categories&&x.categories[0]&&x.categories[0].score
      }));
      detector.close();
      return {width:img.naturalWidth,height:img.naturalHeight,labels};
   });
   assert.ok(result.width>10);
   assert.ok(result.labels.some(x=>/cat/i.test(x.label||'')&&x.score>.25),'Real model should find the sample cat');
   assert.deepEqual(errors,[]);
   console.log('VISION_REAL_MODEL_PASS',JSON.stringify(result).slice(0,850));
 }finally{await browser.close();}
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
