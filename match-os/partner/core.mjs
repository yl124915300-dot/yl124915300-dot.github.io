// MATCH OS · Groupon/LivingSocial Partner API transport and purchase evidence.
// SERVER-ONLY. No credentials or order IDs in public pages, client logs or URLs.
// This file does not deploy a checkout, create a cart or call the network on import.
export const PARTNER_ORIGIN = 'https://api-core.livingsocial.com';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PURCHASED = new Set(['CONFIRMED', 'REDEEMED']);
const NOT_PAID = new Set(['REJECTED', 'EXPIRED', 'CANCELLED']);
const PROCESSING = new Set(['ON_HOLD', 'PENDING']);
const currency = /^[A-Z]{3}$/;
const validUuid = s => typeof s === 'string' && UUID.test(s);

export class PartnerFailure extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PartnerFailure';
    this.code = code;
  }
}
function fail(code, message) { throw new PartnerFailure(code, message); }
function validKey(apiKey) {
  // Do not put keys in error messages. Never log, return, or export a key.
  if (typeof apiKey !== 'string' || !/^grpn_[0-9a-f]{8}_[0-9a-f]{56}$/i.test(apiKey)) {
    fail('KEY_REQUIRED', 'Server-side Partner API credential is not configured.');
  }
}
function partnerPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/partner_storefront/') ||
      path.includes('..') || /[?#]/.test(path) || path.length > 350) fail('INVALID_PATH', 'API path refused.');
  return path;
}
function id(v, name) {
  if (!validUuid(v)) fail('INVALID_' + name, 'Invalid Groupon identifier.');
  return v;
}
function publicLink(v) {
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:' || u.username || u.password || u.port ||
        u.hash || u.href.length > 3000) return null;
    return v; // Partner API authenticated response, returned VERBATIM; CJ can redirect via other hosts.
  } catch { return null; }
}
function priceOf(o) {
  const p = o?.price;
  if (!p || !Number.isSafeInteger(p.retail) || p.retail < 0 ||
      !currency.test(p.currency) || !Number.isInteger(p.currencyPrecision) ||
      p.currencyPrecision < 0 || p.currencyPrecision > 3) fail('PRICE_UNVERIFIED', 'Exact option price unavailable.');
  return { minor: p.retail, currency: p.currency, precision: p.currencyPrecision };
}
function productBody(value) {
  return value?.data?.id ? value.data : value;
}
export function selectOfferOption(response, selection) {
  const product = productBody(response);
  if (!validUuid(product?.id) || product.status !== 'active') fail('PRODUCT_NOT_BUYABLE', 'Product is not an active exact match.');
  if (product.availabilityRequired === true || product.hotelStay === true) {
    fail('BOOKING_REQUIRED', 'Booking or timed slot must use its own verified booking flow.');
  }
  const option = product.options?.find(o => o.id === selection?.optionId);
  if (!validUuid(selection?.optionId) || !option) fail('OPTION_MISMATCH', 'Selected option is not on this product.');
  if (option.active === false) fail('OPTION_NOT_BUYABLE', 'Selected option is inactive.');
  if (Array.isArray(option.selections) && option.selections.some(x => x.required)) {
    fail('SELECTION_REQUIRED', 'Extra required option selections need separate verification.');
  }
  const quantity = selection?.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100 ||
      quantity < (option.minUnits ?? 1) || quantity > (option.maxUnits ?? 100)) {
    fail('QUANTITY_INVALID', 'Selected quantity is outside the allowed range.');
  }
  const price = priceOf(option);
  if (price.currency !== 'USD' || price.precision !== 2) {
    fail('MARKET_MISMATCH', 'This Partner pilot only supports US-dollar prices.');
  }
  if (selection?.agreedPrice !== price.minor) {
    fail('PRICE_CHANGED', 'Buyer must review and explicitly accept the currently displayed price.');
  }
  return Object.freeze({
    productId: product.id, optionId: option.id, quantity, expectedPrice: price.minor,
    currency: price.currency, currencyPrecision: price.precision,
    productTitle: String(product.title || '').slice(0, 200),
    optionTitle: String(option.title || '').slice(0, 200),
    finePrint: Array.isArray(product.finePrint) ? product.finePrint.slice(0, 15).map(x => String(x).slice(0, 400)) : [],
  });
}
export function validateReadyCart(cart, expected) {
  if (!validUuid(cart?.id) || cart.status !== 'ACTIVE' || !publicLink(cart.buyLink)) {
    fail('CART_NOT_READY', 'No active authenticated Groupon checkout link.');
  }
  const matching = Array.isArray(cart.items) ? cart.items.find(line =>
    line.productId === expected.productId && line.optionId === expected.optionId &&
    line.quantity === expected.quantity) : null;
  if (!matching || matching.available !== true) {
    fail('CART_ITEM_UNVERIFIED', 'Groupon has not confirmed the selected option is available.');
  }
  if (Array.isArray(cart.messages) && cart.messages.some(m =>
    ['item_declined', 'price_unavailable'].includes(typeof m === 'string' ? m : m?.code))) {
    fail('CART_ITEMS_DECLINED', 'Groupon excluded or could not price an item.');
  }
  return { cartId: cart.id, buyLink: cart.buyLink, option: expected, status: 'READY',
    finalTotal: 'UNKNOWN', orderVerified: false, commissionVerified: false };
}
export function verifyOrderAgainstCart(order, expected) {
  const status = order?.status;
  if (!validUuid(order?.id) || !Array.isArray(order.items) || typeof status !== 'string') {
    return { status: 'UNKNOWN', merchantOrderVerified: false, commissionVerified: false };
  }
  // A redirect order UUID or the first order on a cart is NEVER enough.
  const matching = order.items.find(x =>
    x.productId === expected.productId && x.optionId === expected.optionId &&
    x.quantity === expected.quantity);
  if (!matching || (status === 'CONFIRMED' || status === 'REDEEMED') &&
      !PURCHASED.has(matching.status)) {
    return { status: 'ITEM_MISMATCH', merchantOrderVerified: false, commissionVerified: false };
  }
  if (status === 'REFUNDED' || matching.status === 'REFUNDED') {
    return { status: 'REFUNDED', merchantOrderVerified: false, commissionVerified: false };
  }
  if (PURCHASED.has(status) && PURCHASED.has(matching.status)) {
    return { status, merchantOrderVerified: true, commissionVerified: false };
  }
  if (NOT_PAID.has(status)) return { status, merchantOrderVerified: false, commissionVerified: false };
  if (PROCESSING.has(status)) return { status, merchantOrderVerified: false, commissionVerified: false };
  return { status: 'UNKNOWN', merchantOrderVerified: false, commissionVerified: false };
}

