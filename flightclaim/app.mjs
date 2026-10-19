import { assess, evidenceChecklist, claimLetter, RULESET_VERSION } from "./engine.mjs";

// Browser-only UI. No external form action, API, analytics, personal-data upload or fee collection.
const $ = (s) => document.querySelector(s);
const form = $("#wizardForm");
const notice = $("#notice"), errorBox = $("#wizardError");
const storeKey = "flightclaim_v0_local_drafts";
const statuses = ["DRAFT", "SENT_BY_TRAVELER", "AIRLINE_RESPONSE", "CLOSED"];
let step = 0, lastInput = null, lastResult = null, language = "en";

const copy = {
  en: {
    navHome: "Home", navCheck: "Check rights", navDrafts: "My local drafts", navGuide: "Airline links",
    navFees: "Fees & privacy", banner: "Free passenger-rights self-help pilot.",
    heroTitle: "Your flight changed. Your rights shouldn't be a mystery.",
    heroLead: "Check whether EU flight disruption rules may apply, understand compensation versus refunds, and prepare a claim you can submit yourself.",
    start: "Start free check →", officialLinks: "Official airline links",
    step1: "Where did your flight operate?", step2: "What happened?", step3: "How long and when?",
    step4: "What is known about the cause?", step5: "Your preliminary result", draftsTitle: "My case drafts"
  },
  zh: {
    navHome: "首页", navCheck: "赔偿初筛", navDrafts: "本机草稿", navGuide: "航司入口",
    navFees: "费用与隐私", banner: "免费航空旅客权益初筛测试版。",
    heroTitle: "航班发生变化，旅客权益不该成为谜题。",
    heroLead: "初步核对欧盟航空旅客权益，区分赔偿、退票和费用报销，生成可由旅客本人提交的资料。",
    start: "免费开始初筛 →", officialLinks: "航空公司官方入口",
    step1: "这次航班的路线属于哪里？", step2: "发生了哪种航班问题？", step3: "延误多久？何时收到通知？",
    step4: "目前知道的原因是什么？", step5: "初步筛选结果", draftsTitle: "我的本机案件草稿"
  }
};

function tr() {
  for (const el of document.querySelectorAll("[data-i18n]")) {
    const k = el.getAttribute("data-i18n");
    if (copy[language][k]) el.textContent = copy[language][k];
  }
  $("#langSwitch").textContent = language === "en" ? "中文" : "EN";
}
$("#langSwitch").addEventListener("click", () => {
  language = language === "en" ? "zh" : "en";
  tr();
  if (language === "zh") say("详细规则解释仍保留英文；不会自动提供确定的赔偿判断。");
});

function say(value, target = notice) {
  target.textContent = value;
}
function showView(view) {
  const valid = ["home", "checker", "drafts", "guide", "fees"];
  const target = valid.includes(view) ? view : "home";
  for (const el of document.querySelectorAll("[data-view]")) el.hidden = el.dataset.view !== target;
  for (const el of document.querySelectorAll("nav [data-nav]")) {
    if (el.dataset.nav === target) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  }
  if (target === "drafts") renderDrafts();
  if (target === "checker") refreshStepper();
  if (location.hash !== "#" + target) history.replaceState(null, "", "#" + target);
  window.scrollTo({ top: 0, behavior: "instant" });
}
document.addEventListener("click", event => {
  const el = event.target.closest("[data-nav]");
  if (!el) return;
  event.preventDefault();
  if (el.dataset.newCheck === "true") {
    form.reset();
    step = 0;
    lastInput = null;
    lastResult = null;
    errorBox.textContent = "";
    errorBox.hidden = true;
    $("#resultState").replaceChildren();
    $("#letterText").value = "";
    say("");
  }
  showView(el.dataset.nav);
});
window.addEventListener("hashchange", () => showView(location.hash.slice(1)));

