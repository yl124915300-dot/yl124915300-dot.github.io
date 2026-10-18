const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {respond} = require('./dialogue.js');

const ctx = {name:'团子',scene:'',feeding:'',behavior:''};
const cases = [
  ['normal greeting','你好','general',/我是猫猫物语/],
  ['door scenario','它总在门口叫','context',/门口/],
  ['after feeding','它刚吃完为什么还叫','context',/刚吃过|加餐/],
  ['toy prompt','想和猫玩','context',/玩具|逗猫棒|互动/],
  ['urgent breathing','猫呼吸困难','urgent',/尽快联系兽医/],
  ['urgent urinary','猫咪尿不出来','urgent',/急诊动物医院/],
  ['hiss stops interaction','它一直哈气','stop',/停止|空间/],
  ['unknown sound abstains','刚才是猫叫吗','sound',/没有可复核的声音模型结果/],
  ['feedback nontruth','它过来了','feedback',/单次反应/],
  ['cue nonliteral','怎样和猫说话','cue',/不能把人话翻译成猫语/],
  ['unknown intent abstains','它是不是要搬家','abstain',/不足以判断/],
  ['empty abstains','', 'abstain',/还没收到/]
];
for(const [name,question,type,pattern] of cases){
  test(name,()=>{const r=respond(question,ctx,null);assert.equal(r.type,type);assert.match(r.answer,pattern);});
}
test('audio result labelled as candidate only',()=>{
  const r=respond('刚才什么声音',ctx,{verified:true,label:'Meow',score:.61,catCandidate:true});
  assert.equal(r.type,'sound');assert.match(r.answer,/候选/);assert.match(r.answer,/不是确认叫声/);
});
test('unverified sound metadata does not count as inference',()=>{
  const r=respond('刚才什么声音',ctx,{verified:false,label:'Meow',score:.99});
  assert.match(r.answer,/没有可复核/);
});
test('override context does not suppress urgent triage',()=>{
  const r=respond('它抽搐了',{scene:'toy',feeding:'recent',behavior:'play'},null);
  assert.equal(r.type,'urgent');
});
test('worker and live app parse cleanly',()=>{
  new Function(fs.readFileSync(path.join(__dirname,'live.js'),'utf8'));
  new Function(fs.readFileSync(path.join(__dirname,'sound-worker.js'),'utf8'));
});
test('html includes privacy consent, proper script order and stop controls',()=>{
  const h=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
  assert.ok(h.indexOf('dialogue.js')<h.indexOf('live.js'));
  for(const s of ['id="mic-consent"','id="start"','id="stop"','id="camera"','id="enable-sound"','id="messages"','id="try-ai"']){
    assert.ok(h.includes(s),s);
  }
  assert.match(h,/浏览器供应商/);
  assert.match(h,/未进行画面 AI 理解/);
});

const {createMemory,updateMemory,shouldHandleTranscript}=require('./dialogue.js');
const {assess}=require('./sound-policy.js');
test('session-only context retains the last owner-reported scene',()=>{
 let m=createMemory();m=updateMemory(m,'它在门口叫',respond('它在门口叫',ctx,null,m));
 assert.equal(m.scene,'door');assert.equal(m.lastTopic,'door');
 assert.match(respond('然后呢',ctx,null,m).answer,/门窗安全/);
 assert.match(respond('它过来了',ctx,null,m).answer,/之前提到门口/);
});
test('reset starts without retained context',()=>{assert.match(respond('然后呢',ctx,null,createMemory()).answer,/还不确定/);});
test('feeding context persists but never proves intention',()=>{
 let m=createMemory();m=updateMemory(m,'它刚吃完饭还在门口叫',respond('它刚吃完饭还在门口叫',ctx,null,m));
 assert.equal(m.feeding,'recent');assert.equal(m.lastTopic,'food');
 assert.match(respond('那现在呢',ctx,null,m).answer,/不必为了测试再加餐/);
});
test('urgent symptoms override remembered context',()=>{
 const m={scene:'door',feeding:'recent',lastTopic:'food',turnCount:4};
 assert.equal(respond('呼吸困难',ctx,null,m).type,'urgent');
 assert.equal(respond('然后呢',ctx,null,{...m,lastTopic:'urgent'}).type,'urgent');
});
test('short cat-like sounds are not automatically interpreted as user speech',()=>{
 for(const w of ['喵','喵喵！','嗯','啊。',''])assert.equal(shouldHandleTranscript(w),false);
 for(const w of ['你好','在吗','它过来了'])assert.equal(shouldHandleTranscript(w),true);
});
test('baby crying cannot produce a cat candidate even when cat ranks first',()=>{
 const d=assess([{label:'Meow',score:.51},{label:'Baby crying',score:.38}],1,true);
 assert.equal(d.negative,true);assert.equal(d.catCandidate,false);assert.equal(d.streak,0);
});
test('alarm, human laughter and keyboard typing block cat candidates',()=>{
 for(const label of ['Alarm clock','Laughter','Keyboard typing','Speech'])
   assert.equal(assess([{label:'Cat',score:.56},{label,score:.36}],3,true).catCandidate,false);
});
test('cat candidate requires two consecutive cat-top windows',()=>{
 const top=[{label:'Meow',score:.72},{label:'Silence',score:.1}];
 const one=assess(top,0,true),two=assess(top,one.streak,true);
 assert.equal(one.catCandidate,false);assert.equal(two.catCandidate,true);
 assert.equal(assess([{label:'Dog',score:.74}],two.streak,false).catCandidate,false);
});
test('audio results older than thirty seconds never become new evidence',()=>{
 const stale={verified:true,label:'Meow',score:.85,at:Date.now()-45000};
 assert.match(respond('刚才是什么声音',ctx,stale).answer,/没有可复核/);
});
test('new audio and privacy controls render in the correct load order',()=>{
 const h=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
 for(const name of ['id="manual-mode"','id="listen-once"','data-example','sound-policy.js'])assert.ok(h.includes(name),name);
 assert.ok(h.indexOf('dialogue.js')<h.indexOf('sound-policy.js'));
 assert.ok(h.indexOf('sound-policy.js')<h.indexOf('live.js'));
 assert.match(h,/切换到后台/);
});

test('camera preview is not the same as AI seeing a cat',()=>{
 const msg=respond('摄像头画面里看到猫了吗',ctx,null,null,null);
 assert.equal(msg.type,'vision');assert.match(msg.answer,/没有来自真实视觉模型/);
});
test('verified fresh cat detections are only bounded visual evidence',()=>{
 const vision={verified:true,catCandidate:true,catScore:.81,at:Date.now()};
 const msg=respond('镜头里有猫吗',ctx,null,null,vision);
 assert.equal(msg.type,'vision');assert.match(msg.answer,/EfficientDet/);assert.match(msg.answer,/无法判断它在做什么/);
});
test('sound and vision do not prove that a visible cat made the sound',()=>{
 const at=Date.now();
 const sound={verified:true,label:'Meow',score:.68,catCandidate:true,at};
 const vision={verified:true,catCandidate:true,catScore:.81,at};
 const msg=respond('请结合刚才的声音和画面说明能确认什么',ctx,sound,null,vision);
 assert.equal(msg.type,'multimodal');assert.match(msg.answer,/不能确定声音来自画面里的猫/);
});
test('old vision result does not become fresh evidence',()=>{
 const old={verified:true,catCandidate:true,catScore:1,at:Date.now()-20000};
 assert.match(respond('你从画面看见猫了吗',ctx,null,null,old).answer,/没有来自真实视觉模型/);
});
