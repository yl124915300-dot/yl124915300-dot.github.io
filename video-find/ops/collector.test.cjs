/* Tests the server collector contract without deploying a worker or fabricating visitors. */
'use strict';
const assert=require('node:assert/strict');
const ORIGIN='https://yl124915300-dot.github.io';
const VALID=new Set(['visit','video_submitted','item_selected','product_search','merchant_outbound']);
(async()=>{
  const {default:worker}=await import('./collector.mjs');
  const events=new Map();
  const env={
    HMAC_SALT:'local-test-secret-not-a-production-value',
    ADMIN_TOKEN:'local-test-admin-token',
    DB:{prepare(sql){
      return {bind(...params){
        return {
          async run(){
            assert.match(sql,/INSERT OR IGNORE INTO framefind_events/);
            assert.equal(params.length,8);
            assert.match(params[1],/^[0-9a-f]{64}$/,'anonymous session hash only');
            assert.ok(!params.some(x=>typeof x==='string'&&/youtube|jfKfPfy|mailto:/.test(x)));
            const key=params.slice(0,3).join(':');
            if(!events.has(key))events.set(key,params);
            return {success:true};
          },
          async all(){
            const grouped={};
            for(const p of events.values()){
              if(p[0]<params[0])continue;
              const key=[p[0],p[3],p[4],p[2]].join(':');
              grouped[key]=(grouped[key]||0)+1;
            }
            return {results:Object.entries(grouped).map(([k,v])=>{
              const [day,source,medium,stage]=k.split(':');
              return {day,source,medium,stage,sessions:v};
            })};
          }
        };
      }};
    }}
  };
  const date=new Date().toISOString().slice(0,10);
  const sid=crypto.randomUUID();
  const base={v:1,day:date,sid,source:'user_share',medium:'referral',entry:'finder',channel:'video_link',merchant:'other'};
  const request=(stage,override={},agent='Mozilla/5.0')=>new Request('https://framefind.example.workers.dev/collect',{
    method:'POST',headers:{'Origin':ORIGIN,'Content-Type':'application/json','User-Agent':agent},
    body:JSON.stringify({...base,stage,...override})
  });
  for(const stage of VALID){
    const options=stage==='merchant_outbound'?{merchant:'amazon'}:{};
    const result=await worker.fetch(request(stage,options),env);
    assert.equal(result.status,202,stage);
  }
  assert.equal(events.size,5);
  assert.equal((await worker.fetch(request('merchant_outbound',{merchant:'amazon'}),env)).status,202);
  assert.equal(events.size,5,'server must dedupe repeat stages for same anonymous session');
  assert.equal((await worker.fetch(request('visit',{videoUrl:'https://youtube.com/private'}),env)).status,400);
  assert.equal((await worker.fetch(request('visit',{channel:'demo'}),env)).status,400);
  assert.equal((await worker.fetch(request('visit',{},'Playwright Chrome'),env)).status,202);
  assert.equal(events.size,5,'bot event not stored');
  const req=new Request('https://framefind.example.workers.dev/stats');
  assert.equal((await worker.fetch(req,env)).status,401,'Stats must require owner-only token');
  const authorized=new Request('https://framefind.example.workers.dev/stats?days=7',{headers:{Authorization:'Bearer '+env.ADMIN_TOKEN}});
  const data=await (await worker.fetch(authorized,env)).json();
  assert.ok(data.rows.length>=5);
  assert.ok(data.rows.every(row=>row.sessions===1));
  const bad=new Request('https://framefind.example.workers.dev/collect',{method:'POST',headers:{Origin:'https://thirdparty.example','Content-Type':'application/json'},body:JSON.stringify({...base,stage:'visit'})});
  assert.equal((await worker.fetch(bad,env)).status,403);
  assert.equal(events.size,5);
  console.log('PASS 5/5 collector stages, deduplication, data minimization, bot ignore, origin check and private stats. Synthetic test only; deployment and visitors remain UNVERIFIED.');
})().catch(e=>{console.error(e.stack||String(e));process.exit(1);});