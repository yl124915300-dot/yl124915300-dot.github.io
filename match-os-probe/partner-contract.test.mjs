import test from 'node:test';
import assert from 'node:assert/strict';
import { createPartnerClient, PartnerFailure, selectOfferOption, validateReadyCart, verifyOrderAgainstCart, hasConfirmedCJ } from '../match-os/partner/core.mjs';

// All examples here are synthetic and never touch the live Partner API.
const P = '0b6f7a52-3c1d-4e8a-9f20-5d7c1a2b3c4d';
const O = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const CART = 'a879ee46-50e3-47e8-8ee9-f1df693ff010';
const BOOKING = '5d0c2f3a-8b1e-4c7d-a9f0-1e2d3c4b5a69';
const DECISION = '632e8a51-8d85-46e8-a64a-2b7eea8eab7c';
const API_KEY = 'grpn_aabbccdd_' + 'a'.repeat(56);
const product = { id: P, title: 'Synthetic 60-minute massage', status: 'active', availabilityRequired: false,
  finePrint: ['Appointment required'], options: [{ id: O, title: 'One 60-minute massage', active: true,
    minUnits: 1, maxUnits: 5, selections: [], price: { retail: 4500, currency: 'USD', currencyPrecision: 2 } }] };
const quote = { optionId: O, quantity: 1, agreedPrice: 4500 };
const decision = selectOfferOption(product, quote);
const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const fails = (call, code) => assert.throws(call, e => e instanceof PartnerFailure && e.code === code);

test('CJ publisher is only confirmed by Groupon on storefront /me', () => {
  assert.equal(hasConfirmedCJ({ cjPublisherId: '1234567' }), true);
  assert.equal(hasConfirmedCJ({ data: { cjPublisherId: '1234567' } }), true);
  assert.equal(hasConfirmedCJ({ cjPublisherId: null, cjStatus: 'APPROVED' }), false);
  assert.equal(hasConfirmedCJ({ status: 'ACTIVE', cjPublisherId: null }), false);
  assert.equal(hasConfirmedCJ({ cjPublisherId: 'not-a-pid' }), false);
});
test('server credential is mandatory; no fake or browser token accepted', () => {
  fails(() => createPartnerClient({ apiKey: '' }), 'KEY_REQUIRED');
  fails(() => createPartnerClient({ apiKey: 'groupon' }), 'KEY_REQUIRED');
  const partner = createPartnerClient({ apiKey: API_KEY, fetchImpl: async () => response(200, {}) });
  assert.ok(partner);
});

test('a selected exact US option must be actively sold and explicitly priced to the shopper', () => {
  assert.deepEqual(decision, {
    productId: P, optionId: O, quantity: 1, expectedPrice: 4500, currency: 'USD', currencyPrecision: 2,
    productTitle: 'Synthetic 60-minute massage', optionTitle: 'One 60-minute massage',
    finePrint: ['Appointment required'],
  });
  fails(() => selectOfferOption(product, { ...quote, agreedPrice: 4400 }), 'PRICE_CHANGED');
  fails(() => selectOfferOption(product, { ...quote, optionId: CART }), 'OPTION_MISMATCH');
  fails(() => selectOfferOption(product, { ...quote, quantity: 6 }), 'QUANTITY_INVALID');
  fails(() => selectOfferOption({ ...product, status: 'sold_out' }, quote), 'PRODUCT_NOT_BUYABLE');
  fails(() => selectOfferOption({ ...product, availabilityRequired: true }, quote), 'BOOKING_REQUIRED');
  fails(() => selectOfferOption({ ...product, options: [{ ...product.options[0], active: false }] }, quote), 'OPTION_NOT_BUYABLE');
  fails(() => selectOfferOption({ ...product, options: [{ ...product.options[0], selections: [{ required: true }] }] }, quote), 'SELECTION_REQUIRED');
  fails(() => selectOfferOption({ ...product, options: [{ ...product.options[0], price: null }] }, quote), 'PRICE_UNVERIFIED');
  fails(() => selectOfferOption({ ...product, options: [{ ...product.options[0], price: { retail: 4500, currency: 'EUR', currencyPrecision: 2 } }] }, quote), 'MARKET_MISMATCH');
});

