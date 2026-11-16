import test from 'node:test';
import assert from 'node:assert/strict';
import { routeRequest, localQuote } from '../match-os/transaction.js';
import { compareHeadphones, headphoneIntent, selectedManufacturerModel } from '../match-os/modules/headphones.js';

const start = '2026-11-18T10:00:00Z';
const end = '2026-11-19T10:00:00Z';
const testNow = Date.parse(start) + 100;
const intent = (item = 'Over-ear headphones', details = '3.5 mm wired ANC required', amount = 220, market = 'US') =>
  routeRequest({ item, details, budget: { currency: 'USD', amount }, place: { code: market, city: '', region: market }, when: 'just comparing' })[0];
const merchant = (id, model, modelCode, amount, extra = {}) => ({
  id, model, modelCode, amount, checkedAt: start, validUntil: end, condition: 'new',
  market: 'US', currency: 'USD', merchant: id, url: 'https://example.test/' + id, ...extra,
});
const snapshots = [
  merchant('qa-1', 'xm5', 'WH1000XM5/B', 299),
  merchant('qa-2', 'xm5', 'WH1000XM5/B', 305),
  merchant('qa-3', 'xm5', 'WH1000XM5/S', 100),
  merchant('qa-4', 'q45', 'A3040011', 155),
  merchant('qa-5', 'q45', 'A3040011', 105, { stock: 'unavailable' }),
];

test('headphone feature checks keep wired mic, power-off playback and model revision distinct', () => {
  const check = intent('Over-ear headphones', '3.5 mm wired ANC required; wired mic required');
  const rows = compareHeadphones(check, [], 'balanced', testNow, snapshots).models;
  assert.equal(rows.find(x => x.model.id === 'q45').unknown[0], 'Built-in microphone over cable');
  assert.ok(rows.find(x => x.model.id === 'xm4').conflicts.includes('Built-in microphone over cable'));
  assert.ok(rows.find(x => x.model.id === 'xm5').conflicts.includes('Built-in microphone over cable'));
  assert.ok(headphoneIntent(intent('Sony WH-1000XM5')));
  assert.equal(headphoneIntent(intent('Sony WH-1000XM4C headphones')), false);
  assert.notEqual(intent('Sony WH-1000XM4C headphones').requirements.hard.model,
    intent('Sony WH-1000XM4 headphones').requirements.hard.model);
  assert.equal(selectedManufacturerModel({ model: 'WH-1000XM5', modelCode: 'WH1000XM5/S' }), undefined);
  assert.equal(selectedManufacturerModel({ model: 'WH-1000XM4C', modelCode: 'WH1000XM4/B' }), undefined);
  assert.ok(headphoneIntent(intent('Sony WH-CH730N')));
  assert.equal(selectedManufacturerModel({ model: 'WH-CH735N', modelCode: 'WHCH730N/B' }), undefined);
});

test('the separate US budget alternative wins on listed price without claiming checkout eligibility', () => {
  const request = intent(undefined, '3.5 mm wired ANC required', 150);
  const listings = [
    merchant('qa-xm5', 'xm5', 'WH1000XM5/B', 398, { stock: 'listed' }),
    merchant('qa-q45', 'q45', 'A3040011', 149.99, { stock: 'backorder' }),
    merchant('qa-ch730n', 'ch730n', 'WHCH730N/B', 98, { stock: 'listed' }),
  ];
  const result = compareHeadphones(request, [], 'balanced', testNow, listings);
  const lead = result.models[0];
  assert.equal(lead.model.id, 'ch730n');
  assert.equal(lead.best.provenance.identity.identifier, 'WHCH730N/B');
  assert.equal(lead.best.provenance.availability.state, 'unknown');
  assert.equal(lead.best.total, null);
  assert.equal(lead.best.status, 'candidate');
  assert.equal(result.models.find(entry => entry.model.id === 'q45').best, undefined);

  const exactXm5 = compareHeadphones(intent('Sony WH-1000XM5'), [], 'balanced', testNow, listings);
  assert.ok(exactXm5.models.find(entry => entry.model.id === 'ch730n').conflicts.includes('Exact model'));
  const silverXm5 = compareHeadphones(intent('Sony WH-1000XM5/S'), [], 'balanced', testNow, listings);
  assert.ok(silverXm5.models.find(entry => entry.model.id === 'xm5').conflicts.includes('Exact model number'));
});

test('snapshots drop out by market and after expiry; missing checkout totals never pass', () => {
  const comparison = compareHeadphones(intent(), [], 'price', testNow, snapshots);
  const q45 = comparison.models.find(x => x.model.id === 'q45');
  const xm5 = comparison.models.find(x => x.model.id === 'xm5');
  assert.equal(comparison.models[0], q45);
  assert.equal(q45.best.total, null);
  assert.equal(q45.best.status, 'candidate');
  assert.ok(q45.rows.find(row => row.offer.id === 'qa-5').problems.includes('Merchant reports unavailable'));
  assert.equal(xm5.best, undefined);
  assert.ok(xm5.conflicts.some(x => x.includes('over budget')));
  assert.equal(xm5.rows.find(row => row.offer.id === 'qa-3').provenance.identity.verified, false);
  const broad = compareHeadphones(intent(undefined, undefined, 400), [], 'fit', testNow, snapshots);
  assert.equal(broad.models.find(x => x.model.id === 'xm5').best.offer.id, 'qa-1');
  assert.equal(broad.rows.filter(row => row.provenance.identity.verified && row.offer.headphone === 'xm5').length, 2);
  const expired = compareHeadphones(intent(), [], 'price', Date.parse(end), snapshots);
  assert.ok(expired.rows.every(row => row.stale && row.status !== 'confirmed'));
  assert.ok(expired.models.every(model => !model.best && !model.conflicts.some(x => x.includes('over budget'))));
  assert.equal(compareHeadphones(intent(undefined, undefined, 220, 'JP'), [], 'price', testNow, snapshots).rows.length, 0);
});

test('user-entered price can change budget status but cannot confirm price, identity or purchase', () => {
  const request = intent('Sony WH-1000XM5', '3.5 mm wired ANC required', 300);
  const inputs = { title: 'QA Sony XM5', model: 'Sony WH-1000XM5', modelCode: 'WH1000XM5/B',
    productKind: 'headphones', wiredAnc: 'yes', analogAudio: 'yes', url: 'https://example.test/manual',
    observedAt: start.slice(0, 10), merchant: 'QA store', currency: 'USD' };
  const get = amount => compareHeadphones(request, [localQuote(request, { ...inputs, amount }, 'qa', start)], 'price', testNow, []).rows[0];
  assert.ok(get(400).problems.includes('Final cost fits budget'));
  assert.equal(get(260).provenance.tier, 'manual');
  assert.equal(get(260).provenance.identity.verified, undefined);
  assert.equal(get(260).total, null);
  assert.equal(get(260).status, 'candidate');
});
