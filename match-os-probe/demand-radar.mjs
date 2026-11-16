import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { makeAgentLink, wirelessHeadphoneTopic } from '../match-os/intake.js';

const day = 86_400_000;
const intentRules = [
  [/\b(?:earbuds?|tws|semi.in.ear|in.ear|écouteurs|auriculares intraurales)\b|耳塞|入耳/iu, 'electronics', null],
  [/\b(?:gaming headsets?|casques de jeu|auriculares para jugar)\b|游戏耳麦/iu, 'electronics', null],
  [/\bwired anc\b|有线降噪/iu, 'electronics', 'wired-anc-headphones'],
  [/\b(?:wireless|over.ear|bluetooth) headphones?\b|casque (?:bluetooth|sans fil)|auriculares de diadema|头戴式耳机/iu, 'electronics', wirelessHeadphoneTopic],
  [/\b(?:oat milk|lait d.avoine|leche de avena)\b|燕麦奶/iu, 'consumables', 'oat-milk-pack-price'],
  [/\baustin\b.*\bmassage\b|\bmassage\b.*\baustin\b|奥斯汀.*按摩/iu, 'services', 'austin-60-minute-massage'],
  [/\blego batman\b/iu, 'games', 'lego-batman-pc-editions'],
  [/\b(?:pc games?|steam keys?|jeu pc|juego de pc)\b|电脑游戏|游戏激活码/iu, 'games', null],
  [/\b(?:massage|haircut|appointment|peluquería)\b|预约|理发|按摩/iu, 'services', null],
  [/\b(?:grocery|groceries|milk|pac[kq]uets?|supermercado)\b|日用品|超市/iu, 'consumables', null],
  [/\b(?:headphones?|headsets?|laptop|smartphone|casque|auriculares)\b|耳机|手机|笔记本/iu, 'electronics', null],
];

export function identifyIntent(subject) {
  const match = intentRules.find(([pattern]) => pattern.test(subject));
  return { category: match?.[1] ?? null, topic: match?.[2] ?? null };
}

// Canonical public content locators only. Never include an author handle or tracking query string.
function canonicalSource(raw) {
  let url;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  const host = url.hostname.replace(/^www\./u, '');
  const path = url.pathname;
  const parts = {
    'reddit.com': /^\/(?:r\/[\w]+\/)?comments\/([a-z0-9]+)(?:\/|$)/iu,
    'instagram.com': /^\/(p|reel)\/([\w-]+)\/?$/u,
    'pinterest.com': /^\/pin\/(\d+)\/?$/u,
    'x.com': /^\/(?:i|[\w]+)\/status\/(\d+)\/?$/u,
    'tiktok.com': /^\/(?:@[\w.-]+\/video|embed\/v2)\/(\d+)\/?$/u,
  };
  if (host === 'youtube.com' || host === 'youtu.be') {
    if (host === 'youtube.com' && path !== '/watch') return null;
    const video = host === 'youtu.be' ? path.slice(1) : url.searchParams.get('v');
    const comment = url.searchParams.get('lc');
    if (!/^[\w-]{11}$/u.test(video ?? '') || (comment && !/^[\w-]{4,90}$/u.test(comment))) return null;
    return 'https://www.youtube.com/watch?' + new URLSearchParams({ v: video, ...(comment ? { lc: comment } : {}) });
  }
  if (!Object.hasOwn(parts, host)) return null;
  const match = parts[host].exec(path);
  if (!match) return null;
  if (host === 'reddit.com') return 'https://www.reddit.com/comments/' + match[1].toLowerCase() + '/';
  if (host === 'x.com') return 'https://x.com/i/status/' + match[1];
  if (host === 'tiktok.com') return 'https://www.tiktok.com/embed/v2/' + match[1];
  if (host === 'instagram.com') return 'https://www.instagram.com/' + match[1] + '/' + match[2] + '/';
  return 'https://www.pinterest.com/pin/' + match[1] + '/';
}

export function qualifyDemand(observations, { now = Date.now() } = {}) {
  const seen = new Set();
  const rows = [];
  for (const raw of observations) {
    const scope = ['public_signal', 'buyer_request', 'opt_in'].includes(raw.scope) ? raw.scope : 'public_signal';
    const observedAt = Date.parse(raw.observedAt);
    const publishedAt = Date.parse(raw.publishedAt);
    if (!(publishedAt <= observedAt && observedAt <= now)) continue;
    const age = now - publishedAt;
    const source = scope === 'public_signal' ? canonicalSource(raw.source) : null;
    // Private intake deduplicates by an internal event number, which is not exported.
    const key = source || (scope !== 'public_signal' && Number.isSafeInteger(raw.event) ? scope + ':' + raw.event : null);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const { category, topic } = identifyIntent(raw.subject ?? '');
    const purchaseQuestion = raw.purchaseQuestion === true;
    const budgetKnown = raw.budgetKnown === true;
    const useKnown = raw.useKnown === true;
    const timingKnown = raw.timingKnown === true;
    const recent = age <= 14 * day;
    const market = /^[A-Z]{2}$/u.test(raw.market ?? '') ? raw.market : '';
    const score = (purchaseQuestion ? 3 : 0) + Number(recent) + Number(budgetKnown) + Number(useKnown) +
      Number(Boolean(market)) + Number(timingKnown);
    const prefill = topic && purchaseQuestion && recent && !raw.resolved && !raw.unverifiedRequirement &&
      makeAgentLink({ topic, market, goal: raw.goal }, now);
    const block = !purchaseQuestion ? 'trend_only' : !recent || raw.resolved ? 'stale_or_resolved' :
      !prefill ? 'insufficient_supported_product_evidence' : null;
    rows.push({ scope, source, publishedAt: new Date(publishedAt).toISOString(), observedAt: new Date(observedAt).toISOString(),
      category, market: market || null, budgetKnown, useKnown, timingKnown, score,
      confidence: purchaseQuestion && score >= 6 ? 'high' : purchaseQuestion && score >= 4 ? 'medium' : 'low',
      comparison: block || 'prefill_ready', link: prefill || null,
      delivery: 'blocked', deliveryReason: scope === 'public_signal' ? 'no_recipient_consent' :
        scope === 'buyer_request' ? 'no_consent_for_platform_reply' : 'no_authorized_sender_connected' });
  }
  return rows;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const observations = JSON.parse(await readFile(process.argv[2], 'utf8'));
  process.stdout.write(JSON.stringify(qualifyDemand(observations), null, 2) + '\n');
}
