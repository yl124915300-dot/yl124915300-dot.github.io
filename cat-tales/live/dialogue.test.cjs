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
