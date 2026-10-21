const test=require('node:test');
const assert=require('node:assert/strict');
const D=require('./dialogue.js');
test('english dialogue has session-only memory',()=>{
 const m=D.createMemory();assert.deepEqual(m,{scene:'',feeding:'',lastTopic:'',turnCount:0});
 const r=D.respond('My cat just ate but keeps meowing by the door.',{name:'Mochi'});
 assert.match(r.answer,/recently ate/);const updated=D.updateMemory(m,'My cat just ate by the door',r);
 assert.equal(updated.scene,'door');assert.equal(updated.feeding,'recent');assert.equal(updated.turnCount,1);
});
test('emergency urination and breathing take priority over casual chat',()=>{
 for(const x of ['My cat cannot pee and is crying','My cat has trouble breathing','My cat collapsed','My cat is having a seizure']){
  const r=D.respond(x,{name:'Mochi'});assert.equal(r.type,'urgent',x);assert.match(r.answer,/emergency veterinarian/);
 }
});
test('stress and hiding trigger non-forcing stop guidance',()=>{
 const r=D.respond('My cat is hissing and hiding.',{name:'Mochi'});assert.equal(r.type,'stop');assert.match(r.answer,/Stop the interaction/);
 assert.equal(D.respond('just a question',{behavior:'hide'}).type,'stop');
});
test('voice only handles meaningful human speech, not cat noise',()=>{
 assert.equal(D.shouldHandleTranscript('Meow'),false);
 assert.equal(D.shouldHandleTranscript('meow meow'),false);
 assert.equal(D.shouldHandleTranscript('Hi there, I am here'),true);
 assert.equal(D.shouldHandleTranscript('Hi'),false);
});
test('no visual evidence is never invented',()=>{
 const r=D.respond('Can you see my cat on the camera?',{},null,{},null);
 assert.equal(r.type,'vision');assert.match(r.answer,/haven't received a verified visual detection/);
});
test('true model candidate stays tentative',()=>{
 const r=D.respond('Can you see my cat on the camera?',{},null,{}, {verified:true,catCandidate:true});
 assert.equal(r.type,'vision');assert.match(r.answer,/possible cat/);assert.match(r.answer,/doesn't prove/);
});
test('video box movement never treated as behavior or intent',()=>{
 const r=D.respond('Did my cat move on camera?',{},null,{}, {verified:true,motionStatus:'frame_position_shift'});
 assert.equal(r.type,'motion');assert.match(r.answer,/the camera/);assert.match(r.answer,/does not prove/);
});
test('audio label never transformed into translation or identification',()=>{
 const r=D.respond('What was that sound?',{}, {verified:true,label:'Cat',catCandidate:true}, {}, null);
 assert.equal(r.type,'sound');assert.match(r.answer,/possible cat vocalization/);assert.match(r.answer,/not a verified sound source or a translation/);
});
test('standalone meow interpretation is contextual and uncertain',()=>{
 const r=D.respond('What does the meow mean?',{name:'Mochi'});
 assert.equal(r.type,'cue');assert.match(r.answer,/can't translate|isn't a sentence/);
});
test('memory supports a safe next-turn follow-up',()=>{
 const m=D.updateMemory(D.createMemory(),'My cat just ate.',{type:'food'});
 const r=D.respond('Then what?',{name:'Mochi'},null,m);
 assert.equal(r.type,'cue');assert.match(r.answer,/without adding food/);
});
test('safe invitation does not provoke distress',()=>{
 const r=D.respond('How do I call my cat to come here?',{name:'Mochi'});
 assert.match(r.answer,/don't play distress sounds/i);
});
