import {test} from "node:test";
import assert from "node:assert/strict";
import {Session,blankState,plan,compare,validate} from "../core.mjs";
const state=()=>({game:"STS2",patch:"fixture-not-real",encounter:"fixture-only",turn:1,
 player:{hp:20,block:0,energy:1},enemies:[{id:"e1",hp:20,block:0,intent:"attack",attack:8,hits:1}],
 hand:[{id:"c1",name:"Strike",cost:1,value:6},{id:"c2",name:"Defend",cost:1,value:5}],
 review:{completeBattlefield:true,completeHand:true,plainMechanics:true}});
function session(source="display",at=1000){const s=new Session(),token=s.begin();s.acceptFrame(token,{hash:"before",source,at});return s;}
test("blank/unknown state abstains",()=>assert.equal(plan(blankState()).status,"ABSTAIN"));
test("defend reduces immediate damage",()=>{const r=plan(state());assert.equal(r.action.cardId,"c2");assert.equal(r.expected.player.block,5);assert.equal(r.projectedDamageThisTurn,3);});
test("lethal attack removes incoming intent",()=>{const s=state();s.enemies[0].hp=6;assert.equal(plan(s).action.cardId,"c1");});
test("all enemy attacks influence recommendation",()=>{const s=state();s.enemies.push({id:"e2",hp:6,block:0,intent:"attack",attack:12,hits:1});assert.equal(plan(s).action.target,"e2");});
test("enemy block prevents false lethal",()=>{const s=state();s.enemies[0].hp=6;s.enemies[0].block=2;assert.equal(plan(s).action.cardId,"c2");});
test("unsupported cards and effects abstain",()=>{const s=state();s.hand[0].name="Bash";assert.equal(plan(s).status,"ABSTAIN");s.hand[0].name="Strike";s.review.plainMechanics=false;assert.equal(plan(s).status,"ABSTAIN");});
test("missing enemy intent, duplicate IDs and malformed arrays reject",()=>{for(const change of [s=>s.enemies[0].intent="escape",s=>s.enemies.push({...s.enemies[0]}),s=>s.enemies=[null],s=>s.hand="unknown"]){const s=state();change(s);assert.equal(plan(s).status,"ABSTAIN");}});
test("lethal incoming damage is not presented as safe",()=>{const s=state();s.player.hp=1;assert.equal(plan(s).status,"ABSTAIN");});
test("file input never generates live advice",()=>assert.equal(session("file").confirm(1,state(),1000).status,"ABSTAIN"));
test("expired and future-dated capture abstain",()=>{for(const at of [-20000,2000]){const s=session("display",at);assert.equal(s.confirm(s.revision,state(),1000).status,"ABSTAIN");}});
test("late asynchronous image cannot replace newer frame",()=>{const s=new Session(),old=s.begin(),now=s.begin();assert.equal(s.acceptFrame(old,{hash:"old"}),false);assert.equal(s.acceptFrame(now,{hash:"new"}),true);assert.equal(s.frame.hash,"new");});
test("image change invalidates even if caller uses latest revision",()=>{const s=session();s.invalidate("pixels changed");assert.equal(s.confirm(s.revision,state(),1001).status,"ABSTAIN");});
test("new screenshot revokes prior candidate",()=>{const s=session();s.confirm(s.revision,state(),1000);s.begin();assert.equal(s.advice,null);assert.equal(s.startAction(1001),false);});
test("post-action requires different fresh frame and exact observed state",()=>{
 const s=session();s.confirm(s.revision,state(),1000);assert.equal(s.startAction(1001),true);
 assert.equal(s.verify(state(),1002).status,"ABSTAIN");
 const token=s.begin();s.acceptFrame(token,{hash:"after",source:"display",at:1002});
 const observed=structuredClone(s.pending.expected);assert.equal(s.verify(observed,1003).status,"HUMAN_REVIEWED_MATCH");assert.equal(s.advice,null);
});
test("mismatch and terminal/unknown screen abstain",()=>{
 const p=plan(state()),wrong=structuredClone(p.expected);wrong.player.energy=1;assert.equal(compare(p.expected,wrong).status,"MISMATCH");
 wrong.enemies=[];assert.equal(compare(p.expected,wrong).status,"ABSTAIN");
});
test("report cannot manufacture real-game acceptance",()=>{const s=session();assert.equal(s.report().real_game_acceptance,"NOT_RUN");assert.equal(s.report().independent_player_review,"NOT_RUN");});
