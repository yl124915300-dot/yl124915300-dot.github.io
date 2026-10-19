# PLI V1.1: public read-only event decisions

Public UI (deployment must be confirmed by Pages receipt and anonymous browser test):
https://yl124915300-dot.github.io/pli-v11/

This is a **rule engine**, not a general autonomous LLM Agent. All six life profiles, goals, positions, time and budgets are **SYNTHETIC**. Events may be marked **REAL_PUBLIC** only after the fixed official HTTPS adapters fetch them. No purchase/order/payment/submission/messaging executor or public mutation API exists. Real payments and net income: **0**.

## Verification of the V1.0 delivery

Read-only audit on 2026-10-19:
- PR #6 is open/draft/unmerged, head dfbd4216e02c1419761d96e98002b28ff1070d5f.
- Actions run 39203050024 completed successfully in two independent Ubuntu cloud jobs.
- First job ran implementation b253cd0819f0f65a604d75f7127f4818c1ad2f02: 23 checks, accepted 210 USGS earthquakes (211 features; one non-earthquake/unsupported feature skipped) and 17 NWS alerts.
- Second job checked out checkpoint commit 220cc720be40ae02d7baa157b05b5c19edb9156a and passed 10 checks. The final dfbd421 commit records the second report; it was not the original run's source SHA.
- 33/33 describes those assertions (23+10), including synthetic novel events, denied external actions and checkpoint reconstruction. It does not establish general intelligence, hazard accuracy, browser rendering, public deployment, actual users, payment or revenue.
- V1.0 has no authentication. The Origin check does not replace authentication; its fixed HTTP origin also needs adaptation behind HTTPS forwarding. V1.1 therefore exposes static read-only files, not that Python HTTP server.
- The old raw-feature provenance and hashes support the historical read claim; they do not prove the feed is still current today. V1.1 performs new fetches.

Historical evidence:
https://github.com/yl124915300-dot/yl124915300-dot.github.io/actions/runs/39203050024
https://github.com/yl124915300-dot/yl124915300-dot.github.io/pull/6

## Zero-budget implementation choice

| Option | Current verified capability | Decision |
| --- | --- | --- |
| Existing GitHub Pages + standard public-repository Actions + versioned JSON | Existing main/root Pages deployment was verified from logs; cloud inspect checks live config before publishing. Standard public runners are free. | Selected; only pli-v11/ and dedicated new workflows are added. Existing project content/settings are not changed. |
| Cloudflare Workers Free + D1 Free | Documented free tiers exist. Current connected-tool/plugin discovery returned no Cloudflare connection. Existing account resources, plan and deployment permission could not be inspected. | Not provisioned; no credentials requested, no paid plan activated. |

Pages serves static HTML/CSS/JS/JSON. **It does not run Python. Actions is a periodic batch runner, not an always-on server.**

A dedicated default-branch workflow attempts a refresh at minute 23 of each hour (UTC), writes only its own data/state paths with a normal fast-forward push, then explicitly requests the existing Pages build. A GITHUB_TOKEN push alone does not auto-build Pages. It never changes the Pages publishing source, default branch or another project's files. If a concurrent commit wins, the push fails safely; no force push/rebase is used by the scheduler.

Schedules can be delayed/dropped and public-repo schedules can be disabled after 60 days without repository activity. There is no real-time SLA or long-term availability guarantee. The UI dynamically labels a snapshot older than two hours as stale and suppresses effective proposals; fetching failures are visible. Opening/reloading the page reads the saved snapshot and does not run the agent.

## Rules and new gates

- NWS: only status Actual and Alert/Update/Cancel are accepted; test/exercise/draft messages are skipped. For a provided Polygon/MultiPolygon, the point must lie inside the polygon and outside holes. Polygon scope takes priority over broad county codes. Boundary points of an exterior ring are included; hole boundaries excluded. Invalid/unsupported geometries fail closed.
- If NWS geometry is null: use exact county UGC, or the profile's official NWS /points response joined to affectedZones. Point mappings are cached for at most seven days; stale mappings are not used. No title/place-name substring guesses.
- The six profiles do not establish beach/marine activity. Rip-current, high-surf and marine/gale alerts cannot trigger solely because a forecast zone matches; absent relevant exposure they yield NO_MATCH.
- Earthquakes: finite and range-checked coordinates/magnitude, correct spherical distance across the dateline, magnitude >=4.5 and magnitude-dependent 25–250 km **review radius**. Depth is shown in the basis. This is a demonstration rule, not an intensity/hazard model.
- Both sources: valid UTC/timezone-aware intervals; future timestamp checks; actual HTTP 200 from the expected HTTPS host; bounded body; HTTP response Date no older than two hours. USGS collection generation time must also be current within two hours. Event-level raw features and their SHA256, batch-response hashes and observation times are retained.
- Failed/degraded/stale sources cannot produce active proposals. Missing NWS items are not assumed cancelled. CAP references supersede earlier identifiers; cancellation/expiry/source failure can revoke existing proposals.
- Zero events is a valid read result, not demand or successful assistance. No matching event is a valid NO_MATCH decision. No fixture fills in a missing live opportunity.
- A matching profile with >=5 spare minutes is asked to check official advice; otherwise it gets a schedule-conflict flag. Every result is unexecuted and requires human review.

## State and evidence

state/memory.json is bounded public/synthetic memory, restored from Git in a new process/job. Events remain at most 48 hours after expiry; proposal/revocation history at most 7 days/400 rows (UI 80). Git commits retain prior public versions; this is not an unbounded application database and no private input is accepted. A 12 MB output guard stops writes instead of corrupting prior memory.

data.json is the public snapshot with generated_at, source attempts/success times, snapshot age policy, rule basis, run URL and memory SHA256.
state/refresh.json is actual source health/count/hash evidence.
evidence/tests.json is explicitly TEST_FIXTURE_ONLY; it proves deterministic logic, not live collection.
evidence/browser.json and screenshots are created by a cloud headless browser against a cloud static server. Browser staleness tests intercept only that browser's response and never replace live files.
The independent cloud job verifies memory/snapshot digests and provenance from a fresh checkout.
The dedicated public browser workflow separately verifies the deployed HTTPS URL without credentials/cookies, checks the actual app checksum and records evidence/public-http.json, evidence/public-browser.json and screenshots.

Development and tests run only in authorized GitHub cloud jobs. Nothing needs to run on the owner's Mac. No extra Actions artifact/cache storage is requested.

## Official references

- GitHub public standard-runner billing: https://docs.github.com/en/billing/concepts/product-billing/github-actions
- Static Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages
- Actions schedule limitations: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
- Token-triggered build limitation: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- Pages build API: https://docs.github.com/en/rest/pages/pages#request-a-github-pages-build
- NWS API: https://www.weather.gov/documentation/services-web-api
- USGS GeoJSON: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
- Workers Free: https://developers.cloudflare.com/workers/platform/pricing/
- D1 Free: https://developers.cloudflare.com/d1/platform/pricing/
