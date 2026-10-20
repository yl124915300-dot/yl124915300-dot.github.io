# Personal Life Intelligence V1.0

Runnable rule-driven central agent, Python HTTP UI, SQLite memory, six explicitly SYNTHETIC life states and two live public event adapters. Standard library only. No API key, paid model or transaction account.

This independent project lives under `pli-v1/` on branch `pli-v1-20261019` in the owner's multi-project publishing repository. Original projects are not dependencies and their source is unchanged.

## Startable delivery

Run in an authorized **cloud Linux/Python environment**, not on the owner's Mac:

```sh
git clone --depth 1 --branch pli-v1-20261019 https://github.com/yl124915300-dot/yl124915300-dot.github.io.git
cd yl124915300-dot.github.io/pli-v1
python3 agent.py serve --db /path/to/persistent-volume/pli.sqlite --restore state/checkpoint.json
```

Use the environment's private authenticated port forwarding for port 8080, then open its resulting URL. No host or forwarding service is provisioned. The server binds to loopback. After the initial restore, restart with the same DB path **without `--restore`** to keep newer changes. Explicit restore replaces that DB's state.

There is no permanent hosted app URL and no claim of a ChatGPT Work deployment. GitHub Actions runs the real agent and HTTP tests on free standard public-repository runners. The same process serves the UI and polls sources every 15 minutes while running. This is executable delivery and verified cloud execution, not an always-on hosting service.

## Behavior and evidence

- Persist profiles, event versions, sources, decisions, revocations and permission denials in SQLite.
- Read NWS alerts for CA, WA, NY, FL, IL and USGS daily earthquake GeoJSON over HTTPS.
- Save raw public features, official links, fetch times and SHA256 response digests.
- Match geography/exposure, propose based on resources/goals, and reconcile changed/cancelled/expired events.
- NWS CAP updates revoke referenced stored versions. A missing alert is not assumed cancelled.
- Source errors are FAIL; synthetic data never substitutes for a real fetch.
- All external payment, submission, booking and messaging attempts are denied and audited. Caller-supplied approved flags cannot grant authority. No external executor exists.

All profiles, budgets, goals and constraints are **SYNTHETIC**. Public events are **REAL_PUBLIC**. Manual input is forcibly SYNTHETIC and cannot replace official IDs. No actual transactions, demand, savings or income are inferred from this demo. Real transactions and income: 0.

## Explicit auditable rules

- R0: cancelled, expired and not-yet-effective events cannot produce proposals.
- R1: weather county UGC match, relevant exposure and Moderate/Severe/Extreme severity.
- R2: quake magnitude >=4.5 and within a magnitude-dependent 25–250 km review radius.
- R3: >=5 spare minutes proposes checking official advice; otherwise flags schedule conflict. Cost 0, constrained by synthetic resources/goals.

These are demonstration review policies, not scientific hazard models. New structured weather/quake events are handled without predefined titles/IDs/answers. Unknown domains are explicitly rejected. No LLM or general natural-language understanding is claimed.

## Actual cloud verification

Workflow: `.github/workflows/pli-v1.yml`.

First cloud job: HTTP UI, two live feed reads, never-seen random event, proposal, revocation, deduplication, spoof rejection, permission denials, process restart and resource constraints. Commits portable public/synthetic memory and generated evidence.

Second cloud job: independent checkout and fresh SQLite DB; checks checkpoint SHA256, restores every profile/event/action/audit/source, then handles another new event, revocation and permission denial.

`state/phase1.json` and `state/phase2.json` contain actual generated PASS/FAIL results. `state/checkpoint.json` contains synthetic/public memory. Final PASS is valid only if both jobs succeed. Logs and step summaries are retained by GitHub. No artifact or cache is uploaded.

Repeat with GitHub Actions **Re-run all jobs** on the implementation run, or push source changes to this branch. The workflow uses only a standard Ubuntu runner. No paid resource, artifact storage, cache, LLM API or hosting service.

## HTTP interface

- GET /health
- GET / — UI
- GET /api/state — state and audit; reconciles expiry
- POST /api/refresh with {} — read both official sources
- POST /api/events — structured synthetic event
- POST /api/actions/attempt — always HTTP 403; audited, no execution

The UI creates a current-time synthetic event template. For a matching weather example use severity Severe and county WAC033. Cancel the same event with a later updated_at to revoke its action.

## Limits and next engineering step

- No permanent interactive URL or always-on executor has been provisioned. Static GitHub Pages cannot run Python/SQLite.
- County UGC matching is conservative; forecast-zone-only weather alerts can be missed. Full zone/geometry mapping remains.
- Source outages are explicit. Stored events remain governed by expiry and CAP references.
- SQLite needs a persistent runtime volume. Cross-job recovery uses the committed checkpoint. Interactive changes are not automatically pushed to GitHub; export a fresh checkpoint before replacing the runtime:
  `python3 agent.py checkpoint --db /path/to/persistent-volume/pli.sqlite --checkpoint state/checkpoint.json`
- HTTP tests do not claim a browser visual review or domain safety validation. Proposals require human review against the official source.
- There is no built-in authentication. Keep this synthetic prototype in private authenticated cloud forwarding; do not expose mutation endpoints publicly.

Official documentation:
- https://www.weather.gov/documentation/services-web-api
- https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
