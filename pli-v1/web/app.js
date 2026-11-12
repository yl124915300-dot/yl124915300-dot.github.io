"use strict";
const $ = id => document.getElementById(id);
const node = (tag, text, cls) => { const n = document.createElement(tag); n.textContent = text; if(cls) n.className = cls; return n; };
async function api(path, body) {
  const res = await fetch(path, body ? {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)} : {});
  const value = await res.json();
  if (!res.ok && path !== "/api/actions/attempt") throw Error(value.error || JSON.stringify(value));
  return value;
}
function card(parent, title, body, badge) {
  const box = node("article", "", "card");
  box.append(node("h3", title), node("p", body), node("span", badge, "badge"));
  parent.append(box);
}
async function render() {
  try {
    const s = await api("/api/state");
    for (const id of ["profiles", "sources", "actions", "history"]) $(id).replaceChildren();
    s.profiles.forEach(p => card($("profiles"), p.label, p.city+" · "+p.goal+"\n可用时间 "+p.spare_minutes+" 分钟 · 合成预算 $"+p.budget_usd+"\n"+p.state+" · 提议 "+p.active_proposals+" · 状态版本 "+p.revision, "SYNTHETIC"));
    s.sources.slice(-4).reverse().forEach(x => { const v=x.data; card($("sources"), x.name+" · "+v.result, x.at+"\n"+v.url+"\n"+(v.error || "HTTP "+v.http_status+" · "+v.features+" 条 · SHA256 "+v.raw_sha256), v.evidence); });
    const proposed = s.actions.filter(a=>a.status==="PROPOSED");
    proposed.forEach(a => card($("actions"), a.profile_id+" · "+a.action, "事件 "+a.event_id+"\n"+JSON.stringify(a.basis, null, 2), "待人类核验 · 未执行"));
    if(!proposed.length) $("actions").append(node("p", "当前没有符合规则的提议。"));
    s.audit.slice(-60).reverse().forEach(a => { const pre=node("pre", a.seq+" · "+a.at+" · "+a.kind+"\n"+JSON.stringify(a.data, null, 2)); $("history").append(pre); });
    $("counts").textContent = "已保存事件 "+s.events.length+" · 审计记录 "+s.audit.length+" · 显示最近 60 条 · 真实交易 0";
    $("status").textContent = "状态已读取 · "+s.generated_at;
  } catch(e) { $("status").textContent = "读取失败："+e.message; }
}
async function run(fn) {
  $("status").textContent="处理中";
  try { const result=await fn(); $("result").textContent=JSON.stringify(result,null,2); await render(); }
  catch(e) { $("status").textContent=e.message; }
}
function draft() {
  const t=new Date();
  return {id:"manual:"+crypto.randomUUID(),kind:"weather",status:"active",title:"新事件描述（合成）",updated_at:t.toISOString(),expires_at:new Date(t.getTime()+3600000).toISOString(),payload:{severity:"Severe",counties:["WAC033"]}};
}
$("event").value=JSON.stringify(draft(),null,2);
$("reload").onclick=render;
$("refresh").onclick=()=>run(()=>api("/api/refresh",{}));
$("ingest").onclick=()=>run(()=>api("/api/events",JSON.parse($("event").value)));
$("cancel").onclick=()=>run(()=>{const e=JSON.parse($("event").value);e.status="cancelled";e.updated_at=new Date().toISOString();$("event").value=JSON.stringify(e,null,2);return api("/api/events",e);});
$("deny").onclick=()=>run(()=>api("/api/actions/attempt",{action:"payment",approved:true}));
render();
setInterval(render,30000);
