"use strict";
let latest=null;
const by=id=>document.getElementById(id);
function el(tag,text,cls){const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;}
function link(text,url){const a=el("a",text);if(/^https:\/\/(api\.weather\.gov|earthquake\.usgs\.gov|github\.com)\//.test(url)){a.href=url;a.rel="noopener noreferrer";}return a;}
function card(parent,lines){const c=el("article",null,"card");for(const [s,cls] of lines)c.append(el("p",s,cls));parent.append(c);return c;}
function render(){
 if(!latest)return;
 const d=latest,now=Date.now(),age=now-Date.parse(d.generated_at);
 const stale=!Number.isFinite(age)||age< -300000||age>=d.stale_after_seconds*1000;
 const failed=Object.values(d.source_receipts).some(r=>!r.ok);
 const state=stale?"STALE":failed?"DEGRADED":"FRESH";
 document.body.dataset.state=state;by("health").textContent=state+" · 规则驱动 / 只读";
 by("time").textContent="快照抓取："+d.generated_at+"；当前查看："+new Date().toISOString()+"；两小时失效。";
 const a=d.schedule_audit;
 by("schedule").textContent="真实 schedule 回执："+a.pli_live_schedule_observed+"；V1.1："+a.v11_schedule_observed+"；持续运行："+a.continuous_schedule+"。workflow_dispatch 不计作 schedule。";
 by("proposals").replaceChildren();
 const valid=stale?[]:d.proposals.filter(p=>p.status==="PROPOSED"&&Date.parse(p.valid_until)>now&&d.source_receipts[p.source]?.ok);
 for(const p of valid){
  const c=card(by("proposals"),[[p.role_id+" · "+p.goal],["SYNTHETIC · "+p.action,"tag"],[p.text],["规则："+p.rule+"；地理："+p.basis.method+"；费用 0；无外部执行","meta"],["未知："+p.unknowns.join("；")],["有效期："+p.valid_until,"meta"]]);
  c.dataset.proposal="valid";c.append(link("官方事件证据",p.evidence_url));
 }
 if(!valid.length)by("proposals").append(el("p",stale?"STALE：所有有效提议已关闭。":"没有当前满足条件的提议。"));
 by("sources").replaceChildren();
 for(const [name,r] of Object.entries(d.source_receipts)){
  const c=card(by("sources"),[[name+" · "+(r.ok?"FETCH_OK":"FAILED")],[r.fetched_at+" · HTTP "+(r.http_status||"UNKNOWN"),"meta"],[r.error||"SHA256 "+r.sha256,"meta"]]);
  c.append(link("官方来源",r.url));
 }
 by("runs").replaceChildren();
 for(const r of d.runs.slice(-8).reverse()){
  const c=card(by("runs"),[["运行 "+r.id+" · event="+r.event],[r.at+"；恢复自 "+(r.restored_from_run||"初始空状态")+"；变更 "+r.transitions+"；去重保持 "+r.unchanged_proposals,"meta"]]);
  c.append(link("CI 回执",r.run_url));c.append(el("span"," · "));const h=el("a","历史与状态哈希");h.href="history/"+r.id+".json";c.append(h);
 }
 by("history").replaceChildren();
 for(const h of d.journal.slice(-30).reverse())card(by("history"),[[h.role_id+" · "+h.from_status+" → "+h.to_status],[h.reason+"；risk_resolved=false"],[h.at+" · "+h.event_id,"meta"]]);
}
fetch("data.json?t="+Date.now(),{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json();}).then(d=>{latest=d;render();setInterval(render,15000);}).catch(e=>{document.body.dataset.state="FAILED";by("health").textContent="FAILED：有效提议已关闭。";});
