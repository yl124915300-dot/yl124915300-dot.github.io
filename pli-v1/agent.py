#!/usr/bin/env python3
"""PLI V1.0: rule-driven central agent. Python standard library only."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import sqlite3
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen

VERSION = "1.0.0"
ROOT = Path(__file__).resolve().parent
FEEDS = {
    "USGS": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
    "NWS": "https://api.weather.gov/alerts/active?area=CA,WA,NY,FL,IL",
}
PROFILES = [
    dict(id="S1", label="纽约通勤者", city="New York", lat=40.75, lon=-73.99,
         county="NYC061", exposure=["commute"], goal="按时通勤", spare_minutes=20),
    dict(id="S2", label="西雅图配送员", city="Seattle", lat=47.61, lon=-122.33,
         county="WAC033", exposure=["outdoor", "delivery"], goal="安全规划配送", spare_minutes=15),
    dict(id="S3", label="洛杉矶旅客", city="Los Angeles", lat=34.05, lon=-118.24,
         county="CAC037", exposure=["travel"], goal="核验出行条件", spare_minutes=30),
    dict(id="S4", label="旧金山家庭", city="San Francisco", lat=37.77, lon=-122.42,
         county="CAC075", exposure=["care"], goal="协调家庭安排", spare_minutes=10),
    dict(id="S5", label="迈阿密店主", city="Miami", lat=25.77, lon=-80.19,
         county="FLC086", exposure=["outdoor", "business"], goal="检查营业影响", spare_minutes=5),
    dict(id="S6", label="芝加哥学生", city="Chicago", lat=41.88, lon=-87.63,
         county="ILC031", exposure=["commute", "outdoor"], goal="协调上课出行", spare_minutes=0),
]
SCHEMA = """
CREATE TABLE IF NOT EXISTS profiles(id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY, revision TEXT NOT NULL, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS versions(event_id TEXT, revision TEXT, data TEXT NOT NULL,
  PRIMARY KEY(event_id, revision));
CREATE TABLE IF NOT EXISTS actions(id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(seq INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, kind TEXT, data TEXT);
CREATE TABLE IF NOT EXISTS sources(seq INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, name TEXT, data TEXT);
"""
TABLES = ("profiles", "events", "versions", "actions", "audit", "sources")

def now():
    return datetime.now(timezone.utc).isoformat()

def stamp(value):
    if isinstance(value, (int, float)):
        return float(value) / 1000
    return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()

def canon(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))

def digest(value):
    return hashlib.sha256(canon(value).encode()).hexdigest()

def distance(a, b, c, d):
    p, q = map(math.radians, (a, c))
    dp, dq = math.radians(c-a), math.radians(d-b)
    h = math.sin(dp/2)**2 + math.cos(p)*math.cos(q)*math.sin(dq/2)**2
    return 6371 * 2 * math.asin(math.sqrt(min(1, max(0, h))))

class Agent:
    def __init__(self, db):
        self.db = sqlite3.connect(str(db), check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.lock = threading.RLock()
        with self.db:
            self.db.executescript(SCHEMA)
            for original in PROFILES:
                p = dict(original, classification="SYNTHETIC", budget_usd=100,
                         state="monitoring", active_proposals=0, revision=0,
                         permissions=["public_read", "propose"])
                self.db.execute("INSERT OR IGNORE INTO profiles VALUES (?,?)", (p["id"], canon(p)))

    def close(self):
        self.db.close()

    def audit(self, kind, data):
        self.db.execute("INSERT INTO audit(at,kind,data) VALUES (?,?,?)", (now(), kind, canon(data)))

    def records(self, table):
        return [json.loads(r["data"]) for r in self.db.execute("SELECT data FROM " + table)]

    def ingest(self, e, trusted=False):
        e = json.loads(canon(e))
        required = ("id", "kind", "status", "title", "updated_at", "expires_at", "payload")
        if not all(k in e for k in required):
            raise ValueError("Missing event fields")
        if e["kind"] not in ("weather", "earthquake"):
            raise ValueError("Unsupported event kind: explicit rules need structured weather/earthquake input")
        if e["status"] not in ("active", "cancelled"):
            raise ValueError("Invalid status")
        if not isinstance(e["id"], str) or not e["id"] or len(e["id"]) > 300:
            raise ValueError("Invalid event id")
        stamp(e["updated_at"])
        stamp(e["expires_at"])
        if trusted:
            if e.get("evidence") != "REAL_PUBLIC" or e.get("source_url") not in FEEDS.values():
                raise ValueError("Invalid official source")
        else:
            if e["id"].startswith(("usgs:", "nws:")):
                raise ValueError("Official event identifiers cannot be supplied manually")
            e["evidence"] = "SYNTHETIC"
            e["source_url"] = None
        p = e["payload"]
        if e["kind"] == "earthquake":
            for k in ("lat", "lon", "magnitude"):
                if not isinstance(p.get(k), (int, float)) or not math.isfinite(p[k]):
                    raise ValueError("Invalid earthquake parameters")
            if not (-90 <= p["lat"] <= 90 and -180 <= p["lon"] <= 180 and -10 <= p["magnitude"] <= 10):
                raise ValueError("Earthquake parameters out of range")
        else:
            if p.get("severity") not in ("Extreme", "Severe", "Moderate", "Minor", "Unknown"):
                raise ValueError("Invalid severity")
            if not isinstance(p.get("counties"), list) or not all(isinstance(x, str) for x in p["counties"]):
                raise ValueError("Invalid county codes")
        revision = digest(e)
        with self.lock, self.db:
            row = self.db.execute("SELECT data,revision FROM events WHERE id=?", (e["id"],)).fetchone()
            if row and stamp(json.loads(row["data"])["updated_at"]) > stamp(e["updated_at"]):
                self.audit("STALE_UPDATE_REJECTED", {"event_id": e["id"]})
                return {"accepted": False, "reason": "older event revision"}
            if row and row["revision"] == revision:
                return {"accepted": True, "duplicate": True}
            self.db.execute("INSERT OR IGNORE INTO versions VALUES (?,?,?)", (e["id"], revision, canon(e)))
            self.db.execute("INSERT OR REPLACE INTO events VALUES (?,?,?)", (e["id"], revision, canon(e)))
            self.audit("EVENT_INGESTED", {"id": e["id"], "revision": revision, "evidence": e["evidence"]})
            self.reconcile()
        return {"accepted": True, "revision": revision}

    def evaluate(self, e, p):
        evidence = {"rule_version": VERSION, "profile_classification": "SYNTHETIC",
                    "event_evidence": e["evidence"], "goal": p["goal"],
                    "source_url": e["source_url"]}
        if e["status"] != "active" or stamp(e["expires_at"]) <= time.time():
            return None, dict(evidence, rule="R0", reason="event cancelled or expired")
        if stamp(e.get("starts_at", e["updated_at"])) > time.time():
            return None, dict(evidence, rule="R0", reason="event not yet effective")
        if e["kind"] == "weather":
            affected = p["county"] in e["payload"]["counties"]
            severity = e["payload"]["severity"]
            exposed = bool(set(p["exposure"]) & {"outdoor", "commute", "travel", "care", "business", "delivery"})
            matched = affected and exposed and severity in ("Extreme", "Severe", "Moderate")
            evidence.update(rule="R1", county=p["county"], affected=affected,
                            exposure=p["exposure"], severity=severity)
        else:
            x = e["payload"]
            km = distance(p["lat"], p["lon"], x["lat"], x["lon"])
            radius = min(250, max(25, 50 * (x["magnitude"] - 3)))
            matched = x["magnitude"] >= 4.5 and km <= radius
            evidence.update(rule="R2", distance_km=round(km, 2), radius_km=radius,
                            magnitude=x["magnitude"])
        if not matched:
            return None, dict(evidence, reason="scope or threshold did not match")
        action = "check_official_advice" if p["spare_minutes"] >= 5 else "flag_schedule_conflict"
        evidence.update(rule="R3", matching_rule="R1" if e["kind"] == "weather" else "R2",
                        available_minutes=p["spare_minutes"], required_minutes=5,
                        estimated_cost_usd=0, budget_usd=p["budget_usd"],
                        reason="matched event with synthetic location and constraints")
        return action, evidence

    def reconcile(self):
        with self.lock, self.db:
            events = self.db.execute("SELECT * FROM events").fetchall()
            for p in self.records("profiles"):
                for row in events:
                    e = json.loads(row["data"])
                    proposal, basis = self.evaluate(e, p)
                    key = p["id"] + "|" + e["id"]
                    oldrow = self.db.execute("SELECT data FROM actions WHERE id=?", (key,)).fetchone()
                    old = json.loads(oldrow["data"]) if oldrow else None
                    status = "PROPOSED" if proposal else ("REVOKED" if old and old["status"] in ("PROPOSED", "REVOKED") else "NO_MATCH")
                    a = dict(id=key, profile_id=p["id"], event_id=e["id"], revision=row["revision"],
                             action=proposal, status=status, basis=basis, external_execution=False)
                    comparable = lambda v: {k: v[k] for k in ("revision", "action", "status", "basis")}
                    if not old or comparable(old) != comparable(a):
                        self.db.execute("INSERT OR REPLACE INTO actions VALUES (?,?)", (key, canon(a)))
                        self.audit("DECISION", a)
                count = sum(x["status"] == "PROPOSED" and x["profile_id"] == p["id"] for x in self.records("actions"))
                state = "review_required" if count else "monitoring"
                if p["active_proposals"] != count or p["state"] != state:
                    p.update(active_proposals=count, state=state, revision=p["revision"] + 1)
                    self.db.execute("UPDATE profiles SET data=? WHERE id=?", (canon(p), p["id"]))
                    self.audit("PROFILE_UPDATED", {"id": p["id"], "state": state, "revision": p["revision"]})

    def attempt(self, request):
        # There are deliberately no payment, submission, booking or messaging adapters.
        # Caller-supplied permissions/approved flags never grant execution authority.
        with self.lock, self.db:
            result = {"allowed": False, "executed": False, "reason": "DENIED_NO_EXTERNAL_EXECUTOR",
                      "action": str(request.get("action", "unknown"))[:100]}
            self.audit("PERMISSION_DENIED", result)
        return result

    def source_record(self, name, data):
        with self.lock, self.db:
            self.db.execute("INSERT INTO sources(at,name,data) VALUES (?,?,?)", (now(), name, canon(data)))

    def read_public(self):
        results = []
        for name, url in FEEDS.items():
            try:
                req = Request(url, headers={"User-Agent": "PLI-V1/1.0 (public synthetic research demo)",
                                            "Accept": "application/geo+json, application/json"})
                with urlopen(req, timeout=25) as response:
                    raw = response.read(8_000_001)
                    status = response.status
                    final_url = response.url
                if len(raw) > 8_000_000:
                    raise ValueError("Response exceeds 8 MB")
                data = json.loads(raw)
                if data.get("type") != "FeatureCollection" or not isinstance(data.get("features"), list):
                    raise ValueError("Not a GeoJSON FeatureCollection")
                accepted = 0
                for feature in data["features"]:
                    prop = feature["properties"]
                    if name == "USGS":
                        if prop.get("mag") is None or prop.get("type") != "earthquake":
                            continue
                        xyz = feature["geometry"]["coordinates"]
                        updated = datetime.fromtimestamp(prop["updated"] / 1000, timezone.utc).isoformat()
                        starts = datetime.fromtimestamp(prop["time"] / 1000, timezone.utc).isoformat()
                        expiry = datetime.fromtimestamp(prop["time"] / 1000 + 86400, timezone.utc).isoformat()
                        e = dict(id="usgs:" + feature["id"], kind="earthquake", status="active",
                                 title=prop.get("title") or prop.get("place") or "USGS earthquake",
                                 updated_at=updated, starts_at=starts, expires_at=expiry,
                                 payload={"lat": xyz[1], "lon": xyz[0], "magnitude": prop["mag"]})
                    else:
                        if prop.get("status") != "Actual":
                            continue
                        e = dict(id="nws:" + prop["id"], kind="weather",
                                 status="cancelled" if prop.get("messageType") == "Cancel" else "active",
                                 title=prop.get("headline") or prop.get("event") or "NWS alert",
                                 updated_at=prop["sent"], starts_at=prop.get("effective") or prop["sent"],
                                 expires_at=prop["expires"],
                                 payload={"severity": prop.get("severity", "Unknown"),
                                          "counties": prop.get("geocode", {}).get("UGC", [])})
                    if name == "NWS":
                        # CAP updates/cancellations can have a new identifier.
                        for ref in prop.get("references", []):
                            old_id = "nws:" + str(ref.get("identifier", ""))
                            old_row = self.db.execute("SELECT data FROM events WHERE id=?", (old_id,)).fetchone()
                            if old_row:
                                old_event = json.loads(old_row["data"])
                                old_event.update(status="cancelled", updated_at=prop["sent"],
                                                 superseded_by=e["id"])
                                self.ingest(old_event, trusted=True)
                    e.update(source_url=url, official_url=prop.get("url") if name == "USGS" else prop.get("id"),
                             evidence="REAL_PUBLIC", raw=feature)
                    self.ingest(e, trusted=True)
                    accepted += 1
                record = dict(name=name, url=url, final_url=final_url, at=now(), http_status=status,
                              result="PASS", evidence="REAL_PUBLIC", raw_sha256=hashlib.sha256(raw).hexdigest(),
                              features=len(data["features"]), accepted=accepted)
            except Exception as exc:
                record = dict(name=name, url=url, at=now(), result="FAIL",
                              error=str(exc), evidence="FETCH_FAILURE")
            self.source_record(name, record)
            results.append(record)
        self.reconcile()
        return results

    def snapshot(self):
        with self.lock:
            return dict(version=VERSION, generated_at=now(), mode="RULE_DRIVEN",
                        money_received_usd=0, transactions_executed=0,
                        profiles=self.records("profiles"), events=self.records("events"),
                        actions=self.records("actions"),
                        sources=[dict(row) | {"data": json.loads(row["data"])} for row in self.db.execute("SELECT * FROM sources")],
                        audit=[dict(row) | {"data": json.loads(row["data"])} for row in self.db.execute("SELECT * FROM audit ORDER BY seq")])

    def checkpoint(self, path):
        # Portable logical DB checkpoint; synthetic profiles and public data only.
        with self.lock:
            payload = {"format": VERSION, "tables": {t: [dict(r) for r in self.db.execute("SELECT * FROM " + t)] for t in TABLES}}
            body = canon(payload)
            if len(body.encode()) > 12_000_000:
                raise ValueError("Checkpoint exceeds 12 MB")
            target = Path(path)
            target.parent.mkdir(parents=True, exist_ok=True)
            tmp = target.with_suffix(".tmp")
            tmp.write_text(body, encoding="utf-8")
            os.replace(tmp, target)
            return hashlib.sha256(body.encode()).hexdigest()

    def restore(self, path):
        obj = json.loads(Path(path).read_text(encoding="utf-8"))
        if obj.get("format") != VERSION or set(obj["tables"]) != set(TABLES):
            raise ValueError("Unsupported checkpoint")
        with self.lock, self.db:
            for t in TABLES:
                self.db.execute("DELETE FROM " + t)
                for row in obj["tables"][t]:
                    expected = [r[1] for r in self.db.execute("PRAGMA table_info(" + t + ")")]
                    if set(row) != set(expected):
                        raise ValueError("Invalid checkpoint columns")
                    self.db.execute("INSERT INTO " + t + " (" + ",".join(expected) + ") VALUES (" + ",".join("?" for _ in expected) + ")", [row[k] for k in expected])

def handler_for(agent):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):
            print(canon({"at": now(), "http": fmt % args}), flush=True)

        def send(self, status, body, mime="application/json"):
            raw = (canon(body) if mime == "application/json" else body).encode()
            self.send_response(status)
            self.send_header("Content-Type", mime + "; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'")
            self.end_headers()
            self.wfile.write(raw)

        def do_GET(self):
            if self.path == "/api/state":
                agent.reconcile()
                self.send(200, agent.snapshot())
            elif self.path == "/health":
                self.send(200, {"status": "ok", "version": VERSION})
            elif self.path in ("/", "/app.js", "/style.css"):
                name = {"/": "index.html", "/app.js": "app.js", "/style.css": "style.css"}[self.path]
                mime = {"/": "text/html", "/app.js": "text/javascript", "/style.css": "text/css"}[self.path]
                self.send(200, (ROOT / "web" / name).read_text(encoding="utf-8"), mime)
            else:
                self.send(404, {"error": "Not found"})

        def do_POST(self):
            # Same-origin mutations only; an untrusted page cannot issue silent form submissions.
            origin = self.headers.get("Origin")
            if origin and origin != "http://" + self.headers.get("Host", ""):
                self.send(403, {"error": "Origin denied"})
                return
            if self.headers.get_content_type() != "application/json":
                self.send(415, {"error": "JSON required"})
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= 50_000:
                    raise ValueError("Body must be between 1 and 50000 bytes")
                body = json.loads(self.rfile.read(length))
                if not isinstance(body, dict):
                    raise ValueError("Object required")
                if self.path == "/api/events":
                    result = agent.ingest(body)
                    self.send(200, result)
                elif self.path == "/api/actions/attempt":
                    self.send(403, agent.attempt(body))
                elif self.path == "/api/refresh":
                    self.send(200, {"sources": agent.read_public()})
                else:
                    self.send(404, {"error": "Not found"})
            except (ValueError, TypeError, KeyError) as exc:
                self.send(400, {"error": str(exc)})
    return Handler

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["serve", "refresh", "state", "checkpoint"])
    parser.add_argument("--db", default="pli.sqlite")
    parser.add_argument("--restore")
    parser.add_argument("--checkpoint", default="state/checkpoint.json")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--poll-seconds", type=int, default=900)
    args = parser.parse_args()
    agent = Agent(args.db)
    if args.restore:
        agent.restore(args.restore)
    if args.command == "serve":
        if args.poll_seconds < 300:
            parser.error("Public feed polling must be at least 300 seconds")
        def poll():
            while True:
                print(canon({"poll": agent.read_public()}), flush=True)
                time.sleep(args.poll_seconds)
        threading.Thread(target=poll, daemon=True).start()
        print(canon({"server": "http://127.0.0.1:" + str(args.port), "mode": "SYNTHETIC profiles + public events"}), flush=True)
        ThreadingHTTPServer(("127.0.0.1", args.port), handler_for(agent)).serve_forever()
    elif args.command == "refresh":
        print(canon({"sources": agent.read_public()}))
    elif args.command == "checkpoint":
        print(agent.checkpoint(args.checkpoint))
    else:
        agent.reconcile()
        print(canon(agent.snapshot()))

if __name__ == "__main__":
    main()
