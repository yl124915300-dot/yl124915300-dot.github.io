#!/usr/bin/env python3
"""Run on a standard GitHub-hosted Linux runner; never mocks live source reads."""
import argparse
import hashlib
import json
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import threading
import time
import uuid
from datetime import datetime, timezone, timedelta
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from agent import Agent, handler_for, canon, now, digest

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "state"
OUT.mkdir(exist_ok=True)
checks = []

def check(name, condition, detail=None):
    result = {"name": name, "result": "PASS" if condition else "FAIL", "detail": detail}
    checks.append(result)
    print(canon(result), flush=True)
    if not condition:
        raise AssertionError(name)

def request(base, path, payload=None, origin=None):
    headers = {}
    if payload is not None:
        headers["Content-Type"] = "application/json"
    if origin:
        headers["Origin"] = origin
    req = Request(base + path, data=canon(payload).encode() if payload is not None else None, headers=headers)
    try:
        with urlopen(req, timeout=60) as response:
            raw = response.read()
            return response.status, json.loads(raw) if response.headers.get_content_type() == "application/json" else raw.decode()
    except HTTPError as exc:
        return exc.code, json.loads(exc.read())

def start(a):
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler_for(a))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, "http://127.0.0.1:" + str(server.server_port)

def unknown_event(county="WAC033"):
    # Values and title are generated at execution time, absent from repository fixtures.
    t = datetime.now(timezone.utc)
    nonce = uuid.uuid4().hex
    return dict(id="test:" + nonce, kind="weather", status="active",
                title="Unseen field event " + nonce, evidence="REAL_PUBLIC",
                updated_at=t.isoformat(), expires_at=(t + timedelta(hours=2)).isoformat(),
                payload={"severity": "Severe", "counties": [county]})

def active(snapshot, event_id):
    return [a for a in snapshot["actions"] if a["event_id"] == event_id and a["status"] == "PROPOSED"]

