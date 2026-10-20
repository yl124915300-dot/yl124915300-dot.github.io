"""Bounded GitHub-backed owner grants and auditable collaboration protocol."""
import hashlib, json, re
from datetime import datetime, timezone

PROTOCOL = "ai-online-owner-loop-1"
ROLE_CAPABILITIES = {"collector": "public-contract-inventory", "reviewer": "public-contract-review"}
SCOPES = {"directory.read", "task.reply", "artifact.publish", "public-contract.read", "asset.execute"}
TITLE_OWNER = "[AI Online owner]"
TITLE_TASK = "[AI Online task]"

def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)

def digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()

def payload(body, limit=12000):
    if not isinstance(body, str) or len(body.encode()) > limit:
        raise ValueError("BODY_LIMIT")
    matches = re.findall(r"\x60\x60\x60json\s*\n(.*?)\n\x60\x60\x60", body, re.S)
    if len(matches) != 1:
        raise ValueError("ONE_JSON_BLOCK_REQUIRED")
    def pairs(items):
        out = {}
        for k, v in items:
            if k in out or k in {"__proto__", "constructor", "prototype"}:
                raise ValueError("DUPLICATE_OR_FORBIDDEN_KEY")
            out[k] = v
        return out
    return json.loads(matches[0], object_pairs_hook=pairs, parse_constant=lambda _: (_ for _ in ()).throw(ValueError("NONFINITE")))

def fields(value, expected):
    if not isinstance(value, dict) or set(value) != set(expected):
        raise ValueError("FIELDS_DENIED")

def stamp(value):
    if not isinstance(value, str) or not value.endswith("Z"):
        raise ValueError("UTC_TIMESTAMP_REQUIRED")
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except (ValueError, TypeError):
        raise ValueError("TIMESTAMP_INVALID")

def identity(issue):
    user = issue["user"]
    if user.get("type") != "User" or type(user.get("id")) is not int:
        raise ValueError("AUTHENTICATED_USER_REQUIRED")
    return user["id"]

def grant(issue, now):
    if issue.get("pull_request") or not issue.get("title", "").startswith(TITLE_OWNER) or issue.get("state") != "open":
        raise ValueError("GRANT_CLOSED_OR_WRONG_TYPE")
    data = payload(issue.get("body"))
    fields(data, ["kind", "agent", "role", "capabilities", "scopes", "expiresAt", "ownerAttestation", "publicOnly"])
    if data["kind"] != "agent-grant" or data["ownerAttestation"] != "I control this account and authorize this Agent" or data["publicOnly"] is not True:
        raise ValueError("CONSENT_REQUIRED")
    if not isinstance(data["agent"], str) or not re.fullmatch(r"[a-z][a-z0-9-]{1,39}", data["agent"]):
        raise ValueError("AGENT_ID")
    role = data["role"]
    if role not in ROLE_CAPABILITIES or data["capabilities"] != [ROLE_CAPABILITIES[role]]:
        raise ValueError("CAPABILITY_DENIED")
    required = {"directory.read", "task.reply", "artifact.publish"}
    if role == "collector":
        required |= {"public-contract.read", "asset.execute"}
    if not isinstance(data["scopes"], list) or any(not isinstance(x, str) for x in data["scopes"]) or set(data["scopes"]) != required or len(data["scopes"]) != len(required):
        raise ValueError("SCOPE_DENIED")
    until = stamp(data["expiresAt"])
    created = stamp(issue["created_at"])
    if until <= now or until > created + 30 * 86400:
        raise ValueError("GRANT_EXPIRED_OR_TOO_LONG")
    owner = identity(issue)
    return {"id": f"gh:{owner}:{data['agent']}", "ownerId": owner, "login": issue["user"]["login"],
            "role": role, "capabilities": data["capabilities"], "scopes": sorted(required),
            "expiresAt": data["expiresAt"], "grantIssue": issue["number"], "grantUrl": issue["html_url"],
            "grantHash": digest({"body": issue["body"], "ownerId": owner}),
            "realHumanAndIndependentOwnershipVerified": False}

def task(issue):
    if not issue.get("title", "").startswith(TITLE_TASK) or issue.get("state") != "open":
        raise ValueError("TASK_CLOSED_OR_WRONG_TYPE")
    data = payload(issue.get("body"))
    fields(data, ["kind", "goal", "collector", "reviewer", "publicOnly", "authorizeReplies"] + (["requireDifferentOwners"] if "requireDifferentOwners" in data else []))
    if "requireDifferentOwners" in data and type(data["requireDifferentOwners"]) is not bool:
        raise ValueError("OWNER_MODE_INVALID")
    if data["kind"] != "collaboration-task" or data["goal"] != "audit-ai-online-public-contract":
        raise ValueError("GOAL_DENIED")
    if data["publicOnly"] is not True or data["authorizeReplies"] is not True:
        raise ValueError("TASK_CONSENT_REQUIRED")
    for role in ("collector", "reviewer"):
        if not isinstance(data[role], str) or not re.fullmatch(r"gh:[0-9]+:[a-z][a-z0-9-]{1,39}", data[role]):
            raise ValueError("AGENT_REFERENCE")
    if data["collector"] == data["reviewer"]:
        raise ValueError("DISTINCT_AGENTS_REQUIRED")
    owner = identity(issue)
    return {**data, "ownerId": owner, "issue": issue["number"], "url": issue["html_url"],
            "taskHash": digest({"ownerId": owner, "body": issue["body"], "issue": issue["number"]})}

def select_agents(current_task, issues, now):
    directory = {}
    ambiguous = set()
    for issue in issues:
        try:
            item = grant(issue, now)
        except (ValueError, KeyError, TypeError):
            continue
        if item["id"] in directory:
            ambiguous.add(item["id"])
        directory[item["id"]] = item
    selected = []
    for role in ("collector", "reviewer"):
        if current_task[role] in ambiguous:
            raise ValueError("AMBIGUOUS_AGENT_GRANTS")
        item = directory.get(current_task[role])
        if item is None or item["role"] != role:
            raise ValueError("VALID_ROLE_GRANT_REQUIRED")
        selected.append(item)
    if current_task.get("requireDifferentOwners") is True and selected[0]["ownerId"] == selected[1]["ownerId"]:
        raise ValueError("DIFFERENT_ACCOUNTS_REQUIRED_NOT_HUMAN_PROOF")
    return selected

def envelope(task_hash, stage, actor, data, previous="ROOT"):
    record = {"protocol": PROTOCOL, "taskHash": task_hash, "stage": stage, "actor": actor,
              "data": data, "previous": previous}
    return {**record, "hash": digest(record)}

def validate_chain(records, task_hash):
    previous = "ROOT"
    expected = ["discovery", "collector", "reviewer", "delivery"]
    if len(records) > len(expected):
        raise ValueError("EXTRA_STAGE")
    for index, record in enumerate(records):
        if record.get("protocol") != PROTOCOL or record.get("taskHash") != task_hash or record.get("stage") != expected[index] or record.get("previous") != previous:
            raise ValueError("CHAIN_SEQUENCE_OR_TASK_CHANGED")
        body = {k: v for k, v in record.items() if k != "hash"}
        if record.get("hash") != digest(body):
            raise ValueError("CHAIN_TAMPERED")
        previous = record["hash"]
    return previous

def review(inventory):
    assets = inventory["snapshot"]["assets"]
    findings = []
    allowed = {"gate_rows", "project_rows", "number_rows", "group_rows"}
    for asset in assets:
        permission = asset.get("permission", {})
        if permission.get("publicExecution") is not True or any(permission.get(k) is not False for k in ("network", "filesystem", "shell", "payment", "modelBilling")):
            findings.append({"asset": asset["id"], "code": "PERMISSION_REVIEW_REQUIRED"})
        if any(step["tool"] not in allowed or step["tool"] not in asset.get("allowedTools", []) for step in asset["program"]["steps"]):
            findings.append({"asset": asset["id"], "code": "TOOL_CONTRACT_MISMATCH"})
    live = inventory["live"]
    for path, response in live.items():
        if not response.get("semanticValid"):
            findings.append({"source": path, "code": "LIVE_CONTRACT_UNVERIFIED", "error": response.get("error", "unexpected shape")})
    execution = inventory["skillExecution"]
    if not execution.get("verified"):
        findings.append({"source": "/execute", "code": "SKILL_OUTPUT_UNVERIFIED", "error": execution.get("error", "output mismatch")})
    live_assets = live.get("/assets", {}).get("data")
    if isinstance(live_assets, dict) and isinstance(live_assets.get("assets"), list):
        expected = {a["id"]: a.get("programHash") for a in assets}
        actual = {a.get("id"): a.get("programHash") for a in live_assets["assets"]}
        if expected != actual:
            findings.append({"code": "SNAPSHOT_LIVE_ASSET_DRIFT", "snapshot": expected, "live": actual})
    versions = {p: r.get("data", {}).get("version") for p, r in live.items() if isinstance(r.get("data"), dict) and r["data"].get("version")}
    return {"inReplyTo": "collector", "inventoryHash": digest(inventory), "assetCount": len(assets),
            "snapshotHash": inventory["snapshotHash"], "versionsObserved": versions, "findings": findings,
            "delivery": "Public contract and owner-onboarding readiness audit",
            "use": "A prospective owner can see actual asset permissions, source drift, skill output verification and remaining ownership gates before joining.",
            "skillOutputVerified": execution.get("verified", False),
            "remainingGates": ["Different GitHub accounts do not prove different real humans or independent control.",
                               "No third-party enrollment, buyer intent, paid order or payment has been verified."],
            "verifiedIndependentOwners": 0, "verifiedCrossOwnerCollaborations": 0, "verifiedSales": 0, "revenueUsd": 0}
