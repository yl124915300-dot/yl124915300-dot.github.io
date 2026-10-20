"""Isolated fixtures only. None of these tests prove real inference or real owners."""
import copy, json, os, threading, unittest, urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from unittest.mock import patch
from core import payload, grant, task, select_agents
from test_network import NOW, issue, registration, task_issue
from model_plan import plan, post, validate_decision, CAPABILITIES

SNAPSHOT = {"assets": [{"id": "minimized-summary-v1", "programHash": "fixture", "permission": {"network": False}}]}
ENV = {"AI_ONLINE_MODEL_TOKEN": "isolated-fixture-secret", "AI_ONLINE_MODEL_ID": "fixture-model",
       "AI_ONLINE_MODEL_APPROVED": "1"}

class EnrollmentTests(unittest.TestCase):
    def test_unrelated_duplicate_cannot_deny_other_owners(self):
        unrelated = registration(number=8)
        data = payload(unrelated["body"]); data["agent"] = "unrelated"
        unrelated = issue(8, "[AI Online owner]", data)
        duplicate = copy.deepcopy(unrelated); duplicate["number"] = 9
        selected = select_agents(task(task_issue()), [registration(), registration("reviewer", 2), unrelated, duplicate], NOW)
        self.assertEqual(len(selected), 2)

    def test_cross_account_requirement_enforced(self):
        data = payload(task_issue()["body"]); data["requireDifferentOwners"] = True
        current = task(issue(3, "[AI Online task]", data))
        with self.assertRaisesRegex(ValueError, "DIFFERENT_ACCOUNTS_REQUIRED"):
            select_agents(current, [registration(), registration("reviewer", 2)], NOW)
        reviewer = registration("reviewer", 2); reviewer["user"]["id"] = 777
        data["reviewer"] = "gh:777:reviewer"
        current = task(issue(3, "[AI Online task]", data))
        selected = select_agents(current, [registration(), reviewer], NOW)
        self.assertFalse(selected[1]["realHumanAndIndependentOwnershipVerified"])
        reviewer["state"] = "closed"
        with self.assertRaisesRegex(ValueError, "VALID_ROLE"):
            select_agents(current, [registration(), reviewer], NOW)

    def test_string_cross_account_mode_rejected(self):
        data = payload(task_issue()["body"]); data["requireDifferentOwners"] = "true"
        with self.assertRaisesRegex(ValueError, "OWNER_MODE_INVALID"):
            task(issue(3, "[AI Online task]", data))

class PlannerTests(unittest.TestCase):
    def test_not_connected_never_calls_transport(self):
        with patch("model_plan.post", side_effect=AssertionError("must not call")):
            result = plan(SNAPSHOT, environ={})
        self.assertEqual(result["status"], "NOT_CONNECTED")
        self.assertFalse(result["inferenceAttempted"])
        self.assertFalse(result["modelAutonomyVerified"])

    def test_token_without_separate_authorization_never_calls(self):
        env = {k:v for k,v in ENV.items() if k != "AI_ONLINE_MODEL_APPROVED"}
        with patch("model_plan.post", side_effect=AssertionError("must not call")):
            self.assertEqual(plan(SNAPSHOT, environ=env)["status"], "NOT_CONNECTED")

    def test_untrusted_decisions_cannot_expand_scope_or_change_task(self):
        for value in ({"taskHash": "x", "capabilities": ["payment"]},
                      {"taskHash": "x", "capabilities": ["public-contract-review"], "shell": "x"},
                      {"taskHash": "other", "capabilities": ["public-contract-review"]},
                      {"taskHash": "x", "capabilities": ["public-contract-review"]*2}):
            with self.assertRaises(ValueError):
                validate_decision(value, "x", CAPABILITIES)

    def test_failure_does_not_publish_secrets(self):
        with patch("model_plan.post", side_effect=ValueError(ENV["AI_ONLINE_MODEL_TOKEN"])):
            result = plan(SNAPSHOT, environ=ENV)
        self.assertEqual(result["status"], "MODEL_CALL_FAILED_OR_REJECTED")
        self.assertNotIn("fixture-secret", json.dumps(result))

    def test_actual_http_transport_with_isolated_fixture_service(self):
        observed = {}
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args): pass
            def do_POST(self):
                body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
                observed.update(body)
                self.send_response(200); self.end_headers()
                context = json.loads(body["messages"][1]["content"])
                response = {"id": "isolated-http-fixture", "model": "fixture-model", "choices": [{
                    "finish_reason": "stop", "message": {"content": json.dumps({
                        "taskHash": context["taskHash"], "capabilities": ["public-contract-review"]})}}]}
                self.wfile.write(json.dumps(response).encode())
        server = HTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        def fixture_transport(req):
            self.assertEqual(req.full_url, "https://api.openai.com/v1/chat/completions")
            local = urllib.request.Request("http://127.0.0.1:"+str(server.server_port)+"/v1/chat/completions",
                                           data=req.data, headers={"Content-Type": "application/json"})
            return post(local)
        try:
            with patch("model_plan.post", side_effect=fixture_transport):
                result = plan(SNAPSHOT, environ=ENV)
        finally:
            server.shutdown(); server.server_close(); thread.join()
        self.assertEqual(result["status"], "MODEL_PLAN_VALIDATED")
        self.assertFalse(result["modelAutonomyVerified"])
        self.assertEqual(result["toolsExecuted"], 0)
        self.assertNotIn("fixture-secret", json.dumps(result))
        self.assertEqual(observed["max_completion_tokens"], 500)
        self.assertNotIn("tools", observed)
        self.assertNotIn("token", observed)

if __name__ == "__main__": unittest.main()
