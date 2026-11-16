import { normalize, relevance } from './decision.js?v=7';
import { consumables } from './modules/consumables.js?v=7';
import { date, key } from './modules/shared.js?v=7';

import { validBarcode } from './evidence.js?v=7';

const cheapshark = 'https://www.cheapshark.com';
const gamerpower = 'https://www.gamerpower.com';
const livingSocial = 'https://api-core.livingsocial.com/ls_agent_api/offers/search';
const openPrices = 'https://prices.openfoodfacts.org/api/v1';
export const catalogNames = {
  cheapshark: 'CheapShark',
  gamerpower: 'GamerPower',
  livingsocial: 'LivingSocial / Groupon',
  openprices: 'Open Prices',
};
export const catalogDocs = {
  cheapshark: 'https://apidocs.cheapshark.com/',
  gamerpower,
  livingsocial: 'https://agent.livingsocial.com/for-agents',
  openprices: 'https://openfoodfacts.github.io/open-prices/guides/data/',
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

function provenance(tier, read, fields = {}) {
  return {
    tier, retrievedAt: read.checkedAt, cacheValidUntil: read.until, observedAt: null, source: read.source,
    identity: null, scope: null, availability: null, fulfillment: null, ...fields,
  };
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

export function localEntries(read, brief) {
  // The open Agent API and the Partner API currently expose US offers only.
  // Never turn a US offer into a cross-border purchase path.
  if (brief.place.code !== 'US') return [];
  const { data, source, checkedAt } = read;
  if (!Array.isArray(data?.offers)) throw new Error('Unexpected catalog response');
  return data.offers.slice(0, 12).flatMap(raw => {
    const id = label(raw?.id, 100);
    const title = label(raw?.title);
    if (!id || !title || raw.status !== 'active') return [];
    const hosts = ['groupon.com', 'livingsocial.com'];
    const listingUrl = officialUrl(raw.offerUrl, hosts);
    const eligibleToBuy = raw.buyable === true;
    const buyUrl = eligibleToBuy ? officialUrl(raw.buyUrl, hosts) : null;
    const bookingUrl = eligibleToBuy ? officialUrl(raw.bookingUrl, hosts) : null;
    const needsBooking = ['bookable_with_live_times', 'stay', 'shipped'].includes(raw.bookingKind);
    // The open Agent API's buyUrl is for its cheapest option, not evidence that the
    // buyer's exact duration/party/slot is available. Never manufacture a URL.
    const purchaseUrl = needsBooking ? bookingUrl : buyUrl;
    const purchaseKind = purchaseUrl ? (needsBooking ? 'booking' : 'cheapest-option') : null;
    const sourceUrl = listingUrl || purchaseUrl;
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
      id, title, provider: 'livingsocial', sourceUrl, purchaseUrl, purchaseKind, checkedAt, priceTimestamp: asOf,
      provenance: provenance('api', read, { observedAt: asOf, recordId: id,
        identity: { identifier: id, type: 'Catalog listing ID' } }),
      category: 'local_catalog', city: label(raw.city, 80) || null,
      market: brief.place.code, merchant: label(typeof raw.merchant === 'string' ? raw.merchant : raw.merchant?.name, 90),
      price: sourcePrice(raw.price), availability: purchaseUrl ? 'Groupon purchase path available; exact option not verified' : 'Active catalog listing; purchase path unverified',
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
    provenance: provenance('api', read, { recordId: raw.dealID,
      identity: { identifier: gameId, type: 'Catalog game ID', specification: title } }),
    activation: storeId === '1' && appId ? 'steam' : null,
    availability: 'Catalog listing; merchant availability unverified',
    // lastChange is a price-change date rather than confirmation that the listing is stale.
    history, confidence: 0.81,
    raw: { endpoint: read.source, gameId, appId, storeId, dealId: raw.dealID, priceChangedAt: asOf },
  });
}

async function cheapSharkEntries(plan, signal, getJSON) {
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
      provenance: provenance('api', read, { recordId: id,
        identity: { identifier: id, type: 'Giveaway ID', specification: title } }),
      availability: 'Catalog marks claim active', confidence: 0.62,
      restrictions: claimEnd && claimEnd !== 'N/A'
        ? 'Claim end shown by GamerPower: ' + claimEnd + ' (timezone unspecified)' : null,
      raw: { endpoint: read.source, id, platforms: raw.platforms, publishedDate: raw.published_date },
    })];
  }).slice(0, 12);
}