test('only authentic, active, fully matched carts may expose the upstream link unchanged', () => {
  const buyLink = 'https://www.groupon.com/checkout/synthetic?utm_source=cj&utm_medium=afl';
  const cart = { id: CART, status: 'ACTIVE', clientReference: DECISION, buyLink, items: [
    { productId: P, optionId: O, quantity: 1, available: true }] };
  const result = validateReadyCart(cart, decision);
  assert.equal(result.buyLink, buyLink);
  assert.equal(result.finalTotal, 'UNKNOWN');
  assert.equal(result.orderVerified, false);
  assert.equal(result.commissionVerified, false);
  fails(() => validateReadyCart({ ...cart, status: 'CHECKED_OUT' }, decision), 'CART_NOT_READY');
  fails(() => validateReadyCart({ ...cart, buyLink: 'http://example.com' }, decision), 'CART_NOT_READY');
  fails(() => validateReadyCart({ ...cart, items: [{ ...cart.items[0], available: false }] }, decision), 'CART_ITEM_UNVERIFIED');
  fails(() => validateReadyCart({ ...cart, items: [{ ...cart.items[0], optionId: BOOKING }] }, decision), 'CART_ITEM_UNVERIFIED');
  fails(() => validateReadyCart({ ...cart, messages: ['price_unavailable'] }, decision), 'CART_ITEMS_DECLINED');
  fails(() => validateReadyCart({ ...cart, items: [...cart.items, { ...cart.items[0], optionId: BOOKING }] },
    decision), 'CART_LINES_UNVERIFIED');
  fails(() => validateReadyCart({ ...cart, clientReference: CART },
    { ...decision, clientReference: DECISION }), 'CART_REFERENCE_MISMATCH');
  assert.equal(validateReadyCart(cart, { ...decision, clientReference: DECISION }).status, 'READY');
});

test('order UUID alone is not purchase; exact product, option, quantity and status are necessary', () => {
  const ok = { id: BOOKING, status: 'CONFIRMED', items: [
    { productId: P, optionId: O, quantity: 1, status: 'CONFIRMED',
      unitItems: [{ id: '79a4ff35-0c55-4908-b5f1-20f50e8397ee', status: 'CONFIRMED' }] }] };
  assert.deepEqual(verifyOrderAgainstCart(ok, decision), {
    status: 'CONFIRMED', merchantOrderVerified: true, commissionVerified: false });
  assert.equal(verifyOrderAgainstCart({ ...ok, status: 'REDEEMED', items: [{ ...ok.items[0], status: 'REDEEMED' }] }, decision).merchantOrderVerified, true);
  assert.equal(verifyOrderAgainstCart({ ...ok, id: null }, decision).merchantOrderVerified, false);
  assert.equal(verifyOrderAgainstCart({ ...ok, items: [{ ...ok.items[0], optionId: CART }] }, decision).status, 'ITEM_MISMATCH');
  assert.equal(verifyOrderAgainstCart({ ...ok, items: [...ok.items, ok.items[0]] }, decision).status, 'ITEM_MISMATCH');
  assert.equal(verifyOrderAgainstCart({ ...ok, items: [{ ...ok.items[0], unitItems: [] }] }, decision).status, 'ITEM_MISMATCH');
  assert.equal(verifyOrderAgainstCart({ ...ok, items: [{ ...ok.items[0], unitItems: [{ status: 'ON_HOLD' }] }] }, decision).status, 'ITEM_MISMATCH');
  assert.equal(verifyOrderAgainstCart({ ...ok, items: [{ ...ok.items[0], unitItems: [{ status: 'REFUNDED' }] }] }, decision).status, 'REFUNDED');
  assert.equal(verifyOrderAgainstCart({ ...ok, items: [{ ...ok.items[0], status: 'ON_HOLD' }] }, decision).status, 'ITEM_MISMATCH');
  for (const status of ['REFUNDED', 'PENDING', 'ON_HOLD', 'REJECTED', 'CANCELLED', 'EXPIRED']) {
    const result = verifyOrderAgainstCart({ ...ok, status }, decision);
    assert.equal(result.merchantOrderVerified, false);
    assert.equal(result.commissionVerified, false);
  }
  assert.equal(verifyOrderAgainstCart({ ...ok, status: 'REFUNDED' }, decision).status, 'REFUNDED');
  assert.equal(verifyOrderAgainstCart({ ...ok, clientReference: DECISION },
    { ...decision, clientReference: DECISION }).merchantOrderVerified, true);
  assert.equal(verifyOrderAgainstCart({ ...ok, clientReference: CART },
    { ...decision, clientReference: DECISION }).status, 'ITEM_MISMATCH');
  assert.equal(verifyOrderAgainstCart({ ...ok, status: 'DOES_NOT_EXIST' }, decision).status, 'UNKNOWN');
});

