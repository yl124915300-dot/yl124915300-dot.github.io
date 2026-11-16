import assert from 'node:assert/strict';
import test from 'node:test';
import { gameEntry, localEntries } from '../match-os/catalogs.js';
import { combinedCost, evaluateIntent, liveOffer, localQuote, routeRequest } from '../match-os/transaction.js';

// Synthetic inputs are for deterministic algorithm tests only. No merchant data is represented here.
const now = '2026-11-15T10:00:00Z';
const at = Date.parse(now);
const market = { city: 'Austin', region: 'United States', code: 'US' };
const plan = (item, details = '', overrides = {}) => routeRequest({
  item, details, place: market, when: 'just comparing', budget: { amount: 100, currency: 'USD' }, ...overrides,
});
const synthetic = (intent, attrs = {}, id = '1') => localQuote(intent, {
  title: 'Synthetic quote ' + id, merchant: 'Synthetic merchant ' + id,
  url: 'https://example.test/quote/' + id, amount: 20, currency: 'USD', shipping: 0, tax: 0, fees: 0,
  observedAt: '2026-11-15', ...attrs,
}, id, now);
const evaluate = (intent, offers, preference = 'balanced') => evaluateIntent(intent, offers, preference, at);

test('synthetic: routing covers four categories, unsupported markets and ambiguous requests', () => {
  assert.deepEqual(plan('iPhone 15 + laundry detergent + 60 minute massage + PC game: LEGO Batman')
    .map(i => [i.category, i.providers]), [
    ['electronics', []], ['consumables', ['openprices']], ['services', ['livingsocial']], ['games', ['cheapshark', 'gamerpower']],
  ]);
  assert.equal(plan('something useful')[0].category, 'unclassified');
  assert.equal(plan('PC game: Tunic', '', { place: { ...market, code: 'CA' } })[0].providers.length, 0);
  assert.equal(plan('haircut')[0].title, 'haircut');
  assert.equal(plan('日用品：大米 + 配送')[0].requiresDelivery, true);
  assert.equal(plan('milk + delivery')[0].requiresDelivery, true);
  assert.equal(plan('找手机和充电器').length, 2);
});

test('synthetic: accessory compatibility is an independent required fact and combined price has its own ceiling', () => {
  const [phone, accessory] = plan('iPhone 15 128 GB + USB-C charger');
  assert.equal(accessory.requirements.hard.compatibleWith, 'iphone 15');
  const device = synthetic(phone, { model: 'iPhone 15', storageGB: 128, amount: 80 });
  const cable = synthetic(accessory, { model: 'Wall charger', connector: 'USB-C', compatibleWith: 'iPhone 15', amount: 25 });
  const wrongCable = synthetic(accessory, { model: 'Wall charger', connector: 'USB-C', compatibleWith: 'iPhone 14' });
  assert.match(evaluate(accessory, [wrongCable]).rows[0].problems.join(), /Compatible with/);
  const joined = [evaluate(phone, [device]), evaluate(accessory, [cable])];
  assert.equal(combinedCost(joined, phone.brief.budget).status, 'unknown');
  assert.equal(combinedCost(joined, { currency: 'USD', amount: 106 }).status, 'unknown');
  assert.equal(combinedCost([joined[0], { rows: [] }], phone.brief.budget).status, 'unknown');
});

const deviceFacts = {
  brand: 'Apple', model: 'iPhone 15', modelCode: 'A0001', storageGB: 128,
  configuration: 'Unlocked', region: 'US', condition: 'new', connector: 'USB-C', warrantyMonths: 12,
};
test('synthetic: electronics groups complete same specs and keeps missing, regional and model-number variants apart', () => {
  const [intent] = plan('iPhone 15 128 GB', 'US version; brand new; 12 months warranty');
  const result = evaluate(intent, [
    synthetic(intent, deviceFacts, 'a'),
    synthetic(intent, { ...deviceFacts, brand: '苹果', connector: 'USB C', amount: 30 }, 'b'),
    synthetic(intent, { ...deviceFacts, configuration: '', tax: '' }, 'c'),
    synthetic(intent, { ...deviceFacts, region: 'JP' }, 'd'),
    synthetic(intent, { ...deviceFacts, modelCode: 'A0002' }, 'e'),
  ]);
  assert.equal(result.groups.filter(g => g.horizontal).length, 1);
  assert.equal(result.groups.find(g => g.horizontal).rows.length, 2);
  assert.equal(result.rows.find(r => r.offer.id === 'c').identity, null);
  assert.equal(result.rows.find(r => r.offer.id === 'c').total, null);
  assert.match(result.rows.find(r => r.offer.id === 'd').problems.join(), /Region version/);
  assert.notEqual(result.rows.find(r => r.offer.id === 'e').identity, result.rows.find(r => r.offer.id === 'a').identity);
});

test('synthetic: electronics rejects generation, storage, RAM, condition and warranty conflicts', () => {
  const [intent] = plan('iPhone 15 1 TB', '16 GB RAM; brand new; 12 months warranty');
  const row = evaluate(intent, [synthetic(intent, {
    ...deviceFacts, model: 'iPhone 16', storageGB: 512, condition: 'refurbished', configuration: '8 GB RAM', warrantyMonths: 6,
  })]).rows[0];
  assert.match(row.relation, /Newer generation/);
  assert.deepEqual(new Set(row.problems), new Set(['Storage in GB', 'RAM in GB', 'condition', 'Warranty months', 'Exact model']));
  assert.equal(intent.requirements.hard.storageGB, 1000);
});

test('synthetic: changed electronics quote changes ranking, FX and stale data never establish budget fit', () => {
  const [intent] = plan('iPhone 15 128 GB');
  const a = synthetic(intent, { ...deviceFacts, amount: 60 }, 'a');
  const b = synthetic(intent, { ...deviceFacts, amount: 40 }, 'b');
  assert.equal(evaluate(intent, [a, b], 'price').groups[0].rows[0].offer.id, 'b');
  assert.equal(evaluate(intent, [a, { ...b, price: { ...b.price, amount: 75 } }], 'price').groups[0].rows[0].offer.id, 'a');
  const stale = { ...b, priceTimestamp: '2026-11-01T00:00:00Z' };
  assert.match(evaluate(intent, [stale]).rows[0].pending.join(), /older observation/);
  const euro = synthetic(intent, { ...deviceFacts, currency: 'EUR' }, 'e');
  assert.equal(evaluate(intent, [a, euro]).groups.length, 2);
  assert.match(evaluate(intent, [euro]).rows[0].pending.join(), /currency/);
  assert.deepEqual(evaluate(intent, []), { rows: [], groups: [] });
});

const milk = { product: 'oat milk', brand: 'Synthetic', variant: 'Unsweetened', net: 500, unit: 'ml',
  pieces: 2, bundle: 'uniform pack', minPacks: 1, subscription: 'no', amount: 4 };
test('synthetic: units normalize; package configuration and net dimensions remain distinct', () => {
  const [intent] = plan('oat milk');
  const rows = [
    synthetic(intent, milk, 'a'), synthetic(intent, { ...milk, net: 0.5, unit: 'l' }, 'b'),
    synthetic(intent, { ...milk, net: 1, unit: 'l', pieces: 1, bundle: 'single' }, 'c'),
    synthetic(intent, { ...milk, net: 500, unit: 'g' }, 'd'),
    synthetic(intent, { ...milk, bundle: 'assortment' }, 'e'),
  ];
  const result = evaluate(intent, rows);
  assert.equal(result.groups.length, 4);
  assert.equal(result.groups.filter(g => g.horizontal).length, 1);
  assert.equal(result.groups.find(g => g.horizontal).rows[0].priceBasis.amount, 4);
  assert.notEqual(result.rows.find(r => r.offer.id === 'c').identity, result.rows.find(r => r.offer.id === 'a').identity);
  assert.equal(result.rows.find(r => r.offer.id === 'e').priceBasis, null);
});

test('synthetic: recurring purchases calculate normalized spend and minimum order without claiming unknown tax', () => {
  const [intent] = plan('oat milk', '2.5 L per week; no subscription');
  const a = synthetic(intent, { ...milk, minPacks: 3, tax: '' });
  const row = evaluate(intent, [a]).rows[0];
  assert.deepEqual(row.runRate, { cadence: 'week', packs: 3, restockPeriods: 1.2, subtotal: 12, estimate: 10 });
  assert.equal(row.listed, 12);
  assert.equal(row.total, null);
  assert.equal(row.priceBasis.total, null);
  assert.ok(row.checks.some(c => c.label === 'Subscription required' && c.status === 'pass'));
  const unknown = evaluate(intent, [synthetic(intent, { ...milk, minPacks: '' })]).rows[0];
  assert.equal(unknown.total, null);
  assert.equal(unknown.runRate, null);
  assert.deepEqual(evaluate(intent, []), { rows: [], groups: [] });
});

test('synthetic: subscriptions, expiry, delivery threshold and item quantity are distinct constraints', () => {
  const [intent] = plan('500 ml oat milk + delivery', 'no subscription; order at most 2 packs');
  const offer = synthetic(intent, { ...milk, net: 1000, minPacks: 3, subscription: 'yes',
    expires: '2026-11-14', deliveryThreshold: 20 });
  const [row] = evaluate(intent, [offer]).rows;
  assert.deepEqual(new Set(row.problems), new Set(['Net content per piece', 'Subscription required',
    'Minimum order quantity', 'Product still in date', 'Basket meets delivery threshold']));
  assert.ok(row.alternative);
});

const spa = { service: 'Swedish massage', city: 'Austin', market: 'US', minutes: 60, party: 2,
  package: 'Standard oil massage', coverage: 'On-site', distanceKm: 5, slot: '2026-11-16T18:00:00-06:00', cancelable: 'yes' };
test('synthetic: equivalent service options require matching city, type, party, time length and package', () => {
  const [intent] = plan('60 minute Swedish massage', 'two people; within 4 miles; free cancellation');
  const result = evaluate(intent, [
    synthetic(intent, spa, 'a'), synthetic(intent, spa, 'b'),
    synthetic(intent, { ...spa, party: 1, city: 'Dallas', distanceKm: 8, minimumCharge: 50 }, 'c'),
    synthetic(intent, { ...spa, package: '', priceKind: 'from' }, 'd'),
  ]);
  assert.equal(result.groups.filter(group => group.horizontal).length, 1);
  assert.deepEqual(new Set(result.rows.find(r => r.offer.id === 'c').problems),
    new Set(['Requested city or verified coverage', 'People included', 'Distance within requested radius']));
  assert.match(result.rows.find(r => r.offer.id === 'd').pending.join(), /option price/);
  assert.equal(result.rows.find(r => r.offer.id === 'd').identity, null);
});

test('synthetic: services verify timestamp and package alternatives without treating catalog options as bookable', () => {
  const [intent] = plan('Swedish massage', 'two people; 60 minutes',
    { when: '2026-11-17T00:00:00Z' });
  const [catalog] = localEntries({ source: 'https://example.test/catalog', checkedAt: now, data: { asOf: now, offers: [{
    id: 'x', title: '60 or 90 Minute Swedish Massage for Two', city: 'Austin', status: 'active',
    offerUrl: 'https://www.groupon.com/deals/synthetic', price: { fromMinor: 3500, currency: 'USD' },
  }] } }, intent.brief);
  const result = evaluate(intent, [synthetic(intent, spa, 'a'), liveOffer(intent, catalog),
    synthetic(intent, { ...spa, minutes: 90, slot: '2026-11-17T01:00:00Z' }, 'b')]);
  assert.equal(result.rows[0].offer.id, 'a');
  assert.ok(result.rows[0].checks.some(check => check.label === 'Appointment deadline' && check.status === 'pass'));
  assert.match(result.rows.find(row => row.offer.id === 'x').pending.join(), /Appointment deadline.*Selected option/);
  assert.ok(result.rows.find(row => row.offer.id === 'b').alternative);
  assert.deepEqual(evaluate(intent, []), { rows: [], groups: [] });
});

test('synthetic: game registry preserves catalog game identities, version separation and headline-only prices', () => {
  const [intent] = plan('PC game: Sample Game');
  const stores = new Map([['1', 'Steam'], ['7', 'GOG']]);
  const sample = (game, title, store, price) => gameEntry({ dealID: 'QA' + game + store, storeID: store, price },
    { id: game, title }, stores, { checkedAt: now, source: 'https://example.test/catalog' });
  const offer = sample('40', 'Sample Game', '1', '12.00');
  const equivalent = sample('40', 'Sample Game', '7', '10.00');
  const deluxe = sample('41', 'Sample Game Deluxe', '1', '15.00');
  const result = evaluate(intent, [offer, equivalent, deluxe]);
  assert.equal(result.groups.length, 2);
  assert.equal(result.groups.filter(group => group.sameTitleAcrossStores).length, 1);
  assert.equal(result.rows[0].total, null);
  assert.deepEqual(evaluate(intent, []), { rows: [], groups: [] });
});


test('synthetic: LivingSocial purchase links need active US offers, explicit buyability and trusted URLs', () => {
  const offerUrl = 'https://www.groupon.com/deals/synthetic-qa';
  const buyUrl = 'https://www.groupon.com/checkout/synthetic-qa';
  const bookingUrl = 'https://www.groupon.com/book/synthetic-qa';
  const base = { id: 'synthetic-qa', title: '60-minute massage for one', status: 'active',
    city: 'Austin', offerUrl, buyUrl, buyable: true, price: { fromMinor: 4000, currency: 'USD' } };
  const input = offers => ({ source: 'https://example.test/qa-catalog',
    checkedAt: now, data: { asOf: now, offers } });
  const brief = { place: market };
  const available = localEntries(input([base]), brief)[0];
  assert.equal(available.sourceUrl, offerUrl);
  assert.equal(available.purchaseUrl, buyUrl);
  assert.equal(available.purchaseKind, 'cheapest-option');
  assert.equal(available.price.kind, 'from');
  assert.equal(available.shipping, null);
  assert.equal(available.tax, null);
  assert.equal(localEntries(input([{ ...base, buyable: false }]), brief)[0].purchaseUrl, null);
  assert.equal(localEntries(input([{ ...base, buyUrl: 'https://evil.example/redirect' }]), brief)[0].purchaseUrl, null);
  assert.equal(localEntries(input([{ ...base, buyUrl: 'http://www.groupon.com/checkout/' }]), brief)[0].purchaseUrl, null);
  assert.equal(localEntries(input([{ ...base, bookingKind: 'bookable_with_live_times', bookingUrl }]), brief)[0].purchaseUrl, bookingUrl);
  assert.equal(localEntries(input([{ ...base, bookingKind: 'bookable_with_live_times' }]), brief)[0].purchaseUrl, null);
  assert.equal(localEntries(input([{ ...base, status: 'expired' }]), brief).length, 0);
  assert.equal(localEntries(input([base]), { place: { ...market, code: 'CA' } }).length, 0);
  assert.deepEqual(plan('Swedish massage', '', { place: { ...market, code: 'CA' } })[0].providers, []);
});
