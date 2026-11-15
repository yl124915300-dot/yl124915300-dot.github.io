import { normalize, relevance } from './decision.js?v=4';

const cheapshark = 'https://www.cheapshark.com';
const gamerpower = 'https://www.gamerpower.com';
const livingSocial = 'https://api-core.livingsocial.com/ls_agent_api/offers/search';
export const catalogNames = {
  cheapshark: 'CheapShark',
  gamerpower: 'GamerPower',
  livingsocial: 'LivingSocial / Groupon',
};
export const catalogDocs = {
  cheapshark: 'https://apidocs.cheapshark.com/',
  gamerpower,
  livingsocial: 'https://agent.livingsocial.com/for-agents',
};

const label = (value, limit = 180) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const integerId = value => /^\d{1,12}$/.test(value) ? String(value) : '';
const timestamp = value => typeof value === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/u.test(value) &&
  Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
const epoch = value => Number.isInteger(value) && value > 0 && value < 4102444800
  ? new Date(value * 1000).toISOString() : null;

function dollars(value) {
  if (typeof value !== 'string' || !/^\d{1,6}(?:\.\d{1,2})?$/.test(value)) return null;
  return Number(value);
}

function officialUrl(raw, hosts) {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && hosts.some(host => url.hostname === host || url.hostname.endsWith('.' + host)) &&
      !url.username && !url.password && !url.port && url.href.length <= 2000 ? url.href : null;
  } catch {
    return null;
  }
}

function sourcePrice(raw) {
  const minor = raw?.fromMinor ?? raw?.amountMinor;
  const currency = label(raw?.currency, 3).toUpperCase();
  if (!Number.isSafeInteger(minor) || minor < 0 || !/^[A-Z]{3}$/.test(currency)) return null;
  const digits = raw.currencyExponent ?? raw.currencyPrecision;
  // A missing exponent leaves the amount unverified outside currencies with known exponents.
  const exponent = Number.isInteger(digits) && digits >= 0 && digits <= 3 ? digits : ({ USD: 2, CAD: 2 })[currency];
  if (exponent === undefined) return null;
  return { amount: minor / 10 ** exponent, currency, kind: 'from' };
}

function entry(fields) {
  return {
    identity: null, model: null, variant: null, condition: null, sellerRegion: null,
    market: null, city: null, storeId: null, merchant: null, activation: null,
    price: null, priceTimestamp: null, shipping: null, tax: null, fees: null, availability: null,
    delivery: null, returns: null, serviceScope: null, restrictions: null, expires: null,
    serviceOptions: null, rating: null, history: null, tco: null, confidence: 0,
    ...fields,
  };
}

