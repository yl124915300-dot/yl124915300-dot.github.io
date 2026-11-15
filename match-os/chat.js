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
  const input = byId('message');
  const feedback = byId('feedback');
  const messages = byId('messages');
  const scroll = byId('scroll');
  const website = 'https://github.com/yl124915300-dot/yl124915300-dot.github.io/issues/new';

  const fields = [
    ['item', 'Item / service', 'What product or service should we look for? Include the model or size if you know it.'],
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

    const time = timePattern.exec(remainder);
    if (time) {
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

    const item = readItem(clean(remainder).replace(/\s+(?:delivered|delivery|shipped|shipping|available)\s*$/iu, ''));
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
    session = { ref, expires, brief, source, field: null, submitting: false };
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
    if (closing || (session && (!remaining() || !session.field))) return;
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

    const reply = readReply(session.field, value);
    if (reply === null) {
      setFeedback(fields.find(([field]) => field === session.field)[2]);
      return;
    }
    setFeedback('');
    appendMessage('buyer', value);
    session.brief[session.field] = reply;
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

  // Read-only public offer search. Never submit a cart, send the raw transcript,
  // or assume that a merchant payment occurred from an outbound link.
  function clearLive() {
    liveSequence += 1;
    if (session?.liveController) {
      session.liveController.abort();
      session.liveController = null;
    }
    byId('live-results').replaceChildren();
    byId('live-status').textContent = 'No external search has run.';
    byId('live-search').disabled = false;
  }

  function officialOfferLink(raw) {
    if (typeof raw !== 'string' || raw.length > 2000) return null;
    try {
      const link = new URL(raw);
      const host = link.hostname.toLowerCase();
      if (link.protocol !== 'https:' ||
          !(host === 'groupon.com' || host.endsWith('.groupon.com') ||
            host === 'livingsocial.com' || host.endsWith('.livingsocial.com'))) return null;
      return raw;
    } catch {
      return null;
    }
  }

  function offerPrice(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const minor = raw.fromMinor ?? raw.amountMinor;
    const unit = String(raw.currency || '').toUpperCase();
    if (!Number.isSafeInteger(minor) || minor < 0 || !/^[A-Z]{3}$/.test(unit)) return null;
    const precision = Number.isInteger(raw.currencyPrecision) && raw.currencyPrecision >= 0 &&
      raw.currencyPrecision <= 3 ? raw.currencyPrecision : 2;
    return { amount: minor / 10 ** precision, unit };
  }

  function renderOffers(raw, brief) {
    const list = byId('live-results');
    list.replaceChildren();
    const offers = Array.isArray(raw?.offers) ? raw.offers.slice(0, 5) : [];
    let shown = 0;
    for (const offer of offers) {
      if (!offer || typeof offer !== 'object' || offer.status !== 'active') continue;
      const link = officialOfferLink(offer.buyUrl) ||
        officialOfferLink(offer.bookingUrl) || officialOfferLink(offer.offerUrl);
      if (!link) continue;
      const card = document.createElement('article');
      card.className = 'offer-card';
      const title = document.createElement('h4');
      title.textContent = String(offer.title || 'Unnamed public offer').slice(0, 170);
      card.append(title);
      const merchantName = typeof offer.merchant === 'string' ? offer.merchant :
        (offer.merchant && typeof offer.merchant.name === 'string' ? offer.merchant.name : '');
      const meta = document.createElement('p');
      meta.className = 'offer-meta';
      meta.textContent = [merchantName.slice(0, 90), String(offer.city || '').slice(0, 65)]
        .filter(Boolean).join(' · ') || 'LivingSocial/Groupon public catalog';
      card.append(meta);
      const price = offerPrice(offer.price);
      const priceLabel = document.createElement('p');
      priceLabel.className = 'offer-price';
      if (price) {
        priceLabel.textContent = 'From ' + price.unit + ' ' + price.amount.toFixed(2);
        if (price.unit === brief.budget.currency) {
          priceLabel.textContent += price.amount <= brief.budget.amount ?
            ' · starting price within budget' : ' · starting price above budget';
        } else {
          priceLabel.textContent += ' · no currency conversion';
        }
      } else {
        priceLabel.textContent = 'Price not supplied — check merchant';
      }
      card.append(priceLabel);
      const outgoing = document.createElement('a');
      outgoing.className = 'secondary offer-link';
      outgoing.href = link; // Source link, including provider attribution, is unchanged.
      outgoing.target = '_blank';
      outgoing.rel = 'noopener noreferrer';
      outgoing.textContent = offer.buyUrl && link === offer.buyUrl ?
        'Review official buy page ↗' : 'Review official offer page ↗';
      outgoing.setAttribute('aria-label', 'Open third-party offer: ' + title.textContent);
      card.append(outgoing);
      list.append(card);
      shown += 1;
    }
    return shown;
  }

  async function searchLiveOffers() {
    if (!session || !remaining() || closing || session.submitting ||
        byId('review').hidden || session.field) return;
    const brief = session.brief;
    const status = byId('live-status');
    const button = byId('live-search');
    const market = brief.place.code;
    byId('live-results').replaceChildren();

    if (market !== 'US' && market !== 'CA') {
      status.textContent = 'Live public offers from this source are currently limited to the US and Canada. You may still request manual comparison.';
      return;
    }
    if (!navigator.onLine) {
      status.textContent = 'Offline. No external catalog search was made.';
      return;
    }
    // The button is an explicit opt-in: only reviewed item and market are shared.
    const words = (brief.item + ' in ' + brief.place.city + ', ' + brief.place.region).slice(0, 200);
    if (sensitive.test(words) || words.length < 3) {
      status.textContent = 'The reviewed search contains private or invalid text. Edit your request first.';
      return;
    }
    session.liveController?.abort();
    const controller = new AbortController();
    session.liveController = controller;
    const ref = session.ref;
    const seq = ++liveSequence;
    button.disabled = true;
    status.textContent = 'Requesting public offers from LivingSocial/Groupon…';
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 12000);
    try {
      const params = new URLSearchParams({ q: words, country: market, limit: '5' });
      const response = await fetch('https://api-core.livingsocial.com/ls_agent_api/offers/search?' + params, {
        method: 'GET', mode: 'cors', credentials: 'omit',
        headers: { Accept: 'application/json' }, signal: controller.signal,
        cache: 'no-store', redirect: 'error'
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const payload = await response.json();
      if (seq !== liveSequence || session?.ref !== ref || !remaining()) return;
      const count = renderOffers(payload, brief);
      const asOf = typeof payload?.asOf === 'string' ? Date.parse(payload.asOf) : NaN;
      const sourceStamp = Number.isFinite(asOf) ?
        ' Catalog as of ' + new Date(asOf).toLocaleString() + '.' : '';
      status.textContent = count ?
        count + ' active public offers found.' + sourceStamp +
          ' These are not confirmed final prices, availability or verified matches.' :
        'No buyable active offers were returned for this search. Try a different request or use manual comparison.';
      byId('stage-build').removeAttribute('aria-current');
      byId('stage-compare').setAttribute('aria-current', 'step');
    } catch (error) {
      if (seq !== liveSequence || session?.ref !== ref) return;
      status.textContent = timedOut ?
        'Public catalog timed out. No offer was selected or purchased.' :
        'Public catalog unavailable. No external purchase was attempted; manual comparison remains available.';
    } finally {
      clearTimeout(timeout);
      if (session?.ref === ref && seq === liveSequence) {
        session.liveController = null;
        button.disabled = false;
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
    input.value = 'Help me find a 16 GB laptop in Austin, United States under USD 800 by Friday.';
    input.focus();
  });
  byId('handoff').addEventListener('click', showSharing);
  byId('live-search').addEventListener('click', searchLiveOffers);
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
