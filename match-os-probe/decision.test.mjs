import assert from 'node:assert/strict';
import test from 'node:test';
import { compareGroups, rank, searchPlan, totalCost } from '../match-os/decision.js';
import { gameEntry, giveawayEntries, localEntries } from '../match-os/catalogs.js';

const checkedAt = '2026-11-15T08:00:00.000Z';
const now = Date.parse(checkedAt);
const evidence = { checkedAt, source: 'https://www.cheapshark.com/api/1.0/games?id=42' };
const stores = new Map([['1', 'Steam'], ['7', 'GOG']]);
const game = { id: '42', title: 'Demo Game', steamAppID: '1234' };
const steam = gameEntry({ storeID: '1', dealID: 'AAA%3D', price: '24.99' }, game, stores, evidence);
const gog = gameEntry({ storeID: '7', dealID: 'BBB%3D', price: '11.99' }, game, stores, evidence);
const deluxe = gameEntry({ storeID: '7', dealID: 'CCC%3D', price: '5.99' },
  { id: '43', title: 'Demo Game Deluxe' }, stores, evidence);
const brief = { item: 'PC game: Demo Game', place: { code: 'US', city: 'Seattle' },
  budget: { amount: 30, currency: 'USD' }, when: 'just comparing', details: '' };
const plan = searchPlan(brief, 'auto');
const evaluate = (offers, req = brief, profile = 'balanced') => rank(offers, req, searchPlan(req, 'auto'), profile, now);

test('only the reviewed title goes to the US games route; CA uses local routing only when selected', () => {
  assert.deepEqual(plan.providers, ['cheapshark', 'gamerpower']);
  assert.equal(plan.title, 'Demo Game');
  assert.equal(searchPlan({ ...brief, item: 'free PC games' }, 'auto').browseFreeGames, true);
  const ca = { ...brief, place: { code: 'CA' } };
  assert.deepEqual(searchPlan(ca, 'auto').providers, []);
  assert.deepEqual(searchPlan(ca, 'general').providers, ['livingsocial']);
});

test('groups the same catalog game across stores, keeps editions separate, deduplicates repeated offers', () => {
  const rows = evaluate([steam, steam, gog, deluxe]);
  assert.equal(rows.length, 3);
  const groups = compareGroups(rows, plan);
  assert.equal(groups.find(group => group.title === game.title).rows.length, 2);
  assert.equal(groups.find(group => group.title === game.title).sameTitleAcrossStores, true);
  assert.equal(groups.find(group => group.title === 'Demo Game Deluxe').alternative, true);
  assert.equal(steam.sourceUrl, 'https://www.cheapshark.com/redirect?dealID=AAA%3D');
});

test('hard conflicts fall below tentative matches for every ranking profile', () => {
  const req = { ...brief, details: 'Steam only and refundable', when: 'today',
    budget: { amount: 20, currency: 'USD' } };
  const rows = evaluate([steam, gog], req, 'price');
  assert.equal(rows[0].offer.merchant, 'GOG');
  assert.match(rows[0].pending.join(' '), /Activation.*unverified/);
  assert.match(rows[0].pending.join(' '), /deadline unverified/);
  assert.match(rows[0].pending.join(' '), /Return policy unverified/);
  assert.match(rows[1].problems.join(' '), /exceeds budget/);
  assert.equal(compareGroups(rows, plan).flatMap(group => group.rows).length, 1);
});

test('a cheaper different edition or title never satisfies an explicit edition or model', () => {
  const req = { ...brief, item: 'PC game: Demo Game Deluxe' };
  assert.deepEqual(evaluate([steam, gog, deluxe], req).map(row => row.offer.title), ['Demo Game Deluxe']);
  assert.deepEqual(evaluate([deluxe], { ...brief, item: 'PC game: Demo Game 2' }), []);
});

test('changing cost and fit priorities reorders without changing hard conditions', () => {
  const offers = [{ ...steam, price: { ...steam.price, amount: 29 } }, deluxe];
  assert.equal(evaluate(offers, brief, 'fit')[0].offer.title, 'Demo Game');
  assert.equal(evaluate(offers, brief, 'price')[0].offer.title, 'Demo Game Deluxe');
});

test('starting rates, FX, aged snapshots and missing tax never pass an all-in budget', () => {
  assert.deepEqual(totalCost(gog), { listed: 11.99, total: null });
  assert.deepEqual(totalCost({ ...gog, shipping: 0, tax: 2, fees: 1 }), { listed: 14.99, total: 14.99 });
  assert.match(evaluate([gog], { ...brief, budget: { amount: 15, currency: 'CAD' } })[0].pending.join(' '), /currency differs/);
  const aged = { ...gog, priceTimestamp: '2026-11-11T00:00:00.000Z' };
  assert.match(evaluate([aged])[0].pending.join(' '), /older than 24 hours/);
});

test('official local sources and option facts survive normalization; a starting price is not a chosen appointment', () => {
  const req = { ...brief, item: 'massage', place: { code: 'US', city: 'Austin' }, details: 'one person and 60 minutes',
    when: 'by Friday', budget: { amount: 100, currency: 'USD' } };
  const offer = { id: 'a', title: '60 or 90-minute Massage for One or Two', merchant: 'Test Spa',
    offerUrl: 'https://www.groupon.com/deals/sample', city: 'Austin', status: 'active',
    price: { fromMinor: 6000, currency: 'USD', currencyExponent: 2 } };
  const entries = localEntries({ ...evidence, data: { asOf: checkedAt, offers: [
    offer, { ...offer, id: 'b', offerUrl: 'https://groupon.com.example.com/fake' },
    { ...offer, id: 'c', status: 'inactive' }
  ] } }, req);
  assert.equal(entries.length, 1);
  const [row] = evaluate(entries, req);
  assert.equal(row.listed, 60);
  assert.equal(row.total, null);
  assert.match(row.pending.join(' '), /60 min service listed; option price unverified/);
  assert.match(row.pending.join(' '), /Party of 1 listed; option price unverified/);
  assert.match(row.pending.join(' '), /deadline unverified/);
});

test('a giveaway is a claim route; worth never becomes a purchase price or SKU identity', () => {
  const listed = { id: 35, title: 'Demo Game (Epic Games) Giveaway', type: 'Game', status: 'Active',
    worth: '$99.99', platforms: 'PC, Epic Games Store', gamerpower_url: 'https://www.gamerpower.com/demo' };
  const entries = giveawayEntries({ ...evidence, data: [listed,
    { ...listed, id: 36, end_date: '2026-11-12 23:59:00' },
    { ...listed, id: 37, type: 'DLC' },
    { ...listed, id: 38, platforms: 'Android' }
  ] }, plan);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].price.amount, 0);
  assert.equal(entries[0].price.kind, 'giveaway');
  assert.equal(entries[0].identity, null);
  assert.equal(compareGroups(evaluate([steam, gog, ...entries]), plan).length, 2);
});