test('US Partner API search is bounded, authorized and never sends buyer identity', async () => {
  const calls = [];
  const client = createPartnerClient({ apiKey: API_KEY, newRequestId: () => DECISION,
    fetchImpl: async (url, options) => { calls.push({ url, ...options }); return response(200, { data: [product] }); } });
  await client.search({ q: 'massage', city: 'Austin', limit: 5 });
  assert.equal(calls.length, 1);
  const u = new URL(calls[0].url);
  assert.equal(u.origin, 'https://api-core.livingsocial.com');
  assert.equal(u.pathname, '/partner_storefront/products/search');
  assert.equal(u.searchParams.get('country'), 'US');
  assert.equal(u.searchParams.get('limit'), '5');
  assert.equal(u.searchParams.has('email'), false);
  assert.equal(calls[0].headers.Authorization, 'Bearer ' + API_KEY);
  assert.equal(calls[0].headers['x-request-id'], DECISION);
  fails(() => client.search({ q: 'a'.repeat(201) }), 'QUERY_INVALID');
  fails(() => client.search({ q: 'massage', limit: 100 }), 'QUERY_INVALID');
});

test('creating a live cart is a one-shot explicit action, and a timeout never implies success', async () => {
  const calls = [];
  const client = createPartnerClient({ apiKey: API_KEY,
    fetchImpl: async (url, options) => {
      calls.push({ url, ...options });
      if (options.method === 'POST') return response(200, { id: CART, status: 'ACTIVE',
        buyLink: 'https://www.groupon.com/checkout/synthetic',
        items: [{ productId: P, optionId: O, quantity: 1, available: true }] });
      return response(200, { id: P, options: [] });
    },
    newRequestId: () => DECISION });
  const created = await client.createCart(decision, DECISION);
  assert.equal(created.id, CART);
  const body = JSON.parse(calls[0].body);
  assert.deepEqual(body, { country: 'US', clientReference: DECISION, items: [
    { productId: P, optionId: O, quantity: 1, expectedPrice: 4500 }] });
  fails(() => client.createCart(decision, 'random-person@example.test'), 'CART_SELECTION_INVALID');
  const broken = createPartnerClient({ apiKey: API_KEY, fetchImpl: async () => { throw Error('timeout'); } });
  await assert.rejects(broken.createCart(decision, DECISION), e => e.code === 'UPSTREAM_UNAVAILABLE');
});

test('errors never echo request fields, secrets or buyers', async () => {
  const client = createPartnerClient({ apiKey: API_KEY, fetchImpl: async () =>
    response(409, { details: { error: 'PRICE_MISMATCH', currentPrice: 4600 } }) });
  await assert.rejects(client.createCart(decision, DECISION), e => {
    assert.equal(e.code, 'PRICE_MISMATCH');
    assert.doesNotMatch(e.message, /grpn_|@|4600/);
    return true;
  });
});


test('gateway remains disabled without private key, D1 and Turnstile; foreign origin rejected', async () => {
  const { default: gateway } = await import('../match-os/partner/gateway-worker.mjs');
  const base = 'https://partner-test.example';
  const health = await gateway.fetch(new Request(base + '/health'), {});
  assert.equal((await health.json()).connected, false);
  const request = new Request(base + '/v1/cart', {
    method: 'POST', headers: { Origin: 'https://yl124915300-dot.github.io',
      'Content-Type': 'application/json' }, body: JSON.stringify({ decisionToken: 'fake' }) });
  const blocked = await gateway.fetch(request, {});
  assert.equal(blocked.status, 503);
  assert.equal((await blocked.json()).error, 'PARTNER_NOT_CONNECTED');
  const foreign = await gateway.fetch(new Request(base + '/v1/cart', {
    method: 'POST', headers: { Origin: 'https://untrusted.example',
      'Content-Type': 'application/json' }, body: '{}' }), {});
  assert.equal(foreign.status, 403);
  assert.equal((await foreign.json()).error, 'ORIGIN_REFUSED');
});

