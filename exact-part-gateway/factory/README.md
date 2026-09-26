# Part Intelligence Factory

Evidence-gated, repeatable publication into the existing `exact-part-gateway/` GitHub Pages subtree. The factory adds only `page_*` tables to the supplied SQLite database; use the existing Transaction OS database, not another business ledger. Python 3 standard library only; no package installation is needed.

## Run

Replace the paths and public base URL below with the existing authorized project values. The base URL must end in `/exact-part-gateway/`. Site root is the existing GitHub Pages checkout that already contains `exact-part-gateway/assets/intelligence.css`.

```sh
python3 factory.py --db /absolute/path/to/transaction-os.sqlite run \
  --input /absolute/path/to/reviewed-candidates.json \
  --site-root /absolute/path/to/existing-pages-checkout \
  --base-url https://yl124915300-dot.github.io/exact-part-gateway/ \
  --report-dir /absolute/path/to/reports
```

This ingests reviewed evidence, evaluates every candidate, generates only qualified new pages, retains previously factory-published pages, merges both sitemaps without removing original URLs, creates an IndexNow changed-URL manifest and runs structural checks. It does not deploy, submit IndexNow or claim Search Console processing. Those actions need the existing authorized routes and their own response evidence.

```sh
# After the existing deployment completes, independently verify the public bytes.
python3 factory.py --db /absolute/path/to/transaction-os.sqlite verify-deployed

# Re-evaluate freshness, downgrade stale/invalid offers, regenerate, and audit.
python3 factory.py --db /absolute/path/to/transaction-os.sqlite refresh \
  --site-root /absolute/path/to/existing-pages-checkout \
  --base-url https://yl124915300-dot.github.io/exact-part-gateway/ \
  --report-dir /absolute/path/to/reports --probe

# Read current metrics; no re-publication or artificial zeroes.
python3 factory.py --db /absolute/path/to/transaction-os.sqlite metrics

# Record a measurement only from its actual reporting source.
python3 factory.py --db /absolute/path/to/transaction-os.sqlite measurement \
  SEARCH_CLICKS null --source-url https://search.google.com/search-console \
  --verified-at 2026-09-27T00:00:00Z --note 'Report unavailable; unknown, not zero'

python3 -m unittest discover -s . -p 'test_*.py' -v
```

Do not use `--now` during production runs: it exists for explicit historical replay and tests. Do not advance evidence timestamps merely because a run or HTTP request succeeded.

## Reviewed input contract

Top-level object: `{"candidates": [...]}`. Candidate records may be incomplete: rejection reasons remain in the database and report, and incomplete new candidates never create public pages.

Candidate fields:

| Field | Required meaning |
|---|---|
| `brand`, `mpn`, `category`, `identity_summary` | Exact manufacturer identity and useful part-specific context |
| `vertical` | One of `Industrial Automation/MRO`, `Heavy Equipment/Crane`, `Commercial Vehicle/OEM replacement`, `Legacy IT/Networking` |
| `page_path` | Existing relative `brand/part/` path, if already published; cannot change on later ingestion |
| `series` | Optional real manufacturer series; hubs require at least three qualified members |
| `ebay_market_exists` | Defaults true; false needs a documented `ebay_absence_note` |
| `listings` | At least two distinct fully supported current buyable offers |
| `references` | At least one non-eBay cross-reference supporting the exact identity |
| `model_checks` | Array of `{text, source_urls}`; specific checks supported by this candidate's current sources |
| `review` | `{approved: true, reviewed_at, reviewer, incremental_value}` recording the editorial judgement that the page adds real value |
| `tracked_search_url` | Optional existing tracked fallback to preserve; campaign and unique attribution ownership are validated |

Each listing:

| Field | Meaning |
|---|---|
| `listing_id`, `source_url` | Identity and direct offer URL; eBay must be an exact `/itm/` URL |
| `marketplace` | `ebay` or `supplier` |
| `verified_at` | ISO 8601 timestamp with timezone when the commercial facts were verified |
| `source_crawled_at` | If the source is cached and its crawl time is known, preserve it. Older than 24 hours fails freshness even when reviewed recently. Never relabel old snippets as current evidence. |
| `exact_mpn`, `identity_verified` | Complete exact code, with `identity_verified: true`; punctuation normalization does not waive suffix differences |
| `price`, `currency` | Positive finite public price and three-letter uppercase currency |
| `condition`, `seller` | Observed condition and source identity |
| `availability` | `BUY_NOW`, `IN_STOCK`, `OUT_OF_STOCK`, `ENDED`, or `UNKNOWN`; only the first two are buyable |
| `shipping_note` | Verified scope/restriction, or explicitly unknown scope |
| `returns_note` / `warranty_note` | At least one actual verified term; `Unknown` alone does not pass |
| `verification_method` | `browser_rendered`, `official_api`, or `web_source` |
| `evidence_note` | What the source actually establishes, including conflicts/limitations |
| `tracked_url` | Optional mapped existing EPN item URL, preserved if campaign and target match |

