const t=require('node:test'),a=require('node:assert/strict');
const {initial,advance}=require('./motion-policy.js');
const cat=(x=100,y=90,n=1)=>Array.from({length:n},(_,i)=>({categories:[{categoryName:'cat',score:.82}],boundingBox:{originX:x+200*i,originY:y,width:170,height:130}}));
const f=(s,d,time)=>advance(s,d,640,416,time);
t('first and second frame cannot claim movement',()=>{
 let s=f(initial(),cat(),1000);a.equal(s.status,'collecting');
 s=f(s,cat(180),3100);a.equal(s.status,'collecting');
});
t('three cat detections support only a frame-relative displacement',()=>{
 let s=f(initial(),cat(),1000);s=f(s,cat(150),3100);s=f(s,cat(200),5200);
 a.equal(s.status,'frame_position_shift');a.ok(s.distance>.12);
 a.equal(Object.hasOwn(s,'catWalked'),false);
});
t('stationary box does not prove a stationary cat',()=>{
 let s=initial();
 for(const [i,x] of [100,101,102,102].entries())s=f(s,cat(x),1000+i*2100);
 a.equal(s.status,'no_large_frame_shift');
});
t('multiple cats cannot be linked across frames',()=>{
 const s=f(initial(),cat(40,90,2),1000);a.equal(s.status,'multiple_cats');a.equal(s.samples.length,0);
});
t('dog-only, empty frame, invalid box and long gap reset',()=>{
 let s=f(initial(),cat(),1000);
 s=f(s,[{categories:[{categoryName:'dog',score:.9}]}],3100);a.equal(s.status,'no_cat');a.equal(s.samples.length,0);
 s=f(s,cat(),6000);s=f(s,cat(320),14000);a.equal(s.status,'collecting');
 a.equal(f(s,[{categories:[{categoryName:'cat',score:.9}],boundingBox:{}}],17000).status,'invalid_box');
 a.equal(f(s,[],19000).status,'no_cat');
});
t('frame values validate and only ephemeral numeric positions are retained',()=>{
 a.equal(advance(initial(),cat(),0,400,1000).status,'invalid_frame');
 const s=f(initial(),cat(),1000);a.deepEqual(Object.keys(s.samples[0]).sort(),['time','x','y']);
});
