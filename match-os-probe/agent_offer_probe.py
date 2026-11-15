#!/usr/bin/env python3
"""MATCH OS read-only live supply preflight. No credentials, carts, tracking or payments."""
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = "https://api-core.livingsocial.com/ls_agent_api/offers/search"
CASES = (
    ("US-local-Austin", "massage in Austin, TX"),
    ("US-local-New-York", "restaurant in New York, NY"),
    ("US-ecommerce", "headphones"),
)
MAX_BYTES = 350_000


def read_case(label, q):
    url = BASE + "?" + urllib.parse.urlencode({"q": q, "limit": 3})
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "MATCH-OS-ReadOnly-QA/1.0 (public catalog; no session)",
            "Accept": "application/json",
        },
        method="GET",
    )
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            status = res.status
            raw = res.read(MAX_BYTES + 1)
    except urllib.error.HTTPError as exc:
        print(json.dumps({"case": label, "ok": False, "http": exc.code, "cause": "http_error"}), flush=True)
        return False
    except Exception as exc:
        print(json.dumps({"case": label, "ok": False, "cause": type(exc).__name__}), flush=True)
        return False
    if len(raw) > MAX_BYTES:
        print(json.dumps({"case": label, "ok": False, "http": status, "cause": "oversized_response"}), flush=True)
        return False
    try:
        payload = json.loads(raw)
    except ValueError:
        print(json.dumps({"case": label, "ok": False, "http": status, "cause": "invalid_json"}), flush=True)
        return False
    if isinstance(payload, list):
        offers = payload
        keys = []
    elif isinstance(payload, dict):
        offers = []
        for key in ("offers", "results", "items", "data"):
            v = payload.get(key)
            if isinstance(v, list):
                offers = v
                break
            if isinstance(v, dict):
                for k in ("offers", "results", "items"):
                    if isinstance(v.get(k), list):
                        offers = v[k]
                        break
            if offers:
                break
        keys = sorted(payload.keys())
    else:
        offers, keys = [], []
    samples = []
    for entry in offers[:3]:
        if not isinstance(entry, dict):
            continue
        price = entry.get("price")
        if isinstance(price, dict):
            price = {k: price.get(k) for k in ("amountMinor", "fromMinor", "currency", "currencyPrecision", "basis") if k in price}
        samples.append({
            "title": str(entry.get("title") or entry.get("experienceTitle") or entry.get("name") or "")[:90],
            "status": entry.get("status"),
            "price": price,
            "hasBuyUrl": bool(entry.get("buyUrl")),
            "hasBookingUrl": bool(entry.get("bookingUrl")),
        })
    evidence = {"case": label, "ok": status == 200 and len(offers) > 0,
                "http": status, "elapsed_ms": round((time.perf_counter()-t0)*1000),
                "count": len(offers), "root_keys": keys, "sample": samples}
    print(json.dumps(evidence, ensure_ascii=False), flush=True)
    return evidence["ok"]


def main():
    passed = [read_case(label, q) for label, q in CASES]
    print(json.dumps({"total": len(passed), "passed": sum(passed), "failed": len(passed)-sum(passed),
                      "level": "L2 public offer read-only (not merchant commission or purchase)"}), flush=True)
    return 0 if all(passed) else 2


if __name__ == "__main__":
    sys.exit(main())
