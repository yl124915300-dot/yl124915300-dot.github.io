# PLI V1.2 — synthetic continuous-life experiment

LLM_NOT_CONNECTED. This is a deterministic rule simulator, not a general autonomous LLM.
The existing V1.1 observer remains at https://yl124915300-dot.github.io/pli-v11/.
V1.2 candidate URL: https://yl124915300-dot.github.io/pli-v12/ . Only public-http and public-browser evidence establish that this URL is LIVE.

Try:
1. Select one or more SYNTHETIC profiles.
2. Enter a synthetic event and choose structured operation, category, virtual cost and time slot; submit.
3. Inspect state and causal history; load either complete chain and use the replay slider.

The travel chain has eight events: a proposed plan, blocking constraint, clearance, replacement plan, budget pressure, simulated refund, new plan, cancellation.
The household chain has six events: plan, expense, household constraint, constraint cancellation, new plan, additional expense.
Every step is replayed in tests. Versioned checkpoints are opened in an independent GitHub Actions job and continued there.

Safety:
- Only SYNTHETIC user_simulation events with operation=simulate are accepted.
- Exact county selection; explicit wildcard means synthetic scope, not geographical inference.
- Input timestamps, expiry, budgets, conflicts, duplicates and checkpoint shape are checked.
- Expenses alter virtual state only. Refunding a simulated expense is not a real refund.
- All real payment/order/account/messaging execution requests are denied even if an input claims authorization.
- Static UI sends only same-origin GET requests. Browser persistence is explicit and optional; copied checkpoints are never uploaded by the app.
- State is private to the browser, except fixed synthetic CI fixtures already public in this repository. Do not enter personal data.
- Decisions and user text use textContent. CSP blocks inline scripts, external connections, objects and form navigation.
- Journal limit: 300 events. No automatic truncation or silent loss.
- A checkpoint is untrusted input. It is schema checked and replayed; it has no signature or trusted authority.

Model:
Current official GitHub documentation says GitHub Models was retired July 30, 2026: https://docs.github.com/en/github-models .
The connected tool inventory exposes no general application text-inference endpoint. No inference call has succeeded, no external model account has been created, no agreement accepted, no secret requested, no paid service used.
provider.mjs defines a disconnected interface and a strict untrusted-output boundary: allowed simulated action, known profile/source IDs, integer bounded costs, explicit uncertainty, no extra fields.
The schema cannot prove a model claim true; a hypothetical valid output remains UNVERIFIED_MODEL_OUTPUT and cannot execute anything.
Three unfamiliar text cases prove safe abstention, not LLM reasoning. Provider-output tests use synthetic stubs, not live inference.

Evidence:
- evidence/unit.json: meaningful rule, provenance, adversarial and replay checks.
- evidence/browser.json: desktop/mobile browser checks in isolated cloud.
- evidence/restore.json: separate cloud-job restoration.
- evidence/v11-audit.json: actual anonymous V1.1 reads, fresh source receipts, snapshot age and schedule-event audit.
- evidence/summary.json: prepublication cloud check totals.
- evidence/public-http.json and public-browser.json: actual deployed-byte and anonymous browser acceptance.
- evidence/public-summary.json: combined validation totals after publication.

No existing V1.1 or unrelated file/settings should change. PR stays draft/unmerged. Publication is a separate additive commit containing only pli-v12/ and dedicated new workflows.
Actions is periodic cloud execution, not an always-on backend. There is no shared user-state service or natural-language understanding.
Real transactions: 0. Net income: 0.
