#!/usr/bin/env python3
"""Evidence-gated exact-part publishing. Python 3 standard library only.

HTTP probing can invalidate an offer but can never reverify its commercial facts.
New evidence is accepted only by explicit reviewed JSON ingestion.
"""
import argparse
import copy
import datetime as dt
import hashlib
import html
import json
import math
import random
import re
import sqlite3
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

CAMPAIGN = "5339214603"
VERTICALS = {"Industrial Automation/MRO", "Heavy Equipment/Crane", "Commercial Vehicle/OEM replacement", "Legacy IT/Networking"}
LIVE = {"BUY_NOW", "IN_STOCK"}
METHODS = {"browser_rendered", "official_api", "web_source"}
NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
ET.register_namespace("", NS)
METRICS = ("SEARCH_IMPRESSIONS", "SEARCH_CLICKS", "EPN_CLICKS", "ATTRIBUTED_PURCHASES", "COMMISSION_PENDING", "COMMISSION_PAID")


def utcnow():
    return dt.datetime.now(dt.timezone.utc)


def timestamp(value=None):
    if value is None:
        return utcnow()
    parsed = dt.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Timestamps must include a timezone")
    return parsed.astimezone(dt.timezone.utc)


def iso(value):
    return timestamp(value).isoformat(timespec="seconds")


def norm(value):
    return re.sub(r"[^A-Z0-9]", "", str(value).upper())


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", str(value).lower()).strip("-")


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def valid_url(value):
    try:
        p = urllib.parse.urlsplit(value)
        return p.scheme in {"https", "http"} and bool(p.hostname) and not p.username and not p.password
    except (ValueError, TypeError):
        return False


def ebay_url(value):
    if not valid_url(value):
        return False
    host = urllib.parse.urlsplit(value).hostname.lower()
    return bool(re.fullmatch(r"(?:[a-z0-9-]+\.)?ebay\.(?:com|co\.uk|com\.au|de|fr|it|es|ca|at|ch|ie|nl|be|pl)", host))


def item_key(value):
    if ebay_url(value):
        match = re.search(r"/itm/(?:[^/?]+/)?(\d{9,15})(?:[/?]|$)", value)
        return "ebay:" + match[1] if match else ""
    p = urllib.parse.urlsplit(value)
    return p.netloc.lower() + p.path.rstrip("/")


def customid(candidate):
    return "cpr_" + norm(candidate["mpn"]).lower()[:42]


def tracked_link(url, identifier, campaign=CAMPAIGN):
    p = urllib.parse.urlsplit(url)
    params = dict(urllib.parse.parse_qsl(p.query))
    params.update({"mkcid": "1", "mkrid": "711-53200-19255-0", "siteid": "0", "campid": campaign, "customid": identifier, "toolid": "10001", "mkevt": "1"})
    return urllib.parse.urlunsplit((p.scheme, p.netloc, p.path, urllib.parse.urlencode(params), p.fragment))


def tracked_valid(url, campaign=CAMPAIGN):
    if not ebay_url(url):
        return False
    q = urllib.parse.parse_qs(urllib.parse.urlsplit(url).query)
    return q.get("campid") == [campaign] and bool(q.get("customid", [""])[0]) and q.get("mkcid") == ["1"]


