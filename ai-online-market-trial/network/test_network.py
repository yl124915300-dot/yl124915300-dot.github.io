import copy, json, os, unittest
from pathlib import Path
from unittest.mock import patch
from core import digest, envelope, grant, payload, select_agents, task, validate_chain, review
from agent import request, summarize
from runner import receipts, receipt_text, role_process, BOT

NOW = 1792497600
def issue(number, title, value, owner=239416297):
    return {"number": number, "title": title, "body": "\x60\x60\x60json\n" + json.dumps(value) + "\n\x60\x60\x60",
            "state": "open", "created_at": "2026-10-20T00:00:00Z", "html_url": f"https://github.com/example/repo/issues/{number}",
            "user": {"id": owner, "type": "User", "login": "test-fixture"}}
def registration(role="collector", number=1):
    scopes = ["directory.read", "task.reply", "artifact.publish"]
    if role == "collector":
        scopes += ["public-contract.read", "asset.execute"]
    return issue(number, "[AI Online owner] fixture", {"kind": "agent-grant", "agent": role,
        "role": role, "capabilities": ["public-contract-inventory" if role == "collector" else "public-contract-review"],
        "scopes": scopes, "expiresAt": "2026-10-27T00:00:00Z",
        "ownerAttestation": "I control this account and authorize this Agent", "publicOnly": True})
def task_issue():
    return issue(3, "[AI Online task] fixture", {"kind": "collaboration-task", "goal": "audit-ai-online-public-contract",
        "collector": "gh:239416297:collector", "reviewer": "gh:239416297:reviewer", "publicOnly": True, "authorizeReplies": True})

class AuthorizationTests(unittest.TestCase):
    def test_identity_comes_from_github_not_payload(self):
        item = registration()
        self.assertEqual(grant(item, NOW)["ownerId"], 239416297)
        data = payload(item["body"]); data["ownerId"] = 7
        item["body"] = "\x60\x60\x60json\n" + json.dumps(data) + "\n\x60\x60\x60"
        with self.assertRaisesRegex(ValueError, "FIELDS_DENIED"):
            grant(item, NOW)

    def test_closed_and_expired_grants_revoke(self):
        item = registration(); item["state"] = "closed"
        with self.assertRaises(ValueError): grant(item, NOW)
        item["state"] = "open"
        with self.assertRaisesRegex(ValueError, "EXPIRED"):
            grant(item, NOW + 20 * 86400)

    def test_scope_escalation_and_unknown_goal_rejected(self):
        data = payload(registration()["body"]); data["scopes"].append("payment")
        with self.assertRaisesRegex(ValueError, "SCOPE_DENIED"):
            grant(issue(1, "[AI Online owner]", data), NOW)
        data = payload(task_issue()["body"]); data["goal"] = "run arbitrary code"
        with self.assertRaisesRegex(ValueError, "GOAL_DENIED"):
            task(issue(1, "[AI Online task]", data))

    def test_duplicate_keys_and_nonfinite_input_rejected(self):
        for text in ('{"a":1,"a":2}', '{"a":NaN}', '{"constructor":1}'):
            with self.assertRaises(ValueError):
                payload("\x60\x60\x60json\n" + text + "\n\x60\x60\x60")

    def test_agent_selection_and_duplicate_grant_fail_closed(self):
        current = task(task_issue())
        selected = select_agents(current, [registration(), registration("reviewer", 2)], NOW)
        self.assertEqual(len(selected), 2)
        self.assertEqual(selected[0]["ownerId"], selected[1]["ownerId"])
        self.assertFalse(selected[0]["realHumanAndIndependentOwnershipVerified"])
        with self.assertRaisesRegex(ValueError, "AMBIGUOUS"):
            select_agents(current, [registration(), registration("reviewer", 2), registration(number=4)], NOW)

    def test_wrong_role_and_missing_grant_rejected(self):
        with self.assertRaisesRegex(ValueError, "VALID_ROLE"):
            select_agents(task(task_issue()), [registration()], NOW)