async function getJSON(url, params, signal) {
  const endpoint = new URL(url);
  if (params) endpoint.search = new URLSearchParams(params);
  const response = await fetch(endpoint, {
    mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error',
    headers: { Accept: 'application/json' }, signal, cache: 'no-store',
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  // The upstream URL is retained as evidence. It is session-local and never logged.
  return { data: await response.json(), source: endpoint.href, checkedAt: new Date().toISOString() };
}

export function localEntries(read, brief) {
  const { data, source, checkedAt } = read;
  if (!Array.isArray(data?.offers)) throw new Error('Unexpected catalog response');
  return data.offers.slice(0, 12).flatMap(raw => {
    const id = label(raw?.id, 100);
    const title = label(raw?.title);
    if (!id || !title || raw.status !== 'active') return [];
    const hosts = ['groupon.com', 'livingsocial.com'];
    const sourceUrl = officialUrl(raw.offerUrl, hosts) || officialUrl(raw.buyUrl, hosts) || officialUrl(raw.bookingUrl, hosts);
    if (!sourceUrl) return [];
    const duration = [...title.matchAll(/\b(\d{1,3})(?:\s*(?:or|and)\s*(\d{1,3}))?\s*[- ]?minutes?\b/giu)]
      .flatMap(match => [Number(match[1]), Number(match[2])].filter(Number.isFinite));
    const party = [];
    if (/\b(?:for one|single person|solo)\b/iu.test(title)) party.push(1);
    if (/\b(?:for two|couples?)\b/iu.test(title)) party.push(2);
    const asOf = timestamp(data.asOf);
    const review = raw.merchantRating;
    const rating = Number.isFinite(review?.average) && review.average >= 0 && review.average <= 5 &&
      Number.isSafeInteger(review.count) && review.count > 0 ? { value: review.average, count: review.count, scale: 5 } : null;
    return [entry({
      id, title, provider: 'livingsocial', sourceUrl, checkedAt, priceTimestamp: asOf,
      category: 'local_catalog', city: label(raw.city, 80) || null,
      market: brief.place.code, merchant: label(typeof raw.merchant === 'string' ? raw.merchant : raw.merchant?.name, 90),
      price: sourcePrice(raw.price), availability: raw.buyable ? 'Catalog lists purchase option' : 'Active catalog listing',
      serviceScope: label(raw.category, 100), serviceOptions: { duration, party }, restrictions: label(raw.restrictions, 220),
      expires: timestamp(raw.endsAt), rating, confidence: asOf ? 0.74 : 0.57,
      raw: { endpoint: source, id, category: raw.category, bookingKind: raw.bookingKind },
    })];
  });
}

function dealURL(dealId) {
  if (typeof dealId !== 'string' || dealId.length > 250) return null;
  try {
    const id = decodeURIComponent(dealId);
    if (!/^[A-Za-z0-9+/=_-]+$/.test(id)) return null;
    const target = new URL('/redirect', cheapshark);
    target.searchParams.set('dealID', id);
    return target.href;
  } catch {
    return null;
  }
}

function listStores(payload) {
  if (!Array.isArray(payload)) throw new Error('Unexpected store directory');
  return new Map(payload.filter(store => store?.isActive === 1 || store?.isActive === '1')
    .map(store => [integerId(store.storeID), label(store.storeName, 75)]));
}

export function gameEntry(raw, game, stores, read, history = null) {
  const gameId = integerId(game?.id);
  const storeId = integerId(raw?.storeID);
  const sourceUrl = dealURL(raw?.dealID);
  const title = label(game?.title);
  const amount = dollars(raw?.price ?? raw?.salePrice);
  const merchant = stores.get(storeId);
  if (!gameId || !storeId || !merchant || !sourceUrl || !title || amount === null) return null;
  const asOf = epoch(raw.lastChange);
  const appId = integerId(game.steamAppID);
  return entry({
    id: raw.dealID, title, category: 'pc_game', model: title, variant: 'Digital PC listing', market: 'US',
    sourceUrl, provider: 'cheapshark', storeId: 'cheapshark:' + storeId, merchant, checkedAt: read.checkedAt,
    identity: { key: 'cheapshark:' + gameId + ':' + normalize(title), kind: 'catalog-game', steamAppId: appId || null },
    price: { amount, currency: 'USD', kind: 'fixed' }, shipping: 0,
    activation: storeId === '1' && appId ? 'steam' : null,
    availability: 'Catalog listing; merchant availability unverified',
    // lastChange is a price-change date rather than confirmation that the listing is stale.
    history, confidence: 0.81,
    raw: { endpoint: read.source, gameId, appId, storeId, dealId: raw.dealID, priceChangedAt: asOf },
  });
}

async function cheapSharkEntries(plan, signal) {
  const base = cheapshark + '/api/1.0/';
  const [read, storeRead] = await Promise.all([
    getJSON(base + (plan.browseFreeGames ? 'deals' : 'games'), plan.browseFreeGames
      ? { upperPrice: '0.01', pageSize: '24', sortBy: 'Price' }
      : { title: plan.title, limit: '12' }, signal),
    getJSON(base + 'stores', null, signal),
  ]);
  if (!Array.isArray(read.data)) throw new Error('Unexpected game search response');
  const stores = listStores(storeRead.data);
  if (plan.browseFreeGames) {
    return read.data.filter(row => dollars(row?.salePrice) === 0).map(raw => gameEntry(
      raw, { id: raw.gameID, title: raw.title, steamAppID: raw.steamAppID }, stores, read,
    )).filter(Boolean);
  }
  const candidates = read.data.filter(row => integerId(row?.gameID) && relevance(plan.title, row.external) >= 0.6)
    .sort((a, b) => relevance(plan.title, b.external) - relevance(plan.title, a.external)).slice(0, 5);
  if (!candidates.length) return [];
  const ids = candidates.map(row => row.gameID);
  const details = await getJSON(base + 'games', { ids: ids.join(',') }, signal);
  if (!details.data || typeof details.data !== 'object' || Array.isArray(details.data)) {
    throw new Error('Unexpected game lookup response');
  }
  // One exact (or closest) edition lookup supplies its dated historical low, where published.
  const primary = ids[0];
  const historicRead = await getJSON(base + 'games', { id: primary }, signal)
    .catch(error => { if (signal.aborted) throw error; return null; });
  const historic = historicRead?.data?.cheapestPriceEver;
  const historicPrice = dollars(historic?.price);
  const historicDate = epoch(historic?.date);
  return ids.flatMap(id => {
    const game = details.data[id];
    if (!game || !Array.isArray(game.deals)) return [];
    const history = String(id) === String(primary) && historicPrice !== null && historicDate &&
      normalize(historicRead?.data?.info?.title) === normalize(game.info?.title)
      ? { amount: historicPrice, currency: 'USD', at: historicDate, source: historicRead.source } : null;
    return game.deals.map(raw => gameEntry(raw, { id, ...game.info }, stores, details, history)).filter(Boolean);
  });
}

export function giveawayEntries(read, plan) {
  if (!Array.isArray(read.data)) throw new Error('Unexpected giveaway response');
  return read.data.flatMap(raw => {
    const platforms = label(raw?.platforms, 200).split(/,\s*/u).map(normalize);
    const id = integerId(raw?.id);
    const title = label(raw?.title);
    if (raw?.status !== 'Active' || raw.type !== 'Game' || !platforms.includes('pc') || !id || !title) return [];
    const sourceUrl = officialUrl(raw.gamerpower_url, ['gamerpower.com']);
    if (!sourceUrl || (!plan.browseFreeGames && relevance(plan.title, title) < 0.6)) return [];
    const platform = ['steam', 'gog', 'epic games store', 'itch io'].find(name => platforms.includes(name));
    const claimEnd = label(raw.end_date, 40);
    if (/^\d{4}-\d{2}-\d{2} /u.test(claimEnd)) {
      const latestEnd = Date.parse(claimEnd.replace(' ', 'T') + 'Z') + 14 * 60 * 60 * 1000;
      if (latestEnd < Date.parse(read.checkedAt)) return [];
    }
    return [entry({
      provider: 'gamerpower', title, id, sourceUrl, checkedAt: read.checkedAt,
      category: 'pc_game', variant: 'Digital PC giveaway',
      market: 'US', merchant: platform || null, activation: platform || (platforms.includes('drm free') ? 'drm free' : null),
      price: { amount: 0, currency: 'USD', kind: 'giveaway' }, shipping: 0,
      availability: 'Catalog marks claim active', confidence: 0.62,
      restrictions: claimEnd && claimEnd !== 'N/A'
        ? 'Claim end shown by GamerPower: ' + claimEnd + ' (timezone unspecified)' : null,
      raw: { endpoint: read.source, id, platforms: raw.platforms, publishedDate: raw.published_date },
    })];
  }).slice(0, 12);
}

const adapters = {
  cheapshark: (plan, brief, signal) => cheapSharkEntries(plan, signal),
  gamerpower: async (plan, brief, signal) =>
    giveawayEntries(await getJSON(gamerpower + '/api/giveaways', { type: 'game' }, signal), plan),
  livingsocial: async (plan, brief, signal) => localEntries(await getJSON(livingSocial, {
    q: (plan.title + ' in ' + brief.place.city + ', ' + brief.place.region).slice(0, 200),
    country: plan.market,
    limit: '12',
  }, signal), brief),
};

export async function searchCatalogs(plan, brief, signal) {
  const results = await Promise.all(plan.providers.map(async provider => {
    try {
      const offers = await adapters[provider](plan, brief, AbortSignal.any([signal, AbortSignal.timeout(9500)]));
      return { provider, status: 'ok', offers };
    } catch (error) {
      if (signal.aborted) throw error;
      const status = error.name === 'TimeoutError' ? 'timed out' :
        error.message === 'HTTP 429' ? 'rate limited' : 'unavailable';
      return { provider, status, offers: [] };
    }
  }));
  return results;
}
