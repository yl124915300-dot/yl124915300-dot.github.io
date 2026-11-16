import { electronics } from './electronics.js?v=12';
import { evaluateIntent } from '../transaction.js?v=12';
import { HEADPHONE_LISTINGS } from './headphone-listings.js?v=12';

export const headphoneTopic = 'wired-anc-headphones';
export const headphoneMarkets = {
  US: ['United States', 'USD'], GB: ['United Kingdom', 'GBP'], CA: ['Canada', 'CAD'],
  AU: ['Australia', 'AUD'], CN: ['China', 'CNY'], JP: ['Japan', 'JPY'],
  DE: ['Germany', 'EUR'], FR: ['France', 'EUR'], IN: ['India', 'INR'], HK: ['Hong Kong', 'HKD'],
  SG: ['Singapore', 'SGD'], NZ: ['New Zealand', 'NZD'],
};
export const headphoneModels = [
  {
    id: 'q45', name: 'soundcore Space Q45', sku: 'A3040011', hardware: 'A3040', accent: 'mint',
    brand: 'soundcore', anc: 'Yes · connect AUX, then press NC', power: 'Use the powered NC control',
    passive: 'Power-off playback unverified', mic: 'Built-in mic over AUX unverified',
    facts: { wiredAnc: true, analogAudio: true },
    sources: [
      ['soundcore support: AUX and ANC', 'https://service.soundcore.com/article-description/soundcore-Space-Q45-Headphones-FAQ'],
      ['Anker: exact model and 3.5 mm cable', 'https://www.ankerjapan.com/products/a3040'],
    ],
  },
  {
    id: 'xm4', name: 'Sony WH-1000XM4', sku: 'WH1000XM4/B', hardware: 'WH-1000XM4', accent: 'amber',
    brand: 'Sony', anc: 'Yes · plug in and turn on', power: 'Power on for ANC',
    passive: 'Yes · audio only, ANC off', mic: 'No · use the phone or computer mic',
    facts: { wiredAnc: true, analogAudio: true, passiveAudio: true, wiredMic: false },
    sources: [
      ['Sony Help Guide: cable, power and calls', 'https://helpguide.sony.net/mdr/wh1000xm4/v1/en/contents/TP0002752734.html'],
      ['Sony specifications: analogue input', 'https://www.sony.com/electronics/support/wireless-headphones-bluetooth-headphones/wh-1000xm4/specifications'],
    ],
  },
  {
    id: 'xm5', name: 'Sony WH-1000XM5', sku: 'WH1000XM5/B', hardware: 'WH-1000XM5', accent: 'blue',
    brand: 'Sony', anc: 'Yes · plug in and turn on', power: 'Power on for ANC',
    passive: 'Yes · audio only, ANC off', mic: 'No · use the phone or computer mic',
    facts: { wiredAnc: true, analogAudio: true, passiveAudio: true, wiredMic: false },
    sources: [
      ['Sony Help Guide: cable, power and calls', 'https://helpguide.sony.net/mdr/wh1000xm5/v1/en/contents/TP1000534744.html'],
      ['Sony specifications: analogue input', 'https://www.sony.com/electronics/support/wireless-headphones-bluetooth-headphones/wh-1000xm5/specifications'],
    ],
  },
  {
    id: 'ch730n', name: 'Sony WH-CH730N', sku: 'WHCH730N/B', hardware: 'WH-CH730N', accent: 'mint',
    brand: 'Sony', anc: 'Yes · plug in and turn on', power: 'Power on for ANC',
    passive: 'Yes · audio only, ANC off', mic: 'No · use the phone or computer mic',
    facts: { wiredAnc: true, analogAudio: true, passiveAudio: true, wiredMic: false },
    sources: [
      ['Sony Help Guide: cable, power and calls', 'https://helpguide.sony.net/mdr/3006/v1/en/contents/H032_Using_the_supplied_headphone_cable.html'],
      ['Sony specifications', 'https://helpguide.sony.net/mdr/3006/v1/en/contents/H062_Specifications.html'],
    ],
  },
];


/**
 * Buyer-led starting intents, not seller recommendations or harvested profiles.
 * Every option only sets requirements we can check against the named models.
 * A missing capability must remain unknown, never silently pass.
 */
export const headphoneGoals = Object.freeze([
  { id: 'wired-anc', label: 'Noise cancellation through an AUX cable',
    details: '3.5 mm wired ANC required', checks: ['wiredAnc', 'analogAudio'],
    copy: 'For flights and other devices where Bluetooth is unavailable.' },
  { id: 'wired-mic', label: 'Use a headset microphone with a cable',
    details: '3.5 mm audio required; wired mic required', checks: ['analogAudio', 'wiredMic'],
    copy: 'Do not assume a Bluetooth microphone also works over a 3.5 mm cable.' },
  { id: 'no-battery', label: 'Listen through a cable with power off',
    details: '3.5 mm audio required; passive wired audio required', checks: ['analogAudio', 'passiveAudio'],
    copy: 'Passive wired listening and powered noise cancellation are not equivalent.' },
  { id: 'explore', label: 'Compare headphones without extra restrictions',
    details: '', checks: [], copy: 'Start broadly, then add must-haves and a deadline in the chat.' },
]);

export function headphoneGoal(id) {
  return headphoneGoals.find(goal => goal.id === id) || headphoneGoals[0];
}

export function headphoneGoalFit(model, goalId) {
  const goal = headphoneGoal(goalId);
  const failed = goal.checks.filter(feature => model.facts[feature] === false);
  const unknown = goal.checks.filter(feature => model.facts[feature] !== true && model.facts[feature] !== false);
  return { status: failed.length ? 'conflict' : unknown.length ? 'pending' : 'verified',
    failed, unknown, goal };
}

