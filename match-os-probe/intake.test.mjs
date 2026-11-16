import test from 'node:test';
import assert from 'node:assert/strict';
import { makeAgentLink, readAgentLink, wirelessHeadphoneTopic } from '../match-os/intake.js';
import { entryContext } from '../match-os/demand/topics.js';
import { createFunnel } from '../match-os/funnel.js';
import { identifyIntent, qualifyDemand } from './demand-radar.mjs';

const now = Date.parse('2026-11-16T08:20:00Z');

test('short-lived prefill shares only fixed fields and cannot create an attributed session via an old route', () => {
  const input = { topic: wirelessHeadphoneTopic, market: 'FR', budget: 87, author: 'private@example.test' };
  const link = new URL(makeAgentLink(input, now));
  assert.equal(link.search, '');
  assert.deepEqual([...new URLSearchParams(link.hash.slice(1)).keys()], ['compare', 'topic', 'until', 'market', 'goal']);
  const parsed = readAgentLink(link.hash, now);
  assert.deepEqual(parsed, { topic: wirelessHeadphoneTopic, market: 'FR', goal: 'explore', expires: now + 900_000 });
  assert.equal(readAgentLink(link.hash, parsed.expires), null);
  assert.equal(readAgentLink(link.hash, now - 60_000), null);
  assert.equal(readAgentLink(link.hash + '&market=US', now), null);
  assert.equal(readAgentLink(link.hash + '&budget=87', now), null);
  assert.equal(makeAgentLink({ ...input, goal: 'malicious' }, now), null);
  assert.deepEqual(entryContext('#entry=agent_link&topic=' + wirelessHeadphoneTopic, ''), { source: 'direct', topic: null });
  const funnel = createFunnel({ source: 'agent_link', topic: parsed.topic }, true);
  assert.equal(funnel.export(['electronics']).source, 'agent_link');
  assert.equal(funnel.export(['electronics']).merchant_purchase_verified, false);
});

test('four buying categories keep their original subjects and reject mismatched local templates', () => {
  for (const [subject, category, topic] of [
    ['casque Bluetooth', 'electronics', wirelessHeadphoneTopic],
    ['leche de avena', 'consumables', 'oat-milk-pack-price'],
    ['奥斯汀按摩', 'services', 'austin-60-minute-massage'],
    ['LEGO Batman', 'games', 'lego-batman-pc-editions'],
  ]) {
    assert.deepEqual(identifyIntent(subject), { category, topic });
    const hash = new URL(makeAgentLink({ topic }, now)).hash;
    assert.equal(readAgentLink(hash, now).topic, topic);
  }
  assert.equal(makeAgentLink({ topic: 'austin-60-minute-massage', market: 'FR' }, now), null);
  assert.deepEqual(identifyIntent('earbuds with LE Audio'), { category: 'electronics', topic: null });
});

test('public radar deduplicates tracking variants and keeps drafts separate from delivery eligibility', () => {
  const data = { observedAt: '2026-11-16T08:16:00Z', publishedAt: '2026-11-12T00:00:00Z',
    purchaseQuestion: true, subject: 'Bluetooth headphones', market: 'FR', budgetKnown: true, useKnown: true };
  const base = { ...data, source: 'https://www.reddit.com/r/test/comments/abc123/title/' };
  const rows = qualifyDemand([
    base, { ...base, source: base.source + '?email=private%40example.test' },
    { ...data, scope: 'buyer_request', event: 87155 },
    { ...data, scope: 'opt_in', event: 17289 },
    { ...data, source: 'https://x.com/private_author/status/123', purchaseQuestion: false },
    { ...data, scope: 'opt_in', event: 31, publishedAt: '2026-10-14T00:00:00Z' },
  ], { now });
  assert.equal(rows.length, 5);
  assert.equal(rows[0].comparison, 'prefill_ready');
  assert.equal(rows[0].confidence, 'high');
  assert.equal(rows[3].comparison, 'trend_only');
  assert.equal(rows[4].comparison, 'stale_or_resolved');
  assert.deepEqual(rows.slice(0, 3).map(row => row.deliveryReason),
    ['no_recipient_consent', 'no_consent_for_platform_reply', 'no_authorized_sender_connected']);
  assert.ok(rows.every(row => row.delivery === 'blocked'));
  assert.doesNotMatch(JSON.stringify(rows), /private|87155|17289/);
});
