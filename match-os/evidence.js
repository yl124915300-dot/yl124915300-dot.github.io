import { key } from './modules/shared.js?v=7';

const minute = 60_000;

export const evidenceLabels = Object.freeze({
  api: 'Latest API listing',
  stale: 'Older API listing',
  observation: 'Dated price observation',
  manual: 'User-entered quote',
  link: 'Unverified link',
});

const barcodePattern = /(?:\b(?:barcode|gtin|ean|upc)\b|条形码|条码)\s*[:：]?\s*(\d{8}|\d{12,14})(?!\d)/giu;

export function validBarcode(code) {
  if (typeof code !== 'string' || !/^(?:\d{8}|\d{12,14})$/u.test(code) || /^0+$/u.test(code)) return false;
  return [...code].reverse().reduce((sum, digit, i) => sum + Number(digit) * (i % 2 ? 3 : 1), 0) % 10 === 0;
}

export function publicBarcodes(value) {
  return [...String(value ?? '').normalize('NFKC').matchAll(barcodePattern)].filter(([, code]) => validBarcode(code));
}

export function withoutBarcodes(value) {
  let result = String(value ?? '').normalize('NFKC');
  for (const [match] of publicBarcodes(result)) result = result.replace(match, ' ');
  return result.trim();
}

export function assessEvidence(offer, intent, now) {
  const source = offer.provenance || { tier: 'link' };
  const age = now - Date.parse(source.retrievedAt);
  const observedAge = now - Date.parse(source.observedAt);
  const priceEnd = Date.parse(source.priceValidUntil);
  const offerEnd = Date.parse(offer.expires);
  const stale = source.tier === 'stale' || source.tier === 'api' && (!Number.isFinite(age) || age < 0 || age >= 15 * minute ||
    (Number.isFinite(source.cacheValidUntil) && source.cacheValidUntil <= now) ||
    (Number.isFinite(priceEnd) && priceEnd <= now) || (Number.isFinite(offerEnd) && offerEnd <= now) ||
    Boolean(source.observedAt && (!Number.isFinite(observedAge) || observedAge < 0 || observedAge > 24 * 60 * minute)));
  const tier = stale ? 'stale' : source.tier;
  const pending = [];
  if (tier === 'observation') pending.push('Historical observation; current price and terms unverified');
  else if (tier === 'manual') pending.push('User-entered terms require independent verification');
  else if (tier === 'link') pending.push('Listing link and price unverified');
  else if (tier === 'stale') pending.push('Refresh the older API listing');
  if (tier === 'api' && !(Date.parse(source.priceValidUntil) > now)) {
    pending.push('Merchant price validity unverified or ended');
  }
  if (source.identity?.verified !== true) pending.push('Exact product, edition or option evidence unverified');
  if (source.availability?.verified !== true || source.availability.state !== 'available') pending.push('Stock, redemption or booking availability unverified');
  if (source.scope?.verified !== true || source.scope.market !== intent.market ||
      (intent.category !== 'games' && (!source.scope.city || key(source.scope.city) !== key(intent.brief.place.city)))) {
    pending.push('Eligibility for requested area or account unverified');
  }
  if (source.fulfillment?.verified !== true &&
      (intent.requiresDelivery || !/^(?:just comparing|先比较|recurring)$/iu.test(intent.when))) {
    pending.push('Requested fulfillment time or method unverified');
  }
  if (offer.returns?.verified !== true) pending.push('Return or cancellation terms unverified');
  return { ...source, tier, stale, pending };
}

export function quoteStatus(row) {
  if (row.problems.length) return 'conflict';
  return Number.isFinite(row.total) && row.provenance.tier === 'api' && !row.pending.length ? 'confirmed' : 'candidate';
}
