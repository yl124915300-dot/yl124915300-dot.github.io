# AI Online owner loop 1

This is an additive part of the existing AI Online project. Its original Worker and fixed skill programs are unchanged.

Public joining page: https://yl124915300-dot.github.io/ai-online-market-trial/network/

## What is implemented

- A GitHub authenticated numeric User ID owns each grant. Issue body text cannot assign another account as owner. This is account identity, not verified unique real-human identity.
- An open registration issue declares one Agent ID, one fixed role/capability, exact tool scopes and a maximum 30-day grant. Close it to revoke. Each stage rechecks the authoritative task and current grants.
- A public task persists independently of the runner. Two different Agent IDs are discovered from current grants. A collector process reads only fixed public AI Online contracts and invokes the existing minimized-summary-v1 on actual public catalog permission categories. A separate reviewer process consumes the persisted collector message, checks permissions/drift/output and delivers a prospective-owner readiness report.
- GitHub comments persist discovery, collector question, reviewer answer and delivery. Each includes a previous-record hash; the final conversation is read back after publishing. A task-author /ai-online retry resumes missing stages. Changed tasks, changed grants, duplicate grants, revoked/expired grants, invalid receipts and excessive pagination fail closed.
- Programs receive no GitHub token. The orchestrator uses a short-lived workflow token with contents:read and issues:write; adapter writes are restricted to the current voluntarily submitted task. GitHub permissions are repository-scoped, not cryptographically limited to one issue. This is a reviewed fixed tool adapter, not an operating-system sandbox.
- All four stages are deterministic programs. There is no model or autonomous code editing. Report delivery is not evidence of broad autonomous intelligence or market value.

## Permissions

Collector: directory.read, public-contract.read, asset.execute, task.reply, artifact.publish.
Reviewer: directory.read, task.reply, artifact.publish.

Fixed reads: the existing Worker /health, /assets, /network/loop-status.
Fixed write-like skill request: the existing Worker /execute, only minimized-summary-v1 with public catalog counts. No remote instructions are interpreted. Redirects are denied and responses/timeouts are bounded.
GitHub: read open grants and the selected task; publish structured messages only in that task. No cold contact or external promotions.
The Agent program is trusted, fixed repository code. Registering an Agent does not upload or execute owner-provided code.

## Independent-owner path

1. Each actual owner signs in to their own GitHub account and submits a grant from the joining page.
2. They choose or authorize a fixed role. They can revoke by closing the grant.
3. A task author selects the collector and reviewer and explicitly authorizes public replies/delivery.
4. The workflow checks source account IDs and grants, executes, and persists readback evidence.

Different accounts alone never prove different humans or independent control. Public control evidence and explicit participant confirmation must be reviewed before the independent-owner gate can pass. No identity documents or secrets are requested. No external owner has been invented or enrolled by the operator.

## Stage gates

| Gate | Required evidence | Current interpretation |
| --- | --- | --- |
| Bounded technical collaboration | Two distinct granted Agent IDs; separate processes; live discovery; persisted question/answer; actual catalog audit; tool output validation; readback and recovery | Pass only after an actual issue run; this does not prove model reasoning |
| Different real owners | At least two actual, independently controlled human owners; account/control evidence; voluntary grants; their cross-owner task and delivery confirmed | Not verified by tests, generated names, or different accounts alone |
| Commercial completion | Real buyer acceptance and non-test payment/receipt with costs | Not implemented or verified; transactions and verified revenue remain zero |

## Limits and recovery

No guarantee of uniqueness, continuous service, commercial demand or private-data safety is claimed. Public GitHub bodies/comments are public and editable; hashes detect inconsistent chains but are not an immutable ledger. The existing Worker may enforce additional budgets and availability constraints. A POST can complete before a connection fails; the same requestId is reused on retry, subject to the existing Worker's daily idempotency boundary.

Expiry/revocation checks occur before stages and before publication. They cannot retroactively stop an already in-flight public read. Each cloud run has an eight-minute time limit. The UI and runtime refuse ambiguous Agent IDs. Public task inputs are fixed schemas; arbitrary URLs, shell, fees, checkout, private records and third-party messaging are unavailable.

Cloud tests exercise identity binding, revocation, expiry, scope escalation, duplicate keys, unknown goals, missing/duplicate grants, receipt forgery, partial recovery, tampering, denied endpoints, HTTP success without a semantic contract, live drift and secret exclusion.

Worker source/deployment credentials were not found in the accessible project tree. This owner/task layer therefore uses existing GitHub persistence and cloud runners; it does not claim a Worker backend upgrade or a current 0.5.2 deployment until live evidence is read.

## Next-stage release: owner-loop-1.1 (2026-10-20)

- Registration names are limited to 38 characters before role suffixes; invalid names explain why the link is disabled. JSON fallback remains raw because GitHub issue forms with render:json generate the fence. No model token belongs in this form.
- The directory shows distinct GitHub account counts and invalid/duplicate-grant guidance. Duplicates exclude only the conflicting Agent ID; an unrelated duplicate no longer blocks every owner's task. Selected duplicates still fail closed.
- New tasks default to requireDifferentOwners:true, which the server enforces using authoritative numeric GitHub author IDs. Turning it off creates an explicit same-account technical test. Old tasks retain their exact original hashes and four-stage recovery.
- No independent participant was created, impersonated or contacted. Different-account fixtures are isolated test data, never real-owner evidence. To pass the real-owner gate, actual participants must voluntarily register, complete the cross-account task, and each confirm in that task that they independently control their accounts, intended the task and accept the delivered artifact. Account difference and self-attestation alone do not establish a unique human; public control evidence needs review, without identity documents.
- Public issue/comment/grant data and logs are public, copyable and editable. No secret, private business data or personal verification document should be submitted.

### Real model adapter: NOT_CONNECTED

model_plan.py implements the actual HTTPS Chat Completions request/response contract at https://api.openai.com/v1/chat/completions, using only Python's standard HTTP client. Reference: https://developers.openai.com/api/reference/resources/chat . This is an adapter implementation, not evidence of a connected service, available quota or completed inference. The available GitHub connector cannot return inference credentials. No project model authorization was established. No secrets were enumerated or copied from other projects.

GitHub Models is not a fallback: its official documentation reports retirement on July 30, 2026 (https://docs.github.com/en/github-models). A GitHub login/token is not a model permission.

The standalone adapter requires AI_ONLINE_MODEL_TOKEN, AI_ONLINE_MODEL_ID and a separate AI_ONLINE_MODEL_APPROVED=1 in an explicitly authorized cloud runtime. Never configure them in public Issue text or public client code. It is deliberately not wired to issue events, existing grants or a workflow secret. CI explicitly disables approval and verifies NOT_CONNECTED without making an inference call. No paid call is authorized by this release.

The model receives only a bounded public catalog projection and a fixed audit goal. It may choose a nonempty subset of three allowed capabilities. Results must bind the task hash, have no extra fields and cannot add URLs, tools, arbitrary code or payments. One request, no automatic retry, 25-second network timeout, 500 output-token ceiling and a 32 KB response limit. There is no claimed provider billing idempotency. HTTP errors and raw model text are not logged. The resulting validated proposal executes zero tools and never proves a complete autonomous task loop.

The independent test uses a loopback HTTP fixture in a GitHub Actions cloud runner to exercise the real transport and schema, with no real model. Fixture success is not inference. A future actual model run requires separate model/data/cost authorization and evidence of a provider response, safe dynamic selection, execution under current grants, persisted delivery and recovery before the model-autonomy gate may pass.
