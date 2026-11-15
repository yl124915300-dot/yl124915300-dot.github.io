// Editorial source: match-os/demand/topics.js. Run with --check in CI.
import fs from 'node:fs';
import { BASE, demandURL, topics } from '../match-os/demand/topics.js';

const e = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const list = Object.entries(topics);
const links = (except) => '<ul class="guides">' + list.filter(([id]) => id !== except).map(([id, p]) =>
  '<li><a href="' + demandURL(id) + '">' + e(p.title) + '</a><span>' + e(p.label) + ' · ' + e(p.description) + '</span></li>').join('\n') + '</ul>';

const layout = (path, title, description, body) => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; base-uri 'none'; form-action 'none'">
<title>${e(title)} | MATCH OS</title>
<meta name="description" content="${e(description)}">
<link rel="canonical" href="${BASE}${path}">
<link rel="stylesheet" href="/match-os/demand/guide.css">
</head><body><main>
<header><a href="/match-os/">MATCH OS</a><a href="/match-os/demand/">Buying guides</a><a href="/video-find/">FrameFind</a></header>
${body}
<footer>Free comparison pilot. Purchase directly from the merchant. MATCH OS does not collect a fee.</footer>
</main></body></html>
`;
const check = process.argv.includes('--check');
function file(path, content) {
  if (check) {
    if (fs.readFileSync(path, 'utf8') !== content) throw new Error('Regenerate ' + path);
  } else {
    fs.mkdirSync(path.slice(0, path.lastIndexOf('/') + 1) || '.', { recursive: true });
    fs.writeFileSync(path, content);
  }
}
function assert(condition, label) { if (!condition) throw new Error(label); }
assert(list.length >= 3 && list.length <= 6 && new Set(list.map(([, t]) => t.category)).size >= 3, 'Pilot scope');
const visited = new Set();
for (const [id, p] of list) {
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(id) && p.item.length <= 120 && p.description.length >= 70, id);
  assert(p.problem.length >= 100 && p.checks.length >= 3 && p.output.length >= 70 && p.gap.length >= 75, id + ' needs useful content');
  assert(p.sources.length && p.sources.every(([name, url]) => name && new URL(url).protocol === 'https:'), id + ' needs a primary source');
  for (const s of [p.title, p.description, p.problem, p.output, p.gap, ...p.checks.map(([, value]) => value)]) {
    assert(!visited.has(s), id + ' contains duplicate editorial text');
    visited.add(s);
  }
  const path = demandURL(id);
  const body = `<p class="eyebrow">${e(p.label)} · Buying guide</p>
<h1>${e(p.title)}</h1>
<p class="lead">${e(p.problem)}</p>
<section aria-labelledby="check"><h2 id="check">What to check before you pay</h2><ol>
${p.checks.map(([label, value]) => '<li><strong>' + e(label) + '.</strong> ' + e(value) + '</li>').join('\n')}
</ol></section>
<section aria-labelledby="compare"><h2 id="compare">What MATCH OS can compare</h2>
<p>${e(p.output)}</p><p>${e(p.gap)}</p>
<a id="open-chat" class="cta" href="/match-os/#entry=demand_page&amp;topic=${id}">Open this request in MATCH OS</a>
<p class="small">Review or change the draft before starting. The link contains only this guide’s public topic. External lookups require your approval.</p></section>
<section aria-labelledby="refs"><h2 id="refs">Source references</h2><ul>
${p.sources.map(([label, url]) => '<li><a href="' + e(url) + '" rel="noreferrer">' + e(label) + '</a></li>').join('\n')}
</ul></section>
<section aria-labelledby="related"><h2 id="related">Other buying guides</h2>${links(id)}</section>`;
  file(path.slice(1) + 'index.html', layout(path, p.title, p.description, body));
}
const hub = demandURL();
const intro = 'Buying guides for exact products, package sizes, local service options and PC game editions. Each guide opens a draft in the same purchase chat.';
file(hub.slice(1) + 'index.html', layout(hub, 'Buying guides', intro,
  '<p class="eyebrow">MATCH OS · Buying guides</p><h1>Know what to compare before you pay</h1><p class="lead">' + intro + '</p>' + links()));
const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
assert(sitemap.includes('</urlset>'), 'Expected the existing root sitemap');
const missing = [hub, ...list.map(([id]) => demandURL(id))].filter(url => !sitemap.includes('<loc>' + BASE + url + '</loc>'));
file('sitemap.xml', sitemap.replace('</urlset>', missing.map(url => '  <url><loc>' + BASE + url + '</loc><lastmod>2026-11-15</lastmod></url>\n').join('') + '</urlset>'));
