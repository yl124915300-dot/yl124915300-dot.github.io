// MATCH OS · one-market, one-decision Partner checkout gateway (Cloudflare Worker).
// NOT deployed by this source file. Fail-closed until all private bindings are configured.
// Shopper chooses and pays on Groupon; this gateway NEVER requests a charge.
import { createPartnerClient, PartnerFailure, selectOfferOption, validateReadyCart, verifyOrderAgainstCart } from './core.mjs';

const SITE = 'https://yl124915300-dot.github.io';
const encoder = new TextEncoder();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const now = () => Math.floor(Date.now() / 1000);
const isUuid = value => typeof value === 'string' && UUID.test(value);
const fail = (code, status = 400) => { const e = new Error(code); e.code = code; e.status = status; throw e; };
const b64 = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = text => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - text.length % 4) % 4)), c => c.charCodeAt(0));

async function signer(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function tokenSign(env, value) {
  const payload = b64(encoder.encode(JSON.stringify(value)));
  const key = await signer(env.MATCH_OS_TOKEN_KEY);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
  return payload + '.' + b64(signature);
}
async function tokenRead(env, value, purpose) {
  if (typeof value !== 'string' || value.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) fail('TOKEN_INVALID', 403);
  try {
    const [payload, mac] = value.split('.');
    const key = await signer(env.MATCH_OS_TOKEN_KEY);
    if (!await crypto.subtle.verify('HMAC', key, unb64(mac), encoder.encode(payload))) fail('TOKEN_INVALID', 403);
    const data = JSON.parse(new TextDecoder().decode(unb64(payload)));
    if (data.purpose !== purpose || !isUuid(data.decision) || !Number.isInteger(data.expires) ||
        data.expires <= now()) fail('TOKEN_EXPIRED', 403);
    return data;
  } catch (e) {
    if (e.code) throw e;
    fail('TOKEN_INVALID', 403);
  }
}
function reply(value, status = 200, origin = null) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', Vary: 'Origin',
  });
  if (origin === SITE) {
    headers.set('Access-Control-Allow-Origin', SITE);
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }
  return new Response(JSON.stringify(value), { status, headers });
}
function ready(env) {
  return env.MATCH_OS_PARTNER_LIVE_ENABLED === 'true' && typeof env.MATCH_OS_GROUPON_API_KEY === 'string' &&
    typeof env.MATCH_OS_TOKEN_KEY === 'string' && env.MATCH_OS_TOKEN_KEY.length >= 40 &&
    typeof env.MATCH_OS_TURNSTILE_SECRET === 'string' && !!env.MATCH_OS_DB;
}
async function verifyTurnstile(env, token) {
  if (typeof token !== 'string' || token.length < 5 || token.length > 2048) fail('HUMAN_VERIFICATION_REQUIRED', 403);
  let response;
  try {
    response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.MATCH_OS_TURNSTILE_SECRET, response: token }),
    });
  } catch { fail('HUMAN_VERIFICATION_UNAVAILABLE', 503); }
  if (!response.ok) fail('HUMAN_VERIFICATION_UNAVAILABLE', 503);
  const result = await response.json();
  if (result.success !== true || result.hostname !== 'yl124915300-dot.github.io') fail('HUMAN_VERIFICATION_FAILED', 403);
}
function safeProduct(p) {
  return {
    id: p.id, title: String(p.title || '').slice(0, 160), status: p.status,
    availabilityRequired: p.availabilityRequired === true,
    options: Array.isArray(p.options) ? p.options.slice(0, 20).map(o => ({
      id: o.id, title: String(o.title || '').slice(0, 160), active: o.active,
      price: o.price && { retail: o.price.retail, currency: o.price.currency, currencyPrecision: o.price.currencyPrecision },
    })) : [],
    finePrint: Array.isArray(p.finePrint) ? p.finePrint.slice(0, 8).map(x => String(x).slice(0, 250)) : [],
  };
}
async function findDecision(env, decision) {
  return env.MATCH_OS_DB.prepare('SELECT * FROM partner_decisions WHERE id = ?').bind(decision).first();
}
async function mark(env, decision, status, cartId = null, orderId = null) {
  await env.MATCH_OS_DB.prepare(
    'UPDATE partner_decisions SET status = ?, cart_id = COALESCE(?, cart_id), order_id = COALESCE(?, order_id), updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(status, cartId, orderId, decision).run();
}
async function execute(req, env, pathname, origin, data) {
  const partner = createPartnerClient({ apiKey: env.MATCH_OS_GROUPON_API_KEY });
  if (pathname === '/v1/search') {
    await verifyTurnstile(env, data.turnstileToken);
    const search = await partner.search({ q: data.q, city: data.city || '', limit: 5 });
    return reply({ scope: 'US', source: 'authenticated_partner_api', checkout: 'not_created',
      offers: Array.isArray(search.data) ? search.data.slice(0, 5).map(safeProduct) : [] }, 200, origin);
  }
  if (pathname === '/v1/quote') {
    await verifyTurnstile(env, data.turnstileToken);
    if (!isUuid(data.productId)) fail('PRODUCT_ID_INVALID');
    const product = await partner.product(data.productId);
    const selected = selectOfferOption(product, {
      optionId: data.optionId, quantity: data.quantity, agreedPrice: data.agreedPrice,
    });
    const decision = crypto.randomUUID();
    const token = await tokenSign(env, {
      purpose: 'decision', decision, productId: selected.productId, optionId: selected.optionId,
      quantity: selected.quantity, agreedPrice: selected.expectedPrice, expires: now() + 300,
    });
    return reply({ decisionToken: token, selected, quoteTtlSeconds: 300,
      finalTotal: 'UNKNOWN', bookingOrPaymentStarted: false,
      instruction: 'Review this exact option and price, then explicitly approve checkout preparation.' }, 200, origin);
  }
  if (pathname === '/v1/cart') {
    const v = await tokenRead(env, data.decisionToken, 'decision');
    await verifyTurnstile(env, data.turnstileToken);
    if (!isUuid(v.productId) || !isUuid(v.optionId) || !Number.isSafeInteger(v.agreedPrice) ||
        !Number.isInteger(v.quantity) || v.quantity < 1 || v.quantity > 100) fail('DECISION_INVALID');
    // Atomic D1 uniqueness: only ONE request may issue a create-cart POST for a decision.
    const inserted = await env.MATCH_OS_DB.prepare(
      'INSERT OR IGNORE INTO partner_decisions (id, status, product_id, option_id, quantity, agreed_price) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(v.decision, 'CREATING', v.productId, v.optionId, v.quantity, v.agreedPrice).run();
    if (inserted.meta?.changes !== 1) {
      const previous = await findDecision(env, v.decision);
      if (previous?.status === 'READY' && isUuid(previous.cart_id)) {
        const cart = await partner.cart(previous.cart_id);
        const selected = { productId: previous.product_id, optionId: previous.option_id, quantity: previous.quantity };
        const checked = validateReadyCart(cart, selected);
        const statusToken = await tokenSign(env, { purpose: 'status', decision: v.decision, expires: now() + 31 * 86400 });
        return reply({ buyLink: checked.buyLink, statusToken, status: 'READY', finalTotal: 'UNKNOWN' }, 200, origin);
      }
      fail('DECISION_ALREADY_IN_PROGRESS_OR_BLOCKED', 409);
    }
    try {
      const product = await partner.product(v.productId);
      const selected = selectOfferOption(product, {
        optionId: v.optionId, quantity: v.quantity, agreedPrice: v.agreedPrice,
      });
      const cart = await partner.createCart(selected, v.decision);
      const checked = validateReadyCart(cart, selected);
      await mark(env, v.decision, 'READY', checked.cartId);
      const statusToken = await tokenSign(env, { purpose: 'status', decision: v.decision, expires: now() + 31 * 86400 });
      return reply({ buyLink: checked.buyLink, statusToken, status: 'READY',
        finalTotal: 'UNKNOWN', paymentProcessedBy: 'Groupon', commissionVerified: false }, 200, origin);
    } catch (err) {
      // A POST timeout can mean cart creation happened upstream; NEVER automatically replay it.
      await mark(env, v.decision, err.code === 'PRICE_CHANGED' ? 'PRICE_CHANGED' : 'UNCERTAIN_STOP');
      throw err;
    }
  }
  if (pathname === '/v1/status') {
    const v = await tokenRead(env, data.statusToken, 'status');
    const record = await findDecision(env, v.decision);
    if (!record || record.status === 'CREATING' || !isUuid(record.cart_id)) fail('ORDER_SESSION_NOT_READY', 409);
    const cart = await partner.cart(record.cart_id);
    if (!isUuid(cart.grouponOrderUuid)) {
      return reply({ status: 'UNCONFIRMED', merchantOrderVerified: false, commissionVerified: false }, 200, origin);
    }
    const order = await partner.order(cart.grouponOrderUuid);
    const verified = verifyOrderAgainstCart(order, {
      productId: record.product_id, optionId: record.option_id, quantity: record.quantity,
    });
    await mark(env, v.decision, verified.status, record.cart_id, cart.grouponOrderUuid);
    return reply({ ...verified, commissionAmount: 'UNKNOWN', netRevenue: 'UNKNOWN' }, 200, origin);
  }
  fail('NOT_FOUND', 404);
}
export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin');
    const { pathname } = new URL(req.url);
    if (pathname === '/health' && req.method === 'GET') {
      return reply({ service: 'MATCH OS Partner gateway', connected: ready(env), realOrder: 'NOT_CLAIMED' });
    }
    if (origin !== SITE) return reply({ error: 'ORIGIN_REFUSED' }, 403);
    if (req.method === 'OPTIONS') return reply({ ok: true }, 200, origin);
    if (req.method !== 'POST') return reply({ error: 'METHOD_NOT_ALLOWED' }, 405, origin);
    if (!ready(env)) return reply({ error: 'PARTNER_NOT_CONNECTED' }, 503, origin);
    if (!req.headers.get('Content-Type')?.startsWith('application/json')) return reply({ error: 'JSON_REQUIRED' }, 415, origin);
    try {
      const raw = await req.text();
      if (raw.length > 4000) fail('REQUEST_TOO_LARGE', 413);
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || Array.isArray(data)) fail('INVALID_REQUEST');
      return await execute(req, env, pathname, origin, data);
    } catch (err) {
      // Prevent upstream response, secrets, cart IDs and order UUIDs from escaping.
      const code = err instanceof PartnerFailure ? err.code : err.code || 'UNAVAILABLE';
      const status = err.status || (code === 'PRICE_CHANGED' ? 409 : code === 'UNAVAILABLE' ? 503 : 400);
      return reply({ error: String(code).replace(/[^A-Z0-9_]/g, '').slice(0, 60) }, status, origin);
    }
  },
};
