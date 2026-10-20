"""One-task bounded executor. Model text is data; no dynamic code or URLs.
Only live(), called by the manual workflow, can perform a Worker POST.
Fixtures exercise the same boundary with a fake transport and are never inference evidence.
"""
import json, os, re, threading, time, urllib.error, urllib.request
from pathlib import Path
from core import canonical, digest, fields, grant, payload, stamp, review
from model_plan import CAPABILITIES, strict_json, validate_decision
from agent import BASE, NoRedirect

REPO = "yl124915300-dot/yl124915300-dot.github.io"
HERE = Path(__file__).resolve().parent
WORKFLOW = ".github/workflows/ai-online-autonomous-execution.yml"
MANIFEST = json.loads((HERE / "autonomous-task-v1.json").read_text())
SNAPSHOT = json.loads((HERE.parent / "assets.json").read_text())
SUMMARY = "minimized-summary-v1"
INVENTORY = "public-contract-inventory"
REVIEW = "public-contract-review"

class BoundedHTTP:
    """No proxy, redirects, arbitrary targets, credential forwarding or HTTP retries."""
    def __init__(self):
        self.count = 0
        self.post_attempts = 0
        self.started = time.monotonic()
        self.lock = threading.Lock()
    def get(self, target):
        allowed = {BASE + "/health", BASE + "/assets"}
        allowed |= {"https://api.github.com/repos/" + REPO + "/issues/" + str(n)
                    for n in (31, 24, 25)}
        allowed.add("https://api.github.com/repos/" + REPO + "/actions/runs?event=workflow_dispatch&per_page=100")
        if target not in allowed:
            raise ValueError("FIXED_GET_REQUIRED")
        return self._request(target)
    def post(self, body):
        fields(body, ["assetId", "requestId", "publicOrFabricatedInputConfirmed", "input"])
        if body["assetId"] != SUMMARY or body["publicOrFabricatedInputConfirmed"] is not True:
            raise ValueError("FIXED_SKILL_REQUIRED")
        fields(body["input"], ["rows"])
        if not isinstance(body["input"]["rows"], list) or not 1 <= len(body["input"]["rows"]) <= 20:
            raise ValueError("PUBLIC_ROWS_REQUIRED")
        for row in body["input"]["rows"]:
            fields(row, ["region", "visits"])
            if row["region"] not in ("network-denied", "network-review-required") or type(row["visits"]) is not int or row["visits"] != 1:
                raise ValueError("FIXED_PUBLIC_INPUT_REQUIRED")
        if not re.fullmatch(r"autonomous-v1-[a-f0-9]{40}", body["requestId"]):
            raise ValueError("REQUEST_ID_REQUIRED")
        with self.lock:
            if self.post_attempts:
                raise ValueError("NO_POST_RETRY")
            # Consume BEFORE network I/O. Ambiguous completion never permits a second POST.
            self.post_attempts += 1
        return self._request(BASE + "/execute", body)
    def _request(self, target, body=None):
        self.count += 1
        if self.count > 24 or time.monotonic() - self.started > 360:
            raise ValueError("HTTP_BUDGET")
        headers = {"Accept": "application/json", "User-Agent": "AI-Online/autonomous-v1 (same-owner technical test)"}
        raw = None if body is None else canonical(body).encode()
        if raw is not None:
            if len(raw) > 8192:
                raise ValueError("REQUEST_BOUND")
            headers["Content-Type"] = "application/json"
        request = urllib.request.Request(target, data=raw, headers=headers)
        with urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect()).open(request, timeout=12) as response:
            raw = response.read(524289)
            if response.status != 200 or len(raw) > 524288:
                raise ValueError("HTTP_STATUS_OR_SIZE")
            return strict_json(raw.decode("utf-8"))

def authorize(task_issue, grant_issues, now):
    if task_issue.get("number") != 31 or task_issue.get("state") != "open" or task_issue.get("pull_request") or task_issue.get("title") != "[AI Online autonomous task] V1 same-owner bounded cloud experiment":
        raise ValueError("TASK_REVOKED_OR_WRONG_TARGET")
    if task_issue.get("user", {}).get("id") != MANIFEST["ownerId"] or task_issue.get("user", {}).get("type") != "User":
        raise ValueError("TASK_OWNER")
    if task_issue.get("body") != MANIFEST["taskBody"]:
        raise ValueError("TASK_CHANGED")
    data = payload(task_issue["body"])
    if data["modelProposalAuthorized"] is not True or data["publicOnly"] is not True or data["sameOwnerTechnicalTest"] is not True or data["maxNewExecutions"] != 1 or data["maxPostAttempts"] != 2 or data["maxCostUsd"] != 0:
        raise ValueError("TASK_PERMISSION")
    if stamp(data["expiresAt"]) <= now:
        raise ValueError("TASK_EXPIRED")
    if [i.get("number") for i in grant_issues] != [24, 25]:
        raise ValueError("GRANT_TARGETS")
    agents = [grant(i, now) for i in grant_issues]
    for index, item in enumerate(agents):
        if item["ownerId"] != MANIFEST["ownerId"] or item["grantHash"] != MANIFEST["grants"][index]["hash"] or item["id"] != data[("collector", "reviewer")[index]]:
            raise ValueError("GRANT_BINDING")
    if agents[0]["role"] != "collector" or agents[1]["role"] != "reviewer" or not {"public-contract.read", "asset.execute"} <= set(agents[0]["scopes"]):
        raise ValueError("ROLE_SCOPE")
    return {"taskIssue": 31, "taskBodyHash": digest(task_issue["body"]), "agents": agents,
            "taskHash": digest({"issue": 31, "body": task_issue["body"], "ownerId": MANIFEST["ownerId"]})}

def current_authority(http):
    root = "https://api.github.com/repos/" + REPO + "/issues/"
    return authorize(http.get(root + "31"), [http.get(root + "24"), http.get(root + "25")], time.time())

def public_task(authority):
    return {"goal": "audit-ai-online-public-contract", "publicOnly": True,
            "authorityHash": digest(authority), "snapshotHash": digest(SNAPSHOT),
            "allowedCapabilities": list(CAPABILITIES),
            "request": "Propose an ordered public contract audit. Inventory first; summary required; review optional after inventory. No actions.",
            "dependencies": {INVENTORY: [], SUMMARY: [INVENTORY], REVIEW: [INVENTORY]},
            "requiredCapabilities": [INVENTORY, SUMMARY], "maxCapabilities": 3}

def validate_order(value, task_hash):
    validate_decision(value, task_hash, CAPABILITIES)
    choices = value["capabilities"]
    if choices[0] != INVENTORY or SUMMARY not in choices:
        raise ValueError("PLAN_DEPENDENCY_OR_REQUIRED_SKILL")
    seen = set()
    for choice in choices:
        if choice != INVENTORY and INVENTORY not in seen:
            raise ValueError("PLAN_DEPENDENCY")
        seen.add(choice)
    return choices

def check_catalog(catalog):
    if not isinstance(catalog, dict) or not isinstance(catalog.get("assets"), list) or not 1 <= len(catalog["assets"]) <= 20:
        raise ValueError("CATALOG_SHAPE")
    known = {a["id"]: a for a in SNAPSHOT["assets"]}
    if len(catalog["assets"]) != len(known) or {a.get("id") for a in catalog["assets"]} != set(known):
        raise ValueError("CATALOG_DRIFT")
    clean = []
    for asset in catalog["assets"]:
        expected = known[asset["id"]]
        for key in ("programHash", "permission"):
            if asset.get(key) != expected[key]:
                raise ValueError("CONTRACT_DRIFT")
        if type(asset.get("costUsd")) not in (int, float) or asset["costUsd"] != 0:
            raise ValueError("COST_GATE")
        if asset["permission"].get("publicExecution") is not True or any(asset["permission"].get(k) is not False for k in ("network", "filesystem", "shell", "payment", "modelBilling")):
            raise ValueError("PUBLIC_PERMISSION_GATE")
        clean.append({k: asset[k] for k in ("id", "programHash", "permission", "costUsd")})
    return {"assets": clean}

def verify_result(result, request, expected, program_hash):
    if not isinstance(result, dict) or result.get("ok") is not True or result.get("assetId") != SUMMARY or result.get("programHash") != program_hash or result.get("output") != expected or not isinstance(result.get("executionId"), str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", result["executionId"]):
        raise ValueError("OUTPUT_UNVERIFIED")
    # feedbackToken and private receipt objects MUST NOT leave this function.
    public = {k: result[k] for k in ("ok", "assetId", "programHash", "output", "executionId")}
    if type(result.get("idempotentReplay")) is bool:
        public["idempotentReplay"] = result["idempotentReplay"]
    return {"request": request, "requestHash": digest(request), "response": public,
            "publicResponseHash": digest(public), "completeResponseIntegrityHash": digest(result),
            "expected": expected, "verified": True}

def one_shot_guard(runs, run_id, attempt):
    if str(attempt) != "1" or not isinstance(runs, dict) or runs.get("total_count", 1000) > 100:
        raise ValueError("ONE_SHOT_OR_PAGINATION")
    relevant = [r for r in runs.get("workflow_runs", []) if r.get("path") == WORKFLOW]
    # This task is single-use. Failed earlier dispatches also block new runs.
    if len(relevant) != 1 or str(relevant[0].get("id")) != str(run_id) or relevant[0].get("run_attempt") != 1:
        raise ValueError("PRIOR_OR_CONCURRENT_RUN_RECONCILE")

def execute(decision, task_hash, authority, http, save, guard):
    choices = validate_order(decision, task_hash)
    if digest(public_task(authority)) != task_hash:
        raise ValueError("CONTEXT_BINDING")
    records = []
    inventory = None
    receipt = None
    started_day = time.strftime("%Y-%m-%d", time.gmtime())
    def recheck():
        if current_authority(http) != authority:
            raise ValueError("AUTHORITY_CHANGED")
    for choice in choices:
        recheck()
        if choice == INVENTORY:
            health = http.get(BASE + "/health")
            if not isinstance(health, dict) or health.get("ok") is not True or health.get("executionConfigured") is not True:
                raise ValueError("WORKER_UNAVAILABLE")
            inventory = check_catalog(http.get(BASE + "/assets"))
            result = {"inventory": inventory, "inventoryHash": digest(inventory),
                      "health": {k: health[k] for k in ("ok", "version", "executionConfigured") if k in health}}
        elif choice == SUMMARY:
            if inventory is None:
                raise ValueError("INVENTORY_REQUIRED")
            rows = [{"region": "network-denied" if a["permission"]["network"] is False else "network-review-required", "visits": 1}
                    for a in inventory["assets"]]
            totals = {}
            for row in rows:
                totals[row["region"]] = totals.get(row["region"], 0) + 1
            expected = [{"region": k, "total": v} for k, v in totals.items()]
            request = {"assetId": SUMMARY, "requestId": "autonomous-v1-" + task_hash[:40],
                       "publicOrFabricatedInputConfirmed": True, "input": {"rows": rows}}
            if time.strftime("%Y-%m-%d", time.gmtime()) != started_day:
                raise ValueError("DAY_BOUNDARY_RECONCILE")
            guard()
            # Persist intent before sending. No retries even if POST response is lost.
            save("intent", {"taskHash": task_hash, "request": request, "status": "INTENT_NO_AUTOMATIC_RETRY"})
            receipt = verify_result(http.post(request), request, expected,
                                    next(a["programHash"] for a in inventory["assets"] if a["id"] == SUMMARY))
            save("worker-receipt", receipt)
            result = receipt
        else:
            result = review({"snapshot": SNAPSHOT, "snapshotHash": digest(SNAPSHOT),
                             "live": {"/assets": {"semanticValid": True, "data": inventory}},
                             "skillExecution": receipt or {"verified": False, "error": "summary not yet scheduled"}})
            result["summaryAvailableAtReview"] = receipt is not None
        previous = records[-1]["hash"] if records else "ROOT"
        record = {"taskHash": task_hash, "capability": choice, "result": result, "previous": previous}
        records.append({**record, "hash": digest(record)})
        save("stage-" + str(len(records)), records[-1])
    recheck()
    if receipt is None or receipt.get("verified") is not True:
        raise ValueError("REAL_SKILL_REQUIRED")
    delivery = {"taskHash": task_hash, "decision": decision, "decisionHash": digest(decision),
                "records": records, "worker": receipt, "toolsExecuted": 1,
                "ownershipClass": "same-owner technical test", "realHumanCrossOwner": "NOT_VERIFIED",
                "verifiedSales": 0, "verifiedNetReceiptsUsd": 0,
                "freedom": "Model chooses an ordered subset; inventory and summary required. Optional fixed review may run before or after summary. Executor code, target, data projection, validation and publication are fixed.",
                "recovery": "Saved receipt is read back in the current runner; ambiguous external completion or any earlier dispatch blocks further POSTs. No cross-run exactly-once claim."}
    save("delivery", delivery)
    return delivery

def writer(name, value):
    if not re.fullmatch(r"(intent|worker-receipt|stage-[123]|delivery)", name):
        raise ValueError("FILE_TARGET_DENIED")
    root = Path("autonomous-evidence")
    root.mkdir(exist_ok=True)
    raw = canonical(value)
    if len(raw.encode()) > 65536:
        raise ValueError("DELIVERY_BOUND")
    path = root / (name + ".json")
    # Exclusive create and exact readback; no duplicate publication within this runner.
    try:
        with path.open("x") as stream:
            stream.write(raw)
    except FileExistsError:
        raise ValueError("PRIOR_INTENT_OR_RECEIPT_RECONCILE")
    if strict_json(path.read_text()) != value:
        raise ValueError("DELIVERY_READBACK")
    print("PUBLIC_RECEIPT=" + canonical({"name": name, "sha256": digest(value), "value": value}), flush=True)

def live(decision, task_hash, authority):
    if os.environ.get("GITHUB_EVENT_NAME") != "workflow_dispatch" or os.environ.get("GITHUB_REPOSITORY") != REPO or os.environ.get("RUNNER_ENVIRONMENT") != "github-hosted" or os.environ.get("GITHUB_RUN_ATTEMPT") != "1":
        raise ValueError("MANUAL_ONE_SHOT_CLOUD_REQUIRED")
    http = BoundedHTTP()
    def guard():
        runs = http.get("https://api.github.com/repos/" + REPO + "/actions/runs?event=workflow_dispatch&per_page=100")
        one_shot_guard(runs, os.environ["GITHUB_RUN_ID"], os.environ["GITHUB_RUN_ATTEMPT"])
    guard()
    return execute(decision, task_hash, authority, http, writer, guard)

if __name__ == "__main__":
    import sys
    if sys.argv[1:] != ["preflight"]:
        raise ValueError("MODE_DENIED")
    http = BoundedHTTP()
    authority = current_authority(http)
    health = http.get(BASE + "/health")
    catalog = check_catalog(http.get(BASE + "/assets"))
    print("READ_ONLY_PREFLIGHT=" + canonical({"authorityHash": digest(authority), "taskHash": digest(public_task(authority)),
          "health": {k: health.get(k) for k in ("ok", "version", "executionConfigured")},
          "catalog": catalog, "workerPostAttempts": http.post_attempts, "modelCalls": 0}))
