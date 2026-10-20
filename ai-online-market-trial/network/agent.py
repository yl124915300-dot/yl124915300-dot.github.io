"""Two fixed deterministic Agent programs. No model, arbitrary code or URLs."""
import json, os, sys, urllib.request, urllib.error
from pathlib import Path
from core import digest, review

BASE = "https://ai-online-liquidity.yl124915300.workers.dev"
READ_PATHS = ("/health", "/assets", "/network/loop-status")
ROOT = Path(__file__).resolve().parents[1]

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

def request(path, body=None):
    if path not in READ_PATHS and not (path == "/execute" and body is not None):
        raise ValueError("ENDPOINT_DENIED")
    headers = {"User-Agent": "AI-Online/owner-loop-1 (platform-controlled contract audit)", "Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode() if body is not None else None, headers=headers)
    with urllib.request.build_opener(NoRedirect).open(req, timeout=12) as response:
        raw = response.read(65537)
        if len(raw) > 65536:
            raise ValueError("RESPONSE_LIMIT")
        return json.loads(raw)

def summarize(path, data):
    if not isinstance(data, dict):
        return {"semanticValid": False, "error": "object required"}
    if path == "/assets":
        valid = isinstance(data.get("assets"), list) and bool(data["assets"])
        value = {"assets": [{"id": a.get("id"), "programHash": a.get("programHash"), "permission": a.get("permission")} for a in data.get("assets", [])[:20] if isinstance(a, dict)]}
    elif path == "/health":
        valid = isinstance(data.get("executionConfigured"), bool)
        value = {k: data[k] for k in ("ok", "version", "executionConfigured", "service") if k in data}
    else:
        valid = isinstance(data.get("version"), str) and isinstance(data.get("acceptance"), dict)
        value = {k: data[k] for k in ("version", "state", "acceptance", "scoreSeparation") if k in data}
    return {"semanticValid": valid, "data": value, "responseHash": digest(data)}

def collect(task_hash):
    snapshot = json.loads((ROOT / "assets.json").read_text())
    live = {}
    for path in READ_PATHS:
        try:
            live[path] = summarize(path, request(path))
        except Exception as error:
            live[path] = {"semanticValid": False, "error": type(error).__name__ + ": " + str(error)[:180]}
    # Actual public catalog records are the input. The reviewed existing summary skill
    # counts their permission categories; no fabricated buyers or external endpoints.
    rows = [{"region": "network-denied" if a.get("permission", {}).get("network") is False else "network-review-required", "visits": 1} for a in snapshot["assets"]]
    expected = {}
    for row in rows:
        expected[row["region"]] = expected.get(row["region"], 0) + 1
    expected = [{"region": k, "total": v} for k, v in expected.items()]
    envelope = {"assetId": "minimized-summary-v1", "requestId": "owner-audit-" + task_hash[:40],
                "publicOrFabricatedInputConfirmed": True, "input": {"rows": rows}}
    execution = {"input": envelope, "expected": expected}
    try:
        result = request("/execute", envelope)
        execution.update({k: result.get(k) for k in ("ok", "assetId", "programHash", "output", "executionId", "idempotentReplay")})
        execution["verified"] = result.get("ok") is True and result.get("assetId") == envelope["assetId"] and result.get("output") == expected and isinstance(result.get("executionId"), str)
    except Exception as error:
        execution.update({"verified": False, "error": type(error).__name__ + ": " + str(error)[:180]})
    return {"kind": "actual-public-contract-inventory", "snapshot": snapshot, "snapshotHash": digest(snapshot),
            "live": live, "skillExecution": execution, "questionForReviewer": "Check the permission contracts and live drift; verify the actual catalog summary before preparing the owner handoff.",
            "runtime": {"pid": os.getpid(), "role": "collector", "model": None}}

if __name__ == "__main__":
    role = sys.argv[1]
    data = json.load(sys.stdin)
    if role == "collector":
        result = collect(data["taskHash"])
    elif role == "reviewer":
        result = {**review(data), "runtime": {"pid": os.getpid(), "role": "reviewer", "model": None}}
    else:
        raise ValueError("ROLE_DENIED")
    print(json.dumps(result, ensure_ascii=False))
