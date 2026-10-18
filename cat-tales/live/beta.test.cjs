const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'beta.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
test('beta script has valid JavaScript syntax and is included after main live script',()=>{
 new Function(app);
 assert.ok(html.indexOf('live.js')<html.indexOf('beta.js'));
 assert.match(html,/id="beta-test"/);
});
test('all explicitly read beta controls exist in the page',()=>{
 const ids=[...app.matchAll(/\$\("([a-zA-Z0-9-]+)"\)/g)].map(x=>x[1]);
 for(const id of new Set(ids))assert.ok(html.includes('id="'+id+'"'),'missing beta id: '+id);
});
test('test is disabled until active consent and public submission requires separate opt-in',()=>{
 assert.match(html,/id="beta-consent"/);
 assert.match(html,/id="beta-public-consent"/);
 assert.match(html,/<button[^>]*id="beta-begin"[^>]*disabled/);
 assert.match(html,/<button[^>]*id="beta-public"[^>]*disabled/);
 assert.match(app,/!s\.report\|\|!\$\("beta-public-consent"\)\.checked/);
});
test('no in-page media capture, background upload, or analytics collection is used',()=>{
 assert.doesNotMatch(app,/getUserMedia|MediaRecorder|XMLHttpRequest|navigator\.sendBeacon|localStorage|sessionStorage/);
 assert.doesNotMatch(app,/(^|[^\w])fetch\s*\(/);
 assert.doesNotMatch(app,/\.innerHTML\s*=/);
});
test('feedback identifies manual labels as unverified rather than model accuracy',()=>{
 assert.match(app,/未经独立人工复核/);
 assert.match(app,/用户自述/);
 assert.match(app,/未保存音频、视频、对话正文/);
});
test('feedback never reads message content; DOM access only counts bubbles and voice input labels',()=>{
 assert.match(app,/querySelectorAll\("\.bubble\.user"\)/);
 assert.doesNotMatch(app,/messages.*innerText|messages.*textContent/);
});
test('manual user-edited report text is used in all sharing actions',()=>{
 assert.match(app,/navigator\.clipboard\.writeText\(\$\("beta-report"\)\.value\)/);
 assert.match(app,/new Blob\(\[\$\("beta-report"\)\.value\]/);
 assert.match(app,/encodeURIComponent\(\$\("beta-report"\)\.value\.slice/);
});
