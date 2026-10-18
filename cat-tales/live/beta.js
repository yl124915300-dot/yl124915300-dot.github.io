/* Cat Tales: voluntary field-test report. No media or dialogue texts are read, transmitted, or saved. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const app=$("beta-test");
if(!app)return;
const FIELDS={
  sample:"本次测试环境",
  browser:"浏览器",
  picture:"画面中确实有猫吗（主人观察）",
  cameraMatch:"视觉检测是否符合主人观察",
  noise:"声音环境",
  falseMeow:"听到非猫声时是否误显示疑似猫声",
  response:"对话回答是否有帮助",
  reuse:"是否愿意再次使用",
  pay:"是否考虑为人工复核的个性化解读付费"
};
const CHOICES={
  sample:{real:"真实家庭猫咪（自然发生的互动）",no_cat:"没有猫的家庭噪声对照",video:"公开视频演示（不是家庭实测）",unknown:"未填写"},
  browser:{chrome:"Chrome",safari:"Safari",edge:"Edge",other:"其他或未知"},
  picture:{yes:"是",no:"否",unknown:"不确定",unused:"未启用摄像头"},
  cameraMatch:{yes:"符合",no:"不符合",unknown:"无法判断",unused:"未尝试"},
  noise:{cat:"疑似真实猫声",people:"人声或电视声",noise:"其他家庭环境声",quiet:"安静",mixed:"多类混合",unknown:"未测试"},
  falseMeow:{yes:"出现过（仅主人报告，待音频复核）",no:"未观察到",unsure:"无法判断",untested:"未测试"},
  response:{useful:"有帮助",some:"有一点帮助",no:"没有帮助",untested:"没有尝试"},
  reuse:{yes:"愿意",no:"不愿意",unsure:"不确定"},
  pay:{yes:"会考虑",no:"不会",unsure:"不确定"}
};
const s={active:false,started:0,baseline:null,seen:{vision:false,audio:false,audioInference:false,visionInference:false},timer:null,report:""};
function text(id,value){$(id).textContent=value;}
function value(id){return $(id).value||"";}
function getCounts(){
 const m=$("messages");
 if(!m)return {user:0,assistant:0,voice:0};
 const users=[...m.querySelectorAll(".bubble.user")];
 return {user:users.length,assistant:m.querySelectorAll(".bubble.assistant").length,
   voice:users.filter(x=>x.querySelector("small")?.textContent.includes("浏览器语音识别")).length};
}
function sample(){
 if(!s.active)return;
 const vis=$("vision-status")?.textContent||"";
 const sound=$("sound-status")?.textContent||"";
 const detail=$("vision-detail")?.textContent||"";
 const classes=$("sound-classes")?.textContent||"";
 if(vis==="正在取样"||vis.includes("候选")||vis.includes("检测")||vis.includes("取样"))s.seen.vision=true;
 if(sound.includes("模型已加载"))s.seen.audio=true;
 if(classes.includes("模型类别排序分数"))s.seen.audioInference=true;
 if(detail.includes("连续两次")||vis.includes("候选")||vis.includes("没有")||vis.includes("取样")||vis.includes("检测"))s.seen.visionInference=s.seen.visionInference||vis!=="未运行";
 const elapsed=Math.max(0,Math.round((Date.now()-s.started)/1000));
 text("beta-elapsed","测试中："+Math.floor(elapsed/60)+"分"+String(elapsed%60).padStart(2,"0")+"秒");
}
function tick(){if(!s.active)return;sample();}
function setButtons(){
 $("beta-begin").disabled=s.active||!$("beta-consent").checked;
 $("beta-finish").disabled=!s.active;
 $("beta-copy").disabled=!s.report;
 $("beta-download").disabled=!s.report;
 $("beta-public").disabled=!s.report||!$("beta-public-consent").checked;
}
function begin(){
 if(s.active||!$("beta-consent").checked)return;
 s.active=true;s.started=Date.now();s.baseline=getCounts();
 s.seen={vision:false,audio:false,audioInference:false,visionInference:false};s.report="";
 $("beta-report").value="";
 text("beta-status","记录中。请在此页面上方与真实猫咪自然互动，完成后回到这里结束测试。不会录音或上传报告。");
 $("beta-elapsed").textContent="测试开始";
 s.timer=setInterval(tick,1200);setButtons();
}
function label(field){const v=value("beta-"+field);return CHOICES[field][v]||"未填写";}
function finish(){
 if(!s.active)return;
 sample();s.active=false;
 if(s.timer){clearInterval(s.timer);s.timer=null;}
 const c=getCounts(),b=s.baseline||{user:0,assistant:0,voice:0};
 const el=Math.max(0,Math.round((Date.now()-s.started)/1000));
 const rows=[
 "猫猫物语 LIVE V2.3｜自愿现场体验记录",
 "生成时间："+new Date().toLocaleString("zh-CN"),
 "测试时长："+el+"秒（只记录本次页面内主动开启的测试）",
 "说明：以下用户判断均为自述，未经过独立人工复核，不构成模型准确率。",
 "",
 "【设备界面回读】",
 "新增主人消息（含打字）："+Math.max(0,c.user-b.user),
 "其中标记为浏览器语音转写："+Math.max(0,c.voice-b.voice),
 "新增助手消息："+Math.max(0,c.assistant-b.assistant),
 "观察到声音模型已加载："+(s.seen.audio?"是":"未观察到"),
 "观察到声音模型类别输出："+(s.seen.audioInference?"是":"未观察到"),
 "观察到视觉模块运行："+(s.seen.vision?"是":"未观察到"),
 "观察到视觉模块分类输出："+(s.seen.visionInference?"是":"未观察到"),
 "",
 "【用户自述（并非科学标注）】"
 ];
 for(const k of Object.keys(FIELDS))rows.push(FIELDS[k]+"："+label(k));
 const note=value("beta-note").trim().slice(0,250);
 if(note)rows.push("最影响体验的问题（用户主动填写，公开提交前请确认无私人信息）："+note);
 rows.push("","未保存音频、视频、对话正文、位置、联系人或设备标识。");
 rows.push("本页面没有后台上报；只有用户主动复制、下载或公开提交才会分享。");
 s.report=rows.join("\n");
 $("beta-report").value=s.report;
 text("beta-elapsed","本轮已结束："+el+"秒");
 text("beta-status","反馈单已生成，但尚未发送给任何人。可复制给项目负责人；如主动公开到 GitHub，请先检查内容并单独确认。");
 setButtons();
}
async function copy(){
 if(!s.report)return;
 try{await navigator.clipboard.writeText(s.report);text("beta-status","反馈已复制。你可以自行粘贴到 ChatGPT、微信、Telegram 或其他聊天工具。");}
 catch(e){$("beta-report").focus();$("beta-report").select();text("beta-status","浏览器不允许自动复制，已选中反馈，请手动复制。");}
}
function download(){
 if(!s.report)return;
 const blob=new Blob([s.report],{type:"text/plain;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="CatTales-V2.3-field-feedback.txt";a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function openIssue(){
 if(!s.report||!$("beta-public-consent").checked)return;
 const title="Cat Tales V2.3｜真实场景试用反馈（用户自愿提交）";
 const url="https://github.com/yl124915300-dot/yl124915300-dot.github.io/issues/new?title="+encodeURIComponent(title)+"&body="+encodeURIComponent(s.report.slice(0,4200));
 window.open(url,"_blank","noopener,noreferrer");
 text("beta-status","已经打开 GitHub 反馈页面（需要 GitHub 账号）。内容尚未提交；请预览并确认后再自行发布。");
}
function clear(){
 if(s.timer)clearInterval(s.timer);
 s.active=false;s.started=0;s.baseline=null;s.report="";
 s.seen={vision:false,audio:false,audioInference:false,visionInference:false};
 $("beta-report").value="";$("beta-consent").checked=false;$("beta-public-consent").checked=false;
 $("beta-note").value="";
 Object.keys(FIELDS).forEach(k=>{const field=$("beta-"+k);if(field)field.selectedIndex=0;});
 text("beta-elapsed","尚未开始");
 text("beta-status","测试记录已从当前页面清除。摄像头和麦克风控制与此独立，需使用上方按钮关闭。");
 setButtons();
}
$("beta-consent").addEventListener("change",setButtons);
$("beta-public-consent").addEventListener("change",setButtons);
$("beta-begin").addEventListener("click",begin);
$("beta-finish").addEventListener("click",finish);
$("beta-copy").addEventListener("click",()=>void copy());
$("beta-download").addEventListener("click",download);
$("beta-public").addEventListener("click",openIssue);
$("beta-clear").addEventListener("click",clear);
window.addEventListener("pagehide",()=>{if(s.timer)clearInterval(s.timer);});
setButtons();
})();