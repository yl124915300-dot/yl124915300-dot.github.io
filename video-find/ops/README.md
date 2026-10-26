# FrameFind five-stage event collector (deployment not active)

This folder contains a Cloudflare Worker plus a small D1 schema and tests for the **existing FrameFind website**. It is a deploy-ready feature, not a separately marketed product. A verified Cloudflare Worker and D1 binding have **not** been connected to the public site; the frontend event transport currently stays disabled.

## Stage definitions

| Event | Actual trigger | Counted once per ephemeral UTC-day browser session |
| --- | --- | --- |
| `visit` | FrameFind homepage or finder loads | First visit per tab-session |
| `video_submitted` | Valid public HTTPS video URL, local clip, screenshot, or authorized tab shared | Source type only; no video URL |
| `item_selected` | Shopper drags an item box or actively clicks a detection chip | Deliberate selection only; not auto-detected default |
| `product_search` | Valid product query displays merchant search links | No user query, brand or SKU sent |
| `merchant_outbound` | Shopper activates a retailer search link after a search | Merchant name only; not a verified transaction |

Each real browser session generates a random ephemeral ID (not a login identity). The Worker hashes it with an owner-held daily salt and stores only the session hash and stages; it never reads IP, account details, full URL, search phrase, image, email, payment information or video bytes. Duplicates per stage/session/day are ignored. Browser automation, demos, localhost, DNT and Global Privacy Control never send to production. Sources such as `user_share` and `search` are estimates from whitelisted UTM/referrer categories and can be spoofed; do not mistake counts for verified independent people or successful orders.

**Data retention:** daily purge older than 30 days needs its own bounded scheduled cleanup. A public `/health` route reports only a configuration boolean. Aggregated `/stats` is private behind a secret bearer token; don't expose that token in Github or website JavaScript.

## Deployment requirements (not yet completed)

1. Use a verified existing Cloudflare account and either an already authorized D1 database or one explicitly approved by the operator. Verify no new billable resources. Apply `schema.sql` to the chosen D1 database.
2. Deploy `collector.mjs` to an operator-owned HTTPS `*.workers.dev` Worker route; bind the D1 database as `DB`. Add **non-public** `HMAC_SALT` and `ADMIN_TOKEN` secrets using Cloudflare's standard secret storage. Set allowed site origin only to `https://yl124915300-dot.github.io`.
3. Prove `GET /health` reports `live:true`, successful sample `POST /collect` with origin, row deduplication and 401 for unauthenticated `GET /stats`. Do not count the sample as a customer; delete its data afterward.
4. Only after verification, put the exact owned endpoint in `<meta name="framefind-event-endpoint" content="https://ACTUAL_OWNER_WORKER.workers.dev/collect">` **on both homepage and finder**, then verify browser real network delivery, retention, abuse protection, opt-out, and readback.
5. Aggregate across sources after first independent visits; count merchant link click only as an outgoing search, not a purchase or commission. Merchant settlements must be verified separately.

**Current blocker:** This connected GitHub session can edit and test the static site and workflow, but cannot access the operator's Cloudflare Worker/D1 or secrets. No collector URL was guessed or published. This repository-only code is not proof that server telemetry, real visitors or cash conversion is active.
