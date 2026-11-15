import assert from 'node:assert/strict';
import test from 'node:test';
import { createMatchingSession } from '../match-os/matching.js';
import { catalogScope, searchCatalogs } from '../match-os/catalogs.js';
import { assessEvidence } from '../match-os/evidence.js';
import { routeRequest, evaluateIntent, localQuote } from '../match-os/transaction.js';
import { createFunnel } from '../match-os/funnel.js';
import { entryContext, topics } from '../match-os/demand/topics.js';

const route = (item, changes = {}) => routeRequest({ item, when: 'just comparing', details: '',
  place: { city: 'Austin', code: 'US', region: 'United States' }, budget: { amount: 150, currency: 'USD' }, ...changes })[0];

test('fixed entry allowlist routes four published briefs and ignores arbitrary tracking tags', () => {
  for (const [id, topic] of Object.entries(topics)) {
    assert.equal(route(topic.item, { details: topic.details }).category, topic.category);
    assert.deepEqual(entryContext('#entry=demand_page&topic=' + id + '&item=ignored', '?utm_medium=ignored'),
      { source: 'demand_page', topic: id });
  }
  assert.deepEqual(entryContext('#entry=demand_page&topic=constructor', ''), { source: 'direct', topic: null });
});

test('social content routes use fixed topic and source without user identifiers', () => {
  for (const entry of ['pinterest_pin', 'youtube_profile', 'instagram_profile', 'tiktok_profile']) {
    assert.deepEqual(entryContext('#entry=' + entry + '&topic=oat-milk-pack-price&user=secret&item=ignored', ''),
      { source: entry, topic: 'oat-milk-pack-price' });
    assert.deepEqual(entryContext('#entry=' + entry + '&topic=unapproved&user=secret', ''),
      { source: 'direct', topic: null });
  }
  assert.deepEqual(entryContext('#entry=unknown_source&topic=wired-anc-headphones', ''),
    { source: 'direct', topic: null });
});

test('wired ANC and audio connector distinguish reported evidence, conflict and unknown', () => {
  const intent = route(topics['wired-anc-headphones'].item, { details: topics['wired-anc-headphones'].details });
  function status(wiredAnc, connector) {
    const quote = localQuote(intent, { title: 'QA headphones', productKind: 'headphones', url: 'https://example.test/qa',
      wiredAnc, connector, condition: 'new' }, 'qa');
    return evaluateIntent(intent, [quote]).rows[0];
  }
  assert.equal(status('yes', '3.5 mm').status, 'candidate');
  assert.equal(status('no', '3.5 mm').status, 'conflict');
  assert.equal(status('yes', 'USB-C').status, 'conflict');
  assert.ok(status('', '3.5 mm').pending.includes('Active noise cancellation with cable'));
});

