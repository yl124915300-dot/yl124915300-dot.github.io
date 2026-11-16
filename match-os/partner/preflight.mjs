// Read-only Partner API preflight. Run ONLY in private CI/server environment.
// No orders, carts, partner account mutations, customer PII or payment requests.
import { createPartnerClient, PartnerFailure } from './core.mjs';

const key = process.env.MATCH_OS_GROUPON_API_KEY;
if (!key) {
  console.error('PARTNER_BLOCKED: MATCH_OS_GROUPON_API_KEY is not configured in the private environment.');
  process.exitCode = 2;
} else {
  try {
    const partner = createPartnerClient({ apiKey: key });
    const registration = await partner.me();
    if (!registration || typeof registration !== 'object') {
      throw new PartnerFailure('REGISTRATION_UNVERIFIED', 'No storefront registration returned.');
    }
    // Never print the secret, storefront ID, contact information or CJ PID.
    console.log('PARTNER_REGISTRATION_READ_OK');
    const state = String(registration?.cjPublisherIdStatus ?? registration?.cjStatus ??
      registration?.commission?.status ?? registration?.cj?.status ?? '').toUpperCase();
    if (['APPROVED', 'CONFIRMED', 'ACTIVE'].includes(state)) console.log('CJ_STATUS_REPORTED_CONFIRMED');
    else if (['PENDING', 'AWAITING_CONFIRMATION'].includes(state)) console.log('CJ_STATUS_REPORTED_PENDING');
    else console.log('CJ_STATUS_UNVERIFIED_MANUAL_BACKOFFICE_CHECK_REQUIRED');
    const sample = await partner.search({ q: 'massage in Austin', city: 'Austin', limit: 3 });
    if (!Array.isArray(sample?.data)) throw new PartnerFailure('SEARCH_UNVERIFIED', 'Missing Partner API search response data.');
    console.log('PARTNER_READ_ONLY_US_SEARCH_OK', Math.min(sample.data.length, 3));
    console.log('CHECKOUT_NOT_TESTED_NO_CART_OR_BUYER_NO_PURCHASE');
  } catch (error) {
    const code = error instanceof PartnerFailure ? error.code : 'PREFLIGHT_FAILED';
    // The request error must never include raw API response, key or PII.
    console.error('PARTNER_BLOCKED:', String(code).slice(0, 70));
    process.exitCode = 3;
  }
}
