import {fresh,append,project} from "./engine.mjs";
export function event(id,kind,payload={},extra={},now="2026-10-19T00:00:00.000Z"){
 return {id,kind,classification:"SYNTHETIC",evidence:"SYNTHETIC",source:"user_simulation",operation:"simulate",at:now,expiresAt:new Date(Date.parse(now)+7200000).toISOString(),profileIds:["S1"],county:"*",text:"合成实验 "+id,payload,...extra};
}
export function chain(name,finish=new Date().toISOString()){
 const start=Date.parse(finish)-1200000;
 const definitions=name==="travel"?[
 ["t1","plan",{amountCents:6000,category:"travel",slot:"morning"}],
 ["t2","constraint",{category:"travel",blocked:true}],
 ["t3","constraint",{category:"travel",blocked:false}],
 ["t4","plan",{amountCents:3000,category:"travel",slot:"alternate"}],
 ["t5","expense",{amountCents:8000,category:"household"}],
 ["t6","cancel",{targetId:"t5"}],
 ["t7","plan",{amountCents:2000,category:"travel",slot:"later"}],
 ["t8","cancel",{targetId:"t7"}]
 ]:[
 ["h1","plan",{amountCents:2000,category:"household",slot:"evening"}],
 ["h2","expense",{amountCents:3000,category:"household"}],
 ["h3","constraint",{category:"household",blocked:true}],
 ["h4","cancel",{targetId:"h3"}],
 ["h5","plan",{amountCents:1000,category:"household",slot:"later"}],
 ["h6","expense",{amountCents:500,category:"other"}]
 ];
 let memory=fresh();const frames=[];
 for(const [i,[id,kind,payload]]of definitions.entries()){
  const now=new Date(start+i*60000).toISOString();
  const e=event(id,kind,payload,{profileIds:[name==="travel"?"S1":"S4"]},now);
  const result=append(memory,e,now);memory=result.memory;
  frames.push({eventId:id,at:now,state:result.state});
 }
 return {memory,frames,state:project(memory,finish),asOf:finish};
}