function getAnswers() {
  return Object.fromEntries(new FormData(form).entries());
}
function applyAnswers(values) {
  for (const [name, value] of Object.entries(values || {})) {
    const el = form.elements.namedItem(name);
    if (el && typeof el.value === "string") el.value = String(value ?? "");
  }
}
function validateStep() {
  say("");
  errorBox.hidden = true;
  errorBox.textContent = "";
  if (step === 0 && !form.elements.namedItem("scope").value) {
    errorBox.textContent = "Choose the flight coverage category; selecting Not sure is allowed.";
  } else if (step === 1 && !form.elements.namedItem("disruption").value) {
    errorBox.textContent = "Choose the type of flight disruption.";
  } else if (step >= 2 && step <= 3) {
    for (const input of form.querySelectorAll('input[type="number"]')) {
      if (!input.validity.valid) {
        errorBox.textContent = "Enter a valid non-negative duration or leave it blank if unknown.";
        break;
      }
    }
  }
  errorBox.hidden = !errorBox.textContent || errorBox.textContent === "";
  return errorBox.hidden;
}
function refreshStepper() {
  for (const el of document.querySelectorAll(".step")) el.hidden = Number(el.dataset.step) !== step;
  $("#stepLabel").textContent = (language === "zh" ? "第 " + (step + 1) + " / 5 步" : "Step " + (step + 1) + " of 5");
  $("#progressFill").style.width = ((step + 1) * 20) + "%";
  $("#previousStep").disabled = step === 0;
  $("#nextStep").hidden = step === 4;
  if (step === 4) renderResult();
}
function next() {
  if (!validateStep()) return;
  if (step < 4) step += 1;
  refreshStepper();
  window.scrollTo({ top: 0, behavior: "instant" });
}
function back() {
  if (step > 0) step -= 1;
  errorBox.textContent = "";
  errorBox.hidden = true;
  refreshStepper();
}
$("#nextStep").addEventListener("click", next);
$("#previousStep").addEventListener("click", back);