class RecoveryTests(unittest.TestCase):
    def chain(self):
        records = []; previous = "ROOT"
        for stage in ("discovery", "collector", "reviewer", "delivery"):
            record = envelope("taskhash", stage, {"id": stage}, {"public": True}, previous)
            records.append(record); previous = record["hash"]
        return records

    def test_partial_recovery_has_same_next_record(self):
        records = self.chain()
        previous = validate_chain(records[:2], "taskhash")
        resumed = envelope("taskhash", "reviewer", {"id": "reviewer"}, {"public": True}, previous)
        self.assertEqual(resumed, records[2])

    def test_tampering_duplicate_and_changed_task_fail_closed(self):
        records = self.chain()
        bad = copy.deepcopy(records); bad[1]["data"]["public"] = False
        with self.assertRaisesRegex(ValueError, "TAMPERED"): validate_chain(bad, "taskhash")
        with self.assertRaises(ValueError): validate_chain([records[0], records[0]], "taskhash")
        with self.assertRaises(ValueError): validate_chain(records, "different-task")

    def test_forged_user_comment_is_not_an_agent_receipt(self):
        record = self.chain()[0]
        body = "AI Online · discovery\n\n\x60\x60\x60json\n" + json.dumps(record) + "\n\x60\x60\x60"
        self.assertEqual(receipts([{"user": {"login": "untrusted-user"}, "body": body}], "taskhash"), [])
        self.assertEqual(len(receipts([{"user": {"login": BOT}, "body": body}], "taskhash")), 1)

    def test_full_public_inventory_receipt_roundtrips_and_resumes(self):
        snapshot = json.loads((Path(__file__).resolve().parents[1] / "assets.json").read_text())
        discovery = envelope("large-task", "discovery", {"id": "directory"}, {"agents": []})
        collector = envelope("large-task", "collector", {"id": "collector"},
                             {"snapshot": snapshot, "boundedEvidence": "x" * 13000}, discovery["hash"])
        comments = [{"user": {"login": BOT}, "body": receipt_text(r)} for r in [discovery, collector]]
        with self.assertRaisesRegex(ValueError, "BODY_LIMIT"):
            payload(comments[1]["body"])
        recovered = receipts(comments, "large-task")
        self.assertEqual(recovered, [discovery, collector])
        self.assertEqual(validate_chain(recovered, "large-task"), collector["hash"])

class ToolAndDeliveryTests(unittest.TestCase):
    def test_no_arbitrary_url_or_endpoint(self):
        for path in ("https://example.com", "/admin", "/execute"):
            with self.assertRaisesRegex(ValueError, "ENDPOINT_DENIED"):
                request(path)

    def test_http_success_without_contract_is_rejected(self):
        for path in ("/health", "/assets", "/network/loop-status"):
            self.assertFalse(summarize(path, {"ok": True})["semanticValid"])

    def test_actual_catalog_review_detects_live_drift_and_failed_skill(self):
        snapshot = json.loads((Path(__file__).resolve().parents[1] / "assets.json").read_text())
        inventory = {"snapshot": snapshot, "snapshotHash": digest(snapshot),
                     "live": {"/assets": {"semanticValid": True, "data": {"assets": [{"id": "unexpected"}]}}},
                     "skillExecution": {"verified": False, "error": "timeout"}}
        result = review(inventory)
        self.assertEqual(result["assetCount"], 3)
        self.assertIn("SNAPSHOT_LIVE_ASSET_DRIFT", [f["code"] for f in result["findings"]])
        self.assertIn("SKILL_OUTPUT_UNVERIFIED", [f["code"] for f in result["findings"]])
        self.assertEqual(result["verifiedIndependentOwners"], 0)
        self.assertEqual(result["revenueUsd"], 0)
        with patch.dict(os.environ, {"GITHUB_TOKEN": "test-secret-never-print"}):
            output = role_process("reviewer", inventory)
        self.assertNotEqual(output["runtime"]["pid"], os.getpid())
        self.assertNotIn("test-secret", json.dumps(output))

if __name__ == "__main__":
    unittest.main()
