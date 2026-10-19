"use strict";
const $=id=>document.getElementById(id);
const node=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;};
let data=null;
const names={PROPOSED:"待人工核验",REVOKED:"已撤销",NO_MATCH:"未触发",STALE:"数据过期 / 来源不可用"};
const reasons={exposure_not_matched:"没有已设定的海滩或海上活动暴露；区域匹配不足以触发",fixture_or_synthetic_not_live:"测试或合成事件不能作为真实事件",source_unavailable_or_stale:"来源失败或已过期",cancelled_or_expired:"事件已取消或过期",not_yet_effective:"事件尚未生效",scope_or_threshold_not_matched:"区域或强度阈值未匹配",human_review_of_official_source:"请人工核验官方信息"};
const actions={check_official_advice:"检查官方建议",flag_schedule_conflict:"提示日程冲突"};
const date=s=>s?new Date(s).toLocaleString("zh-CN",{hour12:false})+"（浏览器本地时间）":"无成功记录";
function link(url,label){const a=node("a",label);try{const u=new URL(url);if(u.protocol==="https:"&&["api.weather.gov","www.weather.gov","earthquake.usgs.gov","github.com"].includes(u.hostname)){a.href=u.href;a.target="_blank";a.rel="noopener noreferrer";}}catch{}return a;}
function sourceFresh(source){const s=data.sources.find(x=>x.name===source);const age=s?Date.now()-Date.parse(s.success_at):NaN;return s?.result==="PASS"&&age>=-600000&&age<=data.stale_after_seconds*1000;}
function snapshotFresh(){const age=Date.now()-Date.parse(data.generated_at);return age>=-600000&&age<=data.stale_after_seconds*1000;}
function effectiveStatus(d){if(!snapshotFresh()||!sourceFresh(data.events.find(x=>x.id===d.event_id)?.source))return "STALE";if(d.status==="PROPOSED"&&Date.parse(d.event_expires_at)<=Date.now())return "REVOKED";return d.status;}
function renderFreshness(){
  const fresh=snapshotFresh(),all=fresh&&data.sources.every(s=>sourceFresh(s.name));
  $("freshness").textContent=!fresh?"快照已过期 · 暂停有效提议":all?"快照未超过两小时":"部分来源不可用 · 相关提议已暂停";
  $("freshness").parentElement.classList.toggle("stale",!all);
  $("clock").textContent="快照生成："+date(data.generated_at)+" · 年龄 "+Math.max(0,Math.floor((Date.now()-Date.parse(data.generated_at))/60000))+" 分钟 · 云端批次 "+data.total_runs;
  $("schedule").textContent=data.schedule+"。页面打开不触发抓取。";
}
function renderEvents(){
  $("events").replaceChildren();const profile=$("profile").value,kind=$("kind").value;
  let ev=data.events.filter(e=>kind==="all"||e.kind===kind);
  const rank=e=>data.decisions.some(d=>d.event_id===e.id&&(profile==="all"||d.profile_id===profile)&&effectiveStatus(d)==="PROPOSED")?0:1;
  ev.sort((a,b)=>rank(a)-rank(b)||Date.parse(b.starts_at)-Date.parse(a.starts_at));
  $("counts").textContent=data.events.length+" 条已保存事件 · "+data.decisions.length+" 条判断 · 本页最多显示 30 条";
  $("empty").textContent=ev.length?"若没有符合条件的真实事件，显示“未触发”是有效结果。":"当前筛选无事件。";
  ev.slice(0,30).forEach(e=>{
    const box=node("article","","event");
    box.append(node("span",e.evidence+" · "+(e.kind==="weather"?"天气":"地震"),"badge"),node("h3",e.title));
    box.append(node("p","发生/生效："+date(e.starts_at)+" · 截止："+date(e.expires_at),"meta"));
    box.append(link(e.official_url,"官方事件"),node("p",e.id+" · 观测："+date(e.observed_at),"meta"));
    data.decisions.filter(d=>d.event_id===e.id&&(profile==="all"||d.profile_id===profile)).forEach(d=>{
      const status=effectiveStatus(d),row=node("div","","decision");
      if(status==="PROPOSED")row.classList.add("proposed");
      const p=data.profiles.find(p=>p.id===d.profile_id);
      row.append(node("strong",p.label+" · "+names[status]+(status==="PROPOSED"?" · "+actions[d.action]:"")));
      row.append(node("p",status==="STALE"?"当前数据不可用于有效提议；历史判断："+names[d.status]:(reasons[d.reason]||d.reason)));
      row.append(node("p","依据："+JSON.stringify(d.basis)));
      box.append(row);
    });$("events").append(box);
  });
}
function render(){
  renderFreshness();
  $("profiles").replaceChildren();
  data.profiles.forEach(p=>{
    const box=node("article","","card");const n=data.decisions.filter(d=>d.profile_id===p.id&&effectiveStatus(d)==="PROPOSED").length;
    box.append(node("h3",p.label),node("p",p.city+" · "+p.goal),node("p","可用时间 "+p.spare_minutes+" 分钟 · 合成预算 $"+p.budget_usd),node("span","SYNTHETIC · 当前有效提议 "+n,"badge"));$("profiles").append(box);
  });
  $("sources").replaceChildren();
  data.sources.forEach(s=>{
    const box=node("article","","card");
    box.append(node("h3",s.name+" · "+s.result+" · "+(sourceFresh(s.name)?"未过期":"不可用/过期")));
    box.append(node("p","最近尝试："+date(s.attempted_at)),node("p","最近成功："+date(s.success_at)));
    box.append(node("p",s.error||"抓取 "+s.features+" · 接纳 "+s.accepted+" · 跳过 "+s.skipped+" · 拒绝 "+s.rejected));
    box.append(link(s.url,"官方数据源"),node("p","响应 SHA256："+(s.response_sha256||"本次失败，无新摘要"),"hash"));$("sources").append(box);
  });
  $("mapping").textContent="NWS 官方点位区域映射："+Object.keys(data.mappings).length+"/6。最近映射错误："+data.mapping_errors.length+"。有多边形时优先按点位落区；不根据标题猜测区域。";
  renderEvents();
  $("history").replaceChildren();
  data.history.slice().reverse().forEach(h=>{
    const row=node("div","","history-item");row.append(node("strong",date(h.at)+" · "+h.decision.profile_id+" · 历史"+names[h.decision.status]));
    row.append(node("p",h.event.evidence+" · "+h.event.title+" · "+(reasons[h.decision.reason]||h.decision.reason)));$("history").append(row);
  });
  if(!data.history.length)$("history").append(node("p","尚无真实事件触发提议/撤销；不填入合成成功记录。"));
  $("memory").textContent="记忆摘要："+data.memory_sha256+" · "+data.retention;
}
async function load(){
  try{
    const r=await fetch("./data.json?t="+Date.now(),{cache:"no-store",credentials:"omit"});if(!r.ok)throw Error("HTTP "+r.status);data=await r.json();
    if(data.version!=="1.1.0"||data.profiles.length!==6||!data.profiles.every(p=>p.classification==="SYNTHETIC")||!data.events.every(e=>e.evidence==="REAL_PUBLIC"))throw Error("快照真实性或版本检查失败");
    $("profile").replaceChildren(node("option","全部样本"));$("profile").firstChild.value="all";
    data.profiles.forEach(p=>{const o=node("option",p.label);o.value=p.id;$("profile").append(o);});render();
  }catch(e){data=null;$("freshness").textContent="快照读取失败："+e.message;$("freshness").parentElement.classList.add("stale");for(const id of ["profiles","sources","events","history"])$(id).replaceChildren();}
}
$("profile").onchange=renderEvents;$("kind").onchange=renderEvents;$("reload").onclick=load;
load();setInterval(()=>{if(data)render();},60000);
