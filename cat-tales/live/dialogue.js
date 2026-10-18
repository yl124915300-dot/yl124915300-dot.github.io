/* 猫猫物语 Live — v2 conversational safety policy. No audio/video inference in this module. */
(function (root) {
  "use strict";
  function has(q, words) { return words.some(function(w){ return q.includes(w); }); }
  function respond(input, context, sound) {
    const q = String(input || "").trim();
    const c = context || {};
    const s = sound && sound.verified ? sound : null;
    const short = q.slice(0,600);
    const where = c.scene || "";
    const fed = c.feeding || "";
    const behavior = c.behavior || "";
    const catName = String(c.name || "你的猫咪").slice(0,30);
    if (!short) return {type:"abstain", answer:"我还没收到你的问题。可以告诉我猫咪在哪里、在做什么，或者直接问我怎样和它安全互动。"};
    if (has(short, ["呼吸困难","喘不过气","嘴巴喘气","张口呼吸","尿不出来","尿不出","排尿困难","抽搐","昏迷","突然倒地","快死了","憋尿","吐血","严重受伤"])) {
      return {type:"urgent", answer:"这些情况可能需要紧急医疗处理。请现在停止互动，尽快联系兽医或急诊动物医院，不要等待我分析猫叫。"};
    }
    if (has(short, ["哈气","嘶叫","躲起来","一直躲","逃跑","害怕","咬我","发抖","怕我"]) || behavior==="hide") {
      return {type:"stop", answer:catName+"可能需要空间。先别靠近、追逐或反复播放声音，让它自由离开。等情绪放松后再观察；如果行为突然改变或持续异常，请联系兽医。"};
    }
    if (has(short, ["叫它过来","让它过来","让猫过来","怎么叫过来","和猫说话","猫语","翻译","交流","沟通"])) {
      return {type:"cue", answer:"我们可以建立温和、固定的互动信号，但不能把人话翻译成猫语。试着在它放松时，用同一个短词轻声呼唤一次，等它自愿回应；不靠近就停下。你想让它靠近，还是想知道它为何叫？"};
    }
    if (has(short, ["识别","刚才什么声音","检测到","是猫叫吗","你听到","听到了吗","声音分析","声音是什么"])) {
      if (!s) return {type:"sound",answer:"目前我还没有可复核的声音模型结果。麦克风连接和语音转文字不等于猫叫识别。如果你启用了本地 YAMNet，页面会显示候选类别；也可以告诉我你亲耳听到的声音和猫咪的动作。"};
      const label=s.label||"未知";
      const score=Number.isFinite(s.score)?Math.round(s.score*100):null;
      return {type:"sound",answer:"刚才本地 YAMNet 对一段声音给出的首位候选是“"+label+"”"+(score===null?"":"（模型分数约 "+score+"%）")+"。它只是声音事件的候选，不是确认叫声，更不能说明猫咪想表达什么。你能看到猫当时张嘴发声吗？"};
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
  const api={respond};
  if(typeof module!=="undefined" && module.exports) module.exports=api;
  root.CatTalesDialogue=api;
})(typeof window!=="undefined"?window:globalThis);
