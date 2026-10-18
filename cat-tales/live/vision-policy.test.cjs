const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {evaluate}=require('./vision-policy.js');
function det(label,score){return {categories:[{categoryName:label,score}]};}
test('vision: model input empty does not claim a cat',()=>{
 const d=evaluate([],0);assert.equal(d.catCandidate,false);assert.equal(d.catScore,null);
});
test('vision: one frame cannot confirm a cat',()=>{
 const d=evaluate([det('cat',.82)],0);
 assert.equal(d.oneFrameCat,true);assert.equal(d.catCandidate,false);assert.equal(d.streak,1);
});
test('vision: consecutive cat detections produce a cautious visual candidate',()=>{
 const a=evaluate([det('cat',.82)],0);
 const b=evaluate([det('cat',.78)],a.streak);
 assert.equal(b.catCandidate,true);assert.equal(b.catScore,.78);
});
test('vision: dog is a negative control not converted into cat',()=>{
 const d=evaluate([det('dog',.93)],4);
 assert.equal(d.catCandidate,false);assert.equal(d.dogCandidate,true);assert.equal(d.streak,0);
});
test('vision: low cat score or empty frame resets streak',()=>{
 assert.equal(evaluate([det('cat',.31)],3).streak,0);
 assert.equal(evaluate([],3).streak,0);
});
test('vision: mixed dog and cat scene does not create a sound source inference',()=>{
 const d=evaluate([det('dog',.78),det('cat',.87)],1);
 assert.equal(d.catCandidate,true);assert.equal(d.dogCandidate,true);
 assert.equal(Object.hasOwn(d,'catIsSpeaking'),false);
});
test('vision: scripts parse and privacy consent is exposed',()=>{
 new Function(fs.readFileSync(path.join(__dirname,'vision.js'),'utf8'));
 const h=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
 for(const n of ['id="vision-consent"','id="enable-vision"','id="vision-candidate"','id="fused-status"','vision-policy.js','vision.js'])
 assert.ok(h.includes(n),n);
});
