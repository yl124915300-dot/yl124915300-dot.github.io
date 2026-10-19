const el=id=>document.getElementById(id),put=(id,x)=>el(id).textContent=typeof x==="string"?x:JSON.stringify(x,null,2);
const get=async p=>{const r=await fetch(p,{cache:"no-store"});if(!r.ok)throw Error(p+" HTTP "+r.status);return r.json();};
try{
 const [s,rows]=await Promise.all([get("summary.json"),get("replay.json")]);
 put("verdict",s.verdict+" · 完整第三方语义准确率 "+s.trueSemanticAccuracy);
 for(const [name,arm] of Object.entries(s.actualArms)){const p=document.createElement("p");p.textContent=name+"：自动完整字段 "+arm.automaticEvaluation.automatic_full_field_pass+"/30 · 真实模型输出 "+arm.inference.parsed_outputs+"/30 · 推理 "+arm.inference.inference_seconds+" 秒";el("metrics").append(p);}
 for(let i=0;i<30;i++){const o=document.createElement("option");o.value=i;o.textContent=(i+1)+" · "+rows["fixed-greedy"][i].id;el("case").append(o);}
 function render(){const r=rows[el("arm").value][Number(el("case").value)];put("case-title",r.id+" · "+r.profileId);put("input",r.text);put("output",r.output||r.failure);put("gate",{code:r.gateCode,detail:r.gateDetail,selectedOption:r.selectedOption,externalExecution:false});put("budget",r.available);put("score",r.assessment);}
 el("arm").addEventListener("change",render);el("case").addEventListener("change",render);render();
 put("cron","V1.1 真实 schedule 记录："+s.v11Audit.v11ScheduleRuns.length+" · 核对时间："+s.v11Audit.checkedAtBeijing+"。历史核对，不代表持续监控。");
 document.documentElement.dataset.ready="1";
}catch(e){put("error","证据加载失败："+e.message);document.documentElement.dataset.ready="error";}