def connect(path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    db.executescript("""
      PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS page_candidates (
        candidate_id TEXT PRIMARY KEY, mpn TEXT NOT NULL, brand TEXT NOT NULL,
        vertical TEXT NOT NULL, page_path TEXT NOT NULL UNIQUE, customid TEXT NOT NULL UNIQUE,
        payload_json TEXT NOT NULL, ingested_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS page_evidence (
        evidence_id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL REFERENCES page_candidates(candidate_id),
        kind TEXT NOT NULL, source_url TEXT NOT NULL, verified_at TEXT NOT NULL,
        payload_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS page_evidence_probes (
        probe_id INTEGER PRIMARY KEY, candidate_id TEXT NOT NULL, source_url TEXT NOT NULL,
        checked_at TEXT NOT NULL, http_status INTEGER, outcome TEXT NOT NULL, final_url TEXT);
      CREATE TABLE IF NOT EXISTS page_qualification (
        candidate_id TEXT PRIMARY KEY REFERENCES page_candidates(candidate_id),
        status TEXT NOT NULL, qualified INTEGER NOT NULL, reasons_json TEXT NOT NULL,
        live_listing_count INTEGER NOT NULL, stale INTEGER NOT NULL,
        evaluated_at TEXT NOT NULL, no_live_supply_streak INTEGER NOT NULL DEFAULT 0,
        observation_digest TEXT NOT NULL, first_qualified_at TEXT);
      CREATE TABLE IF NOT EXISTS page_qualification_history (
        id INTEGER PRIMARY KEY, candidate_id TEXT NOT NULL, evaluated_at TEXT NOT NULL,
        status TEXT NOT NULL, reasons_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS page_publications (
        relative_path TEXT PRIMARY KEY, candidate_id TEXT, canonical_url TEXT NOT NULL,
        content_hash TEXT NOT NULL, built_at TEXT NOT NULL, kind TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS page_attribution (
        customid TEXT PRIMARY KEY, candidate_id TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS page_deployment_checks (
        id INTEGER PRIMARY KEY, canonical_url TEXT NOT NULL, checked_at TEXT NOT NULL,
        http_status INTEGER, observed_hash TEXT, expected_hash TEXT, outcome TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS page_measurements (
        metric TEXT PRIMARY KEY, value_json TEXT NOT NULL, source_url TEXT,
        verified_at TEXT, note TEXT);
    """)
    return db


def safe_path(value):
    p = Path(value)
    if not value or p.is_absolute() or ".." in p.parts or "\\" in value or "?" in value or "#" in value:
        raise ValueError("Unsafe page_path: " + str(value))
    if p.parts[0] in {'assets', 'factory', 'series'} or len(p.parts) < 2:
        raise ValueError("Part page_path must use a non-reserved brand/part path")
    return value.rstrip("/") + "/"


def ingest(db, document, now):
    candidates = document.get("candidates", [])
    if not isinstance(candidates, list):
        raise ValueError("candidates must be an array")
    with db:
        for raw in candidates:
            c = copy.deepcopy(raw)
            if not c.get("mpn") or not c.get("brand"):
                raise ValueError("Every candidate needs brand and exact mpn")
            cid = norm(c["brand"]) + ":" + norm(c["mpn"])
            c["candidate_id"] = cid
            c["page_path"] = safe_path(c.get("page_path") or slug(c["brand"]) + "/" + slug(c["mpn"]) + "/")
            previous = db.execute("SELECT page_path,customid FROM page_candidates WHERE candidate_id=?", (cid,)).fetchone()
            if previous and previous["page_path"] != c["page_path"]:
                raise ValueError("Existing URLs cannot be changed: " + cid)
            identifier = previous["customid"] if previous else customid(c)
            # Preserve approved existing tracked identifiers only when every mapped link
            # belongs to the active campaign and all IDs map uniquely to this page.
            passed = [x["tracked_url"] for x in c.get("listings", []) if x.get("tracked_url")]
            if any(not tracked_valid(url) for url in passed):
                raise ValueError("Invalid EPN campaign / tracking parameters: " + cid)
            ids = [urllib.parse.parse_qs(urllib.parse.urlsplit(url).query)["customid"][0] for url in passed]
            if ids and not previous:
                common = re.sub(r"_[abc]$", "", ids[0])
                if all(x == common or re.sub(r"_[abc]$", "", x) == common for x in ids):
                    identifier = common
                else:
                    raise ValueError("Existing attribution links need one page customid or _a/_b/_c suffixes")
            owner = db.execute("SELECT candidate_id FROM page_candidates WHERE customid=? AND candidate_id!=?", (identifier, cid)).fetchone()
            if owner:
                if passed:
                    raise ValueError("Attribution customid is already owned by another MPN")
                identifier = identifier[:40] + "_" + digest(cid)[:7]
            c["customid"] = identifier
            search = c.get('tracked_search_url') or c.get('search_url')
            if search:
                if not tracked_valid(search) or '/sch/' not in urllib.parse.urlsplit(search).path:
                    raise ValueError('Invalid preserved tracked search URL')
                search_query = urllib.parse.parse_qs(urllib.parse.urlsplit(search).query).get('_nkw', [''])[0]
                if norm(c['mpn']) not in norm(search_query):
                    raise ValueError('Tracked search does not contain the exact candidate MPN')
                c['tracked_search_url'] = search
                ids.append(urllib.parse.parse_qs(urllib.parse.urlsplit(search).query)['customid'][0])
            for mapped_id in set(ids + [identifier]):
                owner = db.execute('SELECT candidate_id FROM page_attribution WHERE customid=?', (mapped_id,)).fetchone()
                if owner and owner['candidate_id'] != cid:
                    raise ValueError('Tracked listing/search customid belongs to another MPN')
                db.execute('INSERT OR IGNORE INTO page_attribution VALUES (?,?)', (mapped_id, cid))
            for listing in c.get("listings", []):
                if listing.get("tracked_url"):
                    tracking_id = urllib.parse.parse_qs(urllib.parse.urlsplit(listing["tracked_url"]).query)["customid"][0]
                    owner = db.execute("SELECT candidate_id FROM page_candidates WHERE customid IN (?,?) AND candidate_id!=?", (tracking_id, re.sub(r"_[abc]$", "", tracking_id), cid)).fetchone()
                    if owner:
                        raise ValueError("Attribution customid is already owned by another MPN")
                    if item_key(listing["tracked_url"]) != item_key(listing.get("source_url", "")):
                        raise ValueError("Tracked URL points at a different listing")
            db.execute("INSERT INTO page_candidates VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(candidate_id) DO UPDATE SET vertical=excluded.vertical,payload_json=excluded.payload_json,ingested_at=excluded.ingested_at", (cid, c["mpn"], c["brand"], c.get("vertical", ""), c["page_path"], identifier, json.dumps(c, ensure_ascii=False), iso(now)))
            for kind, items in (("listing", c.get("listings", [])), ("reference", c.get("references", []))):
                for i, e in enumerate(items):
                    url, verified = e.get("source_url", ""), e.get("verified_at", "")
                    # Missing facts remain ingestible so rejected candidates are auditable.
                    if verified:
                        timestamp(verified)
                    db.execute("INSERT OR IGNORE INTO page_evidence VALUES (?,?,?,?,?,?)", (digest([cid, kind, e]), cid, kind, url, verified, json.dumps(e, ensure_ascii=False)))
    return len(candidates)


def latest_probe(db, cid, url):
    return db.execute("SELECT * FROM page_evidence_probes WHERE candidate_id=? AND source_url=? ORDER BY probe_id DESC LIMIT 1", (cid, url)).fetchone()


def fresh(e, now):
    try:
        times = [e.get('verified_at')]
        if e.get('source_crawled_at'):
            times.append(e['source_crawled_at'])
        return all(value and 0 <= (now - timestamp(value)).total_seconds() <= 86400 for value in times)
    except (ValueError, TypeError):
        return False


def listing_reasons(db, c, e, now):
    errors = []
    if not valid_url(e.get("source_url")):
        errors.append("MISSING_LISTING_URL")
    if norm(e.get("exact_mpn", "")) != norm(c["mpn"]) or e.get("identity_verified") is not True:
        errors.append("EXACT_MPN_NOT_VERIFIED")
    if not fresh(e, now):
        errors.append("LISTING_EVIDENCE_STALE_OR_UNDATED")
    if not isinstance(e.get("price"), (float, int)) or isinstance(e.get("price"), bool) or not math.isfinite(e["price"]) or e["price"] <= 0 or not re.fullmatch(r"[A-Z]{3}", e.get("currency", "")):
        errors.append("PUBLIC_PRICE_MISSING")
    if not e.get("condition"):
        errors.append("CONDITION_MISSING")
    if not e.get("seller"):
        errors.append("SELLER_MISSING")
    if e.get("availability") not in LIVE:
        errors.append("NOT_CURRENTLY_BUYABLE")
    if not e.get("shipping_note"):
        errors.append("SHIPPING_SCOPE_OR_UNKNOWN_MISSING")
    known_term = lambda value: bool(value) and str(value).strip().lower() not in {'unknown', 'not verified', 'unverified', 'not independently verified', 'n/a', 'none known'}
    if not known_term(e.get("returns_note")) and not known_term(e.get("warranty_note")):
        errors.append("RETURNS_OR_WARRANTY_MISSING")
    if e.get("verification_method") not in METHODS or not e.get("evidence_note"):
        errors.append("VERIFICATION_EVIDENCE_MISSING")
    if e.get("marketplace") == "ebay" and (not ebay_url(e.get("source_url")) or not item_key(e.get("source_url", "")).startswith("ebay:")):
        errors.append("EBAY_EXACT_ITEM_URL_REQUIRED")
    probe = latest_probe(db, c["candidate_id"], e.get("source_url", ""))
    if probe and probe["outcome"] == "INVALID" and (not e.get("verified_at") or timestamp(probe["checked_at"]) >= timestamp(e["verified_at"])):
        errors.append("LISTING_URL_INVALID")
    return errors


def evaluate(db, c, now):
    reasons = []
    if c.get("vertical") not in VERTICALS:
        reasons.append("OUTSIDE_APPROVED_VERTICALS")
    if not c.get("category") or not c.get("identity_summary"):
        reasons.append("IDENTITY_CONTENT_MISSING")
    live, seen, listing_detail = [], set(), []
    explicitly_unbuyable, observations = [], []
    for e in c.get("listings", []):
        errs = listing_reasons(db, c, e, now)
        key = item_key(e.get("source_url", ""))
        if key in seen:
            errs.append("DUPLICATE_LISTING")
        if not errs:
            live.append(e)
            seen.add(key)
        listing_detail.append({"source_url": e.get("source_url"), "reasons": errs})
        probe = latest_probe(db, c["candidate_id"], e.get("source_url", ""))
        invalid_probe = probe and probe["outcome"] == "INVALID" and (not e.get("verified_at") or timestamp(probe["checked_at"]) >= timestamp(e["verified_at"]))
        explicitly_unbuyable.append(e.get("availability") in {"OUT_OF_STOCK", "ENDED"} or bool(invalid_probe))
        observations.append([e.get("source_url"), e.get("verified_at"), e.get("availability"), probe["checked_at"] if invalid_probe else None])
    if len(live) < 2:
        reasons.append("FEWER_THAN_TWO_CURRENT_BUYABLE_LISTINGS")
    if c.get("ebay_market_exists", True):
        if not any(e.get("marketplace") == "ebay" for e in live):
            reasons.append("NO_CURRENT_EBAY_LISTING")
    elif not c.get("ebay_absence_note"):
        reasons.append("EBAY_ABSENCE_NOT_DOCUMENTED")
    refs = [e for e in c.get("references", []) if valid_url(e.get("source_url")) and not ebay_url(e["source_url"]) and fresh(e, now) and norm(e.get("exact_mpn", "")) == norm(c["mpn"]) and e.get("source_identity") and e.get("identity_note")]
    if not refs:
        reasons.append("NON_EBAY_CROSS_REFERENCE_MISSING_OR_STALE")
    sources = {e["source_url"] for e in refs + live}
    checks = c.get("model_checks", [])
    if not checks or any(not x.get("text") or len(x["text"].strip()) < 30 or not x.get("source_urls") or not set(x["source_urls"]).issubset(sources) for x in checks):
        reasons.append("MODEL_SPECIFIC_CHECKS_NOT_SUPPORTED")
    review = c.get("review", {})
    if review.get("approved") is not True or not review.get("reviewer") or not review.get("incremental_value") or not review.get("reviewed_at"):
        reasons.append("INCREMENTAL_VALUE_REVIEW_REQUIRED")
    elif timestamp(review["reviewed_at"]) > now:
        reasons.append("REVIEW_TIMESTAMP_IN_FUTURE")
    ev = c.get("references", []) + c.get("listings", [])
    stale = bool(ev) and any(not fresh(e, now) for e in ev)
    if stale:
        reasons.append('EVIDENCE_OVER_24H_OR_UNDATED')
    observation_digest = digest(observations)
    previous = db.execute("SELECT * FROM page_qualification WHERE candidate_id=?", (c["candidate_id"],)).fetchone()
    streak = previous["no_live_supply_streak"] if previous else 0
    confirmed_empty = bool(explicitly_unbuyable) and all(explicitly_unbuyable)
    if confirmed_empty and (not previous or previous["observation_digest"] != observation_digest):
        streak += 1
    elif not confirmed_empty:
        streak = 0
    status = "QUALIFIED" if not reasons else "WATCHLIST" if len(live) == 1 else "REJECTED"
    if reasons and stale:
        status = "STALE"
    if confirmed_empty and streak >= 2:
        status = "NO_LIVE_SUPPLY"
    first = previous["first_qualified_at"] if previous else None
    if status == "QUALIFIED" and not first:
        first = iso(now)
    result = {"candidate_id": c["candidate_id"], "mpn": c["mpn"], "page_path": c["page_path"], "status": status, "qualified": status == "QUALIFIED", "reasons": reasons, "listing_checks": listing_detail, "live_listing_count": len(live), "stale": stale, "no_live_supply_streak": streak, "first_qualified_at": first, "evaluated_at": iso(now)}
    with db:
        db.execute("INSERT OR REPLACE INTO page_qualification VALUES (?,?,?,?,?,?,?,?,?,?)", (c["candidate_id"], status, int(result["qualified"]), json.dumps(reasons), len(live), int(stale), iso(now), streak, observation_digest, first))
        db.execute("INSERT INTO page_qualification_history(candidate_id,evaluated_at,status,reasons_json) VALUES (?,?,?,?)", (c["candidate_id"], iso(now), status, json.dumps(reasons)))
    return result


def qualify(db, now):
    return [evaluate(db, json.loads(r["payload_json"]), now) for r in db.execute("SELECT * FROM page_candidates ORDER BY candidate_id").fetchall()]


def probe(db, now, timeout=15):
    results = []
    current = []
    for candidate in db.execute('SELECT candidate_id,payload_json FROM page_candidates').fetchall():
        for listing in json.loads(candidate['payload_json']).get('listings', []):
            current.append({'candidate_id': candidate['candidate_id'], 'source_url': listing.get('source_url', '')})
    for row in current:
        url = row["source_url"]
        if not valid_url(url):
            continue
        req = urllib.request.Request(url, headers={"User-Agent": "PartIntelligenceFactory/1.0 (+read-only availability-link audit)"}, method="GET")
        status, outcome, final_url = None, "UNVERIFIED", url
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                status, final_url = response.status, response.url
                response.read(1024)
                outcome = "REACHABLE_NOT_REVERIFIED"
        except urllib.error.HTTPError as error:
            status = error.code
            outcome = "INVALID" if status in {404, 410} else "BLOCKED_OR_ERROR"
        except (urllib.error.URLError, TimeoutError, OSError):
            outcome = "NETWORK_ERROR"
        with db:
            db.execute("INSERT INTO page_evidence_probes(candidate_id,source_url,checked_at,http_status,outcome,final_url) VALUES (?,?,?,?,?,?)", (row["candidate_id"], url, iso(now), status, outcome, final_url))
        results.append({"source_url": url, "checked_at": iso(now), "http_status": status, "outcome": outcome})
    return results


def h(value):
    return html.escape(str(value), quote=True)


def a(url, label, affiliate=False, css=""):
    return '<a href="' + h(url) + '"' + (' rel="sponsored nofollow"' if affiliate else '') + (' class="' + css + '"' if css else '') + '>' + h(label) + '</a>'


def shell(title, description, canonical, body, base):
    return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + h(title) + '</title><meta name="description" content="' + h(description) + '"><link rel="canonical" href="' + h(canonical) + '"><link rel="stylesheet" href="' + h(base + 'assets/intelligence.css') + '"></head><body><header><nav>' + a(base, 'EXACT-PART GATEWAY', css='wordmark') + a(base + 'factory/', 'Verified page index') + '</nav></header><main>' + body + '</main><footer>Exact-Part Gateway provides independent sourcing information and is not the seller. No fitment or authenticity guarantee. Listing prices, availability, shipping and terms may change; check the seller’s current page before ordering.</footer></body></html>\n'


def freshness_guard(c, fallback, server_status):
    """Conservative display expiry between server refreshes; never edits evidence."""
    times = []
    for evidence in c.get('listings', []) + c.get('references', []):
        for key in ('verified_at', 'source_crawled_at'):
            if evidence.get(key):
                times.append(timestamp(evidence[key]))
    expiry = int((min(times) + dt.timedelta(hours=24)).timestamp() * 1000) if times else 0
    config = json.dumps({'expiresAt': expiry, 'fallback': fallback, 'serverStatus': server_status}, separators=(',', ':')).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    return '<script id="factory-freshness-data" type="application/json">' + config + '</script>' + r'''<script id="factory-freshness-guard">
(() => {
  const data = JSON.parse(document.getElementById('factory-freshness-data').textContent);
  let timer;
  function checkFreshness() {
    clearTimeout(timer);
    const remaining = data.expiresAt - Date.now();
    if (Number.isFinite(remaining) && remaining > 0) {
      timer = setTimeout(checkFreshness, Math.min(remaining + 1, 2147483647));
      return;
    }
    document.querySelectorAll('[data-factory-status]').forEach(el => {
      el.textContent = data.serverStatus === 'NO_LIVE_SUPPLY' ? 'NO_LIVE_SUPPLY' : 'STALE';
    });
    document.querySelectorAll('[data-factory-current-count]').forEach(el => { el.textContent = '0'; });
    document.querySelectorAll('[data-factory-offer-label]').forEach(el => { el.textContent = 'Historical offer — recheck seller'; });
    document.querySelectorAll('[data-factory-listing-heading]').forEach(el => { el.textContent = 'Dated listings comparison'; });
    document.querySelectorAll('[data-factory-snapshot-heading]').forEach(el => { el.textContent = 'Dated market snapshot'; });
    document.querySelectorAll('[data-factory-freshness-warning]').forEach(el => { el.hidden = false; });
    document.querySelectorAll('a[href]').forEach(link => {
      try {
        const url = new URL(link.href);
        if (url.pathname.includes('/itm/') && url.searchParams.get('campid') === '5339214603') {
          link.href = data.fallback;
          link.textContent = 'Search current eBay offers — snapshot expired';
          link.setAttribute('rel', 'sponsored nofollow');
        }
      } catch (_) { /* Keep non-URL evidence links unchanged. */ }
    });
    document.documentElement.dataset.factoryFreshness = 'STALE';
  }
  checkFreshness();
  document.addEventListener('visibilitychange', checkFreshness);
})();
</script>'''


def page_html(db, c, q, now, base, related):
    canonical = base + c["page_path"]
    fallback_plain = "https://www.ebay.com/sch/i.html?" + urllib.parse.urlencode({"_nkw": c["mpn"]})
    fallback = c.get('tracked_search_url') or tracked_link(fallback_plain, c["customid"])
    live = [e for e in c.get("listings", []) if not listing_reasons(db, c, e, now)]
    fresh_times = [e.get("verified_at") for e in c.get("listings", []) + c.get("references", []) if e.get("verified_at")]
    verified = min(fresh_times, key=timestamp) if fresh_times else None
    body = '<section class="hero"><div><p class="eyebrow">' + h(c["brand"]) + ' · ' + h(c["category"]) + '</p><h1>' + h(c["mpn"]) + ': price, availability and buying checks</h1><p class="lede">' + h(c["identity_summary"]) + '</p></div><aside class="identity"><dl><dt>Exact part number</dt><dd>' + h(c["mpn"]) + '</dd><dt>Manufacturer / brand</dt><dd>' + h(c["brand"]) + '</dd><dt>Verification status</dt><dd data-factory-status>' + h(q["status"]) + '</dd><dt>Last verified</dt><dd><time datetime="' + h(verified or '') + '">' + h(verified or 'Unknown') + '</time></dd></dl></aside></section>'
    body += '<p class="disclosure">Affiliate disclosure: eBay links are tracked affiliate links. We may earn a commission from qualifying purchases. Purchase and return contracts are with the named seller.</p>'
    body += '<p class="alert" data-factory-freshness-warning hidden>This dated snapshot has exceeded its 24-hour verification window. Offers below are historical references, not current stock claims. Current-offer counts are set to zero until renewed verification; eBay purchase buttons now open the tracked exact-part search. Original evidence timestamps are unchanged.</p>'
    if q["status"] != "QUALIFIED":
        body += '<p class="alert">' + h(q["status"]) + ': this page is retained for reference and is not currently counted as qualified. Verify all current terms with the seller. Historical offers below are not a current supply claim.</p>'
    primary = next((e.get("tracked_url") or tracked_link(e["source_url"], c["customid"]) for e in live if e.get("marketplace") == 'ebay'), fallback)
    primary_label = 'Buy on eBay — check current listing' if any(e.get('marketplace') == 'ebay' for e in live) else 'Search current eBay offers'
    body += '<div class="actions">' + a(primary, primary_label, True, 'button') + a('#fitment', 'Need fitment / help?', css='button secondary') + '</div>'
    body += '<section class="section" id="listings"><h2 data-factory-listing-heading>Current listings comparison</h2><p class="note"><span data-factory-current-count>' + h(len(live)) + '</span> verified buyable offers in this reviewed sample. This is not a market-wide price estimate. Each offer retains its own verification timestamp.</p><div class="grid">'
    display_listings = live[:3] + [e for e in c.get('listings', []) if e not in live][:max(0, 3 - len(live))]
    for e in display_listings:
        active = e in live
        ebay = e.get("marketplace") == 'ebay'
        target = (e.get("tracked_url") or tracked_link(e["source_url"], c["customid"])) if ebay and active else fallback if ebay else e.get("source_url", "")
        label = ('Buy on eBay — verify offer' if active else 'Search eBay — old offer unverified') if ebay else 'Open supplier offer' if active else 'Supplier reference — availability unverified'
        body += '<article class="card"><span class="pill" data-factory-offer-label>' + ('Verified current offer' if active else 'Historical / unverified offer') + '</span><h3>' + h(e.get("seller", "Unknown source")) + '</h3><p class="price">' + h(e.get("currency", "")) + ' ' + h(e.get("price", "Unknown")) + '</p><dl class="facts">'
        for term, value in (("Exact MPN", e.get("exact_mpn")), ("Condition", e.get("condition")), ("Availability at review", e.get("availability")), ("Shipping", e.get("shipping_note")), ("Returns", e.get("returns_note", "Not independently verified")), ("Warranty", e.get("warranty_note", "Not independently verified")), ("Verified at", e.get("verified_at")), ("Evidence", e.get("evidence_note"))):
            body += '<dt>' + h(term) + '</dt><dd>' + h(value or 'Unknown') + '</dd>'
        body += '</dl><p>' + a(target, label, ebay) + '</p><p class="sources">Source: ' + a(e.get("source_url", ""), e.get("source_url", ""), ebay) + '</p></article>'
    body += '</div></section><section class="section"><h2 data-factory-snapshot-heading>Current market snapshot</h2><div class="snapshot"><p>Reviewed sample: <span data-factory-current-count>' + h(len(live)) + '</span> current buyable listings. Snapshot evaluated ' + h(verified or 'Unknown') + '.</p><p class="note">Compare condition, included accessories, destination shipping, taxes and seller terms before comparing total cost. No currency conversion or invented market price is applied.</p></div></section>'
    body += '<section class="section" id="fitment"><h2>What to verify before buying ' + h(c["mpn"]) + '</h2><div class="checklist">'
    for check in c.get("model_checks", []):
        body += '<article><p>' + h(check['text']) + '</p><p class="sources">' + ' · '.join(a(u, 'Supporting source', ebay_url(u)) for u in check.get('source_urls', [])) + '</p></article>'
    body += '</div><p>For fitment help, give the seller your exact equipment model, existing part label, revision and connector photos. Ask for written confirmation before ordering. Do not share confidential machine data publicly.</p></section>'
    body += '<section class="section"><h2>Shipping and returns notes</h2><p>Shipping scope and return or warranty terms above are specific to each reviewed offer. “Unknown” means the destination or term was not established. Confirm delivery to your postcode, landed cost and the seller’s return conditions before payment.</p></section><section class="section"><h2>Non-eBay identity and specification references</h2><ul>'
    for ref in c.get('references', []):
        body += '<li>' + a(ref['source_url'], ref.get('source_identity', ref['source_url'])) + ' — ' + h(ref.get('identity_note', '')) + ' <span class="note">Verified ' + h(ref.get('verified_at', 'Unknown')) + '</span></li>'
    body += '</ul></section>'
    if related:
        body += '<section class="section"><h2>Related parts in this series</h2><ul>' + ''.join('<li>' + a(base + r['page_path'], r['brand'] + ' ' + r['mpn']) + '</li>' for r in related[:6]) + '</ul></section>'
    body += '<p class="small">Other route: ' + a(fallback_plain, 'ordinary eBay search (untracked)', True) + '. Listings may change after verification.</p>'
    body += freshness_guard(c, fallback, q['status'])
    return shell(c['brand'] + ' ' + c['mpn'] + ' price & availability | Exact-Part Gateway', 'Compare reviewed ' + c['mpn'] + ' offers, condition, shipping and model-specific replacement checks. Verify current seller terms before buying.', canonical, body, base)


def merge_sitemap(path, new_urls, now):
    path = Path(path)
    if path.exists():
        tree = ET.parse(path)
        root = tree.getroot()
        if root.tag.split('}')[-1] != 'urlset':
            raise ValueError('Sitemap index is not a URL sitemap; refusing to replace ' + str(path))
    else:
        root = ET.Element('{' + NS + '}urlset')
        tree = ET.ElementTree(root)
    known = {el.text for el in root.iter() if el.tag.split('}')[-1] == 'loc'}
    for url in sorted(set(new_urls) - known):
        element = ET.SubElement(root, '{' + NS + '}url')
        ET.SubElement(element, '{' + NS + '}loc').text = url
        ET.SubElement(element, '{' + NS + '}lastmod').text = now.date().isoformat()
    for element in root:
        location = next((x for x in element if x.tag.split('}')[-1] == 'loc'), None)
        if location is not None and location.text in new_urls:
            modified = next((x for x in element if x.tag.split('}')[-1] == 'lastmod'), None)
            if modified is None:
                modified = ET.SubElement(element, '{' + NS + '}lastmod')
            modified.text = now.date().isoformat()
    path.parent.mkdir(parents=True, exist_ok=True)
    tree.write(path, encoding='utf-8', xml_declaration=True)
    return len(known | set(new_urls))


def metrics(db, now):
    rows = db.execute('SELECT q.*,p.relative_path FROM page_qualification q LEFT JOIN page_publications p ON q.candidate_id=p.candidate_id AND p.kind="part"').fetchall()
    qualified_built = [r for r in rows if r['status'] == 'QUALIFIED' and r['relative_path']]
    live_ids = set()
    for pub in db.execute('SELECT * FROM page_publications WHERE kind="part"').fetchall():
        check = db.execute('SELECT * FROM page_deployment_checks WHERE canonical_url=? ORDER BY id DESC LIMIT 1', (pub['canonical_url'],)).fetchone()
        if check and check['outcome'] == 'LIVE_MATCH' and check['observed_hash'] == pub['content_hash']:
            live_ids.add(pub['candidate_id'])
    qualified = [r for r in qualified_built if r['candidate_id'] in live_ids]
    data = {"generated_at": iso(now), "QUALIFIED_PAGES_BUILT": len(qualified_built), "QUALIFIED_PAGES_LIVE": len(qualified), "EPN_TRACKED_PAGES": len(qualified), "EPN_TRACKED_COVERAGE": 1.0 if qualified else None, "STALE_PAGES": sum(bool(r['stale']) and bool(r['relative_path']) for r in rows), "NO_LIVE_SUPPLY_PAGES": sum(r['status'] == 'NO_LIVE_SUPPLY' and bool(r['relative_path']) for r in rows), "INDEXED": None, "INDEXED_STATUS": "UNKNOWN", "measurement_note": "Unknown measurements are null, never zero. LIVE requires a public HTTP 200 whose content hash matches the current built artifact; BUILT does not imply deployed."}
    for metric in METRICS:
        data[metric] = None
    for row in db.execute('SELECT * FROM page_measurements'):
        data[row['metric']] = json.loads(row['value_json'])
    return data


def verify_deployed(db, now, timeout=20):
    results = []
    for pub in db.execute('SELECT * FROM page_publications').fetchall():
        status, observed_hash, outcome = None, None, 'UNVERIFIED'
        try:
            req = urllib.request.Request(pub['canonical_url'], headers={'User-Agent': 'PartIntelligenceFactory/1.0 public deployment verification'})
            with urllib.request.urlopen(req, timeout=timeout) as response:
                status = response.status
                observed_hash = hashlib.sha256(response.read()).hexdigest()
                outcome = 'LIVE_MATCH' if status == 200 and observed_hash == pub['content_hash'] else 'CONTENT_MISMATCH'
        except urllib.error.HTTPError as error:
            status, outcome = error.code, 'HTTP_ERROR'
        except (urllib.error.URLError, TimeoutError, OSError):
            outcome = 'NETWORK_ERROR'
        with db:
            db.execute('INSERT INTO page_deployment_checks(canonical_url,checked_at,http_status,observed_hash,expected_hash,outcome) VALUES (?,?,?,?,?,?)', (pub['canonical_url'], iso(now), status, observed_hash, pub['content_hash'], outcome))
        results.append({'url': pub['canonical_url'], 'http_status': status, 'outcome': outcome})
    return {'checks': results, 'metrics': metrics(db, now)}


def update_discovery(subtree, qualified, clusters, base):
    """Append qualified catalog entries; preserve all old commercial data/times."""
    additions = [{key: c[key] for key in ('brand', 'mpn', 'category', 'page_path')} for c in qualified]
    def extend(existing):
        result = copy.deepcopy(existing)
        known = {(norm(c.get('brand', '')), norm(c.get('mpn', ''))) for c in result}
        for c in additions:
            key = norm(c['brand']), norm(c['mpn'])
            if key not in known:
                result.append(c); known.add(key)
        return result
    catalog_path = subtree / 'catalog.json'
    original_catalog = json.loads(catalog_path.read_text()) if catalog_path.exists() else []
    catalog = extend(original_catalog)
    if catalog != original_catalog:
        catalog_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + '\n')
    market_path = subtree / 'marketplace-data.json'
    if market_path.exists():
        market = json.loads(market_path.read_text())
        original = copy.deepcopy(market)
        market['catalog'] = extend(market.get('catalog', []))
        if market != original:
            market_path.write_text(json.dumps(market, indent=2, ensure_ascii=False) + '\n')
    homepage = subtree / 'index.html'
    if not homepage.exists():
        return None
    text = homepage.read_text()
    text = re.sub(r'Browse \d+ part pages', 'Browse ' + str(len(catalog)) + ' part pages', text)
    text = re.sub(r'\d+ exact-part(?: transaction)? pages', str(len(catalog)) + ' exact-part pages', text)
    catalog_section = re.search(r'(<section id="catalog"[^>]*>.*?<div class="grid">)(.*?)(</div></section>)', text, re.S)
    if catalog_section:
        cards = catalog_section[2]
        for c in qualified:
            url = base + c['page_path']
            if 'href="' + h(url) + '"' not in cards:
                cards += '<article class="part-card"><span class="eyebrow">' + h(c['brand']) + '</span><h3>' + a(url, c['mpn']) + '</h3><p class="muted">' + h(c['category']) + '</p>' + a(url, 'View verified comparison →') + '</article>'
        replacement = catalog_section[1] + cards + catalog_section[3]
        text = text[:catalog_section.start()] + replacement + text[catalog_section.end():]
    discovery = '<section id="factory-discovery" class="panel"><h2>Qualified part intelligence</h2><p>See the current qualification status, dated listing comparisons and model-specific buying checks in the ' + a(base + 'factory/', 'verified page index and dashboard') + '.</p>'
    if clusters:
        discovery += '<ul>' + ''.join('<li>' + a(base + 'series/' + slug(brand) + '-' + slug(series) + '/', brand + ' ' + series) + '</li>' for brand, series in sorted(clusters)) + '</ul>'
    discovery += '</section>'
    if re.search(r'<section id="factory-discovery".*?</section>', text, re.S):
        text = re.sub(r'<section id="factory-discovery".*?</section>', lambda _: discovery, text, flags=re.S)
    else:
        text = text.replace('</main>', discovery + '</main>', 1)
    return text


