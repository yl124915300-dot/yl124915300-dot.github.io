import {test} from "node:test";
import assert from "node:assert/strict";
import {parseObservations,screenshotAdvice,compareObservations} from "../recognition.mjs";
const meta={width:1920,height:1080,frameHash:"before"};
const scan=(region,pass,text,confidence=95,x0=100,y0=10)=>({region,pass,lines:[{text,confidence,bbox:{x0,y0,x1:x0+100,y1:y0+25}}]});
const pair=(region,text,x=100,y=10)=>["color","contrast"].map(p=>scan(region,p,text,95,x,y));
test("agreement yields pixel-evidenced HP/energy/turn; missing block is never zero",()=>{
 const o=parseObservations([...pair("hud","51/80"),...pair("energy","3/3"),...pair("turn","End Turn 2")],meta);
 assert.deepEqual(o.player.hp.value,{current:51,max:80});assert.equal(o.player.energy.value.current,3);assert.equal(o.turn.value,2);
 assert.equal(o.player.block.value,null);assert.equal(screenshotAdvice(o).status,"ABSTAIN");
});
test("low-confidence, missing confidence and one-pass reads remain unknown",()=>{
 for(const scans of [[scan("hud","color","51/80")],[scan("hud","color","51/80",40),scan("hud","contrast","51/80",40)],[scan("hud","color","51/80",undefined)]]){
   assert.equal(parseObservations(scans,meta).player.hp.value,null);
 }
});
test("disagreeing preprocessing never picks the convenient HP",()=>{
 assert.equal(parseObservations([scan("hud","color","51/80"),scan("hud","contrast","57/80")],meta).player.hp.value,null);
});
test("invalid fractions reject and Chinese turn is parsed",()=>{
 const o=parseObservations([...pair("hud","90/80"),...pair("energy","30/30"),...pair("turn","结束回合 3")],meta);
 assert.equal(o.player.hp.value,null);assert.equal(o.player.energy.value,null);assert.equal(o.turn.value,3);
});
test("repeated cards retain positions; no inferred costs or effects",()=>{
 const o=parseObservations([...pair("hand","Strike",500,900),...pair("hand","Strike",900,900),...pair("hand","Defend",700,900)],meta);
 assert.equal(o.hand.cards.length,3);assert.ok(o.hand.cards.every(c=>c.confirmed&&c.cost===null&&c.effectiveValue===null));
 assert.equal(o.hand.complete,false);
});
test("enemy HP candidates exclude player side and do not invent intent/block/statuses",()=>{
 const o=parseObservations([...pair("battlefield","51/80",300,650),...pair("battlefield","23/40",1200,650)],meta);
 assert.equal(o.enemies.length,1);assert.deepEqual(o.enemies[0].hp,{current:23,max:40});
 assert.equal(o.enemies[0].intent,null);assert.equal(o.enemies[0].block,null);assert.equal(o.statuses.value,null);
});
test("forged completeness cannot enable unvalidated advice",()=>{
 assert.equal(screenshotAdvice({gate:{status:"COMPLETE"}}).status,"ABSTAIN");
});
test("different pixels alone do not establish state or player action",()=>{
 const a=parseObservations([],meta),b=parseObservations([],{...meta,frameHash:"after"});
 const r=compareObservations(a,b);assert.equal(r.status,"INCONCLUSIVE");assert.equal(r.realActionVerified,false);
 assert.equal(compareObservations(a,a).status,"INCONCLUSIVE");
});
test("energy/HP delta is observed evidence, not execution success",()=>{
 const a=parseObservations([...pair("hud","51/80"),...pair("energy","3/3")],meta);
 const b=parseObservations([...pair("hud","51/80"),...pair("energy","2/3")],{...meta,frameHash:"after"});
 const r=compareObservations(a,b);assert.equal(r.status,"OBSERVED_CHANGE");assert.equal(r.changes[0].delta,-1);
 assert.ok(r.unknown.includes("enemyIdentity"));assert.equal(r.realActionVerified,false);
});
test("changed resource maximum is inconclusive",()=>{
 const a=parseObservations(pair("energy","3/3"),meta),b=parseObservations(pair("energy","2/4"),{...meta,frameHash:"after"});
 assert.equal(compareObservations(a,b).status,"INCONCLUSIVE");
});
