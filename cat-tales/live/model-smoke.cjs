const {chromium}=require('playwright');
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true,
args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--no-sandbox']});
try{
 const context=await browser.newContext({permissions:['microphone','camera']});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')console.log('BROWSER_ERROR',m.text().slice(0,250));});
 await page.goto('http://127.0.0.1:8765/cat-tales/live/',{waitUntil:'domcontentloaded'});
 await page.locator('#mic-consent').check();
 await page.locator('#start').click();
 await page.waitForFunction(()=>document.getElementById('enable-sound').disabled===false,{timeout:12000});
 await page.locator('#enable-sound').click();
 await page.waitForFunction(()=>['模型已加载','加载失败'].includes(document.getElementById('sound-status').textContent),null,{timeout:65000});
 const status=await page.locator('#sound-status').innerText();
 const body=await page.locator('#sound-classes').innerText();
 if(status!=='模型已加载')throw Error('Model unavailable: '+status+' '+body);
 await page.waitForFunction(()=>document.getElementById('sound-classes').textContent.includes('模型类别排序分数'),null,{timeout:30000});
 const evidence=await page.locator('#sound-classes').innerText();
 if(!evidence.match(/\d+\.\d{2}/))throw Error('No scored YAMNet inference results: '+evidence);
 console.log('YAMNET_REAL_MODEL_PASS:',evidence.slice(0,260),'browser errors:',errors.length);
 await page.locator('#stop').click();
 if(await page.locator('#ask-sound').isEnabled())throw Error('Sound result remained actionable after stop');
}finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
