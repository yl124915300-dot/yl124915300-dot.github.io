import { profiles, readPreference } from './decision.js?v=4';
import { catalogNames, searchCatalogs } from './catalogs.js?v=4';
import { renderIntent } from './results.js?v=4';
import { combinedCost, evaluateIntent, liveOffer, localQuote, providers, quoteFields, routeRequest } from './transaction.js?v=4';

(() => {
  'use strict';

  const lifetime = 30 * 60 * 1000;
  const receiptKey = 'matchos:last_request_reference';
  const frameFindKey = 'matchos:framefind_interest_v1';
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
  const quoteForm = byId('quote-form');
  const input = byId('message');
  const feedback = byId('feedback');
  const messages = byId('messages');
  const scroll = byId('scroll');
  const website = 'https://github.com/yl124915300-dot/yl124915300-dot.github.io/issues/new';

  const fields = [
    ['item', 'Item / service', 'What products or services should we look for? Include a product type, model or service name.'],
    ['budget', 'Maximum budget', 'What is the most you want to spend? Include the currency, for example “USD 800”.'],
    ['place', 'Market', 'Which city and country or region should we look in? For example, “Austin, United States”.'],
    ['when', 'Timing', 'When do you need it? For example, “by Friday”, “within a week” or “just comparing”.'],
    ['details', 'Must-haves', 'Any other must-haves, such as condition, size or pickup? Choose “No preference” if there are none.'],
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

  function finish(reason, focus = true, keepReceipt = false) {
    clearLive();
    session = null;
    closing = false;
    clearInterval(timer);
    messages.replaceChildren();
    byId('summary').replaceChildren();
    byId('payload').replaceChildren();
    byId('public-option').open = false;
    byId('ref').textContent = '';
    byId('expiry').textContent = '';
    byId('expiry-label').textContent = '';
    byId('request-submit').disabled = true;
    form.reset();
    byId('chat-form').reset();
    setFeedback('');
    if (!keepReceipt) takeStoredValue(receiptKey);
    for (const id of ['reference', 'review', 'sharing', 'quick-actions', 'close', 'close-confirm']) {
      byId(id).hidden = true;
    }
    byId('stage-compare').removeAttribute('aria-current');
    byId('stage-build').setAttribute('aria-current', 'step');
    byId('route-preview').replaceChildren();
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

  function start(brief, source) {
    takeStoredValue(receiptKey);
    const entropy = crypto.getRandomValues(new Uint8Array(10));
    const ref = 'MO-' + Array.from(entropy, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
    const expires = Date.now() + lifetime;
    session = { ref, expires, brief, source, field: null, submitting: false, quotes: new Map(), nextQuote: 0 };
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

  function summarize() {
    byId('chat-form').hidden = true;
    byId('review').hidden = false;
    const { brief } = session;
    prepareOtherSources(brief);
    session.intents = routeRequest(brief);
    prepareQuoteEntry();
    if (session.intents.some(intent => !intent.module) && session.clarifiedItem !== brief.item) {
      session.clarifiedItem = brief.item;
      appendMessage('assistant', 'What kind of product or service is the unclear item? Use Edit item / service to add a category or model.');
    }
    updateSearchConsent();
    showComparison();
    const values = [
      brief.item,
      brief.budget.currency + ' ' + brief.budget.amount,
      brief.place.city + ', ' + brief.place.region,
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
        if (key === 'item' || key === 'place') session.quotes.clear();
        resetQuoteEntry();
        form.reset();
        byId('public-option').open = false;
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
    appendMessage('assistant', fields.find(([field]) => field === session.field)[2]);
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
    if (sensitive.test(value)) {
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
    session.brief[session.field] = reply;
    if (session.field === 'details') byId('rank-profile').value = readPreference(reply) || 'balanced';
    ask();
  }

  function requestFields() {
    const { brief, ref, source } = session;
    const campaign = new URLSearchParams(window.location.search);
    const labels = [
      ['utm_source', 'acquisition_source', 'direct'],
      ['utm_medium', 'acquisition_medium', 'unknown'],
      ['utm_campaign', 'acquisition_campaign', 'none'],
    ];
    return {
      source,
      region: brief.place.code,
      market_country: brief.place.region,
      city: brief.place.city,
      when: brief.when,
      item: brief.item,
      budget: brief.budget.amount,
      currency: brief.budget.currency,
      details: brief.details,
      transaction_reference: ref,
      ...Object.fromEntries(labels.map(([parameter, name, fallback]) => {
        const value = campaign.get(parameter) || fallback;
        return [name, /^[a-zA-Z0-9._-]{1,60}$/.test(value) && !sensitive.test(value) ? value : 'unclassified'];
      })),
    };
  }

  function clearLive() {
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
    if (Object.entries(raw).some(([name, value]) => name !== 'url' && sensitive.test(value))) {
      feedback.textContent = 'Use public listing details without contact information.';
      return;
    }
    try {
      const quote = localQuote(intent, raw, session.nextQuote++);
      const current = session.quotes.get(intent.id) || [];
      const previous = current.findIndex(row => row.merchant === quote.merchant && row.title === quote.title &&
        row.sourceUrl === quote.sourceUrl && row.price.currency === quote.price.currency);
      if (current.length >= 12 && previous < 0) {
        feedback.textContent = 'This item has 12 quotes. Edit the item or start another comparison to clear them.';
        return;
      }
      const updated = [...current];
      if (previous < 0) updated.push(quote);
      else updated[previous] = quote;
      session.quotes.set(intent.id, updated);
      prepareQuoteFields();
      feedback.textContent = previous < 0 ? 'Quote added to this tab’s comparison.' : 'Existing quote updated with the new observation.';
      showComparison();
    } catch (error) {
      feedback.textContent = error.message;
    }
  }

  function updateSearchConsent() {
    const { intents, brief } = session;
    const preview = byId('route-preview');
    preview.replaceChildren();
    const requests = [];
    for (const intent of intents) {
      const line = document.createElement('p');
      const heading = (intent.module?.label || 'Category unclear') + ' · ' + intent.item;
      const limitations = Object.values(providers).filter(provider => provider.mode && provider.module === intent.category)
        .map(provider => provider.label + ' (' + provider.capability + ')');
      const coverage = intent.providers.length ? intent.providers.map(provider => catalogNames[provider]).join(' and ') :
        intent.module ? 'No eligible live source in this market' : 'Edit the item and give its category or service type.';
      line.textContent = heading + ' — ' + coverage + (limitations.length ? '. ' + limitations.join(' · ') : '') +
        (intent.dependency ? '. ' + intent.dependency : '') + (intent.requiresDelivery ? '. Delivery required.' : '');
      preview.append(line);
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
    byId('live-search').disabled = !requests.length;
    byId('catalog-consent').textContent = requests.length ? requests.join(' ') +
      ' Budget, timing, private details and entered quotes stay in this tab.' : '';
  }

  function showComparison() {
    const output = byId('live-results');
    const preference = byId('rank-profile').value;
    const { intents, catalogResults, quotes } = session;
    output.replaceChildren();
    let candidates = 0;
    const comparisons = [];
    for (const intent of intents) {
      const results = catalogResults?.get(intent.id) || [];
      if (intent.providers.length && !catalogResults && !quotes.has(intent.id)) continue;
      const offers = results.flatMap(result => result.offers.map(offer => liveOffer(intent, offer)));
      const comparison = evaluateIntent(intent, [...offers, ...(quotes.get(intent.id) || [])], preference);
      comparisons.push(comparison);
      candidates += comparison.rows.filter(row => !row.problems.length).length;
      renderIntent(output, intent, comparison, preference);
    }
    if (intents.length > 1 && comparisons.length === intents.length) {
      const combined = combinedCost(comparisons, session.brief.budget);
      const summary = document.createElement('p');
      summary.className = 'muted';
      summary.textContent = combined.status === 'unknown' ? 'Combined budget fit is unverified. Each item needs an eligible final total in the budget currency.' :
        'Combined cost of the lowest complete quotes: ' + combined.currency + ' ' + combined.sum +
        (combined.status === 'pass' ? ' · within the shared budget.' : ' · above the shared budget.');
      output.prepend(summary);
    }
    const coverage = catalogResults && [...catalogResults].flatMap(([id, results]) => results.map(result => {
      const status = result.status === 'ok' ? result.offers.length + ' listings' : result.status;
      return intents.find(item => item.id === id).item + ' · ' + catalogNames[result.provider] + ' ' + status;
    }));
    const status = byId('live-status');
    if (coverage?.length) status.textContent = coverage.join(' · ') + '. ' +
      (candidates ? candidates + ' candidates before the display limit.' : 'No eligible candidates. Manual comparison is available below.');
    else if (quotes.size) status.textContent = 'Comparing quotes entered in this tab.';
    else if (intents.every(intent => !intent.providers.length)) status.textContent = 'No sufficient live quotes. Manual comparison is available below.';
    else status.textContent = 'No external search has run.';
    byId('ranking-tools').hidden = candidates === 0;
  }

  async function searchLiveOffers() {
    if (!remaining() || closing || session.submitting || byId('review').hidden || session.field) return;
    const { intents, brief, ref } = session;
    const live = intents.filter(intent => intent.providers.length);
    if (!live.length || session.liveController) return;
    const status = byId('live-status');
    if (!navigator.onLine) {
      status.textContent = 'Offline. Reconnect to search public catalogs.';
      return;
    }
    if ([...live.map(intent => intent.title), brief.place.city, brief.place.region].some(value => sensitive.test(value))) {
      status.textContent = 'Edit the request to remove private or invalid text before searching.';
      return;
    }
    const controller = new AbortController();
    session.liveController = controller;
    const seq = ++liveSequence;
    byId('live-search').disabled = true;
    status.textContent = 'Searching the authorized catalogs…';
    try {
      const results = await Promise.all(live.map(async intent =>
        [intent.id, await searchCatalogs(intent, brief, controller.signal)]));
      if (seq !== liveSequence || session?.ref !== ref || !remaining()) return;
      session.catalogResults = new Map(results);
      showComparison();
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

  function showSharing() {
    if (!remaining() || closing || session.field) return;
    byId('stage-build').removeAttribute('aria-current');
    byId('stage-compare').setAttribute('aria-current', 'step');
    const data = requestFields();
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
    if (!remaining() || closing || byId('sharing').hidden || session.submitting) return;
    const data = requestFields();
    const body = [
      '## Voluntary buyer request',
      '',
      'Item / service: ' + data.item,
      'Market: ' + data.city + ', ' + data.market_country,
      'Maximum budget: ' + data.currency + ' ' + data.budget,
      'Timing: ' + data.when,
      'Must-haves: ' + (data.details || 'None'),
      '',
      'Self-reported request for manual review. No purchase or merchant quote has been verified.',
    ].join('\n');
    const query = new URLSearchParams({
      title: '[MATCH OS BUYER] ' + data.item.slice(0, 75) + ' / ' + data.city.slice(0, 35), body
    });
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
  byId('example').addEventListener('click', () => {
    input.value = 'Find iPhone 15 128 GB + USB-C charger in Seattle, United States under USD 800, just comparing.';
    input.focus();
  });
  byId('handoff').addEventListener('click', showSharing);
  byId('live-search').addEventListener('click', searchLiveOffers);
  quoteForm.addEventListener('submit', saveQuote);
  byId('quote-target').addEventListener('change', prepareQuoteFields);
  byId('rank-profile').addEventListener('change', () => {
    if (remaining() && !closing && (session.catalogResults || session.quotes.size)) showComparison();
  });
  byId('refine').addEventListener('click', () => {
    if (!remaining() || closing || !(session.catalogResults || session.quotes.size) || session.refining || session.submitting) return;
    session.refining = true;
    appendMessage('assistant', 'What matters more: price, exact match, evidence, reviews, speed or returns?');
    byId('chat-form').hidden = false;
    input.placeholder = 'Type your ranking preference…';
    input.focus();
  });
  byId('github').addEventListener('click', openPublicEditor);
  byId('close').addEventListener('click', () => {
    if (!remaining() || session.submitting) return;
    closing = true;
    byId('close-confirm').hidden = false;
    byId('keep').focus();
  });
  byId('keep').addEventListener('click', () => {
    closing = false;
    byId('close-confirm').hidden = true;
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
    session.submitting = true;
    leaving = true;
    byId('request-submit').disabled = true;
    setFeedback('Continuing to FormSubmit. Delivery is pending.');
  });

  window.addEventListener('pagehide', () => finish(null, false, leaving));
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    leaving = false;
    takeStoredValue(receiptKey);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) remaining();
  });

  if (!window.isSecureContext || !window.crypto?.getRandomValues) {
    byId('example').disabled = true;
    setFeedback('Open MATCH OS on HTTPS with a current browser to start a session.');
    return;
  }
  input.disabled = false;
  byId('send').disabled = false;
  takeStoredValue(receiptKey);
  const staged = takeStoredValue(frameFindKey);
  const stagedAge = Date.now() - staged?.at;
  if (typeof staged?.item === 'string' && stagedAge > -60000 && stagedAge < 600000 && !sensitive.test(staged.item)) {
    const item = readItem(staged.item.trim().slice(0, 120));
    if (item) {
      start({ item }, 'ecommerce');
      appendMessage('assistant', 'FrameFind passed this item to your local chat: ' + item + '. You can edit it before sharing.');
      ask();
    }
  }
})();