export function createPartnerClient({ apiKey, fetchImpl = fetch, newRequestId = () => crypto.randomUUID() } = {}) {
  validKey(apiKey);
  if (typeof fetchImpl !== 'function') fail('FETCH_REQUIRED', 'Server transport unavailable.');
  async function request(method, path, params, body) {
    const url = new URL(partnerPath(path), PARTNER_ORIGIN);
    if (params) for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
    const headers = {
      Authorization: 'Bearer ' + apiKey, 'User-Agent': 'MATCH-OS-Partner/0.1',
      'x-request-id': newRequestId(), Accept: 'application/json',
    };
    if (body) headers['Content-Type'] = 'application/json';
    let response;
    try {
      response = await fetchImpl(url.href, { method, headers, body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store', redirect: 'error' });
    } catch { fail('UPSTREAM_UNAVAILABLE', 'Partner API request failed; do not assume cart creation or purchase.'); }
    let result;
    try { result = await response.json(); }
    catch { fail('INVALID_RESPONSE', 'Partner API returned a non-JSON response.'); }
    if (!response.ok) {
      const code = result?.details?.error || result?.error?.code || 'UPSTREAM_HTTP_' + response.status;
      // Don't echo untrusted upstream details or credentials.
      fail(String(code).slice(0, 70), 'Partner API rejected request (HTTP ' + response.status + ').');
    }
    return result;
  }
  return Object.freeze({
    me: () => request('GET', '/partner_storefront/me'),
    search: ({ q, city = '', limit = 5 } = {}) => {
      if (typeof q !== 'string' || q.trim().length < 2 || q.trim().length > 200 ||
          typeof city !== 'string' || city.length > 80 || !Number.isInteger(limit) ||
          limit < 1 || limit > 10) fail('QUERY_INVALID', 'Invalid bounded US purchase query.');
      return request('GET', '/partner_storefront/products/search', { q: q.trim(), country: 'US', city, limit });
    },
    product: productId => request('GET', '/partner_storefront/products/' + id(productId, 'PRODUCT')),
    // Every creation is an intentional user action. On timeout, never retry POST blindly.
    createCart: (selection, reference) => {
      if (!selection || !validUuid(selection.productId) || !validUuid(selection.optionId) ||
          !Number.isSafeInteger(selection.expectedPrice) || !Number.isInteger(selection.quantity) ||
          selection.quantity < 1 || selection.quantity > 100 || !validUuid(reference)) {
        fail('CART_SELECTION_INVALID', 'Invalid exact option or buyer decision reference.');
      }
      return request('POST', '/partner_storefront/carts', null, {
        country: 'US', clientReference: reference,
        items: [{ productId: selection.productId, optionId: selection.optionId,
          quantity: selection.quantity, expectedPrice: selection.expectedPrice }],
      });
    },
    cart: cartId => request('GET', '/partner_storefront/carts/' + id(cartId, 'CART')),
    order: orderId => request('GET', '/partner_storefront/bookings/' + id(orderId, 'ORDER')),
    orders: ({ clientReference, limit = 25 } = {}) => {
      if (!validUuid(clientReference) || !Number.isInteger(limit) || limit < 1 || limit > 100)
        fail('ORDER_QUERY_INVALID', 'Invalid private order query.');
      return request('GET', '/partner_storefront/bookings', { clientReference, limit });
    },
  });
}
