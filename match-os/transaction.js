import { profiles } from './decision.js?v=5';
import { electronics, modelReference } from './modules/electronics.js?v=5';
import { consumables, productType } from './modules/consumables.js?v=5';
import { services, serviceDefinition } from './modules/services.js?v=5';
import { games } from './modules/games.js?v=5';
import { clamp, constraint, date, key, number, quoteCost, text } from './modules/shared.js?v=5';

import { assessEvidence, publicBarcodes, quoteStatus, withoutBarcodes } from './evidence.js?v=5';

export const modules = Object.freeze({ electronics, consumables, services, games });
export const providers = Object.freeze({
  cheapshark: { label: 'CheapShark', module: 'games', markets: ['US'], capability: 'Catalog purchase listings from multiple merchants' },
  gamerpower: { label: 'GamerPower', module: 'games', markets: ['US'], capability: 'Free claims' },
  livingsocial: { label: 'LivingSocial / Groupon', module: 'services', markets: ['US', 'CA'], capability: 'Public catalog starting prices' },
  bestbuy: { label: 'Best Buy', module: 'electronics', mode: 'blocked', capability: 'Project API key and private connection needed' },
  ebay: { label: 'eBay Browse', module: 'electronics', mode: 'blocked', capability: 'OAuth and production approval needed' },
  kroger: { label: 'Kroger', module: 'consumables', mode: 'blocked', capability: 'OAuth and location-specific product access needed' },
  openprices: { label: 'Open Prices', module: 'consumables', mode: 'observations', capability: 'Dated receipt and shelf records by exact product name or public barcode' },
});

