/* Cat Tales English beta. Live media is permission-gated; no backend, telemetry or transcript persistence.
 * Reuses the original site-hosted YAMNet worker and original media safety policies. */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  const policy=window.CatTalesEnDialogue;
  const state={
    active:false,blocked:false,rec:null,recognizing:false,recognitionPending:false,
    manualRequested:false,speaking:false,working:false,restartTimer:null,
    micStream:null,cameraStream:null,ctx:null,source:null,analyser:null,processor:null,gain:null,
    frame:null,audioQueue:null,audioPos:0,worker:null,soundReady:false,soundLoading:false,
    soundPending:false,soundTimer:null,catStreak:0,recentSound:null,
    epoch:0,memory:policy.createMemory()
  };
  function text(id,value){$(id).textContent=String(value);}
  function show(id,yes){$(id).classList.toggle("hidden",!yes);}
  const moods={idle:"A little cat is ready to listen",listen:"Ears up! Listening to you",talk:"Purr-spective incoming",loading:"Putting the clues together"};
  function orb(mode,hint){
    $("orb").dataset.mode=mode;
    text("orb-hint",hint);
    text("cat-live-mood",moods[mode]||moods.idle);
  }
  function status(message,kind=""){
    text("system-status",message);
    const chip=$("connection");
    chip.className="state"+(kind==="warn"?" warn":kind==="on"?" on":"");
    chip.textContent=!state.active?"Not started":kind==="warn"?"Speech limited":state.speaking?"Speaking":state.working?"Thinking":state.recognizing?"Listening":"Connected";
  }
  function bubble(role,content,meta){
    const box=document.createElement("div");box.className="bubble "+(role==="user"?"user":"assistant");
    const name=document.createElement("span");name.className="who";name.textContent=role==="user"?"🧑 You":"🐾 Cat Tales";
    const p=document.createElement("p");p.textContent=String(content).slice(0,1300);box.append(name,p);
    if(meta){const small=document.createElement("small");small.textContent=meta;box.appendChild(small);}
    $("messages").appendChild(box);
    while($("messages").children.length>55)$("messages").firstElementChild.remove();
    $("messages").scrollTop=$("messages").scrollHeight;
  }
  function context(){return {name:$("cat-name").value.trim()||"your cat",scene:$("cat-scene").value,feeding:$("cat-feeding").value,behavior:$("cat-behavior").value};}
  function isManual(){return $("manual-mode").checked;}
  function clearRestart(){if(state.restartTimer!==null)clearTimeout(state.restartTimer);state.restartTimer=null;}
  function stopRecognizing(){
    clearRestart();
    if(state.rec&&(state.recognizing||state.recognitionPending)){try{state.rec.stop();}catch(_){}}
  }
  function scheduleListen(delay=450){
    clearRestart();
    if(!state.active||state.blocked||state.speaking||state.working||!state.rec||document.hidden||(isManual()&&!state.manualRequested))return;
    state.restartTimer=setTimeout(()=>{
      if(!state.active||state.blocked||state.speaking||state.working||state.recognizing||state.recognitionPending||document.hidden||(isManual()&&!state.manualRequested))return;
      state.recognitionPending=true;
      try{state.rec.start();}catch(e){state.recognitionPending=false;state.restartTimer=setTimeout(()=>scheduleListen(700),1200);}
    },delay);
  }
  function updateManual(){
    $("listen-once").disabled=!state.active||state.blocked||!state.rec||!isManual()||state.recognizing||state.working;
  }
  function initRecognition(){
    if(!Speech)return false;
    const rec=new Speech();rec.lang="en-US";rec.continuous=false;rec.interimResults=true;rec.maxAlternatives=1;
    rec.onstart=()=>{
      state.recognitionPending=false;state.recognizing=true;
      if(state.active&&!state.speaking&&!state.working){orb("listen","I'm listening");status("English speech-to-text is active. You can also type any time.","on");}
      else if(!state.active){try{rec.stop();}catch(_){}}
      updateManual();
    };
    rec.onresult=ev=>{
      if(!state.active||state.speaking||state.working)return;
      let final="",partial="";
      for(let i=ev.resultIndex;i<ev.results.length;i++){
        const entry=ev.results[i];if(entry.isFinal)final+=entry[0].transcript;else partial+=entry[0].transcript;
      }
      if(partial)text("interim","Hearing: "+partial);
      if(final.trim()){
        const heard=final.trim();state.manualRequested=false;stopRecognizing();
        if(!policy.shouldHandleTranscript(heard)){
          text("interim","That short sound wasn't enough to identify an owner sentence. Try a complete sentence.");
          if(state.active&&!isManual())scheduleListen(600);
          updateManual();return;
        }
        text("interim","Heard: "+heard);updateManual();void ask(heard,"voice");
      }
    };
    rec.onerror=ev=>{
      const err=String(ev.error||"unknown");
      if(["not-allowed","service-not-allowed","network","language-not-supported"].includes(err)){
        state.blocked=true;clearRestart();orb("idle","Speech recognition unavailable");
        status("Your browser's English speech recognition is unavailable ("+err+"). Text chat still works; on-device sound classification is separate.","warn");
      }else if(err==="no-speech"&&isManual()){
        state.manualRequested=false;text("interim","No clear sentence heard. Tap Listen once to try again.");
      }else if(err!=="no-speech"&&err!=="aborted"){text("interim","Speech recognition issue: "+err+". You can type instead.");}
      updateManual();
    };
    rec.onend=()=>{
      state.recognizing=false;state.recognitionPending=false;
      if(isManual()&&state.manualRequested){state.manualRequested=false;text("interim","Listening finished. Tap again for another sentence.");}
      updateManual();
      if(state.active&&!state.speaking&&!state.working&&!state.blocked)scheduleListen(450);
    };
    state.rec=rec;return true;
  }
  function stopSpeech(){if("speechSynthesis" in window){try{window.speechSynthesis.cancel();}catch(_){}}state.speaking=false;}
  async function speak(message){
    if(!state.active||!$("tts").checked||!("speechSynthesis" in window)||typeof window.SpeechSynthesisUtterance!=="function")return;
    stopRecognizing();state.speaking=true;orb("talk","I'll say that aloud");status("Speaking my reply through your browser.","on");
    await new Promise(resolve=>{
      let done=false;
      const doneOnce=()=>{if(done)return;done=true;clearTimeout(timer);state.speaking=false;resolve();};
      const u=new SpeechSynthesisUtterance(message.slice(0,620));u.lang="en-US";u.rate=1;u.pitch=1.06;
      const voices=window.speechSynthesis.getVoices();
      const preferred=voices.find(v=>/^en(-US)?$/i.test(v.lang||""))||voices.find(v=>(v.lang||"").toLowerCase().startsWith("en"));
      if(preferred)u.voice=preferred;
      u.onend=doneOnce;u.onerror=doneOnce;
      const timer=setTimeout(doneOnce,Math.min(30000,6000+message.length*115));
      try{window.speechSynthesis.cancel();window.speechSynthesis.speak(u);}catch(_){doneOnce();}
    });
  }
  async function ask(raw,origin="text"){
    const q=String(raw||"").trim().slice(0,650);if(!q||state.working)return;
    const token=state.epoch;state.working=true;
    stopRecognizing();clearRestart();bubble("user",q,origin==="voice"?"Browser transcription · may contain errors":"Typed by you");
    orb("loading","Putting the clues together");text("interim","Considering what you described...");
    status("Thinking about your observation.","on");
    const freshSound=state.recentSound&&Date.now()-state.recentSound.at<30000?state.recentSound:null;
    const freshVision=window.CatTalesVision?.getFresh?.()||null;
    const result=policy.respond(q,context(),freshSound,state.memory,freshVision);
    if(token!==state.epoch)return;
    state.memory=policy.updateMemory(state.memory,q,result);
    bubble("assistant",result.answer,"Conservative context suggestion · owner confirmation needed");
    state.working=false;text("interim","You can ask a follow-up anytime.");
    if(state.active){await speak(result.answer);if(token!==state.epoch)return;}
    if(state.active&&!state.blocked&&!isManual())scheduleListen(450);
    updateManual();
    if(state.active&&!state.speaking)orb("listen","I'm here for the next question");
    if(state.active)status("Conversation ready.","on");
  }
  function closeAudio(){
    if(state.processor){state.processor.onaudioprocess=null;try{state.processor.disconnect();}catch(_){}}
    if(state.gain)try{state.gain.disconnect();}catch(_){}
    if(state.source)try{state.source.disconnect();}catch(_){}
    if(state.ctx)state.ctx.close().catch(()=>{});
    state.processor=null;state.gain=null;state.source=null;state.ctx=null;state.analyser=null;
    state.audioQueue=null;state.audioPos=0;
  }
  function prepareAudio(stream){
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    try{
      const ctx=new Audio();state.ctx=ctx;state.source=ctx.createMediaStreamSource(stream);
      state.analyser=ctx.createAnalyser();state.analyser.fftSize=2048;state.source.connect(state.analyser);
      const processor=ctx.createScriptProcessor(4096,1,1),gain=ctx.createGain();gain.gain.value=0;
      state.source.connect(processor);processor.connect(gain);gain.connect(ctx.destination);
      state.processor=processor;state.gain=gain;
      const target=Math.max(4096,Math.ceil(ctx.sampleRate*.975));
      state.audioQueue=new Float32Array(target);state.audioPos=0;
      processor.onaudioprocess=ev=>{
        if(!state.active||!state.soundReady||!state.worker||state.speaking||state.soundPending)return;
        const arr=ev.inputBuffer.getChannelData(0);let i=0;
        while(i<arr.length){
          const count=Math.min(target-state.audioPos,arr.length-i);
          state.audioQueue.set(arr.subarray(i,i+count),state.audioPos);state.audioPos+=count;i+=count;
          if(state.audioPos===target){
            const chunk=state.audioQueue;state.audioQueue=new Float32Array(target);state.audioPos=0;state.soundPending=true;
            try{state.worker.postMessage({type:"chunk",samples:chunk.buffer,sampleRate:ctx.sampleRate},[chunk.buffer]);}
            catch(_){state.soundPending=false;}
            break;
          }
        }
      };
      ctx.resume().catch(()=>{});
    }catch(e){closeAudio();text("sound-classes","Audio features limited on this browser. Text chat still works.");}
  }
  function drawWave(){
    const canvas=$("wave"),ctx=canvas.getContext("2d");if(!ctx)return;
    const W=canvas.width,H=canvas.height;ctx.clearRect(0,0,W,H);ctx.fillStyle="#fffdf9";ctx.fillRect(0,0,W,H);
    ctx.strokeStyle="#c68da6";ctx.lineWidth=2.4;ctx.beginPath();
    if(state.active&&state.analyser){
      const values=new Uint8Array(state.analyser.fftSize);state.analyser.getByteTimeDomainData(values);
      let power=0;
      for(let x=0;x<W;x++){const v=(values[Math.floor(x*(values.length-1)/(W-1))]-128)/128;power+=v*v;const y=H/2+v*(H*.4);if(x===0)ctx.moveTo(0,y);else ctx.lineTo(x,y);}
      $("meter").style.width=Math.min(100,Math.sqrt(power/W)*320)+"%";
    }else{ctx.moveTo(0,H/2);ctx.lineTo(W,H/2);$("meter").style.width="0%";}
    ctx.stroke();state.frame=requestAnimationFrame(drawWave);
  }
  async function start(){
    if(state.active)return;
    if(!$("mic-consent").checked){status("Please read and accept microphone consent first.","warn");return;}
    if(!navigator.mediaDevices?.getUserMedia){status("This browser cannot access the microphone securely. Text chat still works.","warn");return;}
    $("start").disabled=true;status("Requesting microphone permission...","on");
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:false,autoGainControl:true},video:false});
      if(!$("mic-consent").checked||document.hidden){stream.getTracks().forEach(t=>t.stop());status("Session was not started. Please return to this tab.");$("start").disabled=!$("mic-consent").checked;return;}
      state.epoch++;state.active=true;state.blocked=false;state.manualRequested=false;state.micStream=stream;
      stream.getAudioTracks()[0]?.addEventListener("ended",()=>{if(state.active)stop();});
      prepareAudio(stream);state.rec=null;initRecognition();
      $("start").disabled=true;$("stop").disabled=false;$("enable-sound").disabled=false;orb("listen","I'm listening");
      if(!state.rec){state.blocked=true;status("Microphone is active, but this browser has no English Web Speech support. Type to chat, or opt in to sound clues.","warn");}
      else{status("English voice session connected. Tell me what your cat did.","on");if(!isManual())scheduleListen(250);}
      text("interim",state.blocked?"Speech-to-text unavailable; type instead.":isManual()?"Tap Listen once, then speak.":"Waiting for your first sentence...");
      updateManual();
    }catch(e){$("start").disabled=!$("mic-consent").checked;status("Microphone not started ("+String(e?.name||"unknown")+"). Check your browser permission or use text.","warn");}
  }
  function stopCamera(){
    window.CatTalesVision?.onCameraChange?.(false);
    if(state.cameraStream)state.cameraStream.getTracks().forEach(t=>t.stop());
    state.cameraStream=null;$("camera-video").srcObject=null;show("camera-box",false);
    $("camera").textContent="📷 Turn camera on";$("camera").setAttribute("aria-pressed","false");
  }
  function stop(){
    state.epoch++;state.active=false;state.blocked=false;state.manualRequested=false;state.working=false;state.soundPending=false;
    clearRestart();stopRecognizing();stopSpeech();
    state.rec=null;state.recognizing=false;state.recognitionPending=false;
    if(state.micStream)state.micStream.getTracks().forEach(t=>t.stop());state.micStream=null;
    stopCamera();closeAudio();
    if(state.worker){try{state.worker.terminate();}catch(_){}}
    state.worker=null;state.soundReady=false;state.soundLoading=false;state.catStreak=0;state.recentSound=null;
    if(state.soundTimer){clearTimeout(state.soundTimer);state.soundTimer=null;}
    $("start").disabled=!$("mic-consent").checked;$("stop").disabled=true;$("enable-sound").disabled=true;$("ask-sound").disabled=true;
    $("enable-sound").textContent="Load on-device sound model";
    text("sound-status","Not loaded");text("sound-candidate","No inference yet");text("sound-classes","Session ended. No samples are kept.");
    updateManual();orb("idle","Ready when you are");status("Audio and camera capture stopped. Text chat remains available.");text("interim","Session ended. Text chat is still available.");
  }
  async function camera(){
    if(state.cameraStream){stopCamera();return;}
    if(!navigator.mediaDevices?.getUserMedia){status("Camera is unavailable in this browser.","warn");return;}
    const btn=$("camera");btn.disabled=true;const token=state.epoch;
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});
      if(document.hidden||token!==state.epoch){stream.getTracks().forEach(t=>t.stop());return;}
      state.cameraStream=stream;$("camera-video").srcObject=stream;show("camera-box",true);
      window.CatTalesVision?.onCameraChange?.(true);
      btn.textContent="■ Turn camera off";btn.setAttribute("aria-pressed","true");
      try{await $("camera-video").play();}catch(_){}
    }catch(e){status("Camera could not open ("+String(e?.name||"unknown")+"). Text chat still works.","warn");}
    finally{btn.disabled=false;}
  }
  function soundError(err){
    state.soundReady=false;state.soundLoading=false;state.soundPending=false;
    if(state.worker){try{state.worker.terminate();}catch(_){}state.worker=null;}
    if(state.soundTimer){clearTimeout(state.soundTimer);state.soundTimer=null;}
    text("sound-status","Unavailable");
    const detail=String(err).replace(/^声音模型加载失败：/,"Model load failed: ").replace(/^音频推理失败：/,"Audio inference failed: ");
    text("sound-classes",detail.slice(0,230)+". Text chat still works.");
    text("sound-candidate","No verified sound");
    $("ask-sound").disabled=true;$("enable-sound").disabled=!state.active;$("enable-sound").textContent="Retry sound model";
  }
  function soundResult(d){
    state.soundPending=false;if(!state.active||!state.soundReady)return;
    const top=Array.isArray(d.top)?d.top:[];const first=top[0];if(!first)return;
    const gate=window.CatTalesSoundPolicy.assess(top,state.catStreak,d.catTop);
    state.catStreak=gate.streak;
    state.recentSound={verified:true,label:first.label,score:Math.max(0,Math.min(1,Number(first.score)||0)),catCandidate:gate.catCandidate,at:Date.now()};
    window.CatTalesVision?.refreshFusion?.();
    $("ask-sound").disabled=false;
    text("sound-candidate",gate.catCandidate?"Possible cat sound (unconfirmed)":"Candidate: "+first.label);
    text("sound-classes",top.slice(0,4).map(x=>x.label+" "+Number(x.score).toFixed(2)).join(" · ")+". Uncalibrated scores; no sound source or cat intent confirmed.");
  }
  function enableSound(){
    if(!state.active||state.soundLoading||state.soundReady)return;
    if(!window.Worker){soundError("This browser has no Web Worker support");return;}
    state.soundLoading=true;$("enable-sound").disabled=true;
    text("sound-status","Loading");text("sound-classes","Loading the site-hosted YAMNet model for on-device audio classification...");
    try{
      const worker=new Worker("../live/sound-worker.js?v=20261018c",{type:"classic"});
      state.worker=worker;
      state.soundTimer=setTimeout(()=>{if(!state.soundReady)soundError("Sound model timed out after 45 seconds");},45000);
      worker.onmessage=ev=>{
        const d=ev.data||{};
        if(d.type==="ready"){
          if(!state.active){worker.terminate();return;}
          state.soundLoading=false;state.soundReady=true;state.soundPending=false;
          if(state.soundTimer)clearTimeout(state.soundTimer);state.soundTimer=null;
          text("sound-status","Ready");text("sound-classes","YAMNet loaded. Waiting for real local microphone audio. No cat-meow alerts are fabricated.");
          $("enable-sound").textContent="On-device YAMNet ready";$("enable-sound").disabled=true;
        }else if(d.type==="result")soundResult(d);
        else if(d.type==="error")soundError(d.message||"Unknown sound classification error");
      };
      worker.onerror=()=>soundError("Cannot initialize the site-hosted sound model");
      worker.postMessage({type:"init"});
    }catch(e){soundError(String(e?.message||e));}
  }
  function makeNote(){
    const list=$("messages").querySelectorAll(".bubble.user");
    if(!list.length){text("cat-note-status","Talk about something that really happened with your cat first.");return;}
    const last=list[list.length-1].querySelector("p")?.textContent||"";
    const replies=$("messages").querySelectorAll(".bubble.assistant");
    const answer=replies.length?replies[replies.length-1].querySelector("p")?.textContent||"No suggestion yet":"No suggestion yet";
    const cat=context().name;
    const desc={door:"By the door",bowl:"By the food bowl",toy:"Near a toy",window:"At the window",rest:"Resting",else:"Elsewhere"};
    const feed={recent:"Just ate",due:"Almost mealtime"};
    const behavior={approach:"Approached",play:"Played",hide:"Hid or hissed",quiet:"Calm"};
    const entries=[
      "🐾 CAT TALES · A LITTLE PAWPRINT NOTE","Date: "+new Date().toLocaleDateString("en-US"),
      "My cat: "+cat,
      "Place (owner-reported): "+(desc[$("cat-scene").value]||"Not provided"),
      "Food (owner-reported): "+(feed[$("cat-feeding").value]||"Not provided"),
      "Behavior (owner-reported): "+(behavior[$("cat-behavior").value]||"Not provided"),
      "","What I noticed:",last.slice(0,350),"","Companion's tentative suggestion:",answer.slice(0,600),
      "","This note reflects an owner's description and cautious suggestions, not a verified meow translation or a diagnosis.",
      "Try Cat Tales: https://yl124915300-dot.github.io/cat-tales/en/"
    ];
    $("cat-note-text").value=entries.join("\n");$("cat-note-copy").disabled=false;
    text("cat-note-status","Your little note is ready. Edit it, then decide whether to copy and share. Nothing is uploaded.");
  }
  async function copyNote(){
    const value=$("cat-note-text").value;if(!value.trim())return;
    try{
      if(!navigator.clipboard?.writeText)throw Error("No clipboard API");
      await navigator.clipboard.writeText(value);
      text("cat-note-status","Copied! Please review the note and ask permission before sharing anyone else's details.");
    }catch(_){$("cat-note-text").focus();$("cat-note-text").select();text("cat-note-status","Clipboard unavailable here. Select and copy the text manually.");}
  }
  $("mic-consent").addEventListener("change",()=>{if(!$("mic-consent").checked&&state.active)stop();$("start").disabled=!$("mic-consent").checked||state.active;});
  $("start").addEventListener("click",()=>{void start();});
  $("stop").addEventListener("click",stop);
  $("camera").addEventListener("click",()=>{void camera();});
  $("enable-sound").addEventListener("click",enableSound);
  $("ask-sound").addEventListener("click",()=>{
    if(!state.recentSound||!state.recentSound.verified)return;
    if(Date.now()-state.recentSound.at>30000){state.recentSound=null;$("ask-sound").disabled=true;text("sound-classes","Previous candidate expired. Waiting for new inference.");return;}
    void ask("What sound did you detect?","text");
  });
  $("manual-mode").addEventListener("change",()=>{
    state.manualRequested=false;clearRestart();stopRecognizing();
    if(state.active){text("interim",isManual()?"Tap Listen once before each sentence.":"Automatic listening enabled. Speak when ready.");if(!isManual()&&!state.blocked)scheduleListen(400);}
    updateManual();
  });
  $("listen-once").addEventListener("click",()=>{
    if(!state.active||state.blocked||!isManual()||!state.rec||state.working)return;
    state.manualRequested=true;text("interim","Listening for one complete sentence...");scheduleListen(60);updateManual();
  });
  document.querySelectorAll("[data-example]").forEach(btn=>btn.addEventListener("click",()=>{$("message-input").value=btn.dataset.example||"";$("message-input").focus();}));
  $("compose").addEventListener("submit",ev=>{
    ev.preventDefault();const input=$("message-input"),q=input.value.trim();if(!q)return;
    if(state.working){text("interim","Please finish the previous reply before sending another.");return;}
    input.value="";void ask(q,"text");
  });
  $("tts").addEventListener("change",()=>{if(!$("tts").checked){stopSpeech();if(state.active&&!state.blocked)scheduleListen(300);}});
  $("cat-name").addEventListener("input",()=>{const n=$("cat-name").value.trim().slice(0,24);text("cat-buddy-label",n?"Let's learn more about "+n+" ♡":"A little space for you and your cat ♡");});
  $("cat-note-make").addEventListener("click",makeNote);
  $("cat-note-copy").addEventListener("click",()=>{void copyNote();});
  $("reset").addEventListener("click",()=>{
    $("messages").replaceChildren();bubble("assistant","Conversation cleared. You can start a fresh observation.","Nothing is saved on our server.");
    state.epoch++;state.memory=policy.createMemory();state.recentSound=null;state.catStreak=0;state.working=false;
    stopSpeech();$("cat-note-text").value="";$("cat-note-copy").disabled=true;
    text("cat-note-status","Local note cleared.");
    window.CatTalesVision?.clearOwnerReport?.();window.CatTalesVision?.refreshFusion?.();
    if(state.active&&!state.blocked&&!isManual())scheduleListen(450);
  });
  window.CatTalesLiveEvidence=()=>state.recentSound&&Date.now()-state.recentSound.at<=5000?state.recentSound:null;
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden&&(state.active||state.cameraStream)){stop();status("Media capture stopped because the tab went into the background. Re-enable it when you're ready.");}
  });
  window.addEventListener("pagehide",()=>{stop();if(state.frame)cancelAnimationFrame(state.frame);});
  drawWave();
})();
