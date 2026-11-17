# Policy Radar UK — Operations (source of truth)

Last updated: 2026-11-17 (UTC). This file documents what actually ran, not forecasts.

## Existing project (DO NOT REBUILD)

- Public site: https://yl124915300-dot.github.io/policy-radar/
- Repository: https://github.com/yl124915300-dot/yl124915300-dot.github.io
- Root: `policy-radar/`; do not modify `match-os/` or unrelated projects.
- Static GitHub Pages frontend; GitHub Actions uses Python scripts to monitor public official sources. Independent of UK government.
- Personal on-device planner: https://yl124915300-dot.github.io/policy-radar/my-radar.html
- Local emergency support finder: https://yl124915300-dot.github.io/policy-radar/local-support.html
- Individual policy guides: `warm-home-discount-2026-27.html`, `ofgem-price-cap-2027.html`.
- Approved news RSS: https://yl124915300-dot.github.io/policy-radar/updates.xml
- Public calendar: https://yl124915300-dot.github.io/policy-radar/calendar.ics
- Publication sitemap: https://yl124915300-dot.github.io/policy-radar/sitemap.xml

## Verified production facts

1. Source monitor: `monitor.py`, `discover.py`, `build_feeds.py` via `.github/workflows/policy-radar-official-sources.yml`. Most recent confirmed successful run:
   https://github.com/yl124915300-dot/yl124915300-dot.github.io/actions/runs/44067621359
2. Last recorded source snapshot, as checked in this session: `2026-11-17T10:44:42Z`. Nine of nine automated official source fetches succeeded; zero failures; zero pending *content-fingerprint* changes. This is NOT proof no real policy has changed.
3. Automated new-notice search: `data/discovery_queue.json` has three official candidate records: one manually approved news notice, two still requiring review. Search hits are not automatically public policy advice.
4. `data/approved_events.json` has three manually reviewed public entries. `updates.xml` has three RSS items; `calendar.ics` has two future public milestones (the past government news notice is intentionally excluded from calendar).
5. UK resident postcode lookup M1 1AE correctly returned Manchester in an isolated real-browser test. Postcode query goes directly from the browser to Postcodes.io and is not collected by the GitHub Pages site.
6. `my-radar.html`: on-device profile saved/restored after reload, England/Scotland nation filtering, optional user-entered childcare reminder and iCalendar generation verified in a live-browser test. Not a server-side account or background push.
7. `my-radar.html`: local reviewed-notice baseline can be started, survives reload, shows no differences, flags a simulated newly added *approved* entry when a prior baseline is edited in local test storage, and clears. Test did not fabricate a public government change or generate a real customer.
8. Public home, My Radar, local support, policy guides, RSS and calendar endpoints were verified as publicly accessible with HTTP 200. `IndexNow` verification file within `policy-radar/` was verified HTTP 200 and POST to `api.indexnow.org/indexnow` returned **HTTP 202** for five public policy pages. This means the submission was received and key verification is pending; it does NOT mean indexing, ranking or visitors.
9. Privacy-safe GitHub issue forms now exist at `.github/ISSUE_TEMPLATE/policy-radar-request.yml` and `policy-radar-correction.yml`; the linked public GitHub issue form requires GitHub sign-in and is *not* an accountless public resident form. No personal information should be posted publicly.
10. Automated source watch handles the Birmingham, Leeds and Bristol council pages; Manchester official page returns 403 to the scheduled bot and is a **manual-review-only** council. Birmingham application availability has conflicting dated public notices and is marked as unresolved. `data/local_programmes.json` stores coverage and uncertainty explicitly.

## Current metrics (do not report test traffic as real acquisition)

| Metric | Verified as of 17 Nov 2026 |
| --- | --- |
| Official data sources on daily fetch | 9 |
| Approved RSS public updates | 3 |
| Approved calendar milestones | 2 |
| Source-discovery candidates still awaiting review | 2 |
| Local council support links | 4 (3 automatically watched, Manchester manually) |
| UK resident email subscribers | **Unmeasurable / email backend absent** |
| Count of external RSS subscribers | **Unmeasurable** |
| Real independently attributable site visitors | **Unknown / no analytics** |
| Public resident feedback requests via new GitHub forms | **0 verified** |
| Paid users, orders | 0 verified |
| Net receipts | GBP 0 |

## Critical constraints and safeguards

- No official affiliation, no benefits eligibility decisions, no claim handling, no charging for government applications.
- Publicly retrieved policy texts and content hashes are machine change leads only. A human verifies effective dates, geographic applicability, and official evidence before changing `data/approved_events.json`; machine changes never auto-publish benefits promises.
- Current accountless site lacks a secure email subscriber database, double opt-in, mailing compliance logs, unsubscribe handler or private payments. Never present localStorage or GitHub issues as an email subscription. Never silently add third-party tracking code.
- GOV.UK and local schemes are free and have competing free tools, including Turn2us. The site must deliver reliable context and actionable government links, not block public rights behind a fee.
- Links, copy, dates and cash figures can become stale. The personal planner warns if automated source health is older than 48 hours. Official government pages remain authoritative.
- IndexNow submissions only cover the `policy-radar/` path and do not imply SEO ranking. Do not spam the endpoint with unchanged URLs.

## Next meaningful commercial validation

1. **Actual consented adoption**, not site rendering: secure accountless subscriptions and anonymous aggregated analytics need a real backend/provider and privacy notice. No connected first-party backend has been verified for those capabilities yet; do not invent visitor/subscriber counts.
2. Publish evidence-based corrections after reviewing the two remaining official candidate notices; avoid empty news spam.
3. Check Bing indexing results and real search impressions when an authorised Webmaster/Search Console connection is available. `IndexNow HTTP 202` is only request receipt.
4. Measure genuine outside inquiries or use of the public feedback forms, clearly separating the owner's QA from unaffiliated user actions.
5. Only after repeat use and explicit demand, evaluate a transparent opt-in paid data service; public benefits and official applications remain free.

## Recent failures and fixes

- First iCalendar generator accidentally dropped short lines; fixed line-folding and added structural tests in `build_feeds.py`.
- GOV.UK Search API produced unrelated matches; relevance-first sorting, exact topic terms and exclusion of estimated statistics schedules reduced noise. A current zero-candidate run is not proof the government published nothing.
- A prior Actions job failed due to concurrent writes to the shared `main` branch. The job now regenerates source data after fetching latest `origin/main`, never force-pushes. Last successful post-fix run is linked above.
- Some local council URLs block bots, as with Manchester. Do not bypass access controls or describe that council as automatically monitored.
