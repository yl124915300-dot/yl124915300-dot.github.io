'use strict';
const assert = require('node:assert/strict');
const {chromium} = require('playwright');

async function main(){
  const browser=await chromium.launch({headless:true});
  let checks=0;
  try{
    for(const run of [
      {label:'clear-desktop',rain:0,alerts:[],mobile:false,query:'?need=walk&budget=50&party=3&seen=crowded'},
      {label:'coastal-flood-mobile',rain:80,alerts:['Coastal Flood Advisory'],mobile:true,query:'?need=beach&budget=100&party=2&when=today'},
      {label:'official-feed-unavailable',broken:true,mobile:false,query:'?need=beach&budget=0'}
    ]){
      const context=await browser.newContext({viewport:run.mobile?{width:390,height:844}:{width:1240,height:880},isMobile:run.mobile,deviceScaleFactor:1});
      const page=await context.newPage();
      const exceptions=[];
      page.on('pageerror',err=>exceptions.push(String(err)));
      await page.route('https://www.youtube-nocookie.com/**',route=>route.fulfill({status:200,body:'<html><body>Official player not tested in synthetic QA</body></html>',contentType:'text/html'}));
      await page.route('https://api.weather.gov/**',route=>{
        if(run.broken)return route.abort();
        const path=new URL(route.request().url()).pathname;
        const data=path.startsWith('/points/')?{properties:{forecastHourly:'https://api.weather.gov/gridpoints/LOX/1,1/forecast/hourly'}}
          :path.endsWith('/forecast/hourly')?{properties:{periods:[{startTime:new Date(Date.now()-10*60000).toISOString(),endTime:new Date(Date.now()+50*60000).toISOString(),temperature:73,temperatureUnit:'F',shortForecast:run.rain?'Rain':'Clear',probabilityOfPrecipitation:{value:run.rain}}]}}
          :path.startsWith('/alerts/')?{features:(run.alerts||[]).map(event=>({properties:{event,expires:new Date(Date.now()+2*3600000).toISOString()}}))}
          :{};
        return route.fulfill({status:200,contentType:'application/geo+json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(data)});
      });
      await page.goto('http://127.0.0.1:8765/live-la/'+run.query,{waitUntil:'domcontentloaded',timeout:20000});
      await page.waitForFunction(()=>document.querySelector('#cards')?.children.length>=1,{timeout:12000});
      await page.waitForFunction(()=>/feed current|partially available|temporarily unavailable/.test(document.querySelector('#weather-status')?.textContent||''),{timeout:15000});
      assert.equal(await page.locator('iframe').count(),1,'Video player must be present');
      assert.ok((await page.locator('iframe').getAttribute('src')).includes('/embed/qmE7U1YZPQA'),'Embed must match the destination tourism publisher video');
      const hrefs=await page.locator('#cards a').evaluateAll(els=>els.map(a=>a.href));
      assert.ok(hrefs.some(h=>h.includes('www.santamonica.com')||h.includes('forecast.weather.gov')||h.includes('klook.tpo.lv')),'Should lead to real official or affiliate destinations');
      if(run.broken){
        assert.match(await page.locator('#weather-status').innerText(),/unavailable/i,'Must explicitly disclose failed official feed');
        assert.match(await page.locator('#weather-alerts').innerText(),/failed/i,'Must not imply no warnings on failure');
      }else{
        assert.match(await page.locator('#weather-status').innerText(),/feed current/i,'Must show NWS real-data state when present');
        assert.match(await page.locator('#nws-temp').innerText(),/73°F/);
        assert.match(await page.locator('#nws-rain').innerText(),new RegExp('^'+run.rain+'%'));
        if(run.alerts.length){
          assert.match(await page.locator('#weather-alerts').innerText(),/Coastal Flood Advisory/);
          assert.match(await page.locator('#cards').innerText(),/Check the coastal conditions first/);
        }else{
          assert.equal(await page.locator('#need').inputValue(),'walk','URL parameter must preselect intent');
          assert.equal(await page.locator('#budget').inputValue(),'50','URL parameter must preselect budget');
          assert.equal(await page.locator('#party').inputValue(),'3','URL parameter must preselect party');
          await page.locator('#planner button[type=submit]').click();
          const cards=await page.locator('#cards').innerText();
          assert.match(cards,/Hollywood Sign Express/,'Should rank a qualifying existing paid activity');
          assert.doesNotMatch(cards,/Big Bus Hop-On/,'A $59 activity must not be listed for a $50 cap');
        }
      }
      assert.equal(exceptions.length,0,run.label+' page exceptions: '+exceptions.join('; '));
      await context.close();
      checks++;
      console.log('PASS '+run.label+' (synthetic browser test, not real customer traffic)');
    }
  }finally{await browser.close();}
  assert.equal(checks,3);
  console.log('QA passed 3 synthetic desktop/mobile scenarios. No independent viewers, live video playback, sales or payouts established.');
}
main().catch(e=>{console.error(e.stack||e);process.exit(1);});