const gameWords = /\b(?:(?:pc|windows|digital|steam|video)\s+games?|games?\s*[:：]|(?:free\s+)?games?\s*$|for pc|on steam|lego batman|baldur['’]s gate|cyberpunk 2077)\b|电脑游戏|PC游戏|数字游戏/iu;
const deviceWords = /\b(?:phones?|smartphones?|iphone|ipad|pixel|galaxy|laptop|notebook|macbook|tablet|headphones?|earbuds?|monitor|charger|adapter|usb[- ]?c|camera|airpods|graphics card|ssd|nintendo switch)\b|手机|数码|笔记本|电脑|耳机|显示器|充电器|充电线|配件|相机/iu;
const essentialWords = /\b(?:grocer(?:y|ies)|everyday essentials|consumables?|household supplies|ingredients|pantry)\b|日用品|食材|食品|杂货|耗材/iu;
const deliveryOnly = /^(?:(?:same[- ]day|local|home|grocery)\s+)?(?:delivery|shipping)$|^(?:配送|送货)$/iu;
const deliveryWords = /\s+\b(?:include|with|for)\s+(?:same[- ]day\s+)?(?:delivery|shipping)\s*$|\s*需要配送$|\s*送货到家$/iu;
const prefixes = [
  [/^(?:electronics?|device|数码|电子产品)\s*[:：]\s*/iu, electronics],
  [/^(?:grocery|daily goods|everyday essentials|日用品|食材)\s*[:：]\s*/iu, consumables],
  [/^(?:local service|service|本地服务|服务)\s*[:：]\s*/iu, services],
  [/^(?:digital pc games?|pc games?|game|电脑游戏|PC游戏|游戏)\s*[:：]\s*/iu, games],
];

function classify(item) {
  for (const [prefix, module] of prefixes) if (prefix.test(item)) return { module, item: text(item.replace(prefix, '')) };
  if (gameWords.test(item)) return { module: games, item };
  if (serviceDefinition(item) && !/\b(?:chair|gun|device|tool|kit)\b|按摩椅|按摩枪/u.test(key(item))) return { module: services, item };
  if (deviceWords.test(item) || modelReference(item)) return { module: electronics, item };
  if (essentialWords.test(item) || productType(item)) return { module: consumables, item };
  return { module: null, item };
}

function channel(item) {
  const pieces = item.split(/\s*(?:\+|＋|；|;|、|\band also\b|以及|另外还要)\s*/iu).map(text).filter(Boolean);
  return pieces.flatMap(piece => {
    const split = piece.split(/\s+(?:and|plus)\s+|(?:还要|加上|和)/iu).map(text).filter(Boolean);
    return split.length > 1 && split.every(part => classify(part).module || deliveryOnly.test(part)) ? split : [piece];
  });
}

export function routeRequest(brief) {
  const sales = channel(brief.item);
  const requested = sales.map(part => ({ ...classify(text(part.replace(deliveryWords, ''))), delivery: deliveryWords.test(part) }));
  const hasGoods = requested.some(({ module }) => module === consumables || module === electronics);
  const sharedDelivery = hasGoods && (sales.some(part => deliveryOnly.test(part)) ||
    /\b(?:include delivery|with delivery|delivered|same[- ]day delivery)\b|需要配送|送货到家/iu.test(brief.details));
  const needDelivery = hasGoods && (sharedDelivery || requested.some(part => part.delivery));
  const parts = needDelivery ? requested.filter(({ item }) => !deliveryOnly.test(item)) : requested;
  const targets = parts.flatMap(({ module, item }) => {
    const ref = module === electronics && modelReference(item);
    return ref && !/\b(?:charger|cable|adapter|case)\b|充电器|配件|保护壳/u.test(key(item)) ? [ref.model] : [];
  });
  const intents = parts.map(({ module, item, delivery }, index) => {
    const category = module?.id ?? 'unclassified';
    const codes = [...new Set(publicBarcodes(item + (parts.length === 1 ? ' ' + brief.details : '')).map(([, code]) => code))];
    const barcode = module === consumables && codes.length === 1 && brief.place.code !== 'Other' ? codes[0] : null;
    const cleanItem = withoutBarcodes(item).replace(/[\s,;，；]+$/u, '');
    // Shared details can contain different requirements for different items. Unassigned details stay pending.
    const canReadObservations = module === consumables && brief.place.code !== 'Other' &&
      codes.length < 2 && (barcode || (cleanItem.length >= 2 && cleanItem.length <= 100));
    const intentBrief = { ...brief, item: cleanItem, details: parts.length === 1 ? withoutBarcodes(brief.details) : '' };
    const requirements = module?.requirements(intentBrief, cleanItem);
    let dependency = null;
    if (module === electronics && requirements.accessory && targets.length === 1 && !requirements.hard.compatibleWith) {
      requirements.hard.compatibleWith = targets[0];
      dependency = 'Verify compatibility with ' + targets[0];
    }
    const title = module === games ? requirements.title : module === services
      ? serviceDefinition(cleanItem) || cleanItem : cleanItem;
    const supported = Object.entries(providers).filter(([, provider]) =>
      provider.module === category && !provider.mode && provider.markets.includes(brief.place.code));
    return {
      id: String(index), module, item: cleanItem, title, barcode, category, brief: intentBrief,
      market: brief.place.code, when: brief.when, requirements, dependency,
      providers: [...supported.map(([provider]) => provider), ...(canReadObservations ? ['openprices'] : [])],
      browseFreeGames: requirements?.browseFreeGames || false,
      requiresDelivery: (sharedDelivery || delivery) && (module === electronics || module === consumables),
      sharedBudget: parts.length > 1,
      sharedDetails: parts.length > 1 && Boolean(brief.details) && !/^\s*(?:prioriti[sz]e|prefer|优先)/iu.test(brief.details),
    };
  });
  return intents;
}

export const quoteFields = [
  ['title', 'Listing title'], ['merchant', 'Merchant'], ['url', 'Source URL (HTTPS)'],
  ['merchantSku', 'Merchant SKU or option ID'], ['returnTerms', 'Return or cancellation terms'],
  ['amount', 'Merchant price'], ['currency', 'Currency code', 'USD'],
  ['priceKind', 'Price type (fixed or from)', 'fixed'],
  ['shipping', 'Shipping for this order'], ['tax', 'Tax for this order'], ['fees', 'Other fees for this order'],
  ['observedAt', 'Date observed or published (YYYY-MM-DD)'],
];

export function localQuote(intent, raw, id, now = new Date().toISOString()) {
  if (!intent.module || intent.category === 'games') throw new Error('Use a product or service request to enter a quote.');
  const amount = number(raw.amount);
  const currency = text(raw.currency).toUpperCase();
  const priceKind = key(raw.priceKind) || 'fixed';
  const observedAt = date(raw.observedAt);
  let sourceUrl;
  try {
    const url = new URL(text(raw.url));
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.')) throw new Error();
    sourceUrl = url.href;
  } catch {
    throw new Error('Enter a valid HTTPS listing URL.');
  }
  const recorded = {
    id: String(id), provider: 'user', category: intent.category,
    title: text(raw.title) || new URL(sourceUrl).hostname, merchant: text(raw.merchant),
    sourceUrl, checkedAt: now, attrs: intent.module.normalize(raw),
  };
  if (!text(raw.amount)) {
    return { ...recorded, price: null, confidence: 0, provenance: { tier: 'link', retrievedAt: now, source: sourceUrl } };
  }
  if (!text(raw.title) || !text(raw.merchant) || !observedAt || Date.parse(observedAt) > Date.parse(now) ||
      amount === null || !/^[A-Z]{3}$/u.test(currency) || !['fixed', 'from'].includes(priceKind)) {
    throw new Error('Enter a listing title, merchant, price, three-letter currency and a valid observation date.');
  }
  for (const field of ['shipping', 'tax', 'fees']) {
    if (text(raw[field]) && number(raw[field]) === null) throw new Error('Enter non-negative numbers for known charges.');
  }
  return {
    ...recorded, price: { amount, currency, kind: priceKind }, priceTimestamp: observedAt,
    provenance: { tier: 'manual', observedAt, retrievedAt: now, source: sourceUrl,
      identity: { type: 'Reported merchant SKU or option ID', identifier: text(raw.merchantSku) } },
    returns: text(raw.returnTerms) ? { label: text(raw.returnTerms), verified: false } : null,
    shipping: number(raw.shipping), tax: number(raw.tax), fees: number(raw.fees), confidence: 0.47,
    deliveryDate: date(raw.deliveryDate), delivery: date(raw.deliveryDate) ? { label: 'Arrival ' + raw.deliveryDate } : null,
  };
}

export function liveOffer(intent, offer) {
  if (intent.category !== 'services') return offer;
  return {
    ...offer, category: 'services',
    attrs: services.normalize({
      service: serviceDefinition(offer.title + ' ' + offer.serviceScope),
      city: offer.city, market: offer.market, listedOptions: offer.serviceOptions,
      minimumCharge: offer.price?.amount,
    }),
  };
}

function comparisonCost(intent, offer, quantity) {
  if (intent.category === 'consumables' && !offer.attrs.minPacks) {
    return { ...quoteCost(offer), total: null, uncertainQuantity: true };
  }
  const result = quoteCost(offer, quantity);
  const minimum = offer.attrs.minimumCharge;
  if (intent.category === 'services' && minimum !== null && offer.price && minimum > offer.price.amount) {
    return { listed: result.listed + minimum - offer.price.amount, total: null };
  }
  return result;
}

function evaluatedOffer(offer, intent, weights, preference, now) {
  const result = intent.module.assess(offer.attrs, intent, offer, now);
  if (result.relevant === false) return null;
  const provenance = assessEvidence(offer, intent, now);
  const { listed, total, uncertainQuantity } = provenance.tier === 'observation'
    ? { listed: null, total: null } : comparisonCost(intent, offer, result.quantity);
  const checks = [...result.checks];
  const stale = offer.provider === 'user' ?
    !offer.priceTimestamp || new Date(now).toISOString().slice(0, 10) > offer.priceTimestamp.slice(0, 10) :
    provenance.stale || provenance.tier === 'observation';
  const sameCurrency = offer.price?.currency === intent.brief.budget.currency;
  const amount = intent.brief.budget.amount;
  if (offer.expires) checks.push(constraint('Listing validity', Date.parse(offer.expires), now, (end, current) => end >= current));
  if (stale && provenance.tier === 'manual') checks.push(constraint('Current price (older observation)', null, true));
  const priceForBudget = sameCurrency && !stale ? total ?? (listed !== null && listed > amount ? listed : null) : null;
  checks.push(constraint(sameCurrency ? (intent.sharedBudget ? 'Individual listing fits the shared budget ceiling' : 'Final cost fits budget') :
    'Budget currency or price unavailable', priceForBudget, amount, (a, b) => a <= b));
  if (intent.sharedDetails || intent.requirements.unmatched?.length) checks.push(constraint('Other must-haves need evidence or clarification', null, true));
  let costFit = sameCurrency && listed !== null && !stale ? clamp(1 - listed / amount) * (total === null ? 0.6 : 1) : 0;
  if (uncertainQuantity) costFit = Math.min(0.25, costFit);
  const problems = checks.filter(check => check.status === 'conflict').map(check => check.label);
  const pending = [...checks.filter(check => check.status === 'unknown').map(check => check.label), ...provenance.pending];
  const evidence = clamp(offer.confidence * (stale ? 0.45 : 1) - Math.min(0.4, pending.length * 0.05));
  const rating = offer.rating ? offer.rating.value / offer.rating.scale * offer.rating.count / (offer.rating.count + 25) : 0;
  const softFit = result.soft.length ? result.soft.filter(check => check.status === 'pass').length / result.soft.length : null;
  const quality = preference === 'speed' ? Number(Boolean(offer.deliveryDate || offer.attrs.slot)) :
    preference === 'returns' ? Number(offer.attrs.cancelable === true || offer.returns?.eligible === true) : rating;
  const fit = clamp(result.match * (softFit === null ? 1 : 0.75 + 0.25 * softFit));
  const components = [fit, costFit, evidence, quality];
  const score = Math.round(components.reduce((sum, part, index) => sum + part * weights[index], 0));
  const identity = intent.module.identity(offer.attrs, offer);
  const row = { ...result, offer, provenance, listed, total, score, problems, pending, evidence, match: fit, identity, checks, stale, components };
  return { ...row, status: quoteStatus(row) };
}

export function evaluateIntent(intent, offers, preference = 'balanced', now = Date.now()) {
  if (!intent.module) return { rows: [], groups: [] };
  if (intent.category === 'games') return games.evaluate(offers, intent, preference, now);
  const weights = (profiles[preference] || profiles.balanced).weights;
  const prepared = offers.filter(offer => offer.category === intent.category)
    .map(offer => evaluatedOffer(offer, intent, weights, preference, now)).filter(Boolean);
  if (intent.category === 'consumables' && preference === 'price') {
    applyUnitPricePreference(prepared, intent, weights);
  }
  const rows = prepared.sort((a, b) =>
    (a.offer.price?.currency || '').localeCompare(b.offer.price?.currency || '') ||
    Number(Boolean(a.problems.length)) - Number(Boolean(b.problems.length)) ||
    Number(Boolean(a.pending.length)) - Number(Boolean(b.pending.length)) || b.score - a.score ||
    a.offer.title.localeCompare(b.offer.title));
  const groups = new Map();
  for (const row of rows) {
    if (row.problems.length || row.provenance.tier === 'observation') continue;
    const currency = row.offer.price?.currency || '';
    const a = row.offer.attrs;
    const terms = [row.quantity, a.deliveryThreshold, a.subscription, a.warrantyMonths, a.cancelable,
      a.cancelTerms, a.minimumCharge, a.slot, row.offer.deliveryDate, row.offer.returns?.label, row.total !== null];
    const basis = row.identity && row.offer.price?.kind === 'fixed' && row.equivalenceTerms !== null &&
      JSON.stringify([row.identity, currency, row.provenance.tier, row.stale, terms]);
    const groupKey = basis || JSON.stringify([row.offer.provider, row.offer.id, currency]);
    if (!groups.has(groupKey)) groups.set(groupKey, { title: row.offer.title, rows: [], comparable: Boolean(basis), currency });
    groups.get(groupKey).rows.push(row);
  }
  for (const group of groups.values()) {
    group.horizontal = Boolean(group.comparable && new Set(group.rows.map(row => key(row.offer.merchant) || row.offer.provider)).size > 1);
  }
  labelAlternatives(intent, rows);
  return { rows, groups: [...groups.values()] };
}

function labelAlternatives(intent, rows) {
  const base = new Map();
  for (const row of rows) {
    if (row.problems.length || !row.identity) continue;
    const currency = row.offer.price?.currency;
    const a = row.offer.attrs;
    const family = a.family || a.product || a.service;
    if (!currency || !family) continue;
    const mapKey = JSON.stringify([currency, family]);
    const prior = base.get(mapKey);
    if (!prior) {
      base.set(mapKey, row);
      continue;
    }
    if (prior.identity === row.identity) continue;
    if (intent.category === 'electronics' && row.relation === 'Requested model and configuration') {
      const b = prior.offer.attrs;
      if (a.model === b.model && a.storageGB !== null && b.storageGB !== null && a.storageGB !== b.storageGB) {
        row.relation = a.storageGB + ' GB configuration · compared with ' + b.storageGB + ' GB';
      } else if (a.model === b.model) row.relation = 'Different configuration or terms for ' + a.model;
    } else if (intent.category === 'consumables' && row.priceBasis && prior.priceBasis &&
        row.priceBasis.unit === prior.priceBasis.unit && row.priceBasis.size !== prior.priceBasis.size) {
      row.relation = 'Different pack size · compare cost per ' + row.priceBasis.unit;
    } else if (intent.category === 'services' && row.relation === 'Service package, duration and appointment') {
      row.relation = 'Different package, duration or party size for ' + a.service;
    }
  }
}

function applyUnitPricePreference(rows, intent, weights) {
  const comparable = rows.filter(row => row.priceBasis?.product && !row.stale && !row.problems.length &&
    row.offer.price.currency === intent.brief.budget.currency);
  const basis = row => JSON.stringify([row.priceBasis.product, row.offer.attrs.brand, row.offer.attrs.variant,
    row.priceBasis.unit, row.priceBasis.total === null, row.provenance.tier, row.offer.attrs.subscription]);
  const minima = new Map();
  for (const row of comparable) {
    const amount = row.priceBasis.total ?? row.priceBasis.amount;
    minima.set(basis(row), Math.min(minima.get(basis(row)) ?? Infinity, amount));
  }
  for (const row of comparable) {
    const peers = comparable.filter(other => basis(other) === basis(row));
    if (peers.length < 2) continue;
    const amount = row.priceBasis.total ?? row.priceBasis.amount;
    const ratio = amount === 0 ? 1 : (minima.get(basis(row)) / amount);
    const unitFit = ratio * (row.priceBasis.total === null ? 0.6 : 1);
    row.components[1] = (row.components[1] + unitFit) / 2;
    row.score = Math.round(row.components.reduce((sum, part, index) => sum + part * weights[index], 0));
    row.unitPriority = true;
  }
}

export function combinedCost(comparisons, budget) {
  if (comparisons.length < 2) return null;
  const picks = comparisons.map(({ rows }) => rows.filter(row => {
    return row.status === 'confirmed' && row.offer.price?.currency === budget.currency;
  }).sort((a, b) => a.total - b.total)[0]);
  if (picks.some(row => !row)) return { status: 'unknown' };
  const sum = Math.round(picks.reduce((total, row) => total + row.total, 0) * 1000) / 1000;
  return { status: sum <= budget.amount ? 'pass' : 'conflict', sum, currency: budget.currency, picks };
}
