#!/usr/bin/env python3
"""Public-source change detector for Policy Radar UK.

It does NOT infer entitlements, edit legal summaries, send marketing, or claim
that a source update is a policy change. Raw content is hashed, not republished.
Run: python3 policy-radar/monitor.py
"""
from __future__ import annotations
import hashlib
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEST = ROOT / "data" / "source_status.json"
SOURCES = [
    {"id": "warm-home-discount", "title": "Warm Home Discount England & Wales",
     "url": "https://www.gov.uk/the-warm-home-discount-scheme/if-you-live-in-england-and-wales",
     "api": "https://www.gov.uk/api/content/the-warm-home-discount-scheme/if-you-live-in-england-and-wales"},
    {"id": "cold-weather-payment", "title": "Cold Weather Payment",
     "url": "https://www.gov.uk/cold-weather-payment",
     "api": "https://www.gov.uk/api/content/cold-weather-payment"},
    {"id": "crisis-resilience-fund", "title": "Crisis and Resilience Fund",
     "url": "https://www.gov.uk/government/publications/crisis-and-resilience-fund-grant-determination-2026-to-2027",
     "api": "https://www.gov.uk/api/content/government/publications/crisis-and-resilience-fund-grant-determination-2026-to-2027"},
    {"id": "childcare", "title": "Free Childcare for Working Parents",
     "url": "https://www.gov.uk/free-childcare-if-working/when-to-apply",
     "api": "https://www.gov.uk/api/content/free-childcare-if-working/when-to-apply"},
    {"id": "ofgem-rates", "title": "Ofgem price cap unit rates",
     "url": "https://www.ofgem.gov.uk/your-energy-supply/your-energy-bill/energy-price-cap-unit-rates-and-standing-charges"},
    {"id": "ofgem-price-cap", "title": "Ofgem energy price cap news and guidance",
     "url": "https://www.ofgem.gov.uk/energy-regulation/domestic-and-non-domestic/energy-pricing-rules/energy-price-cap"},
]

class MainText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.main_depth = 0
        self.skip_depth = 0
        self.out = []

    def handle_starttag(self, tag, attrs):
        if tag == "main":
            self.main_depth += 1
        elif self.main_depth and tag in ("script", "style", "noscript", "svg", "nav"):
            self.skip_depth += 1

    def handle_endtag(self, tag):
        if tag == "main" and self.main_depth:
            self.main_depth -= 1
        elif self.skip_depth and tag in ("script", "style", "noscript", "svg", "nav"):
            self.skip_depth -= 1

    def handle_data(self, text):
        if self.main_depth and not self.skip_depth:
            self.out.append(text)

def iso_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")

def download(url):
    req = urllib.request.Request(
        url,
        headers={"Accept": "application/json, text/html;q=0.9, */*;q=0.5",
                 "User-Agent": "PolicyRadarUK/0.1 (+public-policy-observer; source-linked; no PII)"})
    with urllib.request.urlopen(req, timeout=25) as resp:
        body = resp.read(6_000_000)
        if len(body) >= 6_000_000:
            raise ValueError("Source too large to fingerprint safely")
        return body

def normalize(source):
    raw = download(source.get("api") or source["url"])
    if source.get("api"):
        doc = json.loads(raw.decode("utf-8"))
        if "title" not in doc:
            raise ValueError("Unexpected GOV.UK Content API format")
        meaningful = {
            "title": doc.get("title"),
            "description": doc.get("description"),
            "public_updated_at": doc.get("public_updated_at"),
            "details": doc.get("details"),
            "withdrawn_notice": doc.get("withdrawn_notice"),
        }
        canonical = json.dumps(meaningful, ensure_ascii=False, sort_keys=True,
                               separators=(",", ":")).encode("utf-8")
        return canonical, doc.get("public_updated_at")
    parser = MainText()
    parser.feed(raw.decode("utf-8", errors="replace"))
    main_text = re.sub(r"\s+", " ", " ".join(parser.out)).strip()
    if len(main_text) < 200:
        raise ValueError("Could not extract sufficient main-page text")
    return main_text.encode("utf-8"), None

def main():
    previous = {}
    if DEST.exists():
        try:
            prior = json.loads(DEST.read_text(encoding="utf-8"))
            previous = {i["id"]: i for i in prior.get("sources", [])}
        except (ValueError, OSError, KeyError):
            previous = {}
    now = iso_now()
    out = []
    for source in SOURCES:
        old = previous.get(source["id"], {})
        record = {
            "id": source["id"],
            "title": source["title"],
            "official_url": source["url"],
            "checked_at_utc": now,
            "last_success_utc": old.get("last_success_utc"),
            "source_public_updated_at": old.get("source_public_updated_at"),
            "content_sha256": old.get("content_sha256"),
            "last_change_detected_utc": old.get("last_change_detected_utc"),
            "pending_human_review": bool(old.get("pending_human_review", False)),
            "fetch_status": "error",
        }
        try:
            data, updated_at = normalize(source)
            digest = hashlib.sha256(data).hexdigest()
            has_baseline = bool(old.get("content_sha256"))
            is_new_change = has_baseline and old["content_sha256"] != digest
            record.update({
                "content_sha256": digest,
                "source_public_updated_at": updated_at,
                "last_success_utc": now,
                "fetch_status": "ok",
            })
            if is_new_change:
                record["pending_human_review"] = True
                record["last_change_detected_utc"] = now
            print(f'{source["id"]}: {"CHANGE / REVIEW NEEDED" if is_new_change else "ok or first baseline"}')
        except (OSError, ValueError, urllib.error.URLError) as exc:
            record["error"] = str(exc)[:250]
            print(f'{source["id"]}: fetch failed: {exc}', file=sys.stderr)
        out.append(record)
        time.sleep(0.6)
    result = {
        "schema_version": 1,
        "last_checked_utc": now,
        "notice": "Machine-detected content differences are NOT verified policy changes. Human review is required.",
        "sources": out,
        "summary": {
            "successful_fetches": sum(x["fetch_status"] == "ok" for x in out),
            "failed_fetches": sum(x["fetch_status"] != "ok" for x in out),
            "pending_human_review": sum(x["pending_human_review"] for x in out),
        },
    }
    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8")
    print(json.dumps(result["summary"]))
    if result["summary"]["successful_fetches"] == 0:
        print("All official sources failed; failing workflow", file=sys.stderr)
        return 1
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
