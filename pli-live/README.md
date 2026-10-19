# PLI_AUTONOMOUS_REAL_EVENT_LOOP_V1

An actual public-source, rule-driven loop for six SYNTHETIC people. No external executor, no paid service, no model inference, no money movement. LLM_NOT_AUTONOMOUS. Autonomous real affairs remain NO_GO; complete semantic accuracy UNKNOWN; independent semantic reviewers 0.

The implementation is isolated on pli-autonomous-real-loop-20261019. Only the new pli-live directory and its new workflow are added to main for the specifically authorized public deployment and automatic trigger. No PR is merged. Old file blobs are checked unchanged. Pages is static hosting; Actions is batch compute.

## Loop
1. Fetch real NWS active alerts for CA/WA/NY/FL/IL and USGS last-day earthquake feed, using HTTPS host allowlists, HTTP Date/cache freshness and USGS generated time. Capture response hashes, URLs and UTC fetch timestamps. Fetch all six NWS point mappings independently every run.
2. Match official polygons (including holes), or fresh official point zones / exact explicitly listed county UGC. SAME county-intersects-zone codes never substitute for exact zone coverage. USGS uses distance <=80 km, magnitude >=4.5 and a two-hour observation window, without treating earthquakes as forecasts.
3. Predefined rules create only zero-cost, five-minute official-source review candidates. Unknown beach/marine exposure yields a scope-confirmation proposal, never a claim of land/shop impact. The Chicago profile has zero spare minutes and must be held. No invented transport, prices or services.
4. Guard identity, read-only permission, zero cost, time budget, provenance and validity. Every synthetic person retains a separate event/role key.
5. Restore full JSON state from main across independent jobs/runs, append changes with monotonic sequence, and write versioned state plus immutable per-run history. Repeated observations refresh evidence leases without duplicate proposals/transitions.
6. Matching CAP Update/Cancel references with the same sender supersede/cancel earlier proposals; old canceled IDs cannot revive. Missing active-feed entries suspend with risk UNKNOWN. Expiry withdraws the proposal, not the hazard. Source failure suspends affected proposals.
7. Publish only pli-live paths with a non-forced fast-forward, request the existing Pages rebuild, verify build status and byte equality, then test anonymous desktop/mobile Chromium. Runtime two-hour/alert validity checks hide all stale proposals. New evidence is visible on the next refresh.

A post-freeze national active-feed probe automatically selects the first valid CAP ID not in the V1.1 baseline or prior loop state. Its raw alert and real matching results are recorded; it may correctly match none of the six people. It is never added to synthetic fixtures. If none is available the receipt says NOT_OBSERVED. This is new-event engineering validation, not a semantic benchmark.

## Trigger and receipts
The new default-branch workflow has schedule, workflow_dispatch and a path-restricted bootstrap push. Bootstrap requests first workflow_dispatch; after its separate restore and anonymous acceptance jobs, it requests second workflow_dispatch. There is no dispatch recursion after second. The two dispatches are NOT schedule. No user-supplied event or story is needed on either run.

Future cron runs use the same frozen implementation and restore main state. GitHub may delay or drop schedules; only actual event=schedule receipts count. The old V1.1 cron is unchanged. No always-on or realtime claim is made.

- Public UI: https://yl124915300-dot.github.io/pli-live/
- data.json: freshness, rules, proposals, sources, scheduler audit and real run receipts.
- state.json: full persistent event/proposal/journal/run state.
- history/RUN_ID.json: before/after hashes, real evidence and decisions.
- evidence/raw/RUN_ID-nws.json and -usgs.json: actual source bodies.
- restoration/RUN_ID.json: independent Actions job readback.
- acceptance/RUN_ID.json: actual Pages build, deployed hashes and anonymous browser results.
- evidence/tests.json: 24 named adversarial checks and explicitly SYNTHETIC lifecycle frames. These never count as real observed CAP change/cancel or as independent semantic review.
- Screenshots are retained as Git blobs with hash references in acceptance/. No Actions artifact uploads or caches.

## Boundaries
Real CAP updates/cancels are OBSERVED only if source-linked journal entries show them; otherwise NOT_OBSERVED. Synthetic lifecycle tests are separate. A successful software loop does not establish open-ended autonomous understanding, real-world action safety, verified payment, commercial adoption or income.

True transactions 0; net receipts US$0; first verified positive net receipt KPI NOT_MET.

Primary semantics:
- https://www.weather.gov/documentation/services-web-api
- https://www.weather.gov/media/documentation/docs/NWS_Geolocation.pdf
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
