"""Cloud-only orchestration; GitHub author IDs and issue grants are authoritative."""
import json, os, subprocess, sys, time, urllib.request
from pathlib import Path
from core import PROTOCOL, TITLE_OWNER, TITLE_TASK, canonical, digest, envelope, grant, identity, payload, select_agents, task, validate_chain

REPOSITORY = "yl124915300-dot/yl124915300-dot.github.io"
HERE = Path(__file__).resolve().parent
BOT = "github-actions[bot]"

def role_process(role, value):
    # The two programs run in distinct processes, with no GitHub token in their environment.
    safe_env = {k: v for k, v in os.environ.items() if k in ("PATH", "LANG", "HOME", "SSL_CERT_FILE")}
    process = subprocess.run([sys.executable, str(HERE / "agent.py"), role], input=json.dumps(value),
                             text=True, capture_output=True, timeout=90, env=safe_env, check=True)
    return json.loads(process.stdout)

def github(path, body=None):
    if os.environ.get("GITHUB_REPOSITORY") != REPOSITORY:
        raise ValueError("REPOSITORY_DENIED")
    if not path.startswith("/issues") or any(x in path for x in ("..", "://", "#")):
        raise ValueError("GITHUB_PATH_DENIED")
    headers = {"Authorization": "Bearer " + os.environ["GITHUB_TOKEN"], "Accept": "application/vnd.github+json",
               "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "AI-Online-owner-loop"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request("https://api.github.com/repos/" + REPOSITORY + path,
                                 data=json.dumps(body).encode() if body is not None else None, headers=headers)
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None
    with urllib.request.build_opener(NoRedirect).open(req, timeout=20) as response:
        raw = response.read(2000001)
        if len(raw) > 2000000:
            raise ValueError("GITHUB_RESPONSE_LIMIT")
        return json.loads(raw)

def list_all(path):
    items = []
    for page in range(1, 6):
        response = github(path + ("&" if "?" in path else "?") + f"per_page=100&page={page}")
        if not isinstance(response, list):
            raise ValueError("LIST_SHAPE")
        items.extend(response)
        if len(response) < 100:
            return items
    raise ValueError("PAGINATION_LIMIT_FAIL_CLOSED")

def receipt_text(record):
    return f"AI Online · {record['stage']} · {PROTOCOL}\n\n" + "\x60\x60\x60json\n" + json.dumps(record, ensure_ascii=False, indent=2).replace("`", "\\u0060").replace("@", "\\u0040") + "\n\x60\x60\x60"

def receipts(comments, task_hash):
    out = []
    prefix = "AI Online · "
    for item in comments:
        if item.get("user", {}).get("login") != BOT or not item.get("body", "").startswith(prefix):
            continue
        record = payload(item["body"], limit=60000)
        # Edited task bodies are a new authorization, never silently mix old outputs.
        if record.get("taskHash") != task_hash:
            raise ValueError("TASK_CHANGED_AFTER_EXECUTION_CREATE_NEW_TASK")
        out.append(record)
    validate_chain(out, task_hash)
    return out

def live():
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
    issue = event.get("issue", {})
    if issue.get("pull_request") or not issue.get("title", "").startswith((TITLE_OWNER, TITLE_TASK)):
        print("IGNORED_UNRELATED_EVENT")
        return
    sender = event.get("sender", {}).get("id")
    if sender != issue.get("user", {}).get("id"):
        print("IGNORED_EVENT_WITHOUT_OWNER_AUTHORITY")
        return
    if "comment" in event and event["comment"].get("body", "").strip() != "/ai-online retry":
        print("IGNORED_NON_RETRY_COMMENT")
        return
    number = issue["number"]
    if type(number) is not int:
        raise ValueError("ISSUE_NUMBER")
    issue = github(f"/issues/{number}")
    if identity(issue) != sender:
        raise ValueError("CURRENT_AUTHOR_MISMATCH")
    if issue["title"].startswith(TITLE_OWNER):
        result = grant(issue, time.time())
        print(canonical({"registration": result, "status": "valid while open, unchanged, and unexpired"}))
        return
    current = task(issue)
    agents = None
    def reauthorize():
        fresh = task(github(f"/issues/{number}"))
        if fresh["taskHash"] != current["taskHash"]:
            raise ValueError("TASK_CHANGED")
        selected = select_agents(current, list_all("/issues?state=open"), time.time())
        if agents is not None and selected != agents:
            raise ValueError("GRANTS_CHANGED_DURING_EXECUTION")
        return selected
    agents = reauthorize()
    stored = receipts(list_all(f"/issues/{number}/comments"), current["taskHash"])
    if stored and stored[0]["data"]["agents"] != agents:
        raise ValueError("GRANTS_CHANGED_CREATE_NEW_TASK")
    run_url = "https://github.com/" + REPOSITORY + "/actions/runs/" + os.environ["GITHUB_RUN_ID"]
    def save(stage, actor, data):
        reauthorize()
        previous = validate_chain(stored, current["taskHash"])
        record = envelope(current["taskHash"], stage, actor, data, previous)
        if len(receipt_text(record).encode()) > 60000:
            raise ValueError("RECEIPT_LIMIT")
        github(f"/issues/{number}/comments", {"body": receipt_text(record)})
        stored.append(record)
        print(canonical({"stage": stage, "hash": record["hash"], "run": run_url}))
    common = {"run": run_url, "sourceCommit": os.environ["GITHUB_SHA"]}
    if len(stored) == 0:
        save("discovery", {"id": "platform-directory", "model": None}, {"agents": agents, "task": current, **common,
             "ownershipClass": "same-account-controlled" if agents[0]["ownerId"] == agents[1]["ownerId"] else "different-accounts-real-human-independence-unverified"})
    if len(stored) == 1:
        reauthorize()
        result = role_process("collector", {"taskHash": current["taskHash"]})
        save("collector", agents[0], result)
    if len(stored) == 2:
        reauthorize()
        result = role_process("reviewer", stored[1]["data"])
        save("reviewer", agents[1], result)
    if len(stored) == 3:
        save("delivery", {"id": "platform-handoff", "model": None},
             {"report": stored[2]["data"], "inReplyTo": stored[2]["hash"], "status": "audit-delivered",
              "technical": "bounded deterministic collaboration; production autonomy not established",
              "independentOwnersVerified": 0, "commercialTransactionsVerified": 0, **common})
    # Read back the actual server-persisted complete conversation, do not infer from POST.
    persisted = receipts(list_all(f"/issues/{number}/comments"), current["taskHash"])
    if len(persisted) != 4 or persisted[-1]["hash"] != stored[-1]["hash"]:
        raise ValueError("PERSISTED_READBACK_FAILED")
    output = {"task": current, "agents": agents, "records": persisted, "readbackVerified": True, **common}
    Path("network-evidence").mkdir(exist_ok=True)
    Path("network-evidence/conversation.json").write_text(json.dumps(output, ensure_ascii=False, indent=2))
    print(canonical({"readbackVerified": True, "stages": 4, "task": current["url"], "deliveryHash": persisted[-1]["hash"]}))

def probe():
    inventory = role_process("collector", {"taskHash": digest({"mode": "cloud-probe", "commit": os.environ.get("GITHUB_SHA", "unknown")})})
    reviewed = role_process("reviewer", inventory)
    value = {"inventory": inventory, "review": reviewed, "evidenceClass": "platform-controlled cloud probe",
             "independentOwnersVerified": 0, "revenueUsd": 0}
    Path("network-evidence").mkdir(exist_ok=True)
    Path("network-evidence/probe.json").write_text(json.dumps(value, ensure_ascii=False, indent=2))
    print(canonical({"skillExecution": inventory["skillExecution"], "live": inventory["live"], "review": reviewed}))

if __name__ == "__main__":
    if sys.argv[1] == "probe":
        probe()
    elif sys.argv[1] == "live":
        live()
    else:
        raise ValueError("MODE_DENIED")