export const headphoneNeeds = [
  ['wiredAnc', 'ANC over the cable', 'wired ANC required'],
  ['analogAudio', '3.5 mm audio', '3.5 mm audio required'],
  ['wiredMic', 'Built-in mic over cable', 'wired mic required'],
  ['passiveAudio', 'Audio with power off', 'passive wired audio required'],
];

export function headphoneIntent(intent) {
  if (intent?.category !== 'electronics' || intent.sharedBudget || intent.requirements.accessory) return false;
  const item = intent.item;
  if (/\b(?:space q45|wh[- ]?(?:1000xm[45]|ch730n))(?![a-z0-9])/iu.test(item)) return true;
  return /^(?:over[- ]ear |wired |anc )*headphones?(?:\s+with\s+active noise cancellation in wired mode)?$|^(?:头戴式|有线|降噪)*耳机$/iu.test(item);
}

function specAttributes(model) {
  return { ...electronics.normalize({
    productKind: 'headphones', brand: model.brand, model: model.name,
    modelCode: model.sku, connector: '3.5 mm',
  }), ...model.facts };
}

export function selectedManufacturerModel(raw) {
  const normalize = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/gu, '');
  const code = normalize(raw.modelCode);
  const model = normalize(raw.model);
  if (code) return headphoneModels.find(item => normalize(item.sku) === code &&
    (!model || [item.hardware, item.name, item.sku].some(name => normalize(name) === model)))?.id;
  return headphoneModels.find(item => [item.name, item.hardware].some(name => normalize(name) === model))?.id;
}

export function headphoneSnapshotOffers(intent, listings = HEADPHONE_LISTINGS) {
  return listings.flatMap(listing => {
    const model = headphoneModels.find(item => item.id === listing.model);
    if (!model || listing.market !== intent.market) return [];
    const exact = listing.modelCode === model.sku;
    return [{
      id: listing.id, provider: 'merchant-page', category: 'electronics', headphone: model.id,
      title: model.name, merchant: listing.merchant, sourceUrl: listing.url,
      attrs: { ...(exact ? specAttributes(model) : electronics.normalize({ productKind: 'headphones' })),
        modelCode: exact ? model.sku : '',
        condition: listing.condition || '' },
      price: Number.isFinite(listing.amount) ? { amount: listing.amount, currency: listing.currency, kind: 'fixed' } : null,
      checkedAt: listing.checkedAt,
      shipping: listing.shipping ?? null, tax: null, fees: null, confidence: exact ? 0.82 : 0.5,
      provenance: {
        tier: 'snapshot', retrievedAt: listing.checkedAt, observedAt: listing.checkedAt,
        priceValidUntil: listing.validUntil, source: listing.url,
        identity: { verified: exact, identifier: listing.modelCode || listing.merchantSku, type: 'Public product page' },
        availability: { state: listing.stock === 'unavailable' ? 'unavailable' : 'unknown' },
        scope: { market: listing.market, verified: false },
        fulfillment: { verified: false },
      },
      delivery: listing.fulfillment ? { label: listing.fulfillment } : null,
      returns: listing.returns ? { ...listing.returns, verified: false } : null,
      stockNote: listing.stockNote,
      merchantEvidence: listing.evidenceNote,
      snapshotAvailable: !['unavailable', 'backorder'].includes(listing.stock),
    }];
  });
}

export function compareHeadphones(intent, offers, preference, now = Date.now(), listings = HEADPHONE_LISTINGS) {
  const stored = headphoneSnapshotOffers(intent, listings);
  const comparison = evaluateIntent(intent, [...stored, ...offers], preference, now);
  const scoped = headphoneModels.map(model => {
    const features = electronics.assess(specAttributes(model), { ...intent, when: 'just comparing', requiresDelivery: false }, {});
    const specFields = /Product type|Exact model|noise cancellation|3\.5 mm audio|microphone|power off|^connector$/iu;
    const checks = features.checks.filter(check => specFields.test(check.label));
    const rows = comparison.rows.filter(row => row.offer.headphone === model.id ||
      (row.offer.provider === 'user' && selectedManufacturerModel(row.offer.attrs) === model.id));
    const best = rows.filter(row => row.provenance.tier !== 'snapshot' || row.offer.attrs.condition === 'new')
      .sort((a, b) => b.score - a.score).find(row => !row.problems.length && !row.stale && row.offer.price &&
      row.offer.price.currency === intent.brief.budget.currency && row.offer.snapshotAvailable !== false &&
      (row.provenance.tier !== 'snapshot' || row.provenance.identity.verified));
    const minimumOptions = rows.filter(row => !row.stale && row.offer.snapshotAvailable !== false && row.listed !== null &&
      row.offer.price?.currency === intent.brief.budget.currency &&
      (row.provenance.tier === 'snapshot' && row.provenance.identity.verified && row.offer.attrs.condition === 'new'));
    const over = minimumOptions.length > 0 && minimumOptions.every(row => row.listed > intent.brief.budget.amount);
    const conflicts = checks.filter(check => check.status === 'conflict').map(check => check.label);
    if (over && !best) conflicts.push('The observed new listings shown here are over budget before missing charges');
    const unknown = checks.filter(check => check.status === 'unknown').map(check => check.label);
    return { model, checks, rows, best, conflicts, unknown, score: best?.score ?? 0 };
  }).sort((a, b) => Number(Boolean(a.conflicts.length)) - Number(Boolean(b.conflicts.length)) ||
    a.unknown.length - b.unknown.length || b.score - a.score || a.model.name.localeCompare(b.model.name));
  const other = comparison.rows.filter(row => !scoped.some(item => item.rows.includes(row)));
  return { ...comparison, models: scoped, other };
}
