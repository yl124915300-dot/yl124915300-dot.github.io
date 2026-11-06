#!/usr/bin/env python3
"""Read-only RentAHuman public inventory snapshot for RealWorld Agent Router."""
import datetime as dt
import json
import pathlib
import time
import urllib.parse
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
OUTPUT = HERE / "worker-snapshot.json"
CITIES = [
    ("New York", "US"),
    ("San Francisco", "US"),
    ("Los Angeles", "US"),
    ("Austin", "US"),
    ("London", "GB"),
    ("Singapore", "SG"),
]
USER_AGENT = "RealWorldRouter-PublicIndexer/0.1 (read-only, no worker contact)"
MAX_PER_CITY = 15

def one_city(city, country):
    query = urllib.parse.urlencode({"city": city, "limit": 40})
    request = urllib.request.Request(
        "https://rentahuman.ai/api/humans?" + query,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        method="GET",
    )
    with urllib.request.urlopen(request, timeout=18) as response:
        if response.status != 200:
            raise RuntimeError("Public API HTTP %s" % response.status)
        raw = response.read(500_000)
    doc = json.loads(raw)
    if doc.get("success") is not True:
        raise RuntimeError("Public API reported non-success")
    users = doc.get("humans", [])
    if not isinstance(users, list):
        raise RuntimeError("Invalid humans list")
    found = []
    for user in users:
        if not isinstance(user, dict):
            continue
        loc = user.get("location") or {}
        if str(loc.get("city", "")).strip().casefold() != city.casefold():
            continue
        if str(loc.get("country", "")).strip().upper() != country:
            continue
        url = str(user.get("profileUrl") or "")
        if not url.startswith("https://rentahuman.ai/humans/"):
            continue
        found.append({
            "name": str(user.get("name") or "")[:100],
            "headline": str(user.get("headline") or "")[:160],
            "city": city,
            "country": country,
            "hourlyRate": user.get("hourlyRate") if isinstance(user.get("hourlyRate"), (float, int)) else None,
            "verified": bool(user.get("isVerified", False)),
            "availableListed": bool(user.get("isAvailable", False)),
            "profileUrl": url,
        })
        if len(found) >= MAX_PER_CITY:
            break
    return found

def main():
    workers = []
    errors = []
    for city, country in CITIES:
        try:
            workers.extend(one_city(city, country))
        except Exception as err:
            errors.append({"city": city, "error": str(err)[:180]})
        time.sleep(0.3)
    checked = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    previous = None
    if OUTPUT.exists():
        try:
            previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            pass
    if not workers and previous and previous.get("workers"):
        previous["lastSyncAttempt"] = checked
        previous["lastSyncErrors"] = errors
        OUTPUT.write_text(json.dumps(previous, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print("No fresh public profiles; preserving last good snapshot; errors:", errors)
        return
    report = {
        "source": "https://rentahuman.ai/api/humans",
        "checkedAt": checked,
        "disclaimer": "Self-reported public marketplace profiles. Not verified worker availability, identity, eligibility or bookings.",
        "cities": [{"city": c, "country": co} for c, co in CITIES],
        "workers": workers,
        "errors": errors,
    }
    OUTPUT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("Saved %s public worker profiles; errors %s" % (len(workers),len(errors)))

if __name__ == "__main__":
    main()