def phase_one():
    with tempfile.TemporaryDirectory() as tmp:
        db = Path(tmp) / "pli.sqlite"
        agent = Agent(db)
        server, base = start(agent)
        try:
            status, page = request(base, "/")
            check("HTTP_UI", status == 200 and "SYNTHETIC" in page)
            status, js = request(base, "/app.js")
            check("UI_SCRIPT", status == 200 and "textContent" in js)
            snap = agent.snapshot()
            check("SIX_SYNTHETIC_STATES", len(snap["profiles"]) == 6 and all(p["classification"] == "SYNTHETIC" for p in snap["profiles"]))
            results = agent.read_public()
            check("TWO_LIVE_PUBLIC_EVENT_READS", len(results) == 2 and all(x["result"] == "PASS" and x["http_status"] == 200 for x in results), results)
            check("REAL_EVENTS_HAVE_PROVENANCE", all(e["source_url"] and e["raw"] and e["evidence"] == "REAL_PUBLIC" for e in agent.snapshot()["events"]), {"events": len(agent.snapshot()["events"])})
            negative = dict(id="test:negative-magnitude:" + uuid.uuid4().hex,
                            kind="earthquake", status="active", title="SYNTHETIC microquake",
                            updated_at=now(),
                            expires_at=(datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
                            payload={"lat": 47.61, "lon": -122.33, "magnitude": -0.8})
            result = agent.ingest(negative)
            check("VALID_NEGATIVE_MAGNITUDE_ACCEPTED_WITHOUT_ACTION", result["accepted"] and not active(agent.snapshot(), negative["id"]))
            event = unknown_event()
            check("UNSEEN_EVENT_ABSENT_BEFORE_INPUT", all(x["id"] != event["id"] for x in agent.snapshot()["events"]), event["id"])
            code, body = request(base, "/api/events", event)
            snap = agent.snapshot()
            proposals = active(snap, event["id"])
            check("UNSEEN_EVENT_PROPOSES_ACTION", code == 200 and [x["profile_id"] for x in proposals] == ["S2"], {"id": event["id"], "proposals": proposals})
            check("MANUAL_INPUT_CANNOT_CLAIM_REAL_EVIDENCE", next(x for x in snap["events"] if x["id"] == event["id"])["evidence"] == "SYNTHETIC")
            before = len(snap["audit"])
            request(base, "/api/events", event)
            check("IDEMPOTENT_EVENT", len(agent.snapshot()["audit"]) == before)
            claimed = dict(event, id="nws:spoofed")
            code, body = request(base, "/api/events", claimed)
            check("OFFICIAL_EVENT_ID_SPOOF_DENIED", code == 400)
            code, body = request(base, "/api/events", unknown_event(), origin="https://untrusted.invalid")
            check("CROSS_ORIGIN_MUTATION_DENIED", code == 403)
            for action in ("payment", "submission", "booking", "send_message"):
                code, body = request(base, "/api/actions/attempt", {"action": action, "amount": 0.01, "approved": True, "permissions": ["*"]})
                check("UNAUTHORIZED_" + action.upper() + "_DENIED", code == 403 and body["allowed"] is False and body["executed"] is False, body)
            # End first process/session, then reconstruct using the same SQLite file.
            server.shutdown()
            server.server_close()
            baseline = agent.snapshot()
            agent.close()
            proc = subprocess.run([sys.executable, str(ROOT / "agent.py"), "state", "--db", str(db)], check=True, capture_output=True, text=True)
            second = json.loads(proc.stdout)
            check("SQLITE_PERSISTS_AFTER_PROCESS_RESTART", second["events"] == baseline["events"] and second["audit"] == baseline["audit"] and second["profiles"] == baseline["profiles"])
            agent = Agent(db)
            event["status"] = "cancelled"
            event["updated_at"] = (datetime.now(timezone.utc) + timedelta(seconds=1)).isoformat()
            agent.ingest(event)
            revoked = [x for x in agent.snapshot()["actions"] if x["event_id"] == event["id"] and x["status"] == "REVOKED"]
            check("CHANGED_EVENT_REVOKES_PRIOR_ACTION", not active(agent.snapshot(), event["id"]) and len(revoked) == 1, revoked)
            # Resource constraint yields a different action for S6.
            constraint = unknown_event("ILC031")
            agent.ingest(constraint)
            p = active(agent.snapshot(), constraint["id"])
            check("RESOURCE_CONSTRAINT_CHANGES_DECISION", len(p) == 1 and p[0]["action"] == "flag_schedule_conflict", p)
            # Unknown kinds are rejected honestly rather than inventing a response.
            invalid = dict(unknown_event(), kind="unknown-new-domain")
            try:
                agent.ingest(invalid)
                accepted = True
            except ValueError:
                accepted = False
            check("UNSUPPORTED_DOMAIN_EXPLICITLY_REJECTED", not accepted)
            stale = dict(event, status="active", updated_at="2000-01-01T00:00:00+00:00")
            check("STALE_REVISION_CANNOT_REACTIVATE", agent.ingest(stale)["accepted"] is False and not active(agent.snapshot(), event["id"]))
            expired = unknown_event()
            expired["expires_at"] = (datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat()
            agent.ingest(expired)
            check("EXPIRED_EVENT_CANNOT_PROPOSE", not active(agent.snapshot(), expired["id"]))
            snapshot = agent.snapshot()
            check("NO_REAL_TRANSACTIONS", snapshot["transactions_executed"] == 0 and all(a["external_execution"] is False for a in snapshot["actions"]))
            sha = agent.checkpoint(OUT / "checkpoint.json")
            expected = {k: digest(snapshot[k]) for k in ("profiles", "events", "actions", "audit", "sources")}
            (OUT / "expected.json").write_text(canon(expected), encoding="utf-8")
            report = {"phase": 1, "at": now(), "checks": checks, "result": "PASS",
                      "sources": results, "checkpoint_sha256": sha,
                      "events": len(snapshot["events"]), "decisions": len(snapshot["actions"]),
                      "audit_entries": len(snapshot["audit"]), "novel_event": constraint["id"],
                      "runtime": "GitHub Actions standard ubuntu-latest", "external_transactions": 0,
                      "deployment": "LAUNCHABLE_DELIVERY; no permanent hosted server"}
            (OUT / "phase1.json").write_text(canon(report), encoding="utf-8")
            print(canon({"PHASE1": "PASS", "checkpoint_sha256": sha,
                         "checks": len(checks), "events": report["events"],
                         "audit_entries": report["audit_entries"]}), flush=True)
        finally:
            server.shutdown()
            server.server_close()
            agent.close()

def phase_two():
    checkpoint = OUT / "checkpoint.json"
    expected = json.loads((OUT / "expected.json").read_text())
    report = json.loads((OUT / "phase1.json").read_text())
    check("CLOUD_CHECKPOINT_INDEPENDENT_CHECKOUT", hashlib.sha256(checkpoint.read_bytes()).hexdigest() == report["checkpoint_sha256"], report["checkpoint_sha256"])
    with tempfile.TemporaryDirectory() as tmp:
        agent = Agent(Path(tmp) / "second.sqlite")
        agent.restore(checkpoint)
        snapshot = agent.snapshot()
        for key, sha in expected.items():
            check("CROSS_CLOUD_SESSION_" + key.upper(), digest(snapshot[key]) == sha)
        server, base = start(agent)
        try:
            code, state = request(base, "/api/state")
            check("RESTORED_HTTP_UI_STATE", code == 200 and len(state["profiles"]) == 6)
            event = unknown_event("NYC061")
            code, result = request(base, "/api/events", event)
            check("RESTORED_AGENT_HANDLES_ANOTHER_NOVEL_EVENT", code == 200 and any(a["profile_id"] == "S1" for a in active(agent.snapshot(), event["id"])), event["id"])
            event["status"] = "cancelled"
            event["updated_at"] = (datetime.now(timezone.utc) + timedelta(seconds=1)).isoformat()
            request(base, "/api/events", event)
            check("RESTORED_AGENT_CAN_REVOKE", not active(agent.snapshot(), event["id"]))
            check("CROSS_SESSION_GATE_STILL_CLOSED", request(base, "/api/actions/attempt", {"action": "payment", "approved": True})[0] == 403)
            report2 = {"phase": 2, "at": now(), "result": "PASS", "checks": checks,
                       "prior_checkpoint_sha256": report["checkpoint_sha256"],
                       "runtime": "new GitHub Actions job; fresh SQLite reconstructed from committed checkpoint",
                       "total_checks": len(checks) + len(report["checks"]), "external_transactions": 0}
            (OUT / "phase2.json").write_text(canon(report2), encoding="utf-8")
            print(canon({"E2E_RESULT": "PASS", "checks": report2["total_checks"],
                         "independent_cloud_jobs": 2, "external_transactions": 0}), flush=True)
        finally:
            server.shutdown()
            server.server_close()
            agent.close()

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("phase", choices=["1", "2"])
    args = p.parse_args()
    try:
        phase_one() if args.phase == "1" else phase_two()
    except Exception as exc:
        (OUT / ("phase" + args.phase + ".json")).write_text(canon({"phase": args.phase, "at": now(), "result": "FAIL", "checks": checks, "error": repr(exc)}), encoding="utf-8")
        print(canon({"E2E_RESULT": "FAIL", "error": repr(exc)}), flush=True)
        raise