def generate(db, site_root, base, now, report_dir, allow_new=True):
    site_root, report_dir = Path(site_root).resolve(), Path(report_dir).resolve()
    subtree = site_root / 'exact-part-gateway'
    if not (subtree / 'assets/intelligence.css').exists():
        raise ValueError('Existing exact-part-gateway/assets/intelligence.css is required')
    if not base.endswith('/exact-part-gateway/'):
        raise ValueError('base-url must point to existing /exact-part-gateway/')
    report_dir.mkdir(parents=True, exist_ok=True)
    results = qualify(db, now)
    lookup = {r['candidate_id']: r for r in results}
    candidates = [json.loads(r['payload_json']) for r in db.execute('SELECT * FROM page_candidates ORDER BY candidate_id')]
    selected = [c for c in candidates if (allow_new and lookup[c['candidate_id']]['qualified']) or db.execute('SELECT 1 FROM page_publications WHERE candidate_id=? AND kind="part"', (c['candidate_id'],)).fetchone()]
    changed, generated = [], []
    def publish(relpath, content, canonical, candidate_id=None, kind='part'):
        target = subtree / relpath / 'index.html'
        previous_bytes = target.read_bytes() if target.exists() else None
        encoded = content.encode()
        is_changed = previous_bytes != encoded
        if is_changed:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(encoded)
            changed.append(canonical)
        with db:
            db.execute('INSERT OR REPLACE INTO page_publications VALUES (?,?,?,?,?,?)', (relpath, candidate_id, canonical, hashlib.sha256(encoded).hexdigest(), iso(now), kind))
        generated.append(canonical)
    clusters = {}
    for c in selected:
        if lookup[c['candidate_id']]['qualified'] and c.get('series'):
            clusters.setdefault((c['brand'], c['series']), []).append(c)
    clusters = {k: v for k, v in clusters.items() if len(v) >= 3}
    for c in selected:
        related = [r for r in clusters.get((c['brand'], c.get('series')), []) if r['candidate_id'] != c['candidate_id']]
        publish(c['page_path'], page_html(db, c, lookup[c['candidate_id']], now, base, related), base + c['page_path'], c['candidate_id'])
    for (brand, series), members in clusters.items():
        path = 'series/' + slug(brand) + '-' + slug(series) + '/'
        content = '<h1>' + h(brand + ' ' + series) + ' part intelligence</h1><p>Individually verified parts in this manufacturer series. Similar series membership does not establish interchangeability.</p><ul>' + ''.join('<li>' + a(base + c['page_path'], c['mpn'] + ' — ' + c['category']) + '</li>' for c in members) + '</ul>'
        publish(path, shell(brand + ' ' + series + ' replacement parts', 'Reviewed exact MPNs in the ' + brand + ' ' + series + ' series.', base + path, content, base), base + path, kind='hub')
    current_metrics = metrics(db, now)
    qualified = [c for c in selected if lookup[c['candidate_id']]['qualified']]
    homepage = update_discovery(subtree, qualified, clusters, base)
    if homepage is not None:
        publish('', homepage, base, kind='landing')
    index_body = '<h1>Verified part intelligence</h1><p>Only pages meeting the complete evidence gate appear in this index.</p><div class="grid">' + ''.join('<article class="card"><h2>' + a(base + c['page_path'], c['brand'] + ' ' + c['mpn']) + '</h2><p>' + h(c['category']) + '</p></article>' for c in qualified) + '</div>'
    if clusters:
        index_body += '<section class="section"><h2>Manufacturer series guides</h2><ul>' + ''.join('<li>' + a(base + 'series/' + slug(brand) + '-' + slug(series) + '/', brand + ' ' + series) + '</li>' for brand, series in sorted(clusters)) + '</ul></section>'
    index_body += '<section class="section"><h2>Verification dashboard</h2><dl>' + ''.join('<dt>' + h(k) + '</dt><dd>' + h('UNKNOWN' if v is None else v) + '</dd>' for k, v in current_metrics.items() if k.isupper()) + '</dl><p>Search, purchase and commission metrics require authorized reporting evidence. Unknown is not zero. LIVE requires a matching public HTTP check; BUILT only counts local artifacts.</p></section>'
    publish('factory/', shell('Verified parts and dashboard | Exact-Part Gateway', 'Evidence-gated exact-part pages and transparent page_measurements.', base + 'factory/', index_body, base), base + 'factory/', kind='dashboard')
    # Keep every original URL in both existing sitemaps. Only new/substantive
    # content-changed URLs enter the IndexNow delta; unchanged pages do not.
    merge_sitemap(subtree / 'sitemap.xml', changed, now)
    merge_sitemap(site_root / 'sitemap.xml', changed, now)
    manifest = {"generated_at": iso(now), "host": urllib.parse.urlsplit(base).hostname, "urlList": sorted(set(changed)), "submitted": False, "note": "Only changed/new generated pages; submit separately using the existing verified IndexNow key."}
    prior_manifest = report_dir / 'indexnow-delta.json'
    if prior_manifest.exists():
        previous_manifest = json.loads(prior_manifest.read_text())
        if previous_manifest.get('urlList'):
            history = report_dir / 'indexnow-history'
            history.mkdir(exist_ok=True)
            archive_name = re.sub(r'[^0-9A-Za-z-]', '-', previous_manifest.get('generated_at', 'unknown')) + '-' + digest(previous_manifest)[:10] + '.json'
            (history / archive_name).write_text(json.dumps(previous_manifest, indent=2) + '\n')
    (report_dir / 'indexnow-delta.json').write_text(json.dumps(manifest, indent=2) + '\n')
    (report_dir / 'page-qualification.json').write_text(json.dumps(results, indent=2, ensure_ascii=False) + '\n')
    (report_dir / 'dashboard-metrics.json').write_text(json.dumps(current_metrics, indent=2) + '\n')
    sample = random.Random('PartIntelligenceFactory-Day0').sample(qualified, min(10, len(qualified)))
    audit_path = report_dir / 'manual-audit-sample.json'
    prior_audit = json.loads(audit_path.read_text()) if audit_path.exists() else {}
    prior_entries = {entry.get('url'): entry for entry in prior_audit.get('sample', [])}
    sample_entries = []
    for c in sample:
        url = base + c['page_path']
        content_hash = db.execute('SELECT content_hash FROM page_publications WHERE candidate_id=? AND kind="part"', (c['candidate_id'],)).fetchone()[0]
        old_entry = prior_entries.get(url, {})
        if old_entry.get('content_hash') == content_hash:
            sample_entries.append(old_entry)
        else:
            sample_entries.append({'mpn': c['mpn'], 'url': url, 'content_hash': content_hash, 'checks': ['HTTP_200', 'canonical', 'tracked_link', 'affiliate_disclosure', 'sponsored_nofollow', 'non_ebay_reference', 'last_verified', 'no_false_stock_or_fitment'], 'verified': None})
    sample_status = 'PASSED' if len(sample_entries) >= 10 and all(e.get('verified') is True for e in sample_entries) else 'PENDING_MANUAL_REVIEW'
    audit_path.write_text(json.dumps({'required_sample': 10, 'available_qualified': len(qualified), 'status': sample_status, 'sample': sample_entries}, indent=2) + '\n')
    (subtree / 'factory-metrics.json').write_text(json.dumps(current_metrics, indent=2) + '\n')
    return {"qualified_pages_generated": len(qualified), "retained_pages": len(selected) - len(qualified), "generated_urls": generated, "changed_urls": changed, "metrics": current_metrics}


