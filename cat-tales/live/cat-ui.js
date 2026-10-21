/* Cat Tales v2.4 — presentation and voluntary local keepsake only.
 * Does not access media streams, change classifier gates, use analytics, or upload data. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const name = $("cat-name"), buddy = $("cat-buddy-label");
  const orb = $("orb"), mood = $("cat-live-mood");
  const report = $("cat-note-text"), make = $("cat-note-make"), copy = $("cat-note-copy");
  const feedback = $("cat-note-status");
  if (!name || !buddy || !orb || !mood || !report || !make || !copy || !feedback) return;

  function updateBuddy() {
    const cat = name.value.trim().slice(0, 24);
    buddy.textContent = cat ? "今天也来听听 " + cat + " 的故事吧 ♡" : "今天，想听听你家小猫的故事 ♡";
  }
  name.addEventListener("input", updateBuddy);
  updateBuddy();

  const modes = {
    idle: "小猫已就位，等待你开口",
    listen: "耳朵竖起来啦 · 正在聆听主人",
    talk: "轻轻喵一声 · 助手正在回应",
    loading: "猫咪正在整理你提供的线索"
  };
  function updateMood() {
    const mode = orb.dataset.mode || "idle";
    mood.textContent = modes[mode] || modes.idle;
    mood.dataset.mode = mode;
  }
  if ("MutationObserver" in window) {
    new MutationObserver(updateMood).observe(orb, { attributes: true, attributeFilter: ["data-mode"] });
  }
  updateMood();

  const scenes = {
    door: "门口", bowl: "食盆旁", toy: "玩具边",
    window: "窗边", rest: "休息处", else: "其他位置"
  };
  const feeding = { recent: "刚喂过", due: "快到饭点" };
  const behaviors = {
    approach: "主动靠近", play: "主动玩耍",
    hide: "躲藏、哈气或逃避", quiet: "平静"
  };
  function detail(id, dict) {
    const value = $(id).value;
    return dict[value] || "主人未填写";
  }
  function lastBubble(selector) {
    const list = $("messages").querySelectorAll(selector);
    if (!list.length) return "";
    const p = list[list.length - 1].querySelector("p");
    return p ? p.textContent.trim().slice(0, 350) : "";
  }
  make.addEventListener("click", function () {
    const said = lastBubble(".bubble.user");
    if (!said) {
      feedback.textContent = "先和猫猫物语聊一句真实发生的事，再来留下小纸条。";
      return;
    }
    const cat = name.value.trim().slice(0, 24) || "我的猫咪";
    const reply = lastBubble(".bubble.assistant") || "还没有助手建议";
    const lines = [
      "🐾 猫猫物语 · 一张小爪观察卡",
      "日期：" + new Date().toLocaleDateString("zh-CN"),
      "猫咪：" + cat,
      "主人描述的地点：" + detail("cat-scene", scenes),
      "主人描述的喂食：" + detail("cat-feeding", feeding),
      "主人观察到的行为：" + detail("cat-behavior", behaviors),
      "",
      "主人刚才说：",
      said,
      "",
      "助手的保守建议（不是观察到的事实）：",
      reply,
      "",
      "说明：文字来自主人填写、主人对话与助手建议；不是猫语翻译、猫咪意图验证或兽医诊断。",
      "第一次体验：https://yl124915300-dot.github.io/cat-tales/live/"
    ];
    report.value = lines.join("\n");
    copy.disabled = false;
    feedback.textContent = "小纸条做好啦！可以先修改，再由你决定是否复制和分享。页面不会自动上传。";
  });
  copy.addEventListener("click", async function () {
    if (!report.value.trim()) return;
    let success = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(report.value);
        success = true;
      } else {
        report.focus();
        report.select();
        success = typeof document.execCommand === "function" && document.execCommand("copy");
      }
    } catch (_) {
      success = false;
    }
    feedback.textContent = success ? "已经复制。分享前请检查内容并取得涉及他人的许可。" : "自动复制不可用，请长按小纸条或选中文本手动复制。";
  });

  const reset = $("reset");
  if (reset) reset.addEventListener("click", function () {
    report.value = "";
    copy.disabled = true;
    feedback.textContent = "本次小纸条已清空，新的对话可以重新生成。";
  });
  const navLinks = Array.from(document.querySelectorAll(".cat-tabs a[href^='#']"));
  function updateNav() {
    const hash = window.location.hash || "#live-room";
    navLinks.forEach(function (link) {
      if (link.getAttribute("href") === hash) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }
  window.addEventListener("hashchange", updateNav);
  navLinks.forEach(function (link) { link.addEventListener("click", function () {
    navLinks.forEach(function (item) { item.removeAttribute("aria-current"); });
    link.setAttribute("aria-current", "location");
  }); });
  updateNav();
})();