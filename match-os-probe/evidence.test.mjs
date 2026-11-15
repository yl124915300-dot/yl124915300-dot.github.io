import { createMatchingSession } from '../match-os/matching.js';
import { catalogScope } from '../match-os/catalogs.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { openPriceEntries, searchCatalogs } from '../match-os/catalogs.js';
import { combinedCost, evaluateIntent, localQuote, routeRequest } from '../match-os/transaction.js';

// All response bodies, prices and product details in this file are test fixtures only.
const sampleTime = '2026-11-15T11:15:00Z';
const sampleMs = Date.parse(sampleTime);
const code = '12345670';
const place = { city: 'Testville', code: 'US', region: 'United States' };
const budget = { currency: 'USD', amount: 100 };
const plan = item => routeRequest({ item, budget, place, when: 'just comparing', details: '' });
const [phone, charger] = plan('iPhone 15 128 GB + USB-C charger');
const [pantry] = plan('grocery: Test cereal barcode ' + code);
const draft = {
  id: 'synthetic', title: 'Synthetic listing', merchant: 'Synthetic store',
  url: 'https://example.test/listing', observedAt: '2026-11-15',
  amount: 60, currency: 'USD', shipping: 0, tax: 0, fees: 0, merchantSku: 'TEST-ONLY',
};
const phoneFacts = {
  model: 'iPhone 15', modelCode: 'TEST-A1', brand: 'Apple', storageGB: 128, configuration: 'unlocked',
  region: 'US', condition: 'new', connector: 'USB-C',
};
const manual = (intent, attrs) => localQuote(intent, { ...draft, ...attrs }, attrs.id || 'fixture', sampleTime);
const evaluate = (intent, offers, when = sampleMs) => evaluateIntent(intent, offers, 'balanced', when);
const fullEvidence = {
  tier: 'api', retrievedAt: sampleTime, observedAt: sampleTime, priceValidUntil: '2026-11-16T00:00:00Z',
  identity: { verified: true, identifier: 'TEST-ONLY' },
  availability: { verified: true, state: 'available' },
  scope: { verified: true, market: 'US', city: place.city },
};
const verifiedFixture = (intent, raw) => ({
  ...manual(intent, raw), provider: 'synthetic-test-adapter', provenance: { ...fullEvidence },
  returns: { verified: true, label: 'Synthetic policy' },
});

test('synthetic: user fields and an official-looking URL cannot claim API or observation provenance', () => {
  const quote = manual(phone, {
    ...phoneFacts, url: 'https://api.bestbuy.com/v1/products/TEST-ONLY',
    provider: 'bestbuy', priceTimestamp: sampleTime, provenance: fullEvidence,
  });
  const link = manual(phone, { ...phoneFacts, amount: '', url: quote.sourceUrl, provenance: fullEvidence });
  assert.equal(quote.provenance.tier, 'manual');
  assert.equal(quote.provenance.identity.identifier, 'TEST-ONLY');
  assert.equal(link.provenance.tier, 'link');
  assert.equal(link.price, null);
  assert.ok(evaluate(phone, [quote, link]).rows.every(row => row.status === 'candidate'));
  assert.throws(() => manual(phone, { ...phoneFacts, url: 'javascript:alert(1)' }));
});

test('synthetic: a shared seller SKU does not merge another capacity, regional version, or condition', () => {
  const [intent] = plan('iPhone 15');
  const rows = [phoneFacts, { ...phoneFacts, storageGB: 256 }, { ...phoneFacts, region: 'JP' },
    { ...phoneFacts, condition: 'used' }].map((attrs, index) => manual(intent, { ...attrs, id: String(index) }));
  assert.equal(evaluate(intent, rows).groups.length, 4);
});

test('synthetic: confirmation needs current evidence, exact facts, terms and all-in cost', () => {
  const offer = verifiedFixture(phone, phoneFacts);
  assert.equal(evaluate(phone, [offer]).rows[0].status, 'confirmed');
  for (const patch of [
    { tax: null }, { returns: null },
    { provenance: { ...fullEvidence, identity: null } },
    { provenance: { ...fullEvidence, scope: { ...fullEvidence.scope, city: 'Elsewhere' } } },
    { provenance: { ...fullEvidence, priceValidUntil: 'invalid' } },
    { provenance: { ...fullEvidence, availability: { verified: true, state: 'out of stock' } } },
    { provenance: { ...fullEvidence, observedAt: '2026-11-12T11:15:00Z' } },
    { price: { ...offer.price, currency: 'EUR' } },
  ]) assert.equal(evaluate(phone, [{ ...offer, ...patch }]).rows[0].status, 'candidate');
  const stale = evaluate(phone, [offer], sampleMs + 15 * 60_000).rows[0];
  assert.equal(stale.provenance.tier, 'stale');
  assert.equal(stale.status, 'candidate');
  assert.equal(evaluate(phone, [{ ...offer, attrs: { ...offer.attrs, storageGB: 256 } }]).rows[0].status, 'conflict');
});

test('synthetic: combined budget uses confirmed and same-currency totals only', () => {
  const first = evaluate(phone, [verifiedFixture(phone, phoneFacts)]);
  const accessory = { model: 'Synthetic charger', connector: 'USB-C', compatibleWith: 'iPhone 15', amount: 41 };
  const second = evaluate(charger, [verifiedFixture(charger, accessory)]);
  assert.equal(combinedCost([first, second], budget).status, 'conflict');
  assert.equal(combinedCost([first, second], { ...budget, amount: 101 }).sum, 101);
  assert.equal(combinedCost([first, evaluate(charger, [manual(charger, accessory)])], budget).status, 'unknown');
  assert.equal(combinedCost([first, evaluate(charger, [verifiedFixture(charger, { ...accessory, currency: 'EUR' })])], budget).status, 'unknown');
});

const observation = {
  id: 8, type: 'PRODUCT', product_code: code, price: 4, currency: 'USD', date: '2026-10-15', proof_id: 9,
  proof: { id: 9, draft: false, type: 'PRICE_TAG', date: '2026-10-15', currency: 'USD' },
  product: { code, product_name: 'Test cereal', quantity: '400 g' },
  location: { osm_address_country_code: 'US', osm_address_city: 'Testville', osm_name: 'Synthetic store' },
};

test('synthetic: Open Prices joins matching barcode, country and dated proof; observations do not compute budget or shipping', () => {
  assert.deepEqual(pantry.providers, ['openprices']);
  assert.equal(pantry.barcode, code);
  const format = items => openPriceEntries({ data: { items }, checkedAt: sampleTime,
    source: 'https://example.test/openprices-test-fixture' }, pantry);
  const [offer] = format([observation, { ...observation, product_code: '3017620422003' },
    { ...observation, location: { ...observation.location, osm_address_country_code: 'FR' } },
    { ...observation, proof_id: 10 }, { ...observation, date: '2026-10-16' }]);
  assert.equal(format([observation]).length, 1);
  assert.equal(offer.provenance.identity.specification, '400 g');
  const result = evaluate(pantry, [offer]);
  assert.equal(result.groups.length, 0);
  assert.equal(result.rows[0].provenance.tier, 'observation');
  assert.equal(result.rows[0].status, 'candidate');
  assert.equal(result.rows[0].total, null);
  assert.equal(result.rows[0].listed, null);
  assert.equal(format([{ ...observation, proof: { ...observation.proof, draft: true } }]).length, 0);
});

test('synthetic integration: source failure yields no prices and cancelling propagates the abort', async () => {
  const limited = createMatchingSession({ online: () => true, fetcher: async (_url, { signal }) => {
    signal.throwIfAborted();
    return new Response('', { status: 429 });
  } });
  const signal = new AbortController();
  const scope = catalogScope('openprices', pantry, pantry.brief);
  const approved = new Set([scope]);
  const run = matching => searchCatalogs(pantry, pantry.brief, signal.signal, matching, approved, new Set());
  const [result] = await run(limited);
  assert.equal(result.status, 'rate limited');
  assert.deepEqual(result.offers, []);
  limited.dispose();
  const stalled = createMatchingSession({ online: () => true, fetcher: (_url, { signal: request }) =>
    new Promise((_, reject) => request.addEventListener('abort', () => reject(request.reason), { once: true })) });
  const pending = run(stalled);
  signal.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  stalled.dispose();
});