export function openPriceEntries(read, plan, barcodes = [plan.barcode]) {
  if (!Array.isArray(read.data?.items)) throw new Error('Unexpected Open Prices response');
  const offers = [];
  for (const raw of read.data.items) {
    const id = integerId(raw?.id);
    const proofId = integerId(raw?.proof_id);
    const proof = raw?.proof;
    const place = raw?.location;
    const product = raw?.product;
    const observedAt = date(raw?.date);
    const currency = raw?.currency;
    if (!id || !proofId || proofId !== integerId(proof?.id) || proof.draft !== false ||
        !['PRICE_TAG', 'RECEIPT'].includes(proof.type) || raw.type !== 'PRODUCT' ||
        !barcodes.includes(raw.product_code) || (product?.code && product.code !== raw.product_code) || !observedAt || date(proof.date) !== observedAt ||
        Date.parse(observedAt) > Date.parse(read.checkedAt) || !/^[A-Z]{3}$/u.test(currency || '') ||
        (proof.currency && proof.currency !== currency) || !Number.isFinite(raw.price) || raw.price < 0 ||
        place?.osm_address_country_code !== plan.market) continue;

    const code = raw.product_code;
    const title = label(product?.product_name) || label(raw.product_name) || 'Barcode ' + code;
    const merchant = label(place.osm_name) || label(place.osm_brand);
    const specification = label(product?.quantity);
    const attrs = consumables.normalize({ product: title, brand: product?.brands, variant: title });
    const sourceUrl = openPrices + '/prices/' + id;
    offers.push(entry({
      provider: 'openprices', id, title, merchant, sourceUrl, category: 'consumables', attrs,
      city: label(place.osm_address_city), market: plan.market, checkedAt: read.checkedAt,
      priceTimestamp: observedAt, price: { amount: raw.price, currency, kind: 'observation' }, confidence: 0.52,
      provenance: provenance('observation', read, { observedAt, recordId: id,
        proof: { id: proofId, type: proof.type === 'PRICE_TAG' ? 'Shelf tag' : 'Receipt' },
        identity: { identifier: code, type: 'Product barcode', specification },
        scope: { market: plan.market, city: label(place.osm_address_city), verified: false } }),
      restrictions: [
        raw.price_per === 'KILOGRAM' ? 'Reported price per kilogram' :
          raw.price_per === 'UNIT' ? 'Reported price per unit' : 'Observed price as recorded',
        raw.price_is_discounted ? 'Discount observed; eligibility unknown' : '',
      ].filter(Boolean).join(' · '),
    }));
  }
  return offers.slice(0, 8);
}

async function openPriceSearch(plan, signal, getJSON) {
  let codes = [plan.barcode];
  if (!plan.barcode) {
    const { data } = await getJSON(openPrices + '/products', {
      product_name__like: plan.title, price_count__gte: '1', order_by: '-price_count', size: '12',
    }, signal);
    if (!Array.isArray(data?.items)) throw new Error('Unexpected Open Prices product response');
    codes = [...new Set(data.items.filter(product => validBarcode(product?.code) &&
      key(product.product_name) === key(plan.title)).map(product => product.code))].slice(0, 3);
    if (!codes.length) return [];
  }
  const barcodeFilter = codes.length === 1 ? ['product_code', codes[0]] : ['product_code__in', codes.join(',')];
  const params = [barcodeFilter, ['order_by', '-date'], ['size', '50'],
    ['proof__type', 'PRICE_TAG'], ['proof__type', 'RECEIPT']];
  return openPriceEntries(await getJSON(openPrices + '/prices', params, signal), plan, codes);
}

const adapters = {
  openprices: (plan, brief, signal, read) => openPriceSearch(plan, signal, read),
  cheapshark: (plan, brief, signal, read) => cheapSharkEntries(plan, signal, read),
  gamerpower: async (plan, brief, signal, read) =>
    giveawayEntries(await read(gamerpower + '/api/giveaways', { type: 'game' }, signal), plan),
  livingsocial: async (plan, brief, signal, read) => localEntries(await read(livingSocial, {
    q: (plan.title + ' in ' + brief.place.city + ', ' + brief.place.region).slice(0, 200),
    country: plan.market,
    limit: '12',
  }, signal), brief),
};

// A permission is scoped to exactly the information sent to a provider.
export function catalogScope(provider, plan, brief) {
  const query = provider === 'openprices' ? [plan.barcode ? 'barcode' : 'title', plan.barcode || plan.title] :
    provider === 'cheapshark' ? [plan.browseFreeGames ? 'free' : 'title', plan.browseFreeGames ? '' : plan.title] :
    provider === 'livingsocial' ? [plan.title, brief.place.city, brief.place.region, plan.market] : ['game giveaways'];
  return JSON.stringify([provider, ...query]);
}

export async function searchCatalogs(plan, brief, signal, matching, authorized, forced) {
  return Promise.all(plan.providers.map(async provider => {
    const scope = catalogScope(provider, plan, brief);
    if (!authorized.has(scope)) return { provider, status: 'needs approval', offers: [] };
    // Country and game relevance are local filters; they still distinguish fallback snapshots.
    const key = JSON.stringify([scope, plan.market, plan.title, plan.browseFreeGames]);
    const previous = matching.previous(key);
    const reads = [];
    try {
      const offers = await adapters[provider](plan, brief, signal, async (url, query, innerSignal) => {
        const read = await matching.read(url, query, innerSignal, forced.has(scope));
        reads.push(read);
        return read;
      });
      signal.throwIfAborted();
      const stamps = offers.filter(offer => offer.provenance?.tier === 'api').flatMap(offer =>
        [offer.provenance.cacheValidUntil, Date.parse(offer.provenance.priceValidUntil), Date.parse(offer.expires)]
          .filter(deadline => Number.isFinite(deadline)));
      const checkedAt = reads.map(read => read.checkedAt).sort().at(-1);
      const result = { provider, scope, status: 'ok', offers, checkedAt,
        refreshAt: stamps.length ? Math.min(...stamps) : null };
      matching.remember(key, result);
      return result;
    } catch (error) {
      signal.throwIfAborted();
      return { provider, scope, status: error.status || 'unavailable', checkedAt: previous?.checkedAt,
        offers: (previous?.offers || []).map(offer => offer.provenance?.tier !== 'api' ? offer :
          { ...offer, provenance: { ...offer.provenance, tier: 'stale' } }) };
    }
  }));
}
