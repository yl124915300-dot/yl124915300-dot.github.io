/* Cat Tales Live alpha 2026-10-18
 * Real mic permission, Web Speech transcriptions, browser TTS, opt-in webcam preview,
 * optional actual MediaPipe YAMNet sound classification. No server app or stored audio. */
(function(){
"use strict";
const $ = (id) => document.getElementById(id);
const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
const state = {
  active:false, blocked:false, recognizing:false, startPending:false, speaking:false, thinking:false,
  recognition:null, restartTimer:null, micStream:null, cameraStream:null,
  ctx:null, source:null, analyser:null, processor:null, silentGain:null, waveformHandle:null,
  worker:null, soundReady:false, soundLoading:false, soundPending:false, audioQueue:null,
  audioPos:0, recentSound:null, catStreak:0, soundWatchdog:null, ai:null, aiReady:false,
  aiStarting:false, turn:0, stopToken:0, manualRequested:false,
  memory:window.CatTalesDialogue.createMemory()
};
function setText(id, text) { $(id).textContent=String(text); }
function display(id, visible){$(id).classList.toggle("hidden",!visible);}
function setOrb(mode, hint){
  $("orb").dataset.mode=mode;
  setText("orb-hint",hint);
}
function setStatus(message,kind){
  setText("system-status",message);
  const label=$("connection");
  label.className="state"+(kind==="on"?" on":kind==="warn"?" warn":"");
  label.textContent=state.active?(kind==="warn"?"服务受限":state.speaking?"助手回答中":state.thinking?"正在整理":state.recognizing?"语音聆听中":"会话已连接"):"未开始";
}
function bubble(role,content,small){
  const box=document.createElement("div");
  box.className="bubble "+(role==="user"?"user":"assistant");
  const who=document.createElement("span");who.className="who";who.textContent=role==="user"?"🧑 主人":"🐾 猫猫物语";
  const p=document.createElement("p");p.textContent=String(content).slice(0,1300);
  box.appendChild(who);box.appendChild(p);
  if(small){const s=document.createElement("small");s.textContent=small;box.appendChild(s);}
  $("messages").appendChild(box);
  while($("messages").children.length>55)$("messages").firstElementChild.remove();
  $("messages").scrollTop=$("messages").scrollHeight;
}
function context(){
  return {name:$("cat-name").value.trim()||"你的猫咪",
    scene:$("cat-scene").value,feeding:$("cat-feeding").value,behavior:$("cat-behavior").value};
}
function safeReply(q) {
  const sound=state.recentSound&&Date.now()-state.recentSound.at<=30000?state.recentSound:null;
  const vision=window.CatTalesVision&&window.CatTalesVision.getFresh();
  return window.CatTalesDialogue.respond(q,context(),sound,state.memory,vision);
}
window.CatTalesLiveEvidence=()=>state.recentSound&&Date.now()-state.recentSound.at<=5000?state.recentSound:null;
function isManual(){return $("manual-mode").checked;}
function updateManualControls(){
  $("listen-once").disabled=!state.active||state.blocked||!state.recognition||!isManual()||state.recognizing||state.thinking;
}
function clearRestart(){
  if(state.restartTimer){clearTimeout(state.restartTimer);state.restartTimer=null;}
}
function setupRecognition(){
  if(!RecognitionCtor)return false;
  const rec=new RecognitionCtor();
  rec.lang="zh-CN";rec.continuous=false;rec.interimResults=true;rec.maxAlternatives=1;
  rec.onstart=()=>{
    state.startPending=false;state.recognizing=true;
    if(state.active&&!state.speaking&&!state.thinking){
      setOrb("listen","在听你说话");setStatus("麦克风已开启。直接说话；或使用右侧文字输入框。","on");
    }else if(!state.active){ try{rec.stop();}catch(e){} }
  };
  rec.onresult=(event)=>{
    if(!state.active||state.speaking||state.thinking)return;
    let finalText="", interim="";
    for(let i=event.resultIndex;i<event.results.length;i++){
      const entry=event.results[i];
      if(entry.isFinal)finalText+=entry[0].transcript;
      else interim+=entry[0].transcript;
    }
    if(interim) setText("interim","正在听："+interim);
    if(finalText.trim()){
      const transcript=finalText.trim();
      state.manualRequested=false;stopRecognizing();
      if(!window.CatTalesDialogue.shouldHandleTranscript(transcript)){
        setText("interim","这一小段声音不足以确认主人在说话，已忽略。请说完整一句。");
        if(state.active&&!isManual())scheduleListen(600);
        updateManualControls();return;
      }
      setText("interim","已听到："+transcript);
      updateManualControls();
      void ask(transcript,"voice");
    }
  };
  rec.onerror=(event)=>{
    const err=String(event.error||"unknown");
    if(["not-allowed","service-not-allowed","network","language-not-supported"].includes(err)){
      state.blocked=true;clearRestart();
      setOrb("idle","语音转文字不可用");
      setStatus("浏览器语音识别不可用（"+err+"）。麦克风仍可用于可选声音事件筛查；请改用文字聊天。","warn");
    } else if(err==="no-speech"&&isManual()){
      state.manualRequested=false;
      setText("interim","没有听清这句话，可点击「听我说一句」重试。");
      updateManualControls();
    } else if(err!=="no-speech"&&err!=="aborted"){
      setText("interim","识别暂时失败："+err+"；可以继续打字。");
    }
  };
  rec.onend=()=>{
    state.startPending=false;state.recognizing=false;
    if(isManual()&&!state.thinking&&state.manualRequested){
      state.manualRequested=false;setText("interim","本次聆听结束。继续说话请再点一次。");
    }
    updateManualControls();
    if(state.active&&!state.speaking&&!state.thinking&&!state.blocked)scheduleListen(450);
  };
  state.recognition=rec;return true;
}
function stopRecognizing(){
  clearRestart();
  if(!state.recognition)return;
  try{if(state.recognizing||state.startPending)state.recognition.stop();}catch(e){}
}
function scheduleListen(delay){
  clearRestart();
  if(!state.active||state.blocked||state.speaking||state.thinking||!state.recognition||(isManual()&&!state.manualRequested)||document.hidden)return;
  state.restartTimer=setTimeout(()=>{
    if(!state.active||state.blocked||state.speaking||state.thinking||state.recognizing||state.startPending||(isManual()&&!state.manualRequested)||document.hidden)return;
    state.startPending=true;
    try{state.recognition.start();}
    catch(e){state.startPending=false;state.restartTimer=setTimeout(()=>scheduleListen(750),1200);}
  },delay);
}
function stopSpeech(){
  if("speechSynthesis" in window){try{window.speechSynthesis.cancel();}catch(e){}}
  state.speaking=false;
}
async function speak(message){
  if(!state.active||!$("tts").checked||!("speechSynthesis" in window))return;
  stopRecognizing();
  setOrb("talk","我正在回答");
  state.speaking=true;setStatus("助手正在用浏览器语音合成回答你。","on");
  await new Promise((resolve)=>{
    let done=false, timer;
    const finish=()=>{
      if(done)return;
      done=true;clearTimeout(timer);state.speaking=false;resolve();
    };
    const utterance=new SpeechSynthesisUtterance(message.slice(0,650));
    utterance.lang="zh-CN";utterance.rate=1.04;utterance.pitch=1.08;
    const voices=window.speechSynthesis.getVoices();
    const v=voices.find(v=>v.lang&&v.lang.toLowerCase().startsWith("zh"));
    if(v)utterance.voice=v;
    utterance.onend=finish;utterance.onerror=finish;
    timer=setTimeout(finish,Math.min(32000,6000+message.length*210));
    try{window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);}
    catch(e){finish();}
  });
}
function guard(reply){
  // Even built-in language models can hallucinate having seen/listened to a cat.
  if(!reply||typeof reply!=="string")return "";
  const t=reply.trim().slice(0,650);
  if(!t)return "";
  if(/我(?:已经|刚刚)?(?:听到|看见|识别出|检测到)(?:了)?(?:猫|画面|视频|它)/.test(t))return "";
  if(/(?:百分之百|100%)(?:确定|准确)|翻译(?:出|成)(?:了)?猫语|猫语的准确意思/.test(t))return "";
  return t;
}
async function answer(q,core){
  if(!state.aiReady||!state.ai||["urgent","stop","sound","vision","multimodal","motion","abstain"].includes(core.type))return core.answer;
  try{
    const c=context();
    const result=await state.ai.prompt(
      "主人说："+q.slice(0,450)+"\n主人填写的猫咪背景（未核验）："+
      JSON.stringify(c)+"\n本次会话先前由主人报告的线索："+JSON.stringify(state.memory)+"\n安全的保守建议基线："+core.answer+
      "\n请用简短、自然的中文语音对话口吻回答，最多80字。不要假称听见猫叫、看过摄像头或翻译猫语。");
    return guard(result)||core.answer;
  }catch(e){setText("brain","设备内AI出错，已退回情境规则");return core.answer;}
}
async function ask(raw,origin){
  const q=String(raw||"").trim().slice(0,650);
  if(!q||state.thinking)return;
  const token=state.stopToken;
  bubble("user",q,origin==="voice"?"来自浏览器语音识别 · 可能有转写错误":"文字输入");
  state.turn++;state.thinking=true;clearRestart();stopRecognizing();
  setOrb("loading","我正在整理");setText("interim","正在整理你的描述……");
  setStatus("正在整理你的问题。","on");
  const core=safeReply(q);
  const response=await answer(q,core);
  if(token!==state.stopToken)return;
  state.memory=window.CatTalesDialogue.updateMemory(state.memory,q,core);
  state.thinking=false;
  bubble("assistant",response,state.aiReady&&response!==core.answer?"设备内生成式 AI · 仍需主人核验":"保守情境建议 · 视觉仅限物体/画面位置，非姿态或意图识别");
  setText("interim","你可以接着说……");
  if(state.active)await speak(response);
  if(token!==state.stopToken)return;
  if(state.active){
    setOrb("listen",state.blocked?"改用文字输入":"等待你继续说话");
    if(!state.blocked)scheduleListen(500);
    else setStatus("语音识别不可用，请使用文字输入。","warn");
    updateManualControls();
  }else setOrb("idle","文字聊天可继续");
}
function initWaveform(){
  const canvas=$("wave"),ctx=canvas.getContext("2d");
  if(!ctx)return;
  const W=canvas.width,H=canvas.height;
  function tick(){
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle="#f7fbf7";ctx.fillRect(0,0,W,H);
    ctx.strokeStyle="#96bfa7";ctx.lineWidth=2.5;ctx.beginPath();
    if(state.analyser&&state.active){
      const data=new Uint8Array(state.analyser.fftSize);
      state.analyser.getByteTimeDomainData(data);
      let rms=0;
      data.forEach((x)=>{const v=(x-128)/128;rms+=v*v;});
      const level=Math.min(100,Math.round(Math.sqrt(rms/data.length)*320));
      $("meter").style.width=level+"%";
      for(let i=0;i<W;i++){
        const v=data[Math.floor(i*(data.length-1)/(W-1))]/128-1;
        const y=H/2+v*(H*.42);
        if(i===0)ctx.moveTo(i,y);else ctx.lineTo(i,y);
      }
    }else{
      $("meter").style.width="0%";ctx.moveTo(0,H/2);ctx.lineTo(W,H/2);
    }
    ctx.stroke();
    state.waveformHandle=requestAnimationFrame(tick);
  }
  tick();
}
function prepareAudioGraph(stream){
  const Ctx=window.AudioContext||window.webkitAudioContext;
  if(!Ctx){setText("sound-classes","此浏览器没有 Web Audio API，无法显示波形或运行本地声音分类。");return;}
  const ctx=new Ctx();
  state.ctx=ctx;state.source=ctx.createMediaStreamSource(stream);
  const analyser=ctx.createAnalyser();analyser.fftSize=2048;
  state.analyser=analyser;state.source.connect(analyser);
  // ScriptProcessor runs only when connected; output volume is zero.
  const processor=ctx.createScriptProcessor(4096,1,1);
  const muted=ctx.createGain();muted.gain.value=0;
  state.source.connect(processor);processor.connect(muted);muted.connect(ctx.destination);
  state.processor=processor;state.silentGain=muted;
  const target=Math.max(4096,Math.ceil(ctx.sampleRate*0.975));
  state.audioQueue=new Float32Array(target);state.audioPos=0;
  processor.onaudioprocess=(event)=>{
    if(!state.active||!state.soundReady||!state.worker||state.speaking||state.soundPending)return;
    const arr=event.inputBuffer.getChannelData(0);
    let k=0;
    while(k<arr.length){
      const n=Math.min(target-state.audioPos,arr.length-k);
      state.audioQueue.set(arr.subarray(k,k+n),state.audioPos);
      state.audioPos+=n;k+=n;
      if(state.audioPos===target){
        const chunk=state.audioQueue;
        state.audioQueue=new Float32Array(target);state.audioPos=0;
        state.soundPending=true;
        state.worker.postMessage({type:"chunk",samples:chunk.buffer,sampleRate:ctx.sampleRate},[chunk.buffer]);
        break;
      }
    }
  };
  ctx.resume().catch(()=>{});
}
function closeAudio(){
  if(state.processor){state.processor.onaudioprocess=null;try{state.processor.disconnect();}catch(e){}}
  if(state.silentGain)try{state.silentGain.disconnect();}catch(e){}
  if(state.source)try{state.source.disconnect();}catch(e){}
  if(state.ctx){const ctx=state.ctx;ctx.close().catch(()=>{});}
  state.processor=null;state.silentGain=null;state.source=null;state.ctx=null;state.analyser=null;
  state.audioQueue=null;state.audioPos=0;
}
async function start(){
  if(state.active)return;
  if(!$("mic-consent").checked){setStatus("请先勾选本次麦克风授权说明。","warn");return;}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    setStatus("浏览器不支持安全的麦克风访问；你仍可以用右侧文字聊天。","warn");return;
  }
  $("start").disabled=true;setStatus("正在请求麦克风权限……","on");
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:false,autoGainControl:true},video:false});
    if(!$("mic-consent").checked){stream.getTracks().forEach(t=>t.stop());return;}
    if(document.hidden){stream.getTracks().forEach(t=>t.stop());setStatus("页面已经在后台，不启动麦克风。");return;}
    state.micStream=stream;state.active=true;state.blocked=false;state.manualRequested=false;state.stopToken++;
    const track=stream.getAudioTracks()[0];
    if(track)track.addEventListener("ended",()=>{if(state.active)stop();});
    prepareAudioGraph(stream);
    state.recognition=null;setupRecognition();
    $("stop").disabled=false;$("start").disabled=true;
    $("enable-sound").disabled=false;
    setOrb("listen","先跟我说一句话");
    if(!state.recognition){
      state.blocked=true;setStatus("麦克风已授权，但该浏览器不支持 Web Speech 语音识别。可以使用文字聊天，或尝试 Chrome 桌面版。","warn");
    }else{
      setStatus("麦克风已连接。直接和我说话，比如：‘它为什么一直在门口叫？’","on");
      if(!isManual())scheduleListen(250);
    }
    updateManualControls();
    setText("interim",state.blocked?"语音转文字不可用 · 可以打字":isManual()?"点「听我说一句」再说完整一句。":"正在等你说话……");
  }catch(err){
    const label=String(err&&err.name||"");
    setStatus("麦克风未开启（"+label+"）。请在地址栏允许麦克风，或改用文字输入。","warn");
    $("start").disabled=!$("mic-consent").checked;
  }
}
function stopCamera(){
  if(window.CatTalesVision)window.CatTalesVision.onCameraChange(false);
  if(state.cameraStream)state.cameraStream.getTracks().forEach(t=>t.stop());
  state.cameraStream=null;
  $("camera-video").srcObject=null;display("camera-box",false);
  $("camera").textContent="📷 开启摄像头";$("camera").setAttribute("aria-pressed","false");
}
function stop(){
  state.active=false;state.stopToken++;state.blocked=false;state.manualRequested=false;
  state.thinking=false;state.speaking=false;
  clearRestart();stopRecognizing();stopSpeech();
  state.recognition=null;state.startPending=false;state.recognizing=false;
  if(state.micStream)state.micStream.getTracks().forEach(t=>t.stop());
  state.micStream=null;stopCamera();closeAudio();
  if(state.worker){try{state.worker.terminate();}catch(e){}}
  state.worker=null;state.soundReady=false;state.soundLoading=false;state.soundPending=false;state.recentSound=null;state.catStreak=0;
  if(window.CatTalesVision)window.CatTalesVision.refreshFusion();
  if(state.soundWatchdog)clearTimeout(state.soundWatchdog);
  setText("sound-status","未加载");setText("sound-candidate","尚无真实模型结果");
  setText("sound-classes","已经结束本次声音采集。");
  $("ask-sound").disabled=true;$("enable-sound").disabled=true;
  $("start").disabled=!$("mic-consent").checked;$("stop").disabled=true;
  updateManualControls();
  setOrb("idle","会话已经结束");setStatus("已停止麦克风、摄像头和声音分类。再次使用请重新点击开始。");
  setText("interim","会话已结束 · 文字聊天仍可使用。");
}
async function toggleCamera(){
  if(state.cameraStream){stopCamera();return;}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){setStatus("摄像头功能在这个浏览器中不可用。","warn");return;}
  $("camera").disabled=true;const cameraToken=state.stopToken;
  try{
    const video=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});
    if(cameraToken!==state.stopToken||document.hidden){video.getTracks().forEach(t=>t.stop());return;}
    state.cameraStream=video;$("camera-video").srcObject=video;
    display("camera-box",true);
    if(window.CatTalesVision)window.CatTalesVision.onCameraChange(true);
    try{await $("camera-video").play();}catch(e){}
    $("camera").textContent="■ 关闭摄像头";$("camera").setAttribute("aria-pressed","true");
  }catch(err){setStatus("摄像头未开启（"+String(err&&err.name||"权限限制")+"）。这不影响语音使用。","warn");}
  finally{$("camera").disabled=false;}
}
function soundError(error){
  state.soundReady=false;state.soundLoading=false;state.soundPending=false;
  if(state.worker){state.worker.terminate();state.worker=null;}
  if(state.soundWatchdog){clearTimeout(state.soundWatchdog);state.soundWatchdog=null;}
  setText("sound-status","加载失败");
  setText("sound-classes",String(error).slice(0,220)+"。可继续语音聊天，不会虚构声音分类。");
  setText("sound-candidate","未得到模型结果");
  $("enable-sound").disabled=!state.active;
  $("enable-sound").textContent="重试加载本地声音模型";
}
function soundResult(d){
  state.soundPending=false;
  if(!state.active||!state.soundReady)return;
  const top=Array.isArray(d.top)?d.top:[];
  const first=top[0];
  if(!first)return;
  const gate=window.CatTalesSoundPolicy.assess(top,state.catStreak,d.catTop);
  state.catStreak=gate.streak;
  const catCandidate=gate.catCandidate;
  const score=Math.max(0,Math.min(1,Number(first.score)||0));
  state.recentSound={verified:true,label:first.label,score:score,catCandidate:catCandidate,at:Date.now()};
  if(window.CatTalesVision)window.CatTalesVision.refreshFusion();
  $("ask-sound").disabled=false;
  setText("sound-candidate",catCandidate?"连续候选：疑似猫声（未确认）":"候选："+first.label);
  setText("sound-classes",top.slice(0,4).map(x=>x.label+" "+Number(x.score).toFixed(2)).join(" · ")+"。模型类别排序分数未经校准，不是确认概率，更不是猫咪意图。");
}
function enableSound(){
  if(!state.active||state.soundLoading||state.soundReady)return;
  if(!window.Worker){soundError("浏览器不支持 Web Worker");return;}
  state.soundLoading=true;$("enable-sound").disabled=true;
  $("enable-sound").textContent="正在获取模型…";
  setText("sound-status","正在加载");
  setText("sound-classes","正在从本站静态资源加载 MediaPipe WASM 和 YAMNet；音频在浏览器本地推理，不会上传到本站服务器。");
  try{
    const worker=new Worker("./sound-worker.js?v=20261018c",{type:"classic"});
    state.worker=worker;
    state.soundWatchdog=setTimeout(()=>{if(!state.soundReady)soundError("加载超时（45秒），请检查网络和浏览器兼容性");},45000);
    worker.onmessage=(ev)=>{
      const d=ev.data||{};
      if(d.type==="ready"){
        if(!state.active){worker.terminate();return;}
        state.soundReady=true;state.soundLoading=false;state.soundPending=false;
        if(state.soundWatchdog)clearTimeout(state.soundWatchdog);
        $("enable-sound").textContent="YAMNet 已加载（本地研究候选）";
        $("enable-sound").disabled=true;setText("sound-status","模型已加载");
        setText("sound-classes","已完成模型权重加载。等待麦克风真实片段进行推理，不自动弹出猫叫提醒。");
      }else if(d.type==="result")soundResult(d);
      else if(d.type==="error")soundError(d.message||"未知推理错误");
    };
    worker.onerror=(ev)=>{soundError("声音模型模块加载失败；可能是网络、浏览器或跨域限制");};
    worker.postMessage({type:"init"});
  }catch(e){soundError(String(e&&e.message||e));}
}
async function testBuiltInAI(){
  const btn=$("try-ai");
  if(!("LanguageModel" in window)){btn.textContent="本浏览器无设备内生成式 AI";btn.disabled=true;return;}
  try{
    const opts={expectedInputs:[{type:"text",languages:["zh"]}],expectedOutputs:[{type:"text",languages:["zh"]}]};
    const status=await window.LanguageModel.availability(opts);
    if(["available","downloadable","downloading"].includes(status)){
      btn.disabled=false;
      btn.textContent=status==="available"?"启用设备内生成式 AI（可选）":"尝试下载设备内生成式 AI（可选）";
      btn.dataset.availability=status;
    }else {btn.disabled=true;btn.textContent="设备内生成式 AI 不支持中文或设备";}
  }catch(e){btn.disabled=true;btn.textContent="设备内生成式 AI 不可用";}
}
async function enableAI(){
  if(state.aiReady||state.aiStarting)return;
  if(!("LanguageModel" in window))return;
  state.aiStarting=true;
  const btn=$("try-ai");btn.disabled=true;btn.textContent="正在初始化设备内生成式 AI……";
  try{
    const opts={expectedInputs:[{type:"text",languages:["zh"]}],expectedOutputs:[{type:"text",languages:["zh"]}],
      initialPrompts:[{role:"system",content:"你是猫猫物语的温和交互助手。你只能依据主人文本描述和明确的音频声音事件类别提出保守假设。你没有看过或听过摄像头内容，不能声称翻译猫语，不能给出兽医诊断。对排尿困难、呼吸困难、抽搐等情况立即建议就医；对嘶叫/躲避停止互动。每次仅给一个温柔可撤销的动作。用自然简短中文交流。"}]};
    state.ai=await window.LanguageModel.create(opts);
    state.aiReady=true;$("brain").textContent="设备内生成式 AI";
    btn.textContent="设备内生成式 AI 已开启";btn.disabled=true;
    bubble("assistant","设备内生成式 AI 已启用，接下来的普通提问可以获得更灵活的回复。猫语翻译、视频理解和医疗诊断仍不可用。");
  }catch(e){
    btn.textContent="设备内生成式 AI 启用失败";btn.disabled=true;
    bubble("assistant","该浏览器的设备内语言模型未能启动，仍可以正常使用实时语音和保守情境建议。");
  }finally{state.aiStarting=false;}
}
$("manual-mode").addEventListener("change",()=>{
  state.manualRequested=false;clearRestart();stopRecognizing();
  if(state.active){
    setText("interim",isManual()?"已切换单次模式。点击「听我说一句」。":"已切换自动语音对话，等待你说话。");
    if(!isManual()&&!state.blocked)scheduleListen(400);
  }
  updateManualControls();
});
$("listen-once").addEventListener("click",()=>{
  if(!state.active||state.blocked||!isManual()||!state.recognition||state.thinking)return;
  state.manualRequested=true;setText("interim","这一次正在聆听，请说完整一句……");scheduleListen(50);updateManualControls();
});
document.querySelectorAll("[data-example]").forEach(button=>{
  button.addEventListener("click",()=>{const input=$("message-input");input.value=button.dataset.example||"";input.focus();});
});
$("mic-consent").addEventListener("change",()=>{
  if(!$("mic-consent").checked&&state.active)stop();
  $("start").disabled=!$("mic-consent").checked||state.active;
});
$("start").addEventListener("click",()=>{void start();});
$("stop").addEventListener("click",stop);
$("camera").addEventListener("click",()=>{void toggleCamera();});
$("enable-sound").addEventListener("click",enableSound);
$("ask-sound").addEventListener("click",()=>{
  if(!state.recentSound||!state.recentSound.verified)return;
  if(Date.now()-state.recentSound.at>30000){
    state.recentSound=null;$("ask-sound").disabled=true;setText("sound-classes","候选超过30秒已过期，等待下一次真实推理。");return;
  }
  void ask("刚才检测到的是什么声音？","text");
});
$("reset").addEventListener("click",()=>{
  $("messages").replaceChildren();bubble("assistant","对话记录已清空。麦克风会话是否继续，由左侧按钮控制。");
  state.turn=0;state.recentSound=null;state.catStreak=0;
  if(window.CatTalesVision)window.CatTalesVision.refreshFusion();
  state.memory=window.CatTalesDialogue.createMemory();
  if(window.CatTalesVision)window.CatTalesVision.clearOwnerReport();
  state.stopToken++;state.thinking=false;stopSpeech();
  if(state.active&&!state.blocked)scheduleListen(450);
  if(state.ai&&state.ai.destroy){try{state.ai.destroy();}catch(e){}state.ai=null;state.aiReady=false;$("brain").textContent="情境规则";void testBuiltInAI();}
});
$("compose").addEventListener("submit",(ev)=>{
  ev.preventDefault();
  const input=$("message-input"),q=input.value.trim();
  if(!q)return;
  if(state.thinking){setText("interim","上一条消息正在处理，稍等一下。");return;}
  input.value="";void ask(q,"text");
});
$("tts").addEventListener("change",()=>{if(!$("tts").checked){stopSpeech();if(state.active&&!state.blocked)scheduleListen(300);}});
$("try-ai").addEventListener("click",()=>{void enableAI();});
document.addEventListener("visibilitychange",()=>{
  if(document.hidden&&(state.active||state.cameraStream)){
    stop();setText("interim","页面切到后台，已自动停止麦克风和摄像头。");
    setStatus("为保护隐私，切换到后台已自动结束音视频采集。返回后需要重新开启。");
  }
});
window.addEventListener("pagehide",()=>{
  stop();if(state.waveformHandle)cancelAnimationFrame(state.waveformHandle);
});
initWaveform();void testBuiltInAI();
})();