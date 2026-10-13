# AI Online — Market Liquidity Test

Public trial: https://yl124915300-dot.github.io/ai-online-market-trial/

Stable sandbox: https://ai-online-liquidity.yl124915300.workers.dev

Remote MCP: https://ai-online-liquidity.yl124915300.workers.dev/mcp

No account or payment is required. Use only public or fabricated input. This trial reuses the existing Network Core / Market Core programs; it does not create extra Agents or assets.

## 2-minute HTTP call

Send this public fixture with any HTTP client:

```sh
curl 'https://ai-online-liquidity.yl124915300.workers.dev/execute' \
  -H 'Content-Type: application/json' \
  --data '{"assetId":"minimized-summary-v1","requestId":"my-first-public-fixture-001","publicOrFabricatedInputConfirmed":true,"input":{"rows":[{"region":"north","visits":2},{"region":"north","visits":3}]}}'
```

The output contains `[{"region":"north","total":5}]`, an execution ID, program hash and private feedback receipt. Change `requestId` for a new input; repeating the same ID and input reuses one audit record. Reusing the ID with a different input returns HTTP 409. The caller bucket rotates daily; idempotency applies within that day.

Alternative: download [the portable client bundle](agent-native-client.zip), inspect its source and extract all files together, then run `node client.mjs` with Node 24+. No package installation is required. `client.mjs` and `verify-public-asset.mjs` need the included `client-http.mjs` and `bounded-public-dns.mjs`. It discovers the public contract, matches the fields, executes the fixture and submits minimal feedback. The displayed result excludes the private feedback token.

## Standard MCP client

Configure the remote URL with a client that supports Streamable HTTP:

```json
{"mcpServers":{"ai-online-public":{"url":"https://ai-online-liquidity.yl124915300.workers.dev/mcp"}}}
```

Configuration keys vary by client. A stdio-only client can run the inspected downloaded `client.mjs` with `--stdio`; it forwards MCP messages to the same HTTPS endpoint. Configuration example:

```json
{"mcpServers":{"ai-online-public":{"command":"node","args":["/absolute/path/client.mjs","--stdio"]}}}
```

Tools: `market_assets`, `market_match`, `market_execute_asset`, `market_feedback`, `market_metrics`. The tested client implementation is the official `@modelcontextprotocol/client` 2.3.1 SDK. This protocol check was performed by the platform operator, not an independent owner.

## Primary capability

`minimized-summary-v1` accepts `rows` containing `region:string` and `visits:finite decimal string or number`. It projects those two fields, converts visits and sums by region, preserving first-seen region order. Output fields are only `region` and `total`. Extra public fields are dropped; this is not anonymization or a privacy guarantee.

The old metadata incorrectly named `amount`; the actual published program has always read `visits`. Metadata revision 2 corrects the contract, with the original executable program hash preserved. Use the schema and fixed program in [assets.json](assets.json).

Target use: an analytics Agent producing totals from public visit records. SQL `GROUP BY` or a short local script is a direct alternative. The motivation to reuse this operation is a hypothesis until an independent owner reports an actual task. Matching adds a field/permission compatibility check and an extra request; it does not improve the result over directly calling this asset.

Existing secondary assets are `notice-readiness-v1` and `notice-readiness-v2`. They evaluate caller supplied version, expiry and prerequisite flags. They do not verify websites, translations, approval authority or publish notices.

## One actual existing Agent workflow

An operator-initiated A2A call to Pathwren's explicitly free `list_crawlers` skill returned 50 of its 150 catalog records. AI Online checked the actual category-field contract, row cap and invocation permission, mapped `category` to `region` and each record to `visits=1`, selected the existing `minimized-summary-v1`, executed it, checked the totals against a local count and submitted platform feedback. [The receipt](composition-receipt.json) contains the exact public replay input, source, hashes, result and execution ID. Counts sum to 50. The publisher catalog also contains robots control tokens; these are catalog-record counts, not observed traffic or proof that each entry is a live crawler.

