import {profiles,fresh,append,project,checkpoint,restore,MODE} from "./engine.mjs";
import {chain,event} from "./scenarios.mjs";
const $=id=>document.getElementById(id),txt=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;};
let memory=fresh(),asOf=new Date().toISOString();
const money=c=>"$"+(c/100).toFixed(2),key="pli-v12-synthetic-v1";
for(const p of profiles){const l=txt("label","");const c=document.createElement("input");c.type="checkbox";c.value=p.id;c.name="profile";c.checked=p.id==="S1";l.append(c,document.createTextNode(" "+p.label+" · "+p.id+" · SYNTHETIC"));$("profiles").append(l);}
function show(count=memory.journal.length){
 const m={...memory,journal:memory.journal.slice(0,count)};
 const clock=count&&count<memory.journal.length?m.journal.at(-1).observedAt:asOf;
 const state=project(m,clock);
 $("clock").textContent="模拟时钟："+clock+"；仅显示该时间点的合成状态。";
 $("replay").max=String(memory.journal.length);$("replay").value=String(count);$("stepCount").textContent=String(count);
 $("states").replaceChildren();$("decisions").replaceChildren();
 for(const p of Object.values(state.people)){
  const card=txt("article","","card");card.append(txt("h3",p.label+" · "+p.id),txt("p","SYNTHETIC / "+p.county),txt("p","虚拟预算 "+money(p.budgetCents)+" · 模拟已支出 "+money(p.spentCents)+" · 提议占用 "+money(p.reservedCents)+" · 可用 "+money(p.availableCents)));
  for(const plan of Object.values(p.plans))card.append(txt("p",plan.id+" · "+plan.status+" · "+money(plan.amountCents)+" · 原因事件 "+plan.lastCause));
  $("states").append(card);
 }
 for(const d of state.decisions.toReversed()){
  const card=txt("article","","decision");card.append(txt("strong",d.eventId+" / "+d.profileId+" · "+d.status),txt("p",m.journal.find(x=>x.event.id===d.eventId).event.text),txt("small","依据："+d.reason+"；来源："+d.source.source+" / "+d.source.eventId),txt("small","可用 "+money(d.before.availableCents)+" → "+money(d.after.availableCents)+"；支出 "+money(d.before.spentCents)+" → "+money(d.after.spentCents)),txt("small",d.uncertainty),txt("small","外部执行：false；影响目标："+(d.changed.join(", ")||"无")));
  $("decisions").append(card);
 }
 $("history").textContent=JSON.stringify(state.history,null,2);
 window.pliView={mode:MODE,state,journalLength:memory.journal.length}; // Synthetic observability for cloud QA.
}
$("eventForm").addEventListener("submit",e=>{
 e.preventDefault();
 try{
  if(Number($("replay").value)!==memory.journal.length)throw Error("请先将重放滑块拖到末尾再添加事件");
  const kind=$("kind").value,amount=Number($("amount").value),ttl=Number($("ttl").value);
  if(!Number.isFinite(amount)||Math.abs(amount*100-Math.round(amount*100))>0.00001||!Number.isInteger(ttl)||ttl<1||ttl>1440)throw Error("金额或有效期无效");
  const p=kind==="plan"?{amountCents:Math.round(amount*100),category:$("category").value,slot:$("slot").value}:kind==="expense"?{amountCents:Math.round(amount*100),category:$("category").value}:kind==="constraint"?{category:$("category").value,blocked:$("blocked").checked}:kind==="cancel"?{targetId:$("target").value}:{};
  const now=new Date().toISOString(),ids=[...document.querySelectorAll('input[name="profile"]:checked')].map(x=>x.value);
  const ev=event("e_"+crypto.randomUUID().replaceAll("-",""),kind,p,{text:$("text").value,profileIds:ids,county:$("county").value,expiresAt:new Date(Date.parse(now)+ttl*60000).toISOString()},now);
  const r=append(memory,ev,now);memory=r.memory;asOf=now;show();
  $("feedback").textContent=kind==="note"?"NEEDS_CLARIFICATION · LLM_NOT_CONNECTED；没有生成自由文本推理或外部事实。":"已记录合成事件 "+ev.id+"；查看下方状态与依据。";
 }catch(err){$("feedback").textContent="未处理："+err.message;}
});
for(const name of ["travel","household"])$(name).onclick=()=>{const c=chain(name);memory=c.memory;asOf=c.asOf;show();$("feedback").textContent="载入 "+name+" 合成链；拖动滑块逐步回放。";};
$("replay").oninput=()=>show(Number($("replay").value));
$("reset").onclick=()=>{memory=fresh();asOf=new Date().toISOString();show();};
$("export").onclick=()=>{$("checkpoint").value=checkpoint(memory);};
function importMemory(raw){const next=restore(raw);const last=next.journal.at(-1);if(last&&Date.parse(last.observedAt)>Date.now()+60000)throw Error("FUTURE_CHECKPOINT");memory=next;asOf=new Date().toISOString();show();}
$("import").onclick=()=>{try{importMemory($("checkpoint").value);$("feedback").textContent="合成存档恢复并重新计算有效期。";}catch(e){$("feedback").textContent="存档拒绝："+e.message;}};
$("save").onclick=()=>{try{localStorage.setItem(key,checkpoint(memory));$("storage").textContent="仅保存当前浏览器的合成存档；没有上传。";}catch{$("storage").textContent="浏览器存储不可用；可使用复制存档。";}};
$("load").onclick=()=>{try{importMemory(localStorage.getItem(key)||"");$("storage").textContent="本浏览器合成存档已恢复。";}catch(e){$("storage").textContent="恢复失败："+e.message;}};
$("clearSaved").onclick=()=>{try{localStorage.removeItem(key);$("storage").textContent="本浏览器合成存档已删除。";}catch{$("storage").textContent="浏览器存储不可用。";}};
show();
fetch("./evidence/summary.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json();}).then(x=>{$("evidence").textContent=JSON.stringify(x);}).catch(()=>{$("evidence").textContent="尚未读到云端验收汇总；不得视为验收通过。";});