function bulletList(target, items, emptyMessage = "") {
  const root = $(target);
  root.replaceChildren();
  const xs = items.length ? items : [emptyMessage];
  for (const item of xs) {
    const li = document.createElement("li");
    li.textContent = item;
    root.append(li);
  }
}
function renderResult() {
  lastInput = getAnswers();
  lastResult = assess(lastInput);
  const r = lastResult;
  const label = {
    POSSIBLY_ELIGIBLE: "Potential claim — verify facts",
    REVIEW_REQUIRED: "Needs individual review",
    GENERALLY_UNLIKELY: "Fixed-rate EU claim generally unlikely from these answers",
    NOT_SUPPORTED: "Outside this EU-only checker"
  }[r.category];
  const state = $("#resultState");
  state.replaceChildren();
  state.className = "result-state";
  if (r.category === "REVIEW_REQUIRED" || r.category === "NOT_SUPPORTED") state.classList.add("review");
  if (r.category === "GENERALLY_UNLIKELY") state.classList.add("unlikely");
  const strong = document.createElement("span");
  strong.textContent = label + " ";
  state.append(strong);

  const metricItems = [
    ["Statutory compensation", r.compensation === "POSSIBLY_ELIGIBLE" ? "Possibly — verify" : r.compensation === "GENERALLY_UNLIKELY" ? "Generally unlikely" : "Not confirmed"],
    ["Ticket refund option", r.refundPossible ? "May apply; check unused travel" : "Not established"],
    ["Care expenses", r.carePossible ? "May apply; keep receipts" : "Check airline policy"]
  ];
  const flags = $("#resultFlags");
  flags.replaceChildren();
  for (const item of metricItems) {
    const box = document.createElement("div"); box.className = "metric";
    const b = document.createElement("b"); b.textContent = item[0];
    const p = document.createElement("p"); p.textContent = item[1];
    box.append(b, p); flags.append(box);
  }
  bulletList("#resultReasons", r.reasons.map(o => o.code + " — " + o.message));
  bulletList("#resultQuestions", [...r.questions, ...r.cautions], "Further carrier evidence may still change the assessment.");
  bulletList("#evidenceList", evidenceChecklist(lastInput));

  const amount = $("#amountNote");
  amount.replaceChildren(); amount.hidden = true;
  if (r.indicativeAmountEUR !== null) {
    const button = document.createElement("button");
    button.type = "button"; button.className = "btn ghost no-print";
    button.textContent = "Show possible amount (not guaranteed)";
    state.append(button);
    button.addEventListener("click", () => {
      amount.textContent = "Indicative calculation from your self-reported distance/delay: €" + r.indicativeAmountEUR + ". Airline evidence, re-routing, exemptions and country rules can change or eliminate payment.";
      amount.hidden = false;
    });
  }
  $("#letterText").value = claimLetter(lastInput, r);
}
async function copyLetter() {
  const val = $("#letterText").value;
  try {
    if (!navigator.clipboard || !navigator.clipboard.writeText) throw Error("Clipboard unavailable");
    await navigator.clipboard.writeText(val);
    say("Letter copied. Add your personal details only in the official airline channel.");
  } catch {
    $("#letterText").focus();
    $("#letterText").select();
    say("Use the selected text to copy manually, or download the TXT file.");
  }
}
function download(data, filename, type = "text/plain;charset=utf-8") {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("#copyLetter").addEventListener("click", copyLetter);
$("#downloadLetter").addEventListener("click", () => download($("#letterText").value, "flightclaim-airline-letter.txt"));

function readDrafts() {
  try {
    const value = JSON.parse(localStorage.getItem(storeKey) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
function writeDrafts(drafts) {
  localStorage.setItem(storeKey, JSON.stringify(drafts));
}
function saveDraft() {
  if (!lastInput || !lastResult) return;
  if (!confirm("Save a LOCAL-ONLY copy to this browser profile? It is NOT sent to an airline, our team or any cloud service. Anyone using this device profile may view it. Do not include sensitive identifiers.")) return;
  if (!crypto || !crypto.randomUUID) { say("Your browser does not support secure local case references. No data saved."); return; }
  const ref = "FC-LOCAL-" + crypto.randomUUID().slice(0, 12).toUpperCase();
  const now = new Date().toISOString();
  const record = { ref, createdAt: now, updatedAt: now, answers: lastInput, category: lastResult.category, status: "DRAFT", note: "" };
  try {
    const all = readDrafts(); all.unshift(record); writeDrafts(all);
    say("Saved in THIS browser only: " + ref + " — not submitted or reviewed.");
  } catch {
    say("Local browser storage is unavailable. No draft was saved.");
  }
}
$("#saveDraft").addEventListener("click", saveDraft);

function renderDrafts() {
  const root = $("#draftList"); root.replaceChildren();
  const entries = readDrafts();
  if (!entries.length) {
    const empty = document.createElement("div"); empty.className = "card";
    empty.textContent = "No saved drafts on this browser. Run the free checker and actively choose 'Save local draft' to store one.";
    root.append(empty); $("#eraseAll").hidden = true; return;
  }
  $("#eraseAll").hidden = false;
  for (const draft of entries) {
    const article = document.createElement("article"); article.className = "card draft";
    const top = document.createElement("div"); top.className = "draft-top";
    const heading = document.createElement("h3"); heading.textContent = draft.ref;
    const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = "LOCAL ONLY • NOT FILED";
    top.append(heading, tag); article.append(top);
    const when = document.createElement("p"); when.className = "small";
    when.textContent = "Created " + new Date(draft.createdAt).toLocaleString() + " · " + (draft.answers?.flightNumber || "Flight unspecified") + " · " + (draft.category || "Unassessed");
    article.append(when);
    const statusLabel = document.createElement("label"); statusLabel.className = "field";
    const statusTitle = document.createElement("span"); statusTitle.textContent = "Your manually-entered status (not airline verified)";
    const sel = document.createElement("select");
    for (const state of statuses) {
      const option = document.createElement("option"); option.value = state; option.textContent = state.replaceAll("_", " ");
      sel.append(option);
    }
    sel.value = statuses.includes(draft.status) ? draft.status : "DRAFT";
    statusLabel.append(statusTitle, sel); article.append(statusLabel);
    const notesLabel = document.createElement("label"); notesLabel.className = "field";
    const notesTitle = document.createElement("span"); notesTitle.textContent = "Private local notes (no passport/booking/payment details)";
    const note = document.createElement("textarea"); note.rows = 3; note.maxLength = 600;
    note.value = draft.note || ""; notesLabel.append(notesTitle, note); article.append(notesLabel);
    const buttons = document.createElement("div"); buttons.className = "no-print";
    const addButton = (label, cls, fn) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "btn " + cls; b.textContent = label;
      b.addEventListener("click", fn); buttons.append(b);
    };
    addButton("Save my manual notes", "", () => {
      const all = readDrafts(); const target = all.find(x => x.ref === draft.ref);
      if (target) { target.status = sel.value; target.note = note.value.slice(0, 600); target.updatedAt = new Date().toISOString(); writeDrafts(all); say("Updated locally — airline status was not checked.", $("#draftNotice")); }
    });
    addButton("Open in checker", "", () => {
      applyAnswers(draft.answers); step = 4; showView("checker"); renderResult();
    });
    addButton("Export JSON", "", () => download(JSON.stringify(draft, null, 2), draft.ref + ".json", "application/json"));
    addButton("Delete", "danger", () => {
      if (!confirm("Permanently delete this browser draft? This cannot be undone unless you exported it.")) return;
      writeDrafts(readDrafts().filter(x => x.ref !== draft.ref)); renderDrafts();
      say("Deleted locally.", $("#draftNotice"));
    });
    article.append(buttons); root.append(article);
  }
}
$("#eraseAll").addEventListener("click", () => {
  if (!confirm("Permanently erase ALL local case drafts from this browser?")) return;
  try { localStorage.removeItem(storeKey); renderDrafts(); say("All local drafts erased.", $("#draftNotice")); }
  catch { say("Local storage could not be cleared.", $("#draftNotice")); }
});
$("#wizardForm").addEventListener("submit", e => e.preventDefault());
tr();
showView(location.hash.replace(/^#/, "") || "home");
// No service worker, event tracking, remote storage or third-party integrations.