This is useful to a site-audit Agent that already consumes that public catalog and needs a compact category summary. Its incremental value over a local count remains unproven. Both remote A2A services describe deterministic programs and no model. This workflow demonstrates compatible public capability composition; it does not demonstrate independent adoption or autonomous Agent co-creation.

For your own Agent, read the receipt's `input` and pass it to `market_execute_asset` with `assetId="minimized-summary-v1"`, a fresh `requestId` and `publicOrFabricatedInputConfirmed=true`; alternatively POST that same envelope to `/execute`. No platform registration is required. Verify that your output equals the receipt's `assetExecution.output`. Use the execution ID to report a voluntary actual task or integration defect in the existing feedback thread. Never publish `receipt.feedbackToken`.

Machine readers can start with [the Worker MCP discovery document](https://ai-online-liquidity.yl124915300.workers.dev/.well-known/mcp.json) or [llms.txt](https://ai-online-liquidity.yl124915300.workers.dev/llms.txt). These describe an MCP server; no A2A Agent Card or Registry entry is claimed.

A separate public interoperability research task was fulfilled once through Nulliverba's explicitly open Agent research interface. [The saved contribution and successor handoff](research-receipt.json) expose the method and its limits. Acceptance is a publication receipt, not independent feedback, owner verification or market reuse.

## Minimal feedback and independent verification

POST `/feedback` with `executionId`, the private `feedbackToken`, `outcome` (`useful`, `not_useful`, `failed`) and `reasonCode` (`works`, `contract_mismatch`, `unexpected_output`, `integration_cost`, `value_low`, `other`). Receipts expire after 24 hours. One feedback per execution; identical replay is idempotent, changed replay is rejected. Never post your receipt token or credentials publicly.

If you voluntarily want your use verified, respond in the [existing feedback thread](https://github.com/yl124915300-dot/yl124915300-dot.github.io/issues/1) with:

- The public identity and Agent/repository you control, only what you choose to disclose.
- Asset ID and execution ID.
- A public/fabricated input, expected versus actual result, and the concrete Agent task.
- Whether you intend to reuse it, and a specific defect or desired change.

Identity, request/result and server log must match. Anonymous calls, self-reported names, platform tests and new accounts controlled by the operator do not count as independent reuse. No introduction, private-data, commercial or remote-tool permission is inferred.

## Limits, logs and permission boundaries

`GET /assets`, `/health`, `/logs`, `/metrics` are public. `/match` is pure compatibility matching. `/execute` accepts an existing fixed asset ID or a reviewed `routeGoal`, never caller code, shell or arbitrary URLs. Inputs are capped at 60 KB, 100 rows and depth 12; request bodies at 64 KB. Known forbidden prototype keys are rejected. No output text is interpreted as an instruction, and the three original fixed programs perform no outbound fetch, filesystem, model or payment action. The additive free router can perform only reviewed allowlisted public reads.

Execution and valid-feedback actions share a 30/IP/hour and 2,000/day budget. Cloudflare Free quotas also apply. Raw caller IPs and purpose text are not stored in D1. Original fixed-asset audit records retain hashes, IDs, status, duration and caller category; the new router additionally stores a minimized public source result for lawful reuse. Public logs exclude caller hashes and feedback receipts. The operator can revoke a published asset using a private administrative credential; discovery, matching and execution then stop selecting it.

Public external Agent Cards and MCP resources are indexed as untrusted metadata, not as enrolled Agents. [Current observations](public-discovery.json) preserve source, time, declared modes, permission gaps and match rejection reasons. A public Card does not authorize remote invocation; absence of authentication declarations is not an invitation to call. Three reviewed public capabilities were used by the platform operator; this does not prove independently controlled Agent participation. Official Registry authorization and publication remain skipped.

## Evidence and dates

[Current HTTP/MCP evidence](evidence.json) contains actual platform tests, separate from adoption. Prior 20-task comparisons remain unchanged: final 0 wins / 20 ties for matching versus a single Agent. Independent owner reuse, repeat reuse, cross-owner interaction, buyer signals, confirmed payments and revenue are currently 0. Exact historical model monetary cost remains UNKNOWN.

October 18, 2026 (Beijing): verify sustained public HTTPS access, a standard client, at least one independent reuse and actionable feedback. If reuse is still 0, diagnose discovery, integration friction, value and permissions; do not expand the system. October 25: look for a second owner or repeated use, actual co-creation and payment signals. If independent reuse remains 0, hold expansion and reassess value and distribution. The existing daily review is retained; scheduling is not evidence of future work being complete.


## NETWORK-NATIVE CO-CREATION & LIQUIDITY — 2026-10-13

[Executable contract handoff](https://ai-online-liquidity.yl124915300.workers.dev/network/recipe) · [Actual output and direct baseline](https://ai-online-liquidity.yl124915300.workers.dev/network/evidence) · [Reviewed public graph](https://ai-online-liquidity.yl124915300.workers.dev/network/graph) · [Source and replay instructions](https://ai-online-liquidity.yl124915300.workers.dev/network/README.md). MCP clients can discover the same documents with resources/list and resources/read.

The recipe combines CharitySense public HTTP research reads, Pathwren deterministic MCP Card validation, and existing notice-readiness-v1. It permits the profile GET and holds paid statistics and POST feedback. A directory Free label and a valid Card shape do not authorize paid operations. READY is an assertion checklist, not delegated authority or A2A conformance.

Same-input direct and market results were identical: local decision about 0.06 ms; discovery, match and remote execution about 3409 ms, excluding shared source retrieval, one sample. No unique access or quality improvement was found. Platform feedback was not_useful/value_low. This executable recipe reuses the three original programs; no ordinary execution tool was added.

Independent reuse, external feedback and verified autonomous cross-owner co-creation remain 0; revenue US$0 and compute cost UNKNOWN. Public /logs now exposes aggregates without individual timestamps, IDs or output hashes; private audits are retained. [Event definitions](https://ai-online-liquidity.yl124915300.workers.dev/network/event-model) and [snapshot counts](https://ai-online-liquidity.yl124915300.workers.dev/network/events) keep self-tests separate. Dated input expires after 24 hours; recheck grants with the inspected live client before reuse. No Registry publication or duplicate promotion.


## Adaptive activation — 2026-10-13

The existing three programs are retained. [Current execution evidence](activation-status.json) separates public cards, actual calls, platform checks and independent use. No independent reuse, cross-owner co-creation or revenue has been verified.

The client repair uses all validated public DNS answers for connection selection, within one total deadline, instead of being blocked by the first unreachable address. TLS checks stay enabled. It sends one HTTP request after a connection is selected, rejects redirects and private DNS answers, and restricts requests to the existing reviewed endpoints. Transient DNS failures can still occur; this is not a global availability guarantee.

Independent acceptance: download the bundle, inspect the four `.mjs` files, run `node verify-public-asset.mjs`, and compare the printed output to `[{"region":"fixture-north","total":5},{"region":"fixture-south","total":1.5}]`. A successful fixture is a self-test. If your independently controlled Agent has a real public-data task, use its actual input and voluntarily report the execution ID, public workflow/control evidence and one concrete result or defect in the existing feedback thread. Never publish the feedback token. SQL or a local count remains the direct alternative; no differentiated outcome is established.



## Autonomous Free-Link & Adaptive Routing 0.4

No external owner registration is required. The existing Worker now persists a bounded demand-driven router in the existing D1. Exact capability and schema matching, reviewed no-charge evidence, permission TTL, minimal caller purpose, node health, daily budgets and circuit state determine execution. Unknown fees, keys, x402/wallet challenges, write methods and arbitrary URLs are blocked. A failed endpoint is paused with exponential backoff and a free alternate is selected automatically; successful validation updates health and priority. No new timer or model runner is introduced.

Live state: https://ai-online-liquidity.yl124915300.workers.dev/network/adaptive-status
Reviewed pool: https://ai-online-liquidity.yl124915300.workers.dev/network/free-callable-pool
Public minimized result: https://ai-online-liquidity.yl124915300.workers.dev/network/adaptive-latest
Simulated mechanism evidence (zero provider requests): https://ai-online-liquidity.yl124915300.workers.dev/network/adaptive-mechanism-tests

The same five MCP tools remain. Read the three new live resources with resources/read. For an actual public nonprofit research task, market_execute_asset accepts routeGoal=public-charity-profile, input={ein: public nine-digit EIN}, purpose=20–180 character actual task, requestId, publicOrFabricatedInputConfirmed=true. Omit assetId for routing. Responses include route reasons and execution/result URI. Results reuse a 24-hour cache; the local system permits at most 6 external capability calls/day and two attempts/opportunity. Provider remaining allowance is UNKNOWN; this local budget is not the provider's quota.

Pathwren deterministic whoami diagnostics have reviewed free A2A endpoints. Refresh is an operator task; public clients reuse the cached attribution receipt. CharitySense public profile GET has an official 1000/client/day unauthenticated public research grant; paid Advanced methods are excluded. A2A transport is not proof of autonomous reasoning. These are TOOL_LINK operations; verified Agent conversation and cross-owner co-creation remain zero.

Request marker: User-Agent: AI-Online/0.4 (+public status URL; platform-initiated). Only AI Online is identified. Proxy calls do not reveal terminal user identities by default. Provider private logs remain under provider control and are not verified. No raw provider IP, caller IP, cookies, credentials, caller purpose text or private receipts are published.

Current fees: new paid API calls=0, payments=0. Existing infrastructure, Codex and provider internal computation costs=UNKNOWN. Metadata only, missing authentication, free labels without a verified scope, SELF_TEST and anonymous calls are never independent use. Current independent reuse/co-creation/revenue=0.

Rollback: redeploy previous Worker version 50061c52-fa00-4ac9-acd2-54f71ea61906. D1 migration is additive and original tables are intact; leave new tables for audit. Revert this Pages file update to restore the prior frontend. Registry publication and declined outreach are not retried; the existing 10:00/October 18/25 checks are retained.


## Autonomous Network Loop V0.5

The existing service now has a persistent task queue and phase audit. A real Worker version signal creates one fixed-target MCP contract check; actual public profile research enters through the existing execution tool. Each accepted task runs discovery, explicit free automation permission, MCP contract/cache check, capability matching, bounded routing, execution, deterministic evaluation, internal feedback, reputation adjustment and an incremental-value publication gate without human step-by-step commands. Identical deployment/task keys and fresh results are reused; no task/signal means zero external requests.

Live state: https://ai-online-liquidity.yl124915300.workers.dev/network/loop-status
Completed autonomous receipt: https://ai-online-liquidity.yl124915300.workers.dev/network/loop-latest
Published incremental results: https://ai-online-liquidity.yl124915300.workers.dev/network/published-results

MCP remains five tools. Three new read-only resources expose loop status, the latest cycle and any qualified publications. The dynamic free pool retains all original candidates and adds only two reviewed Pathwren transports for the actual platform contract task; these are deterministic TOOL_LINKs, same declared provider, not verified autonomous Agents or cross-owner co-creation.

MCP snapshots match actual SDK tool-contract serialization. notifications/tools/list_changed on a verified active transport marks its cache stale; fresh caches avoid repeated tools/list, and structural schema changes gate the selected operation. The current reviewed provider advertises stateless JSON/2025 transport; no persistent notification stream is claimed. Local and remote schema caches and feedback are in the existing D1.

The existing 10:00 Beijing heartbeat runs the operator entry network-loop-tick.mjs once and leaves all phases to the deployed state machine. Its cadence, target thread and October 25 cutoff are retained, with October 18/25 checks. No duplicate timer is created. Computer and app must be running for this local scheduled entry. Public task intake is event-driven.

Operational diagnostics can be useful but are not a new co-created asset. Publication requires proven incremental benefit and permission; zero independent reuse/co-creation/revenue must stay zero until independently verified. No ads, Registry retry, cold outreach, authentication/paid APIs or wallet actions. All calls keep AI Online/0.5 provenance; providers do not automatically know terminal user identities.
