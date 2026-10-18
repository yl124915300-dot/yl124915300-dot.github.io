const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(String(err)));
  await page.goto('http://127.0.0.1:8765/cat-tales/live/',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#beta-test').evaluate(x=>x.open),false,'Beta must start collapsed');
  await page.locator('#beta-test summary').click();
  assert.equal(await page.locator('#beta-begin').isDisabled(),true);
  assert.equal(await page.locator('#beta-public').isDisabled(),true);
  await page.locator('#beta-consent').check();
  assert.equal(await page.locator('#beta-begin').isEnabled(),true);
  await page.locator('#beta-begin').click();
  assert.match(await page.locator('#beta-status').innerText(),/记录中/);
  // One voluntary typed conversation; this test never claims a real-cat result.
  await page.locator('#message-input').fill('我家猫刚吃完饭还在门口叫');
  await page.locator('#send').click();
  await page.waitForTimeout(320);
  await page.locator('#beta-sample').selectOption('real');
  await page.locator('#beta-browser').selectOption('chrome');
  await page.locator('#beta-noise').selectOption('people');
  await page.locator('#beta-response').selectOption('some');
  await page.locator('#beta-reuse').selectOption('unsure');
  await page.locator('#beta-falseMeow').selectOption('untested');
  await page.locator('#beta-finish').click();
  const report=await page.locator('#beta-report').inputValue();
  assert.match(report,/新增主人消息（含打字）：1/);
  assert.match(report,/本次测试环境：真实家庭猫咪/);
  assert.match(report,/没有上传录音|未保存音频、视频/);
  assert.ok(!report.includes('刚吃完饭还在门口叫'),'Raw dialogue must not be exported');
  assert.equal(await page.locator('#beta-public').isDisabled(),true);
  await page.locator('#beta-report').fill(report+'\n本轮额外备注：只有用户主动编辑才会出现');
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#beta-download').click();
  const download=await downloadPromise;
  const file=fs.readFileSync(await download.path(),'utf8');
  assert.match(file,/本轮额外备注：只有用户主动编辑才会出现/);
  await page.locator('#beta-public-consent').check();
  assert.equal(await page.locator('#beta-public').isEnabled(),true);
  // Never actually submit an issue on behalf of a tester in automated QA.
  await page.locator('#beta-clear').click();
  assert.equal(await page.locator('#beta-public').isDisabled(),true);
  assert.equal(await page.locator('#beta-begin').isDisabled(),true);
  assert.equal(await page.locator('#beta-report').inputValue(),'');
  assert.deepEqual(errors,[]);
  console.log('BETA_MOBILE_E2E_PASS: default-off consent, 1 typed turn, no transcript export, edited TXT, public sharing opt-in and erase.');
 }finally{await browser.close();}
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
