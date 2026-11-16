import { profiles, readPreference } from './decision.js?v=7';
import { catalogNames, catalogScope, searchCatalogs } from './catalogs.js?v=8';
import { renderIntent } from './results.js?v=9';
import { combinedCost, evaluateIntent, liveOffer, localQuote, providers, quoteFields, routeRequest } from './transaction.js?v=13';

import { entryContext, topics } from './demand/topics.js?v=10';
import { agentTemplate, isAgentFragment, isHeadphoneTemplate, readAgentLink, wirelessHeadphoneTopic } from './intake.js?v=1';
import { createMatchingSession } from './matching.js?v=7';
import { createFunnel, steps as funnelSteps } from './funnel.js?v=9';
import { compareHeadphones, headphoneGoal, headphoneGoals, headphoneIntent, headphoneMarkets, headphoneModels, headphoneNeeds, headphoneTopic } from './modules/headphones.js?v=14';
import { HEADPHONE_LISTINGS } from './modules/headphone-listings.js?v=12';
import { renderHeadphonePreview, renderHeadphones } from './headphone-view.js?v=14';
import { validBarcode, withoutBarcodes } from './evidence.js?v=7';

(() => {
  'use strict';

  const lifetime = 30 * 60 * 1000;
  const receiptKey = 'matchos:last_request_reference';
  const frameFindKey = 'matchos:framefind_interest_v1';
  const draftLifetime = 10 * 60 * 1000;
  const byId = (id) => document.getElementById(id);

  function takeStoredValue(key) {
    try {
      const raw = sessionStorage.getItem(key);
      sessionStorage.removeItem(key);
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  const receipt = byId('request-ref');
  if (receipt) {
    const value = takeStoredValue(receiptKey);
    const age = Date.now() - value?.at;
    if (/^MO-[A-F0-9]{20}$/.test(value?.ref) && age >= 0 && age < lifetime) {
      byId('request-code').textContent = value.ref;
      receipt.hidden = false;
    }
    return;
  }

  const form = byId('demand');
  const feedbackForm = byId('feedback-form');
  feedbackForm.action = form.action;
  const quoteForm = byId('quote-form');
  const input = byId('message');
  const feedback = byId('feedback');
  const messages = byId('messages');
  const scroll = byId('scroll');
  const website = 'https://github.com/yl124915300-dot/yl124915300-dot.github.io/issues/new';
  const agentFragment = isAgentFragment(location.hash);
  let agentLanding = agentFragment ? readAgentLink(location.hash) : null;
  const directEntry = { source: 'direct', topic: null };
  const originalEntry = agentFragment ? directEntry : entryContext(location.hash, location.search);
  let context = originalEntry;
  const acquisition = context.source;
  const headphoneEntry = context.topic === headphoneTopic || isHeadphoneTemplate(agentLanding?.topic);
  const hpSetup = byId('hp-setup');
  const hpControls = byId('hp-controls');
  const supportedCurrencies = 'USD GBP CAD AUD EUR JPY CNY HKD SGD INR NZD KRW TWD CHF AED UZS MXN BRL ZAR SEK NOK DKK PLN THB PHP MYR IDR VND SAR TRY'.split(' ');
  const initialWelcome = byId('welcome-title').innerHTML;
  const initialWelcomeCopy = byId('welcome-copy').textContent;
  const qa = navigator.webdriver || location.hostname !== 'yl124915300-dot.github.io' ||
    new URLSearchParams(location.search).has('qa');
  if (agentFragment) history.replaceState(history.state, '', location.pathname);

  const fields = [
    ['item', 'Item / service', 'What products or services should we look for? Include a product type, model or service name.'],
    ['budget', 'Maximum budget', 'What is the most you want to spend? Include the currency, for example “USD 800”.'],
    ['place', 'Market', 'Which city and country or region should we look in? For example, “Austin, United States”.'],
    ['when', 'Timing', 'When do you need it? For example, “by Friday”, “within a week” or “just comparing”.'],
    ['details', 'Must-haves', 'Any other must-haves, such as condition, size or pickup? For a grocery price history, you can add a public barcode. Choose “No preference” to skip.'],
  ];
  const currencies = 'USD|UZS|AED|JPY|CNY|EUR|GBP|CAD|AUD|SGD|HKD|INR|KRW|CHF|TWD|NZD|MXN';
  const symbolCurrency = { '$': 'USD', 'US$': 'USD', '€': 'EUR', '£': 'GBP', '元': 'CNY', '人民币': 'CNY' };
  const amountPattern = '(?:[0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)(?:\\.[0-9]{1,2})?';
  const money = new RegExp(
    '(?:(?:\\b(?:budget(?:\\s+of)?|under|up to|for|at most|max(?:imum)?)\\b|预算|不超过|最多)\\s*[:：]?\\s*)?' +
    '(?:(' + currencies + '|US\\$|[$€£]|人民币)\\s*(' + amountPattern + ')(?:\\s*元)?|(' +
    amountPattern + ')\\s*(' + currencies + '\\b|元|人民币))(?![0-9.])', 'iu'
  );
  const marketNames = {
    'united states': 'US', usa: 'US', us: 'US', 'u.s.': 'US', '美国': 'US',
    'united arab emirates': 'AE', uae: 'AE', ae: 'AE', '阿联酋': 'AE',
    uzbekistan: 'UZ', uz: 'UZ', '乌兹别克斯坦': 'UZ',
    japan: 'JP', jp: 'JP', '日本': 'JP',
    china: 'CN', cn: 'CN', '中国': 'CN',
    'united kingdom': 'GB', uk: 'GB', gb: 'GB', '英国': 'GB',
    canada: 'CA', australia: 'AU', singapore: 'SG', germany: 'DE', france: 'FR',
    india: 'IN', 'hong kong': 'HK', 'south korea': 'KR', 'new zealand': 'NZ',
  };
  const appointmentTime = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})(?![\d:])/iu;
  const timePattern = /\b(?:by\s+|on\s+|within\s+|in\s+)?(?:today|tomorrow|tonight|asap|(?:this|next)\s+(?:week(?:end)?|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|monday|tuesday|wednesday|thursday|friday|saturday|sunday|(?:\d{1,3}|a|one|two|three|four|five|six|seven)\s+(?:business\s+)?(?:hours?|days?|weeks?|months?)|[0-9]{4}-[0-9]{2}-[0-9]{2}|just comparing|recurring)\b|(?:在)?(?:今天|明天|今晚|本周|下周|尽快|先比较|[0-9一二三四五六七八九十]+(?:天|周|个月)内)(?:前|送到|到货)?/iu;
  const sensitive = /@|https?:\/\/|www\.|(?:\+?[0-9][\s().-]*){10,}|\b\d{3}-\d{2}-\d{4}\b|\b\d{1,6}\s+[\p{L}][\p{L}\s.]{1,32}\s+(?:street|st\.?|road|rd\.?|avenue|ave\.?|lane|ln\.?|drive|dr\.?|boulevard|blvd\.?)\b|(?:路|街|巷)\s*[0-9]+号/iu;
  const clean = (value) => value.trim().replace(/^[\s,;:，。；：]+|[\s,;:，。；：!?！？]+$/gu, '').trim();
  let session = null;
  let liveSequence = 0;
  let timer;
  let freshnessTimer;
  let draft;
  let draftTimer;
  let closing = false;
  let leaving = false;

  function readBudget(value) {
    const match = money.exec(value);
    if (!match) return null;
    if (/(?:[0-9][.,]?|[−-])$/u.test(value.slice(0, match.index))) return null;
    const amount = Number((match[2] || match[3]).replace(/,/g, ''));
    if (amount < 1 || amount > 1000000) return null;
    const code = (match[1] || match[4]).toUpperCase();
    return { amount, currency: symbolCurrency[code] || code, match };
  }

  function readPlace(value) {
    const parts = clean(value.replace(/^(?:(?:in|near)\s+|(?:在|地点[：:]?))/iu, '')).split(/\s*[,，/]\s*/u);
    const region = parts.pop().replace(/[.。]+$/u, '').trim();
    const city = parts.join(', ');
    if (city.length < 2 || city.length > 60 || region.length < 2 || region.length > 60 ||
        !/^[\p{L}\p{M} .'-]+$/u.test(region) || !/\p{L}/u.test(city) ||
        !/^[\p{L}\p{M}0-9 .,'’()-]+$/u.test(city)) return null;
    const code = Object.hasOwn(marketNames, region.toLowerCase()) ? marketNames[region.toLowerCase()] : 'Other';
    return { city, region, code };
  }

  function readTime(value) {
    const text = clean(value);
    return text.length <= 70 && /\p{L}|[0-9]/u.test(text) && timePattern.test(text) ? text : null;
  }

  function readItem(value) {
    const text = clean(value.replace(/^(?:(?:please\s+)?(?:can you\s+|could you\s+)?(?:help me\s+)?(?:find(?: me)?|i(?:'m| am) looking for|i(?:'d like| want| need)(?:\s+to\s+buy)?|buy|purchase|looking for)\s+(?:(?:an?|some|one)\s+)?|(?:帮我找(?:一[台个件双张本])?|我想买(?:一[台个件双张本])?|我想找|想买|想找|需要))/iu, ''));
    if (text.length < 2 || text.length > 120 || !/[\p{L}\p{N}]/u.test(text) ||
        /^(?:hi|hello|hey|help|shopping|buy|find|something|anything|你好|买东西)[.!?。！？]*$/iu.test(text)) return null;
    return text;
  }

  function parseOpening(value) {
    let remainder = value.replace(/[.!?。！？]+$/u, '');
    const brief = {};
    const budget = readBudget(remainder);
    if (budget) {
      brief.budget = { amount: budget.amount, currency: budget.currency };
      remainder = remainder.replace(budget.match[0], ' ');
    }

    const time = appointmentTime.exec(remainder) || timePattern.exec(remainder);
    if (time && !/^(?:\d+|one|two|three|four)\s+hours?$/iu.test(time[0])) {
      brief.when = clean(time[0]);
      remainder = remainder.replace(time[0], ' ');
    }

    const placeMatch = /(?:\b(?:ship(?:ping)? to|deliver(?:ed|y)? to|in|near)\s+|(?:地点\s*[:：]?|送到|配送到|在)\s*)([^;；\n]+)$/iu.exec(remainder);
    if (placeMatch) {
      const place = readPlace(placeMatch[1]);
      if (place) {
        brief.place = place;
        remainder = remainder.slice(0, placeMatch.index);
      }
    }

    const itemText = clean(remainder).replace(/\s+available\s*$/iu, '');
    const item = readItem(itemText.replace(/\s+(?:delivered|shipped)\s*$/iu, ' with delivery'));
    if (item) brief.item = item;
    return brief;
  }

  function appendMessage(kind, text) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble ' + kind;
    const label = document.createElement('span');
    label.className = 'sr-only';
    label.textContent = kind === 'buyer' ? 'You: ' : 'MATCH OS: ';
    bubble.append(label, document.createTextNode(text));
    messages.append(bubble);
  }

  function setFeedback(text) {
    feedback.textContent = text;
  }

  function clearDraft() {
    clearTimeout(draftTimer);
    draft = null;
    hpSetup.reset();
    hpSetup.hidden = true;
    byId('hp-market-coverage').hidden = true;
    byId('hp-preview').replaceChildren();
    byId('hp-preview').hidden = true;
    byId('hp-preview-note').hidden = true;
    byId('example').textContent = 'Try an example';
    byId('welcome').classList.remove('hp-welcome');
    byId('welcome-title').innerHTML = initialWelcome;
    byId('welcome-copy').textContent = initialWelcomeCopy;
    byId('entry-preview').hidden = true;
    byId('entry-preview').textContent = '';
    byId('entry-preview').classList.remove('sr-only');
    byId('start-chat').textContent = 'Start purchase chat';
  }

  function resetPublicSharing() {
    byId('public-option').open = false;
    byId('public-consent').checked = false;
    byId('github').disabled = true;
  }

  function finish(reason, focus = true, keepReceipt = false) {
    clearLive();
    session?.matching.dispose();
    clearFunnel();
    clearDraft();
    session = null;
    context = originalEntry;
    closing = false;
    clearInterval(timer);
    messages.replaceChildren();
    clearHeadphoneControls();
    byId('summary').replaceChildren();
    byId('payload').replaceChildren();
    byId('sharing-focus').replaceChildren();
    resetPublicSharing();
    byId('ref').textContent = '';
    byId('expiry').textContent = '';
    byId('expiry-label').textContent = '';
    byId('request-submit').disabled = true;
    form.reset();
    byId('chat-form').reset();
    setFeedback('');
    if (!keepReceipt) takeStoredValue(receiptKey);
    for (const id of ['google-search', 'ebay-search']) byId(id).href = id === 'google-search'
      ? 'https://www.google.com/' : 'https://www.ebay.com/';
    for (const id of ['reference', 'review', 'sharing', 'quick-actions', 'close', 'close-confirm']) {
      byId(id).hidden = true;
    }
    byId('stage-compare').removeAttribute('aria-current');
    byId('stage-build').setAttribute('aria-current', 'step');
    byId('route-preview').replaceChildren();
    byId('topic-evidence').replaceChildren();
    byId('topic-evidence').hidden = true;
    resetQuoteEntry();
    byId('rank-profile').value = 'balanced';
    byId('catalog-consent').textContent = '';
    byId('welcome').hidden = Boolean(reason);
    byId('ended').hidden = !reason;
    byId('chat-form').hidden = Boolean(reason);
    input.placeholder = 'Describe what you want to buy…';
    byId('end-title').textContent = reason || '';
    byId('end-copy').textContent = reason ? 'The chat was cleared from this tab. Anything shared externally is handled by its recipient.' : '';
    scroll.scrollTop = 0;
    if (focus) (reason ? byId('end-title') : input).focus();
  }

  function remaining() {
    if (!session) return false;
    const left = Math.ceil((session.expires - Date.now()) / 1000);
    if (left <= 0) {
      finish('Session expired');
      return false;
    }
    byId('expiry').textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') + ' left';
    return true;
  }

  function start(brief, source, landing) {
    clearDraft();
    context = landing ? { source: 'agent_link', topic: landing.topic } : originalEntry;
    takeStoredValue(receiptKey);
    const entropy = crypto.getRandomValues(new Uint8Array(10));
    const ref = 'MO-' + Array.from(entropy, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
    const expires = Date.now() + lifetime;
    session = { ref, expires, brief, source, field: null, submitting: false, quotes: new Map(), nextQuote: 0,
      matching: createMatchingSession(), approved: new Set(), autoRenewed: new Set(), funnel: createFunnel(context, qa) };
    byId('welcome').hidden = true;
    byId('reference').hidden = false;
    byId('close').hidden = false;
    byId('ref').textContent = ref;
    const expiryLabel = 'Local session expires at ' + new Date(expires).toLocaleTimeString([], {
      hour: 'numeric', minute: '2-digit'
    });
    byId('expiry').title = expiryLabel;
    byId('expiry-label').textContent = expiryLabel;
    timer = setInterval(remaining, 1000);
    remaining();
  }

  function prepareOtherSources(brief) {
    // These are user-clicked searches only; no product price or seller availability is asserted.
    const item = String(brief.item || '').slice(0, 120);
    const market = String(brief.place?.city || '').slice(0, 60) + ' ' +
      String(brief.place?.region || '').slice(0, 60);
    const google = new URL('https://www.google.com/search');
    google.searchParams.set('q', (item + ' ' + market).trim().slice(0, 200));
    const ebay = new URL('https://www.ebay.com/sch/i.html');
    ebay.searchParams.set('_nkw', item);
    for (const [id, url] of [['google-search', google.href], ['ebay-search', ebay.href]]) {
      const link = byId(id);
      link.href = !sensitive.test(item) && !sensitive.test(market) ?
        url : (id === 'google-search' ? 'https://www.google.com/' : 'https://www.ebay.com/');
    }
  }

  function renderTopicEvidence() {
    const panel = byId('topic-evidence');
    panel.replaceChildren();
    panel.hidden = true;
    const topic = topics[context.topic];
    if (session.intents.some(headphoneIntent)) return;
    if (!topic || session.brief.item !== topic.item || !session.intents.some(intent => intent.category === topic.category)) return;
    const action = document.createElement('p');
    action.textContent = topic.next;
    const links = document.createElement('ul');
    for (const [text, url] of topic.sources) {
      const link = document.createElement('a');
      link.textContent = text;
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const item = document.createElement('li');
      item.append(link);
      links.append(item);
    }
    panel.append(action, links);
    panel.hidden = false;
  }

  function clearHeadphoneControls() {
    hpControls.reset();
    byId('hp-tools').hidden = true;
    byId('hp-manual-help').hidden = true;
    byId('hp-clear-quote').hidden = true;
    byId('hp-changes').textContent = '';
    byId('hp-market').querySelector('[value=Other]').textContent = 'Another market';
    byId('review').classList.remove('hp-review');
    byId('review-title').textContent = 'Review your request';
  }

  function prepareHeadphoneControls() {
    const intent = session.intents.find(headphoneIntent);
    if (!intent) { clearHeadphoneControls(); return; }
    const { brief } = intent;
    const market = Object.hasOwn(headphoneMarkets, brief.place.code) ? brief.place.code : 'Other';
    byId('hp-market').value = market;
    if (market === 'Other') byId('hp-market').selectedOptions[0].textContent =
      brief.place.code === 'Other' && brief.place.region === 'Other' ? 'Another market' : brief.place.region + ' · other market';
    byId('hp-budget').value = brief.budget.amount;
    const currency = byId('hp-currency');
    if (![...currency.options].some(option => option.value === brief.budget.currency)) currency.add(new Option(brief.budget.currency, brief.budget.currency));
    currency.value = brief.budget.currency;
    byId('hp-deadline').value = /^\d{4}-\d{2}-\d{2}$/u.test(brief.when) ? brief.when : '';
    for (const box of hpControls.querySelectorAll('input[type=checkbox]')) box.checked = intent.requirements.hard[box.value] === true;
    byId('hp-tools').hidden = false;
    byId('hp-manual-help').hidden = false;
    byId('hp-clear-quote').hidden = false;
    byId('review-title').textContent = 'Find your wired headphones';
    byId('review').classList.add('hp-review');
    byId('stage-build').removeAttribute('aria-current');
    byId('stage-compare').setAttribute('aria-current', 'step');
  }

  function updateSummary() {
    const { brief } = session;
    const values = [
      brief.item,
      brief.budget.currency + ' ' + brief.budget.amount,
      [brief.place.city, brief.place.region].filter(Boolean).join(', '),
      brief.when,
      brief.details || 'No preference'
    ];
    byId('summary').replaceChildren(...fields.map(([key, label], index) => {
      const row = document.createElement('div');
      const name = document.createElement('dt');
      const value = document.createElement('dd');
      const edit = document.createElement('button');
      name.textContent = label;
      value.textContent = values[index];
      edit.type = 'button';
      edit.className = 'quiet edit';
      edit.textContent = 'Edit';
      edit.setAttribute('aria-label', 'Edit ' + label.toLowerCase());
      edit.addEventListener('click', () => {
        if (!remaining() || closing || session.submitting) return;
        clearLive();
        resetFeedbackExport();
        if (key === 'item' || key === 'place') {
          session.quotes.clear();
          session.headphoneQuoteBooks?.clear();
          session.headphoneSelected = null;
        }
        resetQuoteEntry();
        form.reset();
        resetPublicSharing();
        byId('payload').replaceChildren();
        byId('request-submit').disabled = true;
        byId('sharing').hidden = true;
        byId('review').hidden = true;
        byId('stage-compare').removeAttribute('aria-current');
        byId('stage-build').setAttribute('aria-current', 'step');
        ask(key);
        input.focus();
      });
      row.append(name, value, edit);
      return row;
    }));
  }

  function summarize() {
    byId('chat-form').hidden = true;
    byId('review').hidden = false;
    const { brief } = session;
    prepareOtherSources(brief);
    session.intents = routeRequest(brief);
    renderTopicEvidence();
    prepareQuoteEntry();
    if (session.intents.some(intent => !intent.module) && session.clarifiedItem !== brief.item) {
      session.clarifiedItem = brief.item;
      appendMessage('assistant', 'What kind of product or service is the unclear item? Use Edit item / service to add a category or model.');
    }
    const currentScopes = new Set(catalogScopes());
    session.approved = new Set([...session.approved].filter(scope => currentScopes.has(scope)));
    session.funnel.mark('complete');
    if (session.approved.size) session.funnel.mark('authorized');
    renderFunnel();
    updateSearchConsent();
    prepareHeadphoneControls();
    showComparison();
    if (session.approved.size) void searchLiveOffers('edit');
    scheduleFreshness();
    updateSummary();
    byId('review-title').focus();
  }

  function ask(key) {
    session.field = key || fields.find(([field]) => !Object.hasOwn(session.brief, field))?.[0];
    byId('quick-actions').hidden = session.field !== 'details';
    if (!session.field) {
      summarize();
      return;
    }
    byId('chat-form').hidden = false;
    input.placeholder = 'Type your reply…';
    const question = session.field === 'details' && /\bheadphones?\b/i.test(session.brief.item) ?
      'Which input do you need, 3.5 mm or USB-C? Should active noise cancellation work while wired? Add any must-haves for delivery or returns.' :
      fields.find(([field]) => field === session.field)[2];
    appendMessage('assistant', question);
    scroll.scrollTop = scroll.scrollHeight;
  }

  function readReply(field, value) {
    if (field === 'item') return readItem(value);
    if (field === 'place') return readPlace(value);
    if (field === 'when') return readTime(value);
    if (field === 'budget') {
      const parsed = readBudget(value);
      return parsed && { amount: parsed.amount, currency: parsed.currency };
    }
    return /^(?:no(?: preference| constraints)?|none|skip|无|没有|不限)[.。]?$/iu.test(value) ? '' : clean(value);
  }

  function send(value) {
    setFeedback('');
    if (closing || (session && (!remaining() || (!session.field && !session.refining)))) return;
    if (!value) {
      setFeedback('Enter a purchase request or reply first.');
      return;
    }
    if (sensitive.test(!session || ['item', 'details'].includes(session.field) ? withoutBarcodes(value) : value)) {
      input.value = '';
      setFeedback('That looks like contact information, a link or account details. Try again using only purchase details.');
      return;
    }
    input.value = '';

    if (!session) {
      start(parseOpening(value), 'other');
      appendMessage('buyer', value);
      ask();
      return;
    }

    if (session.refining) {
      const preference = readPreference(value);
      if (!preference) {
        setFeedback('Choose price, exact match, evidence, review quality, speed, returns or balanced.');
        return;
      }
      session.refining = false;
      byId('chat-form').hidden = true;
      appendMessage('buyer', value);
      appendMessage('assistant', 'Comparison updated: ' + profiles[preference].label + '.');
      byId('rank-profile').value = preference;
      showComparison();
      byId('rank-profile').focus();
      return;
    }

    const reply = readReply(session.field, value);
    if (reply === null) {
      setFeedback(fields.find(([field]) => field === session.field)[2]);
      return;
    }
    setFeedback('');
    appendMessage('buyer', value);
    const field = session.field;
    if (['item', 'place'].includes(field) && Object.hasOwn(session.brief, field) &&
        JSON.stringify(session.brief[field]) !== JSON.stringify(reply)) {
      session.funnel = createFunnel(context, qa);
      clearFunnel();
    }
    session.brief[field] = reply;
    if (field === 'details') byId('rank-profile').value = readPreference(reply) || 'balanced';
    ask();
  }

  function requestFields() {
    const { brief, ref, source } = session;
    return {
      source,
      acquisition_source: acquisition,
      ...(context.topic ? { acquisition_topic: context.topic } : {}),
      region: brief.place.code,
      market_country: brief.place.region,
      city: brief.place.city,
      when: brief.when,
      item: brief.item,
      budget: brief.budget.amount,
      currency: brief.budget.currency,
      details: brief.details,
      transaction_reference: ref,
    };
  }

  function clearLive() {
    clearTimeout(freshnessTimer);
    liveSequence += 1;
    session?.liveController?.abort();
    if (session) {
      session.liveController = null;
      session.catalogResults = null;
      if (session.refining) byId('chat-form').hidden = true;
      session.refining = false;
    }
    byId('live-results').replaceChildren();
    byId('ranking-tools').hidden = true;
    byId('live-status').textContent = 'No external search has run.';
    byId('live-search').disabled = false;
    byId('revoke-search').hidden = true;
  }

  function resetQuoteEntry() {
    quoteForm.reset();
    byId('quote-target').replaceChildren();
    byId('quote-fields').replaceChildren();
    byId('quote-entry').open = false;
    byId('quote-entry').hidden = true;
    byId('quote-feedback').textContent = '';
  }

  function prepareQuoteEntry() {
    const applicable = session.intents.filter(intent => intent.module && intent.category !== 'games');
    resetQuoteEntry();
    const select = byId('quote-target');
    for (const intent of applicable) {
      select.add(new Option(intent.item, intent.id));
    }
    byId('quote-entry').hidden = !applicable.length;
    if (applicable.length) prepareQuoteFields();
  }

  function prepareQuoteFields() {
    const intent = session.intents.find(item => item.id === byId('quote-target').value);
    const labels = [...quoteFields, ...intent.module.schema].map(([name, label, placeholder]) => {
      const field = document.createElement('input');
      field.name = name;
      field.maxLength = name === 'url' ? 450 : 160;
      field.placeholder = placeholder || '';
      const wrapper = document.createElement('label');
      wrapper.append(label, field);
      return wrapper;
    });
    byId('quote-fields').replaceChildren(...labels);
    byId('quote-feedback').textContent = '';
  }

  function saveQuote(event) {
    event.preventDefault();
    if (!remaining() || closing || session.field || session.submitting) return;
    const intent = session.intents.find(item => item.id === byId('quote-target').value);
    if (!intent) return;
    const raw = Object.fromEntries(new FormData(quoteForm));
    const feedback = byId('quote-feedback');
    if (Object.entries(raw).some(([name, value]) => name !== 'url' &&
      !(name === 'merchantSku' && validBarcode(value.trim())) && sensitive.test(value))) {
      feedback.textContent = 'Use public listing details without contact information.';
      return;
    }
    try {
      const quote = localQuote(intent, raw, session.nextQuote++);
      const current = session.quotes.get(intent.id) || [];
      const facts = row => JSON.stringify([row.sourceUrl, row.merchant, row.title, row.price?.currency,
        row.provenance.identity?.identifier, row.attrs]);
      const previous = current.findIndex(row => facts(row) === facts(quote));
      if (current.length >= 12 && previous < 0) {
        feedback.textContent = 'This item has 12 quotes. Edit the item or start another comparison to clear them.';
        return;
      }
      const updated = [...current];
      if (previous < 0) updated.push(quote);
      else updated[previous] = quote;
      session.quotes.set(intent.id, updated);
      if (!headphoneIntent(intent)) prepareQuoteFields();
      feedback.textContent = previous < 0 ? 'Quote added to this tab’s comparison.' : 'Existing quote updated with the new observation.';
      showComparison('Listing evidence updated.');
      scheduleFreshness();
    } catch (error) {
      feedback.textContent = error.message;
    }
  }

  function catalogScopes(intents = session.intents) {
    return intents.flatMap(intent => intent.providers.map(provider => catalogScope(provider, intent, session.brief)));
  }

  function resetFeedbackExport() {
    byId('feedback-export').hidden = true;
    byId('feedback-text').value = '';
    byId('feedback-payload').value = '';
    byId('feedback-sent').textContent = '';
  }

  function clearFunnel() {
    resetFeedbackExport();
    byId('funnel').open = false;
    byId('funnel-steps').replaceChildren();
    byId('outcome').value = '';
    for (const option of Array.from(byId('outcome').options).slice(1, 4)) option.disabled = true;
  }

  function renderFunnel() {
    const { funnel } = session;
    byId('funnel-steps').replaceChildren(...Object.entries(funnelSteps).map(([step, label]) => {
      const item = document.createElement('li');
      item.dataset.step = step;
      item.textContent = label + ' — ' + (['merchant', 'fee'].includes(step) ? 'unavailable' : funnel.has(step) ? 'recorded' : 'not recorded');
      return item;
    }));
    for (const option of Array.from(byId('outcome').options).slice(1, 4)) option.disabled = !funnel.has('outbound');
  }

  function updateSearchConsent() {
    const { intents, brief } = session;
    const preview = byId('route-preview');
    preview.replaceChildren();
    const requests = [];
    for (const intent of intents) {
      const line = document.createElement('p');
      const heading = (intent.module?.label || 'Category unclear') + ' · ' + intent.item;
      const limitations = Object.entries(providers).filter(([id, provider]) =>
        provider.mode && provider.module === intent.category && !intent.providers.includes(id)).map(([, provider]) => provider)
        .map(provider => provider.label + ' (' + provider.capability + ')');
      const coverage = intent.providers.length ? intent.providers.map(provider => catalogNames[provider] +
        (provider === 'openprices' ? ' (dated observations only)' : '')).join(' and ') :
        intent.module ? 'No eligible live source for this item' : 'Edit the item and give its category or service type.';
      line.textContent = heading + ' — ' + coverage + (limitations.length ? '. ' + limitations.join(' · ') : '') +
        (intent.dependency ? '. ' + intent.dependency : '') + (intent.requiresDelivery ? '. Delivery required.' : '');
      preview.append(line);
      if (intent.providers.includes('openprices')) {
        requests.push('Open Prices receives ' + (intent.barcode ? 'only public barcode ' + intent.barcode :
          'the product name “' + intent.title + '”; returned product barcodes may be used to look up dated observations') +
          '. Country filtering happens in this tab.');
      }
      if (intent.providers.includes('cheapshark')) {
        requests.push(intent.browseFreeGames ? 'CheapShark receives a general free PC game query.' :
          'CheapShark receives this title: “' + intent.title + '”.');
        requests.push('GamerPower receives a general giveaway query.');
      }
      if (intent.providers.includes('livingsocial')) {
        requests.push('LivingSocial / Groupon receives “' + intent.title + '” and “' + brief.place.city + ', ' +
          brief.place.region + '”.');
      }
    }
    byId('live-search').hidden = !requests.length;
    const pending = catalogScopes().some(scope => !session.approved.has(scope));
    byId('live-search').disabled = !requests.length || Boolean(session.liveController);
    byId('live-search').textContent = pending ? 'Authorize catalog search' : 'Refresh public sources';
    byId('revoke-search').hidden = !session.approved.size;
    byId('catalog-consent').textContent = requests.length ? requests.join(' ') +
      ' Approved queries may be reused on edits or rechecked once when a listing ages in this open tab. A changed query needs fresh approval. Budget, timing, private details and entered quotes stay in this tab.' : '';
  }

  function showComparison(change = '') {
    const output = byId('live-results');
    const preference = byId('rank-profile').value;
    const { intents, catalogResults, quotes } = session;
    output.replaceChildren();
    let candidates = 0;
    let merchantCandidates = 0;
    const comparisons = [];
    let headphones = false;
    for (const intent of intents) {
      const results = catalogResults?.get(intent.id) || [];
      if (intent.providers.length && !catalogResults && !quotes.has(intent.id)) continue;
      const offers = results.flatMap(result => result.offers.map(offer => liveOffer(intent, offer)));
      const available = [...offers, ...(quotes.get(intent.id) || [])];
      if (headphoneIntent(intent)) {
        headphones = true;
        const comparison = compareHeadphones(intent, available, preference);
        const leading = comparison.models[0];
        const selected = session.headphoneSelected || leading.model.id;
        renderHeadphones(output, comparison, selected, intent.brief.place.region, intent.brief.budget.currency);
        const eligible = comparison.rows.filter(row => !row.problems.length && !row.stale && row.offer.snapshotAvailable !== false);
        candidates += eligible.length;
        merchantCandidates += eligible.length;
        const priced = eligible.filter(row => row.offer.price && row.offer.price.currency === intent.brief.budget.currency &&
          row.provenance.identity?.verified && row.offer.attrs.condition === 'new').length;
        const summary = (change ? change + ' ' : '') +
          priced + (priced === 1 ? ' matching-SKU listing' : ' matching-SKU listings') + ' with a listed price within budget. ' +
          (!leading.conflicts.length && !leading.unknown.length
            ? (leading.best ? leading.model.name + ' leads on the available evidence. ' : 'No priced lead can be ranked in this market. ')
            : 'No model clears all checked requirements. ') +
          'Confirm stock and final total with the seller.';
        if (byId('hp-changes').textContent !== summary) byId('hp-changes').textContent = summary;
        continue;
      }
      const comparison = evaluateIntent(intent, available, preference);
      comparisons.push(comparison);
      const options = comparison.rows.filter(row => !row.problems.length);
      candidates += options.length;
      merchantCandidates += options.filter(row => row.provenance.tier !== 'observation').length;
      renderIntent(output, intent, comparison, preference);
    }
    if (intents.length > 1 && comparisons.length === intents.length) {
      const combined = combinedCost(comparisons, session.brief.budget);
      const summary = document.createElement('p');
      summary.className = 'muted';
      summary.textContent = combined.status === 'unknown' ? 'Combined budget fit is unverified. Each item needs an eligible final total in the budget currency.' :
        'Sum of the lowest confirmed totals when purchased separately · ' + combined.currency + ' ' + combined.sum +
        (combined.status === 'pass' ? ' · within the shared budget.' : ' · above the shared budget.');
      output.prepend(summary);
    }
    if (merchantCandidates) {
      session.funnel.mark('candidates');
      renderFunnel();
    }
    const coverage = catalogResults && [...catalogResults].flatMap(([id, results]) => results.map(result => {
      const status = result.status === 'ok' ? result.offers.length +
        (result.provider === 'openprices' ? ' dated observations in this country' : ' listings') : result.status;
      const readAt = result.checkedAt ? ' · read ' + new Date(result.checkedAt).toLocaleTimeString() : '';
      return intents.find(item => item.id === id).item + ' · ' + catalogNames[result.provider] + ' ' + status + readAt;
    }));
    const status = byId('live-status');
    if (headphones) status.textContent = navigator.onLine ?
      'Manufacturer references and dated store evidence. No live merchant lookup.' :
      'Offline. Saved evidence and filters still work. Reconnect to open stores.';
    else if (coverage?.length) status.textContent = coverage.join(' · ') + '. ' +
      (candidates ? candidates + ' candidates before the display limit.' : 'No eligible candidates. Manual comparison is available below.');
    else if (quotes.size) status.textContent = 'Comparing quotes entered in this tab.';
    else if (intents.every(intent => !intent.providers.length)) status.textContent = 'No sufficient live quotes. Manual comparison is available below.';
    else status.textContent = 'No external search has run.';
    byId('ranking-tools').hidden = !headphones && candidates === 0;
  }

  function scheduleFreshness() {
    clearTimeout(freshnessTimer);
    if (!session || document.hidden || closing || byId('review').hidden) return;
    const now = Date.now();
    const boundary = [...(session.catalogResults?.values() || [])].flat().flatMap(result =>
      result.offers.flatMap(offer => [offer.provenance?.cacheValidUntil,
        Date.parse(offer.provenance?.priceValidUntil), Date.parse(offer.expires)]))
      .filter(time => Number.isFinite(time) && time > now);
    if (session.intents?.some(headphoneIntent)) {
      boundary.push(...HEADPHONE_LISTINGS.map(row => Date.parse(row.validUntil)).filter(time => time > now));
    }
    if (session.quotes.size) boundary.push(now - now % 86_400_000 + 86_400_000);
    if (boundary.length) freshnessTimer = setTimeout(recheckFreshness, Math.min(...boundary) - now + 5);
  }

  function recheckFreshness() {
    if (!remaining() || closing || document.hidden || byId('review').hidden) return;
    const now = Date.now();
    showComparison();
    scheduleFreshness();
    if (!navigator.onLine || session.liveController) return;
    const expired = new Set([...(session.catalogResults?.values() || [])].flat()
      .filter(result => Number.isFinite(result.refreshAt) && result.refreshAt <= now &&
        session.approved.has(result.scope) && !session.autoRenewed.has(result.scope)).map(result => result.scope));
    if (expired.size) {
      for (const scope of expired) session.autoRenewed.add(scope);
      void searchLiveOffers('expiry', expired);
    }
  }

  async function searchLiveOffers(trigger, forced = new Set()) {
    if (!remaining() || closing || session.submitting || byId('review').hidden || session.field) return;
    const { intents, brief, ref } = session;
    if (!intents.some(intent => intent.providers.length) || session.liveController) return;
    const status = byId('live-status');
    if (!navigator.onLine) {
      showComparison();
      status.textContent = 'Offline. Reconnect to search public catalogs. Prior observations keep their original time.';
      return;
    }
    const scopes = catalogScopes();
    const publicText = intents.flatMap(intent => [
      ...(intent.providers.includes('cheapshark') && !intent.browseFreeGames ? [intent.title] : []),
      ...(intent.providers.includes('openprices') && !intent.barcode ? [intent.title] : []),
      ...(intent.providers.includes('livingsocial') ? [intent.title, brief.place.city, brief.place.region] : []),
    ]);
    if (publicText.some(value => sensitive.test(value))) {
      status.textContent = 'Edit the request to remove private or invalid text before searching.';
      return;
    }
    if (trigger === 'manual') {
      const missing = scopes.filter(scope => !session.approved.has(scope));
      if (missing.length) {
        for (const scope of missing) session.approved.add(scope);
        session.funnel.mark('authorized');
        renderFunnel();
      } else {
        forced = new Set(scopes);
      }
    }
    if (!session.approved.size) return;
    const controller = new AbortController();
    session.liveController = controller;
    const seq = ++liveSequence;
    updateSearchConsent();
    if (trigger !== 'edit' || !session.catalogResults) status.textContent = 'Searching the authorized catalogs…';
    try {
      const results = await Promise.all(intents.filter(intent => intent.providers.length).map(async intent =>
        [intent.id, await searchCatalogs(intent, brief, controller.signal, session.matching, session.approved, forced)]));
      if (seq !== liveSequence || session?.ref !== ref || !remaining()) return;
      session.catalogResults = new Map(results);
      showComparison();
      scheduleFreshness();
      byId('stage-build').removeAttribute('aria-current');
      byId('stage-compare').setAttribute('aria-current', 'step');
    } catch {
      if (seq === liveSequence && session?.ref === ref) {
        status.textContent = 'Comparison unavailable. Manual comparison is available below.';
      }
    } finally {
      if (seq === liveSequence && session?.ref === ref) {
        session.liveController = null;
        updateSearchConsent();
      }
    }
  }

  function showSharing(focusModel) {
    if (!remaining() || closing || session.field) return;
    byId('stage-build').removeAttribute('aria-current');
    byId('stage-compare').setAttribute('aria-current', 'step');
    const data = requestFields();
    const focus = focusModel ? focusModel.name + ' (' + focusModel.sku + ')' : '';
    if (focus) data.details = [data.details, 'Store comparison focus: ' + focus].filter(Boolean).join('; ');
    byId('sharing-focus').textContent = focus ? 'Manual check for ' + focus : '';
    byId('sharing-focus').hidden = !focus;
    byId('payload').replaceChildren(...Object.entries(data).map(([name, value]) => {
      const field = document.createElement('input');
      field.type = 'hidden';
      field.name = name;
      field.value = value;
      return field;
    }));
    byId('sharing').hidden = false;
    byId('request-submit').disabled = false;
    byId('sharing-title').focus();
  }

  function openPublicEditor() {
    if (!remaining() || closing || byId('sharing').hidden || session.submitting || !byId('public-consent').checked) return;
    const data = requestFields();
    data.details = byId('payload').querySelector('[name=details]').value;
    const body = [
      '## Voluntary buyer request',
      '',
      'Item / service: ' + data.item,
      'Market: ' + data.city + ', ' + data.market_country,
      'Maximum budget: ' + data.currency + ' ' + data.budget,
      'Timing: ' + data.when,
      'Must-haves: ' + (data.details || 'None'),
      'Entry: ' + data.acquisition_source + (context.topic ? ' · ' + context.topic : ''),
      '',
      'Self-reported request for manual review. No purchase or merchant quote has been verified.',
    ].join('\n');
    const query = new URLSearchParams({
      title: '[MATCH OS BUYER] ' + data.item.slice(0, 75) + ' / ' + data.city.slice(0, 35), body
    });
    session.funnel.mark('handoff');
    resetFeedbackExport();
    renderFunnel();
    window.open(website + '?' + query, '_blank', 'noopener,noreferrer');
  }

  byId('chat-form').addEventListener('submit', (event) => {
    event.preventDefault();
    send(input.value.trim());
  });
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    byId('chat-form').requestSubmit();
  });
  byId('skip').addEventListener('click', () => send('No preference'));
  const marketChoices = Object.entries(headphoneMarkets).map(([code, [name]]) => [code, name]);
  for (const goal of headphoneGoals) byId('hp-start-goal').add(new Option(goal.label, goal.id));
  for (const id of ['hp-market', 'hp-start-market']) {
    const select = byId(id);
    if (id === 'hp-start-market') select.add(new Option('Choose market', ''));
    for (const [code, name] of marketChoices) select.add(new Option(name, code));
    select.add(new Option('Another market', 'Other'));
  }
  for (const id of ['hp-currency', 'hp-start-currency']) {
    for (const currency of supportedCurrencies) byId(id).add(new Option(currency, currency));
  }
  function updateCurrency(market, currency) {
    if (Object.hasOwn(headphoneMarkets, market)) currency.value = headphoneMarkets[market][1];
  }
  function marketPlace(market) {
    return { code: market, city: '', region: headphoneMarkets[market]?.[0] || 'Other' };
  }
  function updateStartCoverage() {
    if (!headphoneEntry) return;
    const market = byId('hp-start-market').value;
    const description = market === 'US'
      ? 'US: dated public retailer observations may be available; local stock, shipping, tax and final total still need checking.'
      : market
        ? 'No verified local retailer prices for this market yet. Manufacturer feature checks are available; add your own seller link for comparison.'
        : 'Choose your shopping market. We do not assume US prices apply worldwide.';
    byId('hp-market-coverage').textContent = description;
    byId('hp-market-coverage').hidden = false;
  }
  byId('hp-start-market').addEventListener('change', event => {
    updateCurrency(event.target.value, byId('hp-start-currency'));
    updateStartCoverage();
  });
  byId('hp-start-goal').addEventListener('change', event => {
    if (!headphoneEntry || session) return;
    const goal = headphoneGoal(event.target.value);
    renderHeadphonePreview(byId('hp-preview'), goal.id);
    byId('welcome-copy').textContent = goal.copy;
  });
  hpSetup.addEventListener('submit', event => {
    event.preventDefault();
    byId('start-chat').click();
  });
  hpControls.addEventListener('submit', event => event.preventDefault());
  function applyHeadphoneEdit(event) {
    if (!remaining() || closing || session.submitting || session.field || !session.intents.some(headphoneIntent)) return;
    const budget = byId('hp-budget');
    if (!budget.reportValidity()) return;
    const market = byId('hp-market').value;
    const currency = byId('hp-currency');
    const old = session.brief.place;
    const oldMarket = Object.hasOwn(headphoneMarkets, old.code) ? old.code : 'Other';
    const changedMarket = event.target.id === 'hp-market' && oldMarket !== market;
    if (changedMarket) {
      updateCurrency(market, currency);
      session.headphoneQuoteBooks ??= new Map();
      session.headphoneQuoteBooks.set(old.code, session.quotes);
      session.quotes = session.headphoneQuoteBooks.get(market) || new Map();
      session.brief.place = marketPlace(market);
      prepareOtherSources(session.brief);
      quoteForm.reset();
      byId('quote-feedback').textContent = '';
      byId('hp-market').querySelector('[value=Other]').textContent = 'Another market';
      session.funnel = createFunnel(context, qa);
      session.funnel.mark('complete');
      clearFunnel();
      renderFunnel();
    }
    if (event.target.type === 'checkbox') {
      const need = headphoneNeeds.find(([key]) => key === event.target.value);
      if (need) {
        const clauses = session.brief.details.split(/[;；,，\n]+/u).map(text => text.trim()).filter(Boolean);
        const filtered = clauses.filter(text => {
          const basic = routeRequest({ ...session.brief, item: 'Over-ear headphones', details: text })[0]?.requirements;
          return !basic?.hard[need[0]];
        });
        // The social preset combines both requirements in one clause.
        if (clauses.includes('3.5 mm wired ANC required')) {
          for (const [key, , phrase] of headphoneNeeds) {
            if (key !== need[0] && ['wiredAnc', 'analogAudio'].includes(key) && !filtered.includes(phrase)) filtered.push(phrase);
          }
        }
        if (event.target.checked) filtered.push(need[2]);
        session.brief.details = filtered.join('; ');
      }
    }
    if (event.target.id === 'hp-deadline') session.brief.when = event.target.value || 'just comparing';
    session.brief.budget = { currency: currency.value, amount: budget.valueAsNumber };
    session.intents = routeRequest(session.brief);
    resetFeedbackExport();
    if (!byId('sharing').hidden) {
      byId('sharing').hidden = true;
      byId('payload').replaceChildren();
      form.reset();
      resetPublicSharing();
      byId('request-submit').disabled = true;
    }
    updateSummary();
    showComparison(changedMarket ? 'Market changed; only evidence for this market is shown.' :
      event.target.type === 'checkbox' ? 'Must-have changed; model checks updated.' :
      event.target.id === 'hp-deadline' ? 'Deadline changed; check seller delivery.' :
      'Budget updated to ' + currency.value + ' ' + budget.valueAsNumber + '.');
    scheduleFreshness();
  }
  hpControls.addEventListener('change', event => {
    // The budget input already updates as it changes. A second render on blur can replace the next click target.
    if (event.target.id !== 'hp-budget') applyHeadphoneEdit(event);
  });
  byId('hp-budget').addEventListener('input', event => {
    if (event.target.validity.valid && event.target.value) applyHeadphoneEdit(event);
  });

  byId('live-results').addEventListener('click', event => {
    const handoff = event.target.closest('button[data-headphone-handoff]');
    if (handoff) {
      showSharing(headphoneModels.find(model => model.id === handoff.dataset.headphoneHandoff));
      return;
    }
    const button = event.target.closest('button[data-headphone-select]');
    if (!button || !remaining() || closing || session.submitting) return;
    session.headphoneSelected = button.dataset.headphoneSelect;
    showComparison('Store comparison changed.');
    byId('hp-store-title').focus({ preventScroll: true });
    byId('hp-store-title').scrollIntoView({ block: 'start' });
  });

  byId('start-chat').addEventListener('click', () => {
    if (session) return;
    if (draft && Date.now() < draft.expires) {
      const { brief: { item, ...prefill }, landing } = draft;
      if (headphoneEntry) {
        if (!hpSetup.reportValidity()) return;
        const budget = { amount: byId('hp-start-budget').valueAsNumber, currency: byId('hp-start-currency').value };
        const place = marketPlace(byId('hp-start-market').value);
        const goal = headphoneGoal(byId('hp-start-goal').value);
        start({ item, ...prefill, details: goal.details, budget, place, when: 'just comparing' }, 'ecommerce', landing);
        appendMessage('buyer', item + ' · Goal: ' + goal.label);
        summarize();
        return;
      }
      start({ item, ...prefill }, 'ecommerce', landing);
      appendMessage('buyer', item);
      ask();
    } else {
      clearDraft();
    }
    input.focus();
  });
  byId('example').addEventListener('click', () => {
    if (headphoneEntry && draft) {
      clearDraft();
      input.focus();
      return;
    }
    input.value = 'Find iPhone 15 128 GB + USB-C charger in Seattle, United States under USD 800, just comparing.';
    input.focus();
  });
  byId('handoff').addEventListener('click', () => showSharing());
  byId('live-search').addEventListener('click', () => void searchLiveOffers('manual'));
  byId('revoke-search').addEventListener('click', () => {
    if (!remaining() || closing) return;
    clearLive();
    session.matching.dispose();
    session.matching = createMatchingSession();
    session.approved.clear();
    session.autoRenewed.clear();
    updateSearchConsent();
    showComparison();
    byId('live-status').textContent = 'Source access revoked. Catalog results were cleared from this tab.';
  });
  function listingClick(event) {
    if (!event.isTrusted || !remaining() || closing || byId('review').hidden) return;
    const link = event.target.closest('a.offer-link');
    if (!link?.hasAttribute('data-purchase-path')) return;
    session.funnel.mark('outbound');
    resetFeedbackExport();
    renderFunnel();
  }
  byId('live-results').addEventListener('click', listingClick);
  byId('live-results').addEventListener('auxclick', event => { if (event.button === 1) listingClick(event); });
  byId('outcome').addEventListener('change', event => {
    if (!remaining() || closing) return;
    session.funnel.report(event.target.value);
    resetFeedbackExport();
    renderFunnel();
  });
  byId('prepare-feedback').addEventListener('click', () => {
    if (!remaining() || closing || session.field) return;
    const summary = session.funnel.export(session.intents.map(intent => intent.category));
    byId('feedback-text').value = JSON.stringify(summary, null, 2);
    byId('feedback-payload').value = JSON.stringify(summary);
    byId('feedback-export').hidden = false;
    byId('feedback-text').focus();
    byId('feedback-text').select();
  });
  feedbackForm.addEventListener('submit', event => {
    if (!remaining() || closing || byId('feedback-export').hidden || !byId('feedback-payload').value || !navigator.onLine) {
      event.preventDefault();
      if (session && !navigator.onLine) byId('feedback-sent').textContent = 'Offline. The summary was not sent.';
      return;
    }
    byId('feedback-sent').textContent = 'Continue in the new tab. Delivery is pending.';
  });
  quoteForm.addEventListener('submit', saveQuote);
  byId('hp-clear-quote').addEventListener('click', () => {
    if (!remaining() || closing) return;
    prepareQuoteFields();
    quoteForm.querySelector('[name=url]')?.focus();
  });
  byId('quote-target').addEventListener('change', prepareQuoteFields);
  byId('rank-profile').addEventListener('change', () => {
    if (remaining() && !closing && (session.catalogResults || session.quotes.size || session.intents?.some(headphoneIntent))) {
      showComparison('Ranking updated: ' + profiles[byId('rank-profile').value].label + '.');
    }
  });
  byId('refine').addEventListener('click', () => {
    if (!remaining() || closing || !(session.catalogResults || session.quotes.size || session.intents?.some(headphoneIntent)) || session.refining || session.submitting) return;
    session.refining = true;
    appendMessage('assistant', 'What matters more: price, exact match, evidence, reviews, speed or returns?');
    byId('chat-form').hidden = false;
    input.placeholder = 'Type your ranking preference…';
    input.focus();
  });
  byId('github').addEventListener('click', openPublicEditor);
  byId('public-consent').addEventListener('change', (event) => {
    byId('github').disabled = !event.target.checked;
  });
  byId('close').addEventListener('click', () => {
    if (!remaining() || session.submitting) return;
    closing = true;
    byId('close-confirm').hidden = false;
    byId('keep').focus();
  });
  byId('keep').addEventListener('click', () => {
    closing = false;
    byId('close-confirm').hidden = true;
    recheckFreshness();
    (byId('chat-form').hidden ? byId('close') : input).focus();
  });
  byId('cancel').addEventListener('click', () => finish('Session closed'));
  byId('restart').addEventListener('click', () => finish(null));

  form.addEventListener('submit', (event) => {
    if (!remaining() || closing || byId('sharing').hidden || session.submitting || !form.checkValidity()) {
      event.preventDefault();
      return;
    }
    if (!navigator.onLine) {
      event.preventDefault();
      setFeedback('You are offline. The request was not sent. Reconnect and try again before the session expires.');
      return;
    }
    try {
      sessionStorage.setItem(receiptKey, JSON.stringify({ ref: session.ref, at: Date.now() }));
    } catch {
      // The handoff is still usable if browser storage is unavailable.
    }
    session.funnel.mark('handoff');
    session.submitting = true;
    leaving = true;
    byId('request-submit').disabled = true;
    setFeedback('Continuing to FormSubmit. Delivery is pending.');
  });

  window.addEventListener('pagehide', () => finish(null, false, leaving));
  window.addEventListener('hashchange', () => {
    if (isAgentFragment(location.hash)) location.reload();
  });
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    leaving = false;
    takeStoredValue(receiptKey);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) recheckFreshness();
  });

  window.addEventListener('online', () => { if (session) recheckFreshness(); });
  window.addEventListener('offline', () => {
    if (!remaining() || byId('review').hidden) return;
    const running = session.liveController;
    session.liveController = null;
    if (running) { liveSequence++; running.abort(); }
    updateSearchConsent();
    showComparison();
    byId('live-status').textContent = 'Offline. Reconnect to search public catalogs. Prior observations keep their original time.';
  });

  if (!window.isSecureContext || !window.crypto?.getRandomValues) {
    byId('example').disabled = true;
    setFeedback('Open MATCH OS on HTTPS with a current browser to start a session.');
    return;
  }
  input.disabled = false;
  byId('send').disabled = false;
  byId('start-chat').disabled = false;
  takeStoredValue(receiptKey);
  const staged = takeStoredValue(frameFindKey);
  const stagedAge = Date.now() - staged?.at;
  let item;
  if (acquisition === 'framefind_results' && typeof staged?.item === 'string' && stagedAge >= 0 &&
      stagedAge < draftLifetime && !sensitive.test(staged.item)) {
    item = readItem(staged.item.trim().slice(0, 120));
  } else if (acquisition === 'github_guide') {
    item = 'Over-ear headphones with active noise cancellation in wired mode';
  }
  const landing = agentLanding;
  agentLanding = null;
  const topic = landing ? agentTemplate(landing.topic) : context.topic && topics[context.topic];
  if (topic) item = topic.item;
  if (agentFragment && !landing) setFeedback('This comparison link expired or could not be opened. Start a new purchase chat below.');
  if (item) {
    const ttl = landing ? landing.expires - Date.now() :
      acquisition === 'framefind_results' ? draftLifetime - stagedAge : draftLifetime;
    const place = topic?.place || (landing?.market ? marketPlace(landing.market) : null);
    const prefill = { ...(topic?.details !== undefined ? { details: topic.details } : {}),
      ...(place ? { place: { ...place } } : {}) };
    draft = { brief: { item, ...prefill }, expires: Date.now() + ttl, landing };
    byId('entry-preview').textContent = 'Suggested item: ' + item +
      (topic ? ' · ' + topic.details + (topic.place ? ' · ' + topic.place.city : '') + '. Review or edit all fields in the chat.' : '') +
      ' Use this item to start, or type your own below.';
    byId('entry-preview').hidden = false;
    byId('start-chat').textContent = 'Use this item and start chat';
    if (landing && !headphoneEntry) {
      byId('welcome-title').textContent = topic.title;
      byId('welcome-copy').textContent = topic.description;
      byId('entry-preview').textContent = [topic.details, place?.city || place?.region,
        'Confirm the remaining purchase details before comparing sellers.'].filter(Boolean).join(' · ');
    }
    if (headphoneEntry) {
      byId('welcome').classList.add('hp-welcome');
      byId('welcome-title').textContent = landing?.topic === wirelessHeadphoneTopic
        ? 'Compare wireless over-ear headphones' : 'Find headphones that fit your needs';
      if (landing?.goal) byId('hp-start-goal').value = landing.goal;
      if (landing?.market) {
        byId('hp-start-market').value = landing.market;
        updateCurrency(landing.market, byId('hp-start-currency'));
      }
      byId('welcome-copy').textContent = headphoneGoal(byId('hp-start-goal').value).copy;
      byId('entry-preview').classList.add('sr-only');
      renderHeadphonePreview(byId('hp-preview'), byId('hp-start-goal').value);
      updateStartCoverage();
      byId('hp-preview').hidden = false;
      byId('hp-preview-note').hidden = false;
      byId('example').textContent = 'Compare something else';
      hpSetup.hidden = false;
      byId('start-chat').textContent = 'Start my comparison';
    }
    draftTimer = setTimeout(clearDraft, ttl);
  }
})();