test('synthetic gateway: one buyer decision yields one cart and only a matched confirmed order', async () => {
  const { default: gateway } = await import('../match-os/partner/gateway-worker.mjs');
  const origin = 'https://yl124915300-dot.github.io';
  const base = 'https://partner-test.example';
  const decisions = new Map();
  let creates = 0;
  let checkedOut = false;
  let cjConfirmed = true;
  const database = { prepare(sql) { return { bind(...args) { return {
    async run() {
      if (sql.startsWith('INSERT OR IGNORE')) {
        if (decisions.has(args[0])) return { meta: { changes: 0 } };
        decisions.set(args[0], { id: args[0], status: args[1], product_id: args[2],
          option_id: args[3], quantity: args[4], agreed_price: args[5], cart_id: null });
        return { meta: { changes: 1 } };
      }
      if (sql.startsWith('UPDATE partner_decisions')) {
        const row = decisions.get(args[3]);
        assert.ok(row);
        row.status = args[0];
        row.cart_id = args[1] || row.cart_id;
        row.order_id = args[2] || row.order_id;
        return { meta: { changes: 1 } };
      }
      throw Error('Unexpected SQL');
    },
    async first() {
      assert.ok(sql.startsWith('SELECT * FROM partner_decisions'));
      return decisions.get(args[0]) || null;
    },
  }; } }; } };
  const env = { MATCH_OS_PARTNER_LIVE_ENABLED: 'true', MATCH_OS_GROUPON_API_KEY: API_KEY,
    MATCH_OS_TOKEN_KEY: 'synthetic-private-HMAC-key-with-64-random-characters-not-production',
    MATCH_OS_TURNSTILE_SECRET: 'synthetic-secret', MATCH_OS_DB: database };
  const savedFetch = globalThis.fetch;
  const partnerCart = () => ({
    id: CART, status: checkedOut ? 'CHECKED_OUT' : 'ACTIVE',
    buyLink: checkedOut ? null : 'https://www.groupon.com/checkout/synthetic',
    items: [{ productId: P, optionId: O, quantity: 1, available: true }],
    clientReference: decisions.keys().next().value,
    grouponOrderUuid: checkedOut ? BOOKING : null,
  });
  globalThis.fetch = async (url, options = {}) => {
    const u = new URL(url);
    if (u.hostname === 'challenges.cloudflare.com') return response(200, {
      success: true, hostname: 'yl124915300-dot.github.io' });
    assert.equal(u.hostname, 'api-core.livingsocial.com');
    assert.equal(options.headers.Authorization, 'Bearer ' + API_KEY);
    if (u.pathname === '/partner_storefront/me') return response(200, { cjPublisherId: cjConfirmed ? '1234567' : null });
    if (u.pathname === '/partner_storefront/products/' + P) return response(200, product);
    if (u.pathname === '/partner_storefront/carts') {
      assert.equal(options.method, 'POST');
      creates++;
      return response(200, partnerCart());
    }
    if (u.pathname === '/partner_storefront/carts/' + CART) return response(200, partnerCart());
    if (u.pathname === '/partner_storefront/bookings/' + BOOKING) {
      const reference = decisions.keys().next().value;
      return response(200, {
        id: BOOKING, status: 'CONFIRMED', clientReference: reference,
        items: [{ productId: P, optionId: O, quantity: 1, status: 'CONFIRMED',
          unitItems: [{ id: '79a4ff35-0c55-4908-b5f1-20f50e8397ee', status: 'CONFIRMED' }] }],
      });
    }
    throw Error('Unexpected synthetic request');
  };
  const post = (route, input) => gateway.fetch(new Request(base + route, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }), env);
  try {
    const quoteRes = await post('/v1/quote', { turnstileToken: 'synthetic-turnstile',
      productId: P, optionId: O, quantity: 1, agreedPrice: 4500 });
    assert.equal(quoteRes.status, 200);
    const quoteResponse = await quoteRes.json();
    assert.equal(quoteResponse.selected.expectedPrice, 4500);
    cjConfirmed = false;
    const noCommission = await post('/v1/cart', {
      turnstileToken: 'synthetic-turnstile', decisionToken: quoteResponse.decisionToken });
    assert.equal(noCommission.status, 409);
    assert.equal((await noCommission.json()).error, 'CJ_COMMISSION_NOT_CONFIRMED');
    assert.equal(creates, 0);
    assert.equal(decisions.size, 0, 'Unconfirmed CJ must not consume the decision or create a cart');
    cjConfirmed = true;
    const cartResponse = await post('/v1/cart', {
      turnstileToken: 'synthetic-turnstile', decisionToken: quoteResponse.decisionToken });
    assert.equal(cartResponse.status, 200);
    const cartResult = await cartResponse.json();
    assert.equal(cartResult.status, 'READY');
    assert.match(cartResult.buyLink, /^https:\/\/www\.groupon\.com\//);
    assert.equal(creates, 1);
    const dupResponse = await post('/v1/cart', {
      turnstileToken: 'synthetic-turnstile', decisionToken: quoteResponse.decisionToken });
    assert.equal(dupResponse.status, 200);
    assert.equal(creates, 1, 'Double-click may not create a duplicate live cart');
    checkedOut = true;
    const statusResponse = await post('/v1/status', { statusToken: cartResult.statusToken });
    assert.equal(statusResponse.status, 200);
    const outcome = await statusResponse.json();
    assert.equal(outcome.status, 'CONFIRMED');
    assert.equal(outcome.merchantOrderVerified, true);
    assert.equal(outcome.commissionVerified, false);
    assert.equal(outcome.netRevenue, 'UNKNOWN');
    assert.equal(creates, 1);
  } finally {
    globalThis.fetch = savedFetch;
  }
});