test('authorized scope, incremental cache, expiry, Retry-After and offline degradation', async () => {
  let time = Date.parse('2026-11-15T00:00:00Z');
  let offline = false;
  let responses = 0;
  const matching = createMatchingSession({ now: () => time, online: () => !offline,
    fetcher: async (_url, options) => {
      assert.equal(options.credentials, 'omit');
      assert.equal(options.referrerPolicy, 'no-referrer');
      responses++;
      if (responses === 2) return new Response('', { status: 429, headers: { 'Retry-After': '90' } });
      return Response.json({ offers: [{ id: 'qa', title: '60-minute massage for one', status: 'active',
        city: 'Austin', offerUrl: 'https://www.groupon.com/deals/example-qa', price: { fromMinor: 4000, currency: 'USD' } }] });
    } });
  const intent = route('Local service: massage');
  const scope = catalogScope('livingsocial', intent, intent.brief);
  const signal = new AbortController().signal;
  const run = async (plan, approved = [scope], forced = []) =>
    (await searchCatalogs(plan, plan.brief, signal, matching, new Set(approved), new Set(forced)))[0];
  assert.equal((await run(intent, [])).status, 'needs approval');
  assert.equal(responses, 0);
  const first = await run(intent);
  assert.equal(first.status, 'ok');
  assert.equal(first.offers.length, 1);
  const update = await run(route(intent.item, { budget: { amount: 50, currency: 'USD' } }));
  assert.equal(update.checkedAt, first.checkedAt);
  const anotherCity = route(intent.item, { place: { ...intent.brief.place, city: 'Denver' } });
  assert.equal((await run(anotherCity)).status, 'needs approval');
  assert.equal((await run(intent, [scope], [scope])).checkedAt, first.checkedAt);
  assert.equal(responses, 1);
  time = first.refreshAt;
  assert.equal(assessEvidence(first.offers[0], intent, time).tier, 'stale');
  const failed = await run(intent);
  assert.equal(failed.status, 'rate limited');
  assert.equal(failed.checkedAt, first.checkedAt);
  assert.equal(failed.offers[0].provenance.tier, 'stale');
  time += 89_000;
  assert.equal((await run(intent)).status, 'rate limited');
  assert.equal(responses, 2);
  time += 1_000;
  offline = true;
  assert.equal((await run(intent)).status, 'offline');
  assert.equal(responses, 2);
  offline = false;
  assert.equal((await run(intent)).status, 'ok');
  assert.equal(responses, 3);
  matching.dispose();
});

test('concurrency is bounded and disposes active and queued lookups', async () => {
  let active = 0;
  let peak = 0;
  const matching = createMatchingSession({ online: () => true,
    fetcher: (_url, { signal }) => new Promise((resolve, reject) => {
      peak = Math.max(peak, ++active);
      signal.addEventListener('abort', () => { active--; reject(signal.reason); }, { once: true });
    }) });
  const signal = new AbortController().signal;
  const pending = [
    'https://api-core.livingsocial.com/ls_agent_api/offers/search',
    'https://www.gamerpower.com/api/giveaways',
    'https://prices.openfoodfacts.org/api/v1/products',
  ].map(url => matching.read(url, null, signal));
  await Promise.resolve();
  assert.equal(peak, 2);
  matching.dispose();
  assert.ok((await Promise.allSettled(pending)).every(result => result.reason.name === 'AbortError'));
  assert.equal(active, 0);
});

test('funnel orders observations and cannot verify a purchase or a fee', () => {
  const funnel = createFunnel({ source: 'demand_page', topic: 'lego-batman-pc-editions' }, true);
  funnel.mark('outbound');
  funnel.mark('fee');
  funnel.mark('complete');
  funnel.report('bought');
  assert.equal(funnel.export([]).outcome_self_reported, null);
  funnel.mark('authorized');
  funnel.mark('candidates');
  funnel.mark('outbound');
  funnel.report('bought');
  assert.deepEqual(funnel.export(['games', 'arbitrary text']), {
    format: 'match_os_feedback_v1', sample: 'qa', source: 'demand_page', topic: 'lego-batman-pc-editions',
    categories: ['games'], steps: ['entry', 'chat', 'complete', 'authorized', 'candidates', 'outbound', 'outcome'],
    outcome_self_reported: 'bought', blocker_self_reported: null, merchant_purchase_verified: false, paypal_service_fee: 'closed',
  });
});

test('reviewed demand pages and canonical sitemap regenerate byte for byte', async () => {
  const { execFileSync } = await import('node:child_process');
  const { readFileSync } = await import('node:fs');
  const { BASE, demandURL } = await import('../match-os/demand/topics.js');
  execFileSync(process.execPath, ['match-os-probe/build-demand.mjs', '--check']);
  const sitemap = readFileSync('sitemap.xml', 'utf8');
  for (const topic of [null, ...Object.keys(topics)]) {
    const url = BASE + demandURL(topic);
    assert.equal(sitemap.split('<loc>' + url + '</loc>').length - 1, 1);
  }
});
