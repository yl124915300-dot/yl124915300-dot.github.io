import {apply} from "./gate.mjs";import {project} from "../pli-v12/engine.mjs";
const el=id=>document.getElementById(id),put=(id,x)=>el(id).textContent=x,fmt=n=>"$"+(n/100).toFixed(2)+"（模拟）";
const get=async path=>{const r=await fetch(path,{cache:"no-store"});if(!r.ok)throw Error(path+" HTTP "+r.status);return r.json();};
function list(id,items){el(id).replaceChildren(...(items.length?items:["无"]).map(x=>{const li=document.createElement("li");li.textContent=x;return li;}));}
function metric(title,value){const d=document.createElement("div");d.className="metric";const t=document.createElement("span"),v=document.createElement("strong");t.textContent=title;v.textContent=value;d.append(t,v);return d;}
try{
 const [meta,rows,review,audit]=await Promise.all(["./evidence/inference.json","./evidence/results.json","./evidence/review.json","./evidence/v11-audit.json"].map(get));
 if(rows.length!==10)throw Error("十项真实输出证据不完整");
 put("provenance",meta.model+" / "+meta.quantization+" / "+meta.license+" · 真实推理 "+meta.parsed_outputs+"/10 · 推理耗时 "+meta.inference_seconds+" 秒 · 完整作业 "+meta.total_seconds+" 秒");
 const source=document.createElement("a");source.href=meta.run_url;source.textContent="查看原始云端运行";el("provenance").append(document.createElement("br"),source);
 put("quality",review.verdict+" · "+review.summary);el("quality").className="warning";
 rows.forEach((r,i)=>{const option=document.createElement("option");option.value=i+1;option.textContent=(i+1)+". "+r.input.id;el("case").append(option);});
 let stage=1;
 function render(n){
  stage=Math.max(0,Math.min(10,n));el("stage").value=stage;el("case").value=stage||1;el("previous").disabled=stage===0;el("next").disabled=stage===10;
  const r=rows[Math.max(0,stage-1)],before=r.before.people.S1,after=stage===0?before:(r.gate?.state.people.S1??before),v=r.model_output;
  put("stage-label",stage===0?"初始状态 · 家庭活动约束已启用":"第 "+stage+" / 10 个事件 · "+r.input.id);
  el("budget").replaceChildren(metric("初始总预算",fmt(after.budgetCents)),metric("本步可用预算变化",fmt(before.availableCents)+" → "+fmt(after.availableCents)),metric("累计预留",fmt(after.reservedCents)));
  put("event-heading",stage===0?"初始状态":"合成事件 "+r.input.id);put("event",stage===0?"SYNTHETIC S1，模拟预算 $100；家庭活动约束启用。":r.input.text);
  list("facts",stage===0?[]:(v?.facts??[]));list("assumptions",stage===0?[]:(v?.assumptions??[]));list("unknowns",stage===0?[]:(v?.unknowns??["输出失败，不能推断"]));put("impact",stage===0?"":(v?.impact??r.failure??"未知"));
  let match=false;if(r.gate){const replay=apply(r.checkpoint_before,r.input,r.model_output,r.at);match=JSON.stringify(replay)===JSON.stringify(r.gate);}
  put("recomputed",stage===0?"起点：无模型行动。":(match?"浏览器独立重放与云端记录一致。":"重放不一致或模型输出失败，不能视为通过。"));
  el("candidates").replaceChildren();
  if(stage!==0)for(const [i,c] of (v?.candidates??[]).entries()){
   const box=document.createElement("article");box.className="candidate";
   const h=document.createElement("strong");h.textContent=c.description;box.append(h);
   for(const text of [c.action+" · "+c.category+" · "+(c.cost_cents<0?"金额未知":fmt(c.cost_cents)),c.rationale,"证据原文："+c.evidence_quote]){const p=document.createElement("p");p.textContent=text;box.append(p);}
   const code=document.createElement("span");code.className="code";const status=r.gate?.decisions.find(d=>d.candidate===i)?.code??r.gate?.error??"NO_RESULT";const labels={PROPOSED:"仅记录合成计划",BLOCKED_CONSTRAINT:"现有约束阻止该计划",BLOCKED_CONFLICT:"时段冲突，未预留预算",NEEDS_CLARIFICATION:"需核实或澄清，未执行",DENIED_EXTERNAL_EXECUTION:"真实外部操作已拒绝",REJECTED_EVIDENCE:"证据不匹配，未写入",REJECTED_UNKNOWN_OR_UNSUPPORTED_COST:"金额未知或证据不支持，未写入",REJECTED_V12_PROVIDER_BUDGET_OR_SCHEMA:"预算或结构校验拒绝，未写入",UNGROUNDED_FACT:"事实缺乏原文支持，整项拒绝"};code.textContent=(labels[status]??"未通过")+" · "+status;box.append(code);el("candidates").append(box);
  }
  const rr=review.cases.find(x=>x.id===r.input.id);put("case-review",stage===0?"":(rr?rr.verdict+" · "+rr.note:"待审查"));
  el("health").dataset.replay=String(match);el("health").dataset.stage=String(stage);
 }
 el("stage").addEventListener("input",e=>render(Number(e.target.value)));el("case").addEventListener("change",e=>render(Number(e.target.value)));el("previous").addEventListener("click",()=>render(stage-1));el("next").addEventListener("click",()=>render(stage+1));
 put("cron","真实 schedule 记录："+(audit.scheduleCount??"未知")+"；V1.1 定时成功："+(audit.scheduleVerified?"已核验":"未证实")+"。核查于 "+audit.checkedAt+"。push 不计作 cron。");
 const age=audit.snapshotAt?(Date.now()-Date.parse(audit.snapshotAt))/3600000:NaN;const stale=!Number.isFinite(age)||age>2;put("freshness",(stale?"STALE / 数据已过期或时效未知":"FRESH / 两小时以内")+" · 快照 "+(audit.snapshotAt??"未知")+" · 当前年龄 "+(Number.isFinite(age)?age.toFixed(2)+" 小时":"未知"));el("freshness").className=stale?"warning":"";
 render(1);put("health","已载入十项原始证据。模型可能犯错，规则通过不代表语义正确。");el("health").dataset.ready="true";
}catch(e){put("health","NO_GO：证据载入失败："+e.message);el("health").dataset.ready="false";}