Each reference: `{source_url, verified_at, source_identity, exact_mpn, identity_note}`. Preserve `source_crawled_at` where available. A family manual can support a check, but its `identity_note` must say when it establishes only family features rather than certifying the particular unit. References and checks require human/source review; the script cannot invent model-specific facts or judge semantic usefulness from arbitrary text.

All timestamps retain timezones. All evidence versions remain in `page_evidence`; the candidate payload identifies current selected evidence. Raw source snapshots, screenshots, export files or tool retrieval references can also be included in `evidence_note` or additional JSON fields; unrecognized fields are preserved in the payload.

## Qualification, refresh and publication semantics

- At least two distinct current buyable listings, current price/condition/seller, shipping note and a verified return or warranty term are mandatory. One qualifying listing is `WATCHLIST`, never qualified.
- A current eBay item is mandatory when its market exists. Every generated page receives an audited EPN exact-item link or tracked search fallback using campaign `5339214603`, including `mkevt=1`. Existing item and search mappings are preserved. New IDs are `cpr_<normalized_mpn>` with a hash only when needed to prevent collisions.
- Evidence older than 24 hours becomes `STALE`. A successful HTTP response proves reachability only; it never advances `verified_at` or reconfirms price, stock or returns. HTTP 403, bot checks and errors are inconclusive. HTTP 404/410 invalidate the link.
- An invalid or stale eBay offer loses its buy CTA and falls back to the page's tracked exact-MPN search. The ordinary untracked search remains available. Both are labeled; eBay links carry `rel="sponsored nofollow"`.
- Two distinct all-unbuyable observations produce `NO_LIVE_SUPPLY`. Repeating qualification against the same observation does not manufacture a second observation. Previously generated pages remain at their original URLs.
- `QUALIFIED_PAGES_BUILT` means local artifacts. `QUALIFIED_PAGES_LIVE` and `EPN_TRACKED_PAGES` require a public HTTP 200 whose response hash matches the current generated page. `page_deployment_checks` preserves the check evidence. `page_publications.built_at` is explicitly a build time.
- `SEARCH_IMPRESSIONS`, `SEARCH_CLICKS`, `EPN_CLICKS`, `ATTRIBUTED_PURCHASES`, `COMMISSION_PENDING`, `COMMISSION_PAID` and indexing remain `null`/`UNKNOWN` unless a measurement with source URL and verification time is ingested. A local click, link, submission or successful HTTP response never proves a purchase or commission.
- `refresh` is expansion-frozen: it only updates already factory-published part pages, even if new qualified candidates were ingested elsewhere. Use this command throughout the 14-day observation window.
- The factory does not broaden the candidate pool. The sprint owner controls the existing pool plus the maximum additional 200 exact MPNs, records actual eliminations, and applies `QUALIFIED_SUPPLY_DENSITY_LIMIT` when the bounded scan cannot produce 100 pages.

## Outputs and review

- `page-qualification.json`: each candidate's status, failed gates and listing-level reasons.
- `dashboard-metrics.json`: honest built/live/freshness and commercial metrics.
- `indexnow-delta.json`: only newly generated or content-changed URLs, `submitted: false` until separately submitted. Repeating a run without substantive evidence/status/metric changes produces an empty delta. Every previous nonempty manifest is archived under `indexnow-history/` before replacement, so the post-deployment dashboard update cannot erase the original submission batch.
- `manual-audit-sample.json`: deterministic random sample of ten qualified pages, or all available pages when fewer than ten exist; remains `PENDING_MANUAL_REVIEW`. An automated structural pass is not a completed manual audit.
- Additive existing catalog updates preserve every original row and all marketplace listing values and timestamps. The Gateway homepage counts all existing part pages, links the qualified index and real series hubs, and receives only missing qualified cards. Root project pages are not changed.
- Existing site `factory/` index/dashboard, `factory-metrics.json`, qualified part pages, qualifying series hubs, and safely merged subtree/root sitemaps.

The 22 unit checks use synthetic fixtures exclusively in temporary directories. They cover strict offer facts, code mismatch, duplicate URLs, editorial support, fresh-vs-cached evidence, stale fallbacks, repeated no-supply observations, immutable evidence, attribution ownership, public deployment checks, unchanged IndexNow deltas, root sitemap preservation and isolation from existing business tables.
