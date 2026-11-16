import test from 'node:test';
import assert from 'node:assert/strict';
import { createPartnerClient, PartnerFailure, selectOfferOption, validateReadyCart, verifyOrderAgainstCart } from '../match-os/partner/core.mjs';

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
  const cart = { id: CART, status: 'ACTIVE', buyLink, items: [
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
});

test('order UUID alone is not purchase; exact product, option, quantity and status are necessary', () => {
  const ok = { id: BOOKING, status: 'CONFIRMED', items: [
    { productId: P, optionId: O, quantity: 1, status: 'CONFIRMED' }] };
  assert.deepEqual(verifyOrderAgainstCart(ok, decision), {
    status: 'CONFIRMED', merchantOrderVerified: true, commissionVerified: false });
  assert.equal(verifyOrderAgainstCart({ ...ok, status: 'REDEEMED', items: [{ ...ok.items[0], status: 'REDEEMED' }] }, decision).merchantOrderVerified, true);
  assert.equal(verifyOrderAgainstCart({ ...ok, id: null }, decision).merchantOrderVerified, false);
  assert.equal(verifyOrderAgainstCart({ ...ok, items: [{ ...ok.items[0], optionId: CART }] }, decision).status, 'ITEM_MISMATCH');
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
