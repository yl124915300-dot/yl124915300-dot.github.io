"""Adversarial executor fixtures. Zero model calls and zero actual Worker calls."""
import copy, json, threading, unittest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch
from core import canonical, digest
import execution_v1 as x
from test_network import NOW

GRANTS = json.loads("[{\"number\":24,\"title\":\"[AI Online owner] contract-collector — operator technical validation\",\"body\":\"Operator-controlled technical validation, authorized in the 2026-10-20 AI Online execution request. Both Agent roles belong to the same authenticated account. No independent human owner or third-party enrollment is claimed.\\n\\nThis grant permits only the fixed public AI Online contract audit, its existing summary skill (collector only), and replies/delivery in voluntarily submitted AI Online task issues. No payments, private data, arbitrary code or outreach. Close this issue to revoke.\\n\\n```json\\n{\\n  \\\"kind\\\": \\\"agent-grant\\\",\\n  \\\"role\\\": \\\"collector\\\",\\n  \\\"agent\\\": \\\"contract-collector\\\",\\n  \\\"capabilities\\\": [\\n    \\\"public-contract-inventory\\\"\\n  ],\\n  \\\"scopes\\\": [\\n    \\\"directory.read\\\",\\n    \\\"task.reply\\\",\\n    \\\"artifact.publish\\\",\\n    \\\"public-contract.read\\\",\\n    \\\"asset.execute\\\"\\n  ],\\n  \\\"expiresAt\\\": \\\"2026-10-27T09:30:00Z\\\",\\n  \\\"ownerAttestation\\\": \\\"I control this account and authorize this Agent\\\",\\n  \\\"publicOnly\\\": true\\n}\\n```\",\"state\":\"open\",\"created_at\":\"2026-10-20T09:21:58Z\",\"html_url\":\"https://github.com/yl124915300-dot/yl124915300-dot.github.io/issues/24\",\"user\":{\"id\":239416297,\"login\":\"yl124915300-dot\",\"type\":\"User\"}},{\"number\":25,\"title\":\"[AI Online owner] contract-reviewer — operator technical validation\",\"body\":\"Operator-controlled technical validation, authorized in the 2026-10-20 AI Online execution request. Both Agent roles belong to the same authenticated account. No independent human owner or third-party enrollment is claimed.\\n\\nThis grant permits only the fixed public AI Online contract audit, its existing summary skill (collector only), and replies/delivery in voluntarily submitted AI Online task issues. No payments, private data, arbitrary code or outreach. Close this issue to revoke.\\n\\n```json\\n{\\n  \\\"kind\\\": \\\"agent-grant\\\",\\n  \\\"role\\\": \\\"reviewer\\\",\\n  \\\"agent\\\": \\\"contract-reviewer\\\",\\n  \\\"capabilities\\\": [\\n    \\\"public-contract-review\\\"\\n  ],\\n  \\\"scopes\\\": [\\n    \\\"directory.read\\\",\\n    \\\"task.reply\\\",\\n    \\\"artifact.publish\\\"\\n  ],\\n  \\\"expiresAt\\\": \\\"2026-10-27T09:30:00Z\\\",\\n  \\\"ownerAttestation\\\": \\\"I control this account and authorize this Agent\\\",\\n  \\\"publicOnly\\\": true\\n}\\n```\",\"state\":\"open\",\"created_at\":\"2026-10-20T09:21:59Z\",\"html_url\":\"https://github.com/yl124915300-dot/yl124915300-dot.github.io/issues/25\",\"user\":{\"id\":239416297,\"login\":\"yl124915300-dot\",\"type\":\"User\"}}]")

def task_issue():
    return {"number": 31, "title": "[AI Online autonomous task] V1 same-owner bounded cloud experiment",
            "state": "open", "body": x.MANIFEST["taskBody"],
            "user": {"id": x.MANIFEST["ownerId"], "type": "User"}}

