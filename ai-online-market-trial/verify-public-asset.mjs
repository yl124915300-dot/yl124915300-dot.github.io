// Independent executable fixture check. No dependencies, registration, private input or payment.
import assert from 'node:assert/strict';
const base='https://ai-online-liquidity.yl124915300.workers.dev';
const catalog=await (await fetch(base+'/assets')).json();
const asset=catalog.assets.find(a=>a.id==='minimized-summary-v1');
assert.ok(asset);assert.equal(asset.programHash,'32146b1606479e2c78a9cc05a68a7dd87f0e1b68a5fd22fb6ec683b401c53554');
const r=await fetch(base+'/execute',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({assetId:asset.id,requestId:crypto.randomUUID(),publicOrFabricatedInputConfirmed:true,input:{rows:[{region:'fixture-north',visits:'2',note:'PUBLIC_EXTRA'},{region:'fixture-north',visits:3},{region:'fixture-south',visits:'1.5'}]}})});
assert.equal(r.status,200);const result=await r.json();assert.equal(result.ok,true);assert.deepEqual(result.output,[{region:'fixture-north',total:5},{region:'fixture-south',total:1.5}]);assert.ok(!JSON.stringify(result.output).includes('PUBLIC_EXTRA'));
console.log(JSON.stringify({ok:true,assetId:asset.id,executionId:result.executionId,output:result.output,independentUsageVerified:false,note:'This fixture is a self-check. Independent owner use requires separate identity and log verification.'},null,2));
