/* 猫猫物语 Live — v2 conversational safety policy. No audio/video inference in this module. */
(function (root) {
  "use strict";
  function has(q, words) { return words.some(function(w){ return q.includes(w); }); }

  function detectScene(q){
    if(/门口|门外|开门|出门|叫门/.test(q))return "door";
    if(/食盆|饭盆|饭碗|猫粮/.test(q))return "bowl";
    if(/逗猫棒|玩具/.test(q))return "toy";
    if(/窗边|窗外|看鸟|阳台/.test(q))return "window";
    return "";
  }
  function createMemory(){return {scene:"",feeding:"",lastTopic:"",turnCount:0};}
  function updateMemory(previous, input, result){
    const m=Object.assign(createMemory(),previous||{}),q=String(input||"").slice(0,600),scene=detectScene(q);
    if(scene)m.scene=scene;
    if(/刚喂|喂过|刚吃|吃过|喂完/.test(q))m.feeding="recent";
    if(/没吃|没喂|还没喂|快到饭点/.test(q))m.feeding="due";
    if(result&&result.type==="urgent")m.lastTopic="urgent";
    else if(result&&result.type==="stop")m.lastTopic="stop";
    else if(result&&result.type==="cue")m.lastTopic="cue";
    else if(result&&result.type==="sound")m.lastTopic="sound";
    else if(/刚喂|喂过|刚吃|吃过|喂完|饿|饭点/.test(q))m.lastTopic="food";
    else if(scene)m.lastTopic=scene;
    else if(result&&result.type==="uncertain")m.lastTopic="vocal";
    m.turnCount=Math.min(1000,(Number(m.turnCount)||0)+1);
    return m;
  }
  function shouldHandleTranscript(input){
    const q=String(input||"").trim().replace(/[，。！？.!?,\s]/g,"");
    return q.length>=2&&!/^(?:喵+|咪+|啊+|嗯+|哦+|呃+|呜+|哈+|哼+)$/.test(q);
  }

  function respond(input, context, sound, memory, vision) {
    const q = String(input || "").trim();
    const c = context || {},m=memory||createMemory();
    const s = sound && sound.verified && (!Number.isFinite(sound.at)||Date.now()-sound.at<=30000) ? sound : null;
    const v = vision&&vision.verified&&Number.isFinite(vision.at)&&Date.now()-vision.at<=6500?vision:null;
    const short = q.slice(0,600);
    const where = detectScene(q) || c.scene || m.scene || "";
    const fed = /刚喂|喂过|刚吃|吃过|喂完/.test(q) ? "recent" : c.feeding || m.feeding || "";
    const behavior = c.behavior || "";
    const catName = String(c.name || "你的猫咪").slice(0,30);
    if (!short) return {type:"abstain", answer:"我还没收到你的问题。可以告诉我猫咪在哪里、在做什么，或者直接问我怎样和它安全互动。"};
    if (has(short, ["呼吸困难","喘不过气","嘴巴喘气","张口呼吸","尿不出来","尿不出","排尿困难","抽搐","昏迷","突然倒地","快死了","憋尿","吐血","严重受伤"])) {
      return {type:"urgent", answer:"这些情况可能需要紧急医疗处理。请现在停止互动，尽快联系兽医或急诊动物医院，不要等待我分析猫叫。"};
    }
    if (has(short, ["哈气","嘶叫","躲起来","一直躲","逃跑","害怕","咬我","发抖","怕我"]) || behavior==="hide") {
      return {type:"stop", answer:catName+"可能需要空间。先别靠近、追逐或反复播放声音，让它自由离开。等情绪放松后再观察；如果行为突然改变或持续异常，请联系兽医。"};
    }
    // Explicit owner feedback takes priority over older context rules.
    if(has(short,["它走了","离开了","过来了","靠近了","转头了","没有反应","还在叫","不理我","试过了","试了没用"])){
      const prior=m.lastTopic==="door"?"你之前提到门口的情境；":m.lastTopic==="food"?"你之前提到喂食的情境；":m.lastTopic==="toy"?"你之前提到玩耍的情境；":"";
      if(has(short,["没有反应","不理我","试过了","试了没用"])){
        return {type:"feedback",answer:prior+"你报告这次没有明显反应。先不要反复呼唤或增加刺激，让它自己选择要不要互动。单次反应不能证明它理解了建议；观察是否离开或放松。"};
      }
      return {type:"feedback",answer:prior+"这是有用的一次主人观察。不过单次反应不能证明它理解了我们的建议。先尊重它的选择，看看类似情况是否重复出现。你愿意描述一下它现在的姿态吗？"};
    }
    if(/^(?:(?:那|所以|接下来|之后|现在)?(?:然后呢|现在呢|下一步呢|下一步|怎么办|接下来呢|该做什么))[？?。！!]*$/.test(short)){
      if(m.lastTopic==="urgent")return {type:"urgent",answer:"前面提到的症状可能紧急。请联系兽医或急诊动物医院，不要继续测试声音。"};
      if(m.lastTopic==="stop")return {type:"stop",answer:"先给它空间，不主动靠近；若行为突然改变或伴随身体不适，请咨询兽医。"};
      if(m.lastTopic==="food")return {type:"followup",answer:"继续观察它是否正常喝水、进食和活动。若已经喂过，不必为了测试再加餐。它现在离开食盆了吗？"};
      if(m.lastTopic==="door")return {type:"followup",answer:"接下来先保持门窗安全，不要急着开门。看看它是看门、靠近你还是走开，再告诉我结果。"};
      if(m.lastTopic==="toy")return {type:"followup",answer:"猫咪愿意时再轻轻玩一小会儿，转头或离开就结束。它现在主动玩耍了吗？"};
      if(m.lastTopic==="cue")return {type:"followup",answer:"固定口令轻声说一次即可，不要反复催促；转头不代表它听懂了。它现在自愿靠近了吗？"};
      return {type:"abstain",answer:"我还不确定你指的是哪次互动。请说说猫咪现在在哪里、在做什么，再给你一个安全建议。"};
    }
    if(/(?:动了吗|移动了吗|有没有动|在动吗|位置变化|换位置|动作|姿态|尾巴|耳朵|张嘴|走路|走动)/.test(short)&&/猫|它|画面|镜头|摄像头/.test(short)){
      if(!v)return {type:"motion",answer:"目前没有足够新的连续画面证据。仅打开摄像头并不代表我看到了猫咪动作；请另外授权本地视觉检测，并等待连续采样。"};
      if(/尾巴|耳朵|张嘴|姿态|走路/.test(short))return {type:"motion",answer:"目前模型只检测猫物体及检测框位置，不能看懂耳朵、尾巴、张嘴或走路等具体动作。请你亲自观察并告诉我；我不会用框的位置猜测它的意图。"};
      if(v.ownerReport&&v.ownerReport.key==="camera")return {type:"motion",answer:"【主人报告】你刚才移动了手机或镜头，因此不能把画面中检测框的位置变化解释成猫自己移动。"};
      if(v.ownerReport&&v.ownerReport.key==="cat_self")return {type:"motion",answer:"【主人报告】你亲眼看到猫自己换了位置。这是你提供的观察，与模型测量画面位置变化不同；我们仍不知道猫咪为什么这样做。"};
      if(v.motionStatus==="frame_position_shift")return {type:"motion",answer:"最近约"+Number(v.motionSeconds).toFixed(1)+"秒内，猫物体检测框在画面中的位置发生了变化。但这可能来自猫、手机或检测误差。你亲眼看到猫自己移动了吗？"};
      if(v.motionStatus==="no_large_frame_shift")return {type:"motion",answer:"最近几帧中，猫检测框中心位置没有明显变化。但这不能证明它没有运动，更无法说明耳朵、尾巴等细节。"};
      if(v.motionStatus==="multiple_cats")return {type:"motion",answer:"画面可能包含多只猫，模型无法判断连续帧是不是同一只，因此我不推断移动。"};
      return {type:"motion",answer:"还没有足够的连续猫目标画面来判断位置变化。请先保持手机稳定几秒；即使框发生位移，也不能证明猫在走路。"};
    }
    if ((/镜头|摄像头|画面|看见|看到|识别.*猫|拍到/.test(short) && /猫|狗|里面|看到|看见|画面|镜头|摄像头/.test(short)) || (/声/.test(short)&&/画面|摄像头/.test(short))) {
      if(/声音|猫叫|声源|结合/.test(short)&&/画面|摄像头|镜头/.test(short)) {
        if(v&&v.catCandidate&&s&&s.catCandidate&&Math.abs(v.at-s.at)<=5000) return {type:"multimodal",answer:"最近同一时段，视觉模型检测到猫的物体候选，音频模型也给出疑似猫声候选。但这并不能确定声音来自画面里的猫。需要你亲眼观察猫张嘴发声，以及当时的环境。"};
        return {type:"multimodal",answer:"目前没有同时足够新的猫咪画面候选与猫声候选，所以不能确认猫咪在发声。摄像头预览不等于视觉识别；你可以单独启用本地物体检测和 YAMNet，并观察猫咪真实动作。"};
      }
      if(!v)return {type:"vision",answer:"当前还没有来自真实视觉模型、且足够新的画面结果。仅打开摄像头不代表我看见了猫；需要另外勾选并启用本地画面识别。"};
      if(v.catCandidate)return {type:"vision",answer:"本地 EfficientDet-Lite0 最近连续两次检测到猫的物体轮廓候选，原始分数约 "+Number(v.catScore).toFixed(2)+"（未经校准）。这只能说明画面里有猫的可能性，无法判断它在做什么、是否张嘴发声或想表达什么。"};
      if(v.dogCandidate)return {type:"vision",answer:"视觉模型当前检测到狗的物体候选，还没有稳定的猫候选；这不能证明画面中没有猫。可以调整镜头或光线再观察。"};
      return {type:"vision",answer:"本地模型已经检查了最近的画面，但没有形成稳定的猫物体候选。画面可能存在遮挡或光照不足，这不等于没有猫，也不代表猫咪没有发声。"};
    }
    if (has(short, ["叫它过来","让它过来","让猫过来","怎么叫过来","和猫说话","猫语","翻译","交流","沟通"])) {
      return {type:"cue", answer:"我们可以建立温和、固定的互动信号，但不能把人话翻译成猫语。试着在它放松时，用同一个短词轻声呼唤一次，等它自愿回应；不靠近就停下。你想让它靠近，还是想知道它为何叫？"};
    }
    if (has(short, ["识别","刚才什么声音","刚才是什么声音","刚才那是什么声音","检测到","是猫叫吗","你听到","听到了吗","声音分析","声音是什么"])) {
      if (!s) return {type:"sound",answer:"目前我还没有可复核的声音模型结果。麦克风连接和语音转文字不等于猫叫识别。如果你启用了本地 YAMNet，页面会显示候选类别；也可以告诉我你亲耳听到的声音和猫咪的动作。"};
      const label=s.label||"未知";
      const score=Number.isFinite(s.score)?s.score.toFixed(2):null;
      return {type:"sound",answer:"刚才本地 YAMNet 对一段声音给出的首位候选是“"+label+"”"+(score===null?"":"（未经校准的类别分数 "+score+"）")+"。它只是声音事件的候选，不是确认叫声，更不能说明猫咪想表达什么。你能看到猫当时张嘴发声吗？"};
    }
    if (has(short,["饿","吃饭","喂食","饭盆","食盆","碗","吃完","零食","肚子"]) || where==="bowl") {
      if (fed==="recent" || has(short,["刚喂","刚吃","吃过了","喂过"])) {
        return {type:"context",answer:"既然你报告它刚吃过，就先不要因为叫声立即加餐。它也可能在寻求关注，或只是习惯性靠近食盆。先检查饮水、精神和日常活动，观察它是否主动靠近你。"};
      }
      return {type:"context",answer:"叫声不能单独证明它饿了。先看看是不是平常的饭点、饮水是否正常，并按平时的量喂食，不要为测试而增加零食。你上次喂它是什么时候？"};
    }
    if (has(short,["门口","开门","出去","门外","出门","一直叫门","进屋"]) || where==="door") {
      return {type:"context",answer:catName+"在门口活动可能与好奇、声音或熟悉的生活习惯有关，但没法仅凭叫声确定。先保持门窗安全，观察它是盯着门、看着你，还是主动走开。不要为测试随意放它出门。"};
    }
    if (has(short,["玩","玩具","逗猫棒","陪它","运动"]) || where==="toy") {
      return {type:"context",answer:"如果它身体放松，可以试着慢慢移动熟悉的逗猫棒一小会儿，看看它是否自愿靠近。没有反应就停止；一次反应还不足以判断它真正想要什么。"};
    }
    if (has(short,["窗外","看鸟","窗边","阳台"]) || where==="window") {
      return {type:"context",answer:"猫咪可能被窗外的移动、声音或气味吸引。先检查窗户安全，让它自行观察；可以告诉我耳朵、尾巴和身体有没有明显变化。"};
    }
    if (has(short,["一直叫","老是叫","突然叫","喵","猫叫","为什么叫","叫了几声","叫个不停","凌晨叫"]) || (s && s.catCandidate)) {
      return {type:"uncertain",answer:"我不会把叫声直接翻译成人话。它可能在寻求关注、对环境作出反应，或与生活节奏有关。先看它发声的位置、姿态，以及是否刚吃过饭。你亲眼看到它张嘴发声了吗？"};
    }
    if (has(short,["你好","在吗","嗨","你是谁","怎么用","如何开始"])) {
      return {type:"general",answer:"我在呀。我是猫猫物语的互动助手。你可以直接跟我说猫咪刚做了什么，我会给出谨慎的观察建议；也可以问我如何建立温和的回应方式。当前未实现真正的猫语翻译。"};
    }
    if (has(short,["谢谢","好的","明白","知道了"])) {
      return {type:"general",answer:"不客气。可以先试一个安全的小动作，然后告诉我它是靠近了、走开了，还是没有明显变化。我们一起记录真实反应，不急着下结论。"};
    }
    if (has(short,["它走了","离开了","过来了","靠近了","转头了","没有反应","还在叫","不理我"])) {
      return {type:"feedback",answer:"这是很有用的一次主人观察，不过单次反应不能证明它理解了我们的建议。先尊重它的选择，看看类似情况是否重复出现。你愿意描述一下它现在的姿态吗？"};
    }
    return {type:"abstain",answer:"我听到你的描述了，但现有证据还不足以判断这只猫的具体意图。可以补充它当时的位置、是否亲眼看见发声、刚吃过没有，以及有没有靠近或躲避。我会先给一条安全建议，不乱猜。"};
  }
  const api={respond,createMemory,updateMemory,shouldHandleTranscript};
  if(typeof module!=="undefined" && module.exports) module.exports=api;
  root.CatTalesDialogue=api;
})(typeof window!=="undefined"?window:globalThis);