class FakeHTTP:
    def __init__(self):
        self.posts = []
        self.catalog = copy.deepcopy(x.SNAPSHOT)
        self.result_change = None
        self.lost = False
    def get(self, target):
        if target == x.BASE + "/health":
            return {"ok": True, "executionConfigured": True, "version": "fixture"}
        if target == x.BASE + "/assets":
            return self.catalog
        raise AssertionError("unexpected GET")
    def post(self, body):
        self.posts.append(body)
        if self.lost:
            raise TimeoutError("fixture completed remotely but response lost")
        rows = body["input"]["rows"]
        totals = {}
        for row in rows:
            totals[row["region"]] = totals.get(row["region"], 0) + 1
        result = {"ok": True, "assetId": x.SUMMARY,
                  "programHash": next(a["programHash"] for a in self.catalog["assets"] if a["id"] == x.SUMMARY),
                  "executionId": "fixture-execution",
                  "output": [{"region": k, "total": v} for k,v in totals.items()],
                  "receipt": {"feedbackToken": "fixture-private-token"}}
        if self.result_change:
            result.update(self.result_change)
        return result

class ExecutorBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.authority = x.authorize(task_issue(), copy.deepcopy(GRANTS), NOW)
        self.hash = digest(x.public_task(self.authority))
        self.plan = {"taskHash": self.hash, "capabilities": [x.INVENTORY, x.SUMMARY, x.REVIEW]}
        self.http = FakeHTTP()
        self.saved = {}
        self.guards = 0
    def save(self, name, value):
        if name in self.saved:
            raise ValueError("DUPLICATE_DELIVERY")
        self.saved[name] = copy.deepcopy(value)
    def guard(self):
        self.guards += 1
        if self.guards > 1:
            raise ValueError("PRIOR_OR_CONCURRENT_RUN_RECONCILE")
    def run_plan(self, plan=None, save=None):
        with patch.object(x, "current_authority", return_value=self.authority):
            return x.execute(self.plan if plan is None else plan, self.hash, self.authority,
                             self.http, save or self.save, self.guard)

    def test_valid_order_executes_real_adapter_boundary_and_redacts_private_fields_fixture_only(self):
        result = self.run_plan()
        self.assertEqual(len(self.http.posts), 1)
        self.assertEqual(result["toolsExecuted"], 1)
        self.assertNotIn("fixture-private-token", canonical(self.saved))
        self.assertEqual(result["realHumanCrossOwner"], "NOT_VERIFIED")
        self.assertEqual(self.saved["delivery"], result)
        self.assertEqual(result["worker"]["request"]["requestId"], "autonomous-v1-" + self.hash[:40])

    def test_optional_review_order_is_model_choice(self):
        for choices in ([x.INVENTORY,x.SUMMARY], [x.INVENTORY,x.REVIEW,x.SUMMARY]):
            with self.subTest(choices=choices):
                self.setUp()
                self.run_plan({"taskHash":self.hash,"capabilities":choices})
                self.assertEqual([r["capability"] for r in self.saved["delivery"]["records"]], choices)

    def test_wrong_dependency_missing_required_and_unsafe_capability_do_not_call(self):
        for choices in ([x.REVIEW,x.INVENTORY,x.SUMMARY], [x.SUMMARY,x.INVENTORY],
                        [x.INVENTORY,x.REVIEW], [x.INVENTORY,"shell",x.SUMMARY],
                        [x.INVENTORY,x.SUMMARY,x.SUMMARY]):
            with self.subTest(choices=choices), self.assertRaises(ValueError):
                self.run_plan({"taskHash":self.hash,"capabilities":choices})
        self.assertEqual(self.http.posts, [])

    def test_forged_task_hash_and_extra_fields_do_not_call(self):
        for plan in ({**self.plan,"taskHash":"0"*64},{**self.plan,"url":"https://example.com"}):
            with self.assertRaises(ValueError):
                self.run_plan(plan)
        self.assertEqual(self.http.posts, [])

    def test_expired_revoked_changed_or_forged_authority(self):
        for mode in ("expired","closed","changed","owner"):
            item = task_issue()
            now = NOW
            if mode == "expired": now += 3*86400
            elif mode == "closed": item["state"] = "closed"
            elif mode == "changed": item["body"] += " "
            else: item["user"]["id"] = 7
            with self.subTest(mode=mode), self.assertRaises(ValueError):
                x.authorize(item, copy.deepcopy(GRANTS), now)

    def test_expired_revoked_and_scope_escalated_grants(self):
        for mode in ("expired","closed","scope"):
            grants = copy.deepcopy(GRANTS)
            now = NOW
            if mode == "expired": now += 20*86400
            elif mode == "closed": grants[0]["state"] = "closed"
            else: grants[0]["body"] = grants[0]["body"].replace('"asset.execute"', '"payment"')
            with self.subTest(mode=mode), self.assertRaises(ValueError):
                x.authorize(task_issue(), grants, now)

    def test_revocation_during_execution_stops_before_post(self):
        with patch.object(x,"current_authority",side_effect=[self.authority,ValueError("GRANT_CLOSED")]):
            with self.assertRaises(ValueError):
                x.execute(self.plan,self.hash,self.authority,self.http,self.save,self.guard)
        self.assertEqual(self.http.posts, [])

    def test_unknown_nonzero_and_boolean_cost_blocks_post(self):
        for value in (None,0.01,True,"0"):
            self.http.catalog["assets"][0]["costUsd"] = value
            with self.subTest(value=value), self.assertRaisesRegex(ValueError,"COST_GATE"):
                self.run_plan()
        self.assertEqual(self.http.posts, [])

    def test_contract_or_permission_drift_blocks_post(self):
        self.http.catalog["assets"][0]["permission"]["network"] = True
        with self.assertRaisesRegex(ValueError,"CONTRACT_DRIFT"):
            self.run_plan()
        self.assertEqual(self.http.posts, [])

    def test_bad_output_no_delivery_and_no_retry(self):
        self.http.result_change = {"output":[]}
        with self.assertRaisesRegex(ValueError,"OUTPUT_UNVERIFIED"):
            self.run_plan()
        self.assertEqual(len(self.http.posts),1)
        self.assertNotIn("delivery",self.saved)
        with self.assertRaises(ValueError):
            self.run_plan()
        self.assertEqual(len(self.http.posts),1)

    def test_remote_completion_response_lost_requires_reconciliation(self):
        self.http.lost = True
        with self.assertRaises(TimeoutError):
            self.run_plan()
        self.assertIn("intent",self.saved)
        self.assertNotIn("worker-receipt",self.saved)
        with self.assertRaisesRegex(ValueError,"RECONCILE"):
            self.run_plan()
        self.assertEqual(len(self.http.posts),1)

    def test_saved_worker_receipt_survives_delivery_readback_failure(self):
        def failed_readback(name,value):
            self.save(name,value)
            if name == "delivery":
                raise ValueError("DELIVERY_READBACK")
        with self.assertRaisesRegex(ValueError,"DELIVERY_READBACK"):
            self.run_plan(save=failed_readback)
        receipt = json.loads(canonical(self.saved["worker-receipt"]))
        self.assertTrue(receipt["verified"])
        self.assertEqual(receipt["requestHash"],digest(receipt["request"]))
        self.assertEqual(receipt["publicResponseHash"],digest(receipt["response"]))
        self.assertEqual(len(self.http.posts),1)

    def test_duplicate_or_concurrent_workflow_and_rerun_denied(self):
        current = {"id":123,"path":x.WORKFLOW,"run_attempt":1}
        x.one_shot_guard({"total_count":1,"workflow_runs":[current]},123,1)
        for runs,attempt in (([current,current],1),([current],2),([],1)):
            with self.assertRaises(ValueError):
                x.one_shot_guard({"total_count":len(runs),"workflow_runs":runs},123,attempt)
        with self.assertRaises(ValueError):
            x.one_shot_guard({"total_count":101,"workflow_runs":[current]},123,1)

    def test_transport_concurrent_duplicate_post_consumes_one_attempt(self):
        transport = x.BoundedHTTP()
        request = {"assetId":x.SUMMARY,"requestId":"autonomous-v1-"+"a"*40,
                   "publicOrFabricatedInputConfirmed":True,
                   "input":{"rows":[{"region":"network-denied","visits":1}]}}
        barrier = threading.Barrier(2)
        def attempt():
            barrier.wait()
            try: return transport.post(request)
            except ValueError: return "denied"
        with patch.object(transport,"_request",return_value="one"), ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: attempt(),range(2)))
        self.assertCountEqual(results,["one","denied"])
        self.assertEqual(transport.post_attempts,1)

    def test_unknown_url_and_arbitrary_worker_input_denied(self):
        transport = x.BoundedHTTP()
        for url in ("https://example.com",x.BASE+"/assets?x=1",x.BASE+"/feedback"):
            with self.assertRaises(ValueError):
                transport.get(url)
        with self.assertRaises(ValueError):
            transport.post({"shell":"true"})
        self.assertEqual(transport.count,0)

if __name__ == "__main__":
    unittest.main()