def audit(site_root, base):
    # Automatic structural audit, independent of rendered generation routines.
    from html.parser import HTMLParser
    class Inspector(HTMLParser):
        def __init__(self):
            super().__init__(); self.links = []; self.canonical = []; self.times = []; self.headings = []
        def handle_starttag(self, tag, attrs):
            attrs = dict(attrs)
            if tag == 'a': self.links.append(attrs)
            if tag == 'link' and attrs.get('rel') == 'canonical': self.canonical.append(attrs.get('href'))
            if tag == 'time': self.times.append(attrs.get('datetime'))
            if tag == 'h1': self.headings.append(tag)
    root = Path(site_root) / 'exact-part-gateway'
    findings = []
    for path in root.rglob('index.html'):
        text = path.read_text()
        if 'Verification status' not in text:
            continue
        parser = Inspector(); parser.feed(text)
        expected = base + path.parent.relative_to(root).as_posix() + '/'
        errors = []
        if parser.canonical != [expected]: errors.append('CANONICAL_MISMATCH')
        if len(parser.headings) != 1: errors.append('H1_COUNT')
        if not parser.times or not all(parser.times): errors.append('LAST_VERIFIED_MISSING')
        if 'Affiliate disclosure:' not in text: errors.append('DISCLOSURE_MISSING')
        if not any(tracked_valid(x.get('href', '')) for x in parser.links): errors.append('EPN_LINK_MISSING')
        for link in parser.links:
            if ebay_url(link.get('href', '')) and not {'sponsored', 'nofollow'}.issubset(set(link.get('rel', '').split())):
                errors.append('AFFILIATE_REL_MISSING')
        if 'Non-eBay identity and specification references' not in text: errors.append('NON_EBAY_REFERENCE_SECTION_MISSING')
        if 'Listing prices, availability, shipping and terms may change' not in text: errors.append('MAY_CHANGE_NOTICE_MISSING')
        findings.append({'page': expected, 'errors': sorted(set(errors))})
    return {'checked_pages': len(findings), 'passed': all(not x['errors'] for x in findings), 'findings': findings}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--db', default='factory.sqlite')
    p.add_argument('--now', help='UTC test/replay time (otherwise current UTC)')
    sub = p.add_subparsers(dest='command', required=True)
    sub.add_parser('init')
    ing = sub.add_parser('ingest'); ing.add_argument('json_file')
    sub.add_parser('qualify')
    sub.add_parser('metrics')
    dep = sub.add_parser('verify-deployed'); dep.add_argument('--timeout', type=int, default=20)
    pr = sub.add_parser('probe'); pr.add_argument('--timeout', type=int, default=15)
    gen = sub.add_parser('generate'); gen.add_argument('--site-root', required=True); gen.add_argument('--base-url', required=True); gen.add_argument('--report-dir', default='reports')
    run = sub.add_parser('run'); run.add_argument('--input', required=True); run.add_argument('--site-root', required=True); run.add_argument('--base-url', required=True); run.add_argument('--report-dir', default='reports')
    ref = sub.add_parser('refresh'); ref.add_argument('--site-root', required=True); ref.add_argument('--base-url', required=True); ref.add_argument('--report-dir', default='reports'); ref.add_argument('--probe', action='store_true'); ref.add_argument('--timeout', type=int, default=15)
    au = sub.add_parser('audit'); au.add_argument('--site-root', required=True); au.add_argument('--base-url', required=True)
    met = sub.add_parser('measurement'); met.add_argument('metric', choices=list(METRICS) + ['INDEXED', 'INDEXED_STATUS']); met.add_argument('value', help='JSON value or null'); met.add_argument('--source-url', required=True); met.add_argument('--verified-at', required=True); met.add_argument('--note', default='')
    args = p.parse_args(); now = timestamp(args.now); db = connect(args.db)
    if args.command == 'init': result = {'initialized': str(Path(args.db).resolve())}
    elif args.command == 'ingest': result = {'ingested': ingest(db, json.loads(Path(args.json_file).read_text()), now)}
    elif args.command == 'qualify': result = qualify(db, now)
    elif args.command == 'metrics':
        qualify(db, now)
        result = metrics(db, now)
    elif args.command == 'verify-deployed':
        qualify(db, now)
        result = verify_deployed(db, now, args.timeout)
    elif args.command == 'probe': result = probe(db, now, args.timeout)
    elif args.command == 'generate': result = generate(db, args.site_root, args.base_url, now, args.report_dir)
    elif args.command == 'run':
        ingest(db, json.loads(Path(args.input).read_text()), now)
        result = generate(db, args.site_root, args.base_url, now, args.report_dir)
        result['structure_audit'] = audit(args.site_root, args.base_url)
    elif args.command == 'refresh':
        probes = probe(db, now, args.timeout) if args.probe else []
        result = generate(db, args.site_root, args.base_url, now, args.report_dir, allow_new=False)
        result['probes'] = probes
        result['structure_audit'] = audit(args.site_root, args.base_url)
    elif args.command == 'audit': result = audit(args.site_root, args.base_url)
    else:
        if not valid_url(args.source_url): raise ValueError('Measurement source URL required')
        with db: db.execute('INSERT OR REPLACE INTO page_measurements VALUES (?,?,?,?,?)', (args.metric, json.dumps(json.loads(args.value)), args.source_url, iso(args.verified_at), args.note))
        result = {'recorded': args.metric}
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if args.command == 'audit' and not result['passed']: sys.exit(1)
    if args.command in {'run', 'refresh'} and not result['structure_audit']['passed']: sys.exit(1)


if __name__ == '__main__':
    main()
