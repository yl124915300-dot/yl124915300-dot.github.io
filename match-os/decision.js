import { assessEvidence } from './evidence.js?v=7';

const ignored = new Set(['a', 'an', 'the', 'of', 'for', 'in', 'to', 'and', 'or', 'on', 'with']);
const editions = /\b(?:complete|ultimate|deluxe|premium|gold|definitive|goty|game of the year|collector'?s|remaster(?:ed)?|remake|dlc|expansion|bundle)\b|完整版|豪华版|重制版|资料片/iu;

export function normalize(value) {
  return String(value ?? '').normalize('NFKD').toLowerCase().replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function tokens(value) {
  return [...new Set(normalize(value).split(' ').filter(word => word && !ignored.has(word)))];
}

export function relevance(query, label) {
  const wanted = tokens(query);
  const supplied = tokens(label);
  if (!wanted.length) return 0;
  if (normalize(query) === normalize(label)) return 1;
  const hits = wanted.filter(word => supplied.includes(word)).length;
  return hits === wanted.length ? 0.72 + 0.23 * hits / supplied.length : hits / wanted.length * 0.59;
}

export const profiles = {
  balanced: { label: 'Balanced', weights: [50, 20, 20, 10] },
  price: { label: 'Lower known cost', weights: [35, 45, 15, 5] },
  fit: { label: 'Closest match', weights: [75, 10, 10, 5] },
  evidence: { label: 'Better evidence', weights: [35, 10, 50, 5] },
  speed: { label: 'Faster fulfillment', weights: [40, 10, 15, 35] },
  returns: { label: 'Clearer returns', weights: [40, 10, 15, 35] },
  quality: { label: 'Better review evidence', weights: [40, 10, 15, 35] },
};

export function readPreference(text) {
  if (/\b(?:price|cheaper|cheapest|lower cost|budget|cost)\b|价格|便宜|预算/iu.test(text)) return 'price';
  if (/\b(?:evidence|risk|verified|reliab\w*)\b|可靠|证据|风险/iu.test(text)) return 'evidence';
  if (/\b(?:speed|fast\w*|delivery|timing)\b|尽快|速度|时效/iu.test(text)) return 'speed';
  if (/\b(?:return\w*|refund\w*)\b|退货|退款/iu.test(text)) return 'returns';
  if (/\b(?:quality|rating\w*|reviews?)\b|质量|评分|评价/iu.test(text)) return 'quality';
  if (/\b(?:exact|specs?|fit|match)\b|匹配|规格/iu.test(text)) return 'fit';
  if (/\bbalanced\b|均衡/iu.test(text)) return 'balanced';
  return null;
}

export function readGameQuery(item) {
  return item.replace(/^\s*(?:a\s+)?(?:cheap\s+|free\s+)?(?:(?:digital\s+)?(?:PC|Windows)\s+games?|digital\s+games?|电脑游戏|PC游戏)\s*[:：–—-]?\s*/iu, '')
    .replace(/\s+(?:for|on)\s+(?:PC|Windows)\s*$/iu, '').trim();
}

export function searchPlan(brief, route) {
  const item = brief.item;
  const automaticGame = /\b(?:PC|Windows|digital)\s+games?\b|\b(?:for|on)\s+(?:PC|Windows)\b|电脑游戏|PC游戏/iu.test(item);
  const category = route === 'games' || (route === 'auto' && automaticGame) ? 'games' : 'general';
  const market = brief.place.code;
  const gameTitle = readGameQuery(item);
  return {
    category, market,
    title: category === 'games' ? gameTitle : item,
    browseFreeGames: category === 'games' && (!gameTitle || /^(?:games?|any games?|free games?|免费游戏)$/iu.test(gameTitle)),
    providers: category === 'games' ? (market === 'US' ? ['cheapshark', 'gamerpower'] : []) :
      (market === 'US' || market === 'CA' ? ['livingsocial'] : []),
  };
}

function normalizeRequirements(detail, item, category) {
  const checks = [];
  let remainder = (detail || '').normalize('NFKC');
  const add = (label, value, pattern) => {
    if (pattern.test(remainder) && !/\b(?:not|no|never|non)\b|不要|不能/iu.test(remainder)) {
      checks.push({ label, value });
      remainder = remainder.replace(pattern, ' ');
    }
  };
  add('Return policy', 'returns', /\b(?:must be returnable|returns? required|refundable|returnable)\b|必须可退|可退货|可退款/iu);
  if (category === 'pc_game') {
    const platform = /\b(?:(?:only|must(?: be)?(?: on)?)\s+(?:on\s+)?)?(steam|gog|epic(?: games(?: store)?)?|(?:drm[- ]free))(?:\s+(?:only|required))?\b/iu.exec(remainder);
    if (platform && !/\b(?:not|no|or|except|avoid|prefer)\b|不要|或者|优先/iu.test(remainder)) {
      const name = normalize(platform[1]);
      checks.push({ label: 'Activation or DRM requirement', value: 'license:' + (name.startsWith('epic') ? 'epic' : name) });
      remainder = remainder.replace(platform[0], ' ');
    }
  }
  const condition = /\b(?:brand[- ]new|sealed|new only|used only|refurbished(?: only)?)\b|(?:全新|二手|翻新)/iu.exec(item + ' ' + remainder);
  if (condition && !/\b(?:not|no|never|or|avoid)\b|不要|或者/iu.test(item + ' ' + remainder)) {
    const raw = condition[0];
    const value = /used|二手/iu.test(raw) ? 'used' : /refurbished|翻新/iu.test(raw) ? 'refurbished' : 'new';
    checks.push({ label: 'Condition', value: 'condition:' + value });
    remainder = remainder.replace(raw, ' ');
  }
  const duration = /\b(\d{1,3})\s*[- ]?\s*(min(?:ute)?s?|h(?:our)?s?)\b|(\d{1,3})\s*(分钟|小时)/iu.exec(remainder || '');
  if (duration && !/\b(?:not|no|less|more|at least|or|up to)\b|不少于|不超过/iu.test(remainder)) {
    const minutes = Number(duration[1] || duration[3]) * (/^h|小时/iu.test(duration[2] || duration[4]) ? 60 : 1);
    checks.push({ label: minutes + ' min service', value: 'duration:' + minutes });
    remainder = remainder.replace(duration[0], ' ');
  }
  const party = /\b(?:for\s+)?(one|two|three|four|[1-4])\s+(?:people|persons?|adults?|guests?)\b|([12一两二])人/iu.exec(remainder);
  if (party && !/\b(?:not|no|or|about)\b|不要|或者/iu.test(remainder)) {
    const size = ({ one: 1, two: 2, three: 3, four: 4, '一': 1, '两': 2, '二': 2 })[(party[1] || party[2]).toLowerCase()] ||
      Number(party[1] || party[2]);
    checks.push({ label: 'Party of ' + size, value: 'party:' + size });
    remainder = remainder.replace(party[0], ' ');
  }
  // Treat unparsed details as a requirement. Similar wording in a title is insufficient evidence.
  remainder = remainder.replace(/\b(?:must(?: have| be)?|required|only|and|please)\b/giu, ' ');
  if (/[\p{L}\p{N}]/u.test(remainder)) checks.push({ label: 'Other must-haves', value: 'unparsed' });
  return checks;
}

export function totalCost(offer) {
  if (!offer.price) return { listed: null, total: null };
  const { amount, kind } = offer.price;
  const costs = [offer.shipping, offer.tax, offer.fees];
  const known = costs.filter(Number.isFinite).reduce((sum, n) => sum + n, 0);
  const listed = Math.round((amount + known) * 1000) / 1000;
  const complete = kind === 'fixed' && costs.every(Number.isFinite);
  return { listed, total: complete ? listed : null };
}

function assessment(offer, brief, plan, now, requirementChecks, provenance) {
  const { listed, total } = totalCost(offer);
  const comparable = offer.price?.currency === brief.budget.currency;
  const olderThanDay = Boolean(offer.priceTimestamp && now - Date.parse(offer.priceTimestamp) > 24 * 60 * 60 * 1000);
  const stale = provenance?.stale || olderThanDay;
  const problems = [];
  const pending = [];
  if (stale) pending.push(olderThanDay ? 'Catalog price is older than 24 hours' : 'Catalog price has expired or needs refresh');
  if (listed === null || !comparable || stale) pending.push(comparable || listed === null ? 'Current budget fit unverified' : 'Budget currency differs');
  else if (listed > brief.budget.amount) problems.push('Known price alone exceeds budget');
  else if (total === null) pending.push('Final budget fit unverified');
  if (plan.category === 'games') pending.push('Account and activation region unverified');
  else if (!offer.city || normalize(offer.city) !== normalize(brief.place.city)) pending.push('Exact city or fulfillment area unverified');
  const timingRequired = !/^(?:just comparing|先比较)$/iu.test(brief.when);
  if (timingRequired) pending.push(offer.category === 'pc_game' ? 'Delivery or redemption deadline unverified' : 'Appointment or delivery deadline unverified');
  for (const check of requirementChecks) {
    const [type, needed] = check.value.split(':');
    if (type === 'condition' && offer.condition && offer.condition !== needed) problems.push('Condition conflicts with request');
    else if (type === 'condition' && offer.condition === needed) continue;
    else if (type === 'license' && offer.activation && (offer.activation === needed || offer.activation.startsWith(needed + ' '))) continue;
    else if (type === 'license' && offer.activation && needed !== 'drm free') problems.push('Activation conflicts with request');
    else if (type === 'returns' && offer.returns?.eligible === true) continue;
    else if (type === 'returns' && offer.returns?.eligible === false) problems.push('Return policy conflicts with request');
    else if (type === 'duration' && offer.serviceOptions?.duration?.includes(Number(needed))) {
      pending.push(check.label + ' listed; option price unverified');
    } else if (type === 'party' && offer.serviceOptions?.party?.includes(Number(needed))) {
      pending.push(check.label + ' listed; option price unverified');
    } else pending.push(check.label + ' unverified');
  }
  const requestedEdition = editions.exec(plan.title);
  if (offer.category === 'pc_game' && requestedEdition && !normalize(offer.title).includes(normalize(requestedEdition[0]))) {
    problems.push('Requested edition not shown');
  }
  return { problems, pending, comparable, stale };
}

export function rank(offers, brief, plan, preference = 'balanced', now = Date.now()) {
  const profile = profiles[preference] || profiles.balanced;
  const itemCategory = plan.category === 'games' ? 'pc_game' : 'local_catalog';
  const requirements = normalizeRequirements(brief.details, brief.item, itemCategory);
  const unique = new Map();
  for (const offer of offers) {
    const key = offer.provider + ':' + (offer.identity?.key || offer.id) + ':' + (offer.storeId || offer.id);
    const existing = unique.get(key);
    if (!existing) unique.set(key, offer);
    else if (existing.sourceUrl !== offer.sourceUrl || totalCost(existing).listed !== totalCost(offer).listed) {
      // Unidentified license variants and contradictory duplicates cannot stand in for each other.
      unique.set(key + ':' + offer.id, offer);
    }
  }
  return [...unique.values()].flatMap(offer => {
    const text = offer.category === 'pc_game' ? offer.title : [offer.title, offer.serviceScope].filter(Boolean).join(' ');
    const match = plan.browseFreeGames ? 1 : Math.max(relevance(plan.title, offer.title), relevance(plan.title, text));
    if (match < 0.60) return [];
    const { listed, total } = totalCost(offer);
    const provenance = plan.module ? assessEvidence(offer, plan, now) : null;
    const { problems, pending, comparable, stale } = assessment(offer, brief, plan, now, requirements, provenance);
    const affordability = comparable && listed !== null && !stale
      ? Math.max(0, 1 - (total ?? listed) / brief.budget.amount) * (total === null ? 0.68 : 1) : 0;
    const evidence = Math.max(0, (stale ? offer.confidence * 0.3 : offer.confidence) - Math.min(0.4, pending.length * 0.055));
    const rating = offer.rating ? offer.rating.value / offer.rating.scale * offer.rating.count / (offer.rating.count + 25) : 0;
    // Availability in the catalog does not prove speed. Score timing only when an adapter can supply it.
    const service = preference === 'returns' ? Number(offer.returns?.eligible === true) :
      preference === 'speed' ? Number(offer.delivery?.verified === true) : rating;
    const components = [match, affordability, evidence, service];
    const score = Math.round(components.reduce((sum, part, index) => sum + part * profile.weights[index], 0));
    return [{ offer, score, match, evidence, problems, pending, listed, total, provenance }];
  }).sort((a, b) => a.problems.length - b.problems.length || b.score - a.score || b.match - a.match ||
    a.offer.title.localeCompare(b.offer.title) || a.offer.id.localeCompare(b.offer.id));
}

export function compareGroups(rows, plan) {
  const groups = new Map();
  for (const row of rows) {
    if (row.problems.length) continue;
    const { offer } = row;
    const key = JSON.stringify([offer.identity?.key ?? offer.provider + ':' + offer.id,
      offer.price?.currency, offer.price?.kind, row.provenance?.tier]);
    if (!groups.has(key)) groups.set(key, { title: offer.title, rows: [], alternative: false, type: offer.category });
    groups.get(key).rows.push(row);
  }
  return [...groups.values()].map(group => {
    group.sameTitleAcrossStores = new Set(group.rows.map(row => row.offer.storeId).filter(Boolean)).size > 1 &&
      group.rows.every(row => row.offer.identity?.kind === 'catalog-game');
    group.alternative = !plan.browseFreeGames && group.type === 'pc_game' && normalize(group.title) !== normalize(plan.title);
    return group;
  });
}
