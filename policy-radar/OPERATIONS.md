# Policy Radar UK — Operations (source of truth)

## 2026-11-17 — critical interpretation correction: GSC window predates launch

- The **first Policy Radar homepage commit** was `ee252202fa9f3984abd81013f4a771596e8dd6a5`, created at **2026-11-17T09:34:35Z** (verified from GitHub commit metadata; it added `policy-radar/index.html`). The site cannot generate Google search impressions for this new path before it existed.
- The verified Google Search Console daily report for page path `/policy-radar/` only covers **2026-09-25 through 2026-11-15**. Therefore its **0 clicks / 0 impressions are pre-launch baseline**, not a meaningful test of market demand, SEO effectiveness, or user acquisition after launch.
- The provisional 24-hour data for Nov 16–17 also showed zero, but the site was launched partway through Nov 17 and indexing/metrics can be delayed. This is an *early preliminary observation* and must not be treated as an adequate post-launch acquisition sample.
- Recheck using a window **starting no earlier than 2026-11-17** once Search Console has processed post-launch dates. Log the exact fully covered date range, query/page filters, impressions, clicks and any indexing evidence. Separate index discovery from ranking and visitors. A subsequent stable comparison (e.g., after at least 7 fully processed post-launch days) is the earliest fair directional signal; it is not proof of viability or failure on its own.
- **No claims of verified users:** external unique visitors, retained subscribers, and paid demand remain unknown. Paid orders 0 verified and receipts GBP 0 on the current project ledger.
- Do not create more policy pages just to respond to the pre-launch zero report. Obtain real post-launch acquisition evidence before allocating additional product work.

## 2026-11-17 — first verified Policy Radar search report

- Opened the existing `https://yl124915300-dot.github.io/` property in the ChatGPT desktop in-app browser with its existing Google session. In Performance → Search results, the search type was Web (text) and the page filter was URLs containing `/policy-radar/`. The 3-month view showed daily chart coverage from **2026-09-25 through 2026-11-15**, with **0 clicks and 0 impressions**. Google displayed CTR **0%** and average position **0**. With zero recorded impressions, CTR and ranking are not meaningful. Both the Pages and Queries tables showed **No data**. [Filtered Search Console report](https://search.google.com/search-console/performance/search-analytics?resource_id=https%3A%2F%2Fyl124915300-dot.github.io%2F&page=*%2Fpolicy-radar%2F&breakdown=query&time_granularity=DAY&num_of_months=3)
- The report showed “Last update: 3.5 hours ago” when checked. Daily figures for dates after November 15 were not available in that view. The separate preliminary 24-hour view (November 16–17 in the browser's local timezone) also displayed 0 clicks and 0 impressions, and both tables showed No data. [Google's performance report documentation](https://support.google.com/webmasters/answer/7576553?hl=en)
- Cloudflare Dashboard redirected to `https://dash.cloudflare.com/login` and displayed **Sign in to Cloudflare** with a saved Google sign-in option. The desktop browser did not expose the Work Cloud secure sign-in takeover. Account-side Web Analytics site registration, the site-specific snippet, and visitor data remain unverified. Checked the seven sitemap-listed HTML files and their linked local script in the repository. None contained the Cloudflare Web Analytics beacon. [Cloudflare's setup documentation](https://developers.cloudflare.com/web-analytics/get-started/)
- External unique visitors and subscriber counts remain unknown. A scoped GitHub issue search found zero Policy Radar reports or requests. The matching email results were workflow notifications. No paid orders or receipts were verified. The existing operating ledger records **GBP 0** in net receipts. A payment ledger was not independently accessed.

## 2026-11-17 — existing account discovery, search metrics gate

- **Correction to earlier claim**: The owner already possesses a Cloudflare account. Gmail includes official Cloudflare Workers AI / D1 / Observability service notices from 2026. This is evidence of an account, NOT that Web Analytics is provisioned for the Policy Radar public Pages URL.
- **Verified Google Search Console property already exists**: the owner received Google Search Console verification/get-started for `https://yl124915300-dot.github.io/` on 2026-09-26, and Google's 2026-09-29 message says it began collecting search impressions for this *root property* on **2026-09-27**. This does NOT prove that any `/policy-radar/` URL has been indexed or has any impressions.
- Read-only attempt to open the verified site's Search Console performance report in an isolated cloud browser stopped at Google sign-in. Similarly the existing Cloudflare account dashboard stopped at Cloudflare login. No credentials or private analytics were read and no settings changed.
- Public search for exact Policy Radar URL/name returned no matching results in this search session; search index discovery is not exhaustive. **Do not claim indexed/unindexed definitively** without a verified Search Console report.
- **Priority over further features**: log in through an authorised secure browser (not chat), open Search Console for the already-verified root property and filter Performance by Page contains `/policy-radar/` over current available dates, then read total impressions, clicks, page-level and query reports; use the same existing Cloudflare account to verify whether its Web Analytics has a real configured site/token. Create no duplicate accounts.
- Current externally measured unique visitors / subscriptions / qualified leads and revenue remain unavailable. No verified paid orders; receipts GBP 0. Do NOT infer user demand from Github Pages HTTP 200 or IndexNow acknowledgements.


## 2026-11-17 correction / execution gate (must read before building more pages)

**Strategic correction:** The earlier sequence over-weighted page count, number of sources/feeds, CI passes, and IndexNow receipts. These prove limited technical operation, not acquisition, utility, retention or purchase intent. Do NOT keep presenting technical item counts as market traction.

**Official recheck:** The England/Wales 2026/27 Warm Home Discount government guide and the 7 August 2026 statutory eligibility statement both confirm: £150, qualifying snapshot 23 August 2026, qualifying benefits Universal Credit/Housing Benefit/income-related ESA/Pension Credit, electricity supplier/account-holder conditions, most discounts automatic, a letter requiring additional information must be actioned by 26 February 2027. Verify the source version before changing the decision aid:
- https://www.gov.uk/the-warm-home-discount-scheme/if-you-live-in-england-and-wales
- https://www.gov.uk/government/publications/warm-home-discount-eligibility-statement-england-and-wales-2026-to-2027-scheme-year/warm-home-discount-eligibility-statement-england-and-wales-2026-to-2027

**Shipped correction:** Existing public homepage at https://yl124915300-dot.github.io/policy-radar/ now leads with two FREE resident actions (check £150 energy discount / find local emergency support), retains broad UK policy library secondarily, and removes three repetitive new-feature banners. External site fetched HTTP 200 with new primary CTA. Homepage change submitted once to IndexNow, returned HTTP 200. This does NOT establish Google/Bing indexing or visits.

**Privacy correction:** Data handling page now cites the 2026 UK ICO limited statistical-purpose PECR exception for appropriately aggregated, service-improvement-only analytics; individual tracking, profiling or ad measurement do not qualify. UK GDPR still applies. No visitor analytics is installed: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/ . Public page HTTP 200 verified.

**Hard evidence:** Latest repository official source-status snapshot 2026-11-17T11:22:28Z had 11/11 successful fetches, 0 failures, 0 pending fingerprint differences. The 12 RSS endpoints consist of only three unique approved public policy entries distributed across nation/topic filters, not twelve independently useful programmes. Search result queries did not supply verifiable search impressions; GitHub policy feedback issues search returned zero matches. Actual external unique residents, repeat sessions and RSS subscribers remain UNKNOWN; verified paid transactions and net receipts remain zero.

**Immediate business gate, not feature roadmap:**
1. STOP creating new user-facing policy modules until there is a securely authorised measurement route. Cloudflare Web Analytics can be used for GitHub Pages only after the account owner creates a site and supplies the actual per-site snippet/token; provider privacy/legal review required. Google Search Console requires the owner to verify the URL-prefix property; sitemap/IndexNow submission alone cannot establish impressions.
2. Prefer aggregated, privacy-preserving metrics and exclude creator/QA traffic. Track public entry page, government-guide click, voluntary ongoing subscription/follow request, and repeat actual usage where lawful; don't pretend the static site already measures these.
3. Keep government eligibility and applications entirely free. Retain revenue £0 until a real non-test receipt. Test a premium proposition only after verified repeated value or an external organisation requests a paid API/license.
4. Record real user evidence only from trustworthy external sources; do not create synthetic traffic, fake feedback or pretend that GitHub Actions proves acquisition.

**Current externally blocked items:** Site analytics account/access, Google Search Console ownership and an ordinary-user consent-based email subscription backend have not been confirmed. Prior HubSpot account had onboarding false and missing read permission. Do not invent or publicly post account credentials. The existing site can continue running daily monitoring while these dependencies are unresolved.


## 17 November 2026 — safety interlock and distribution transparency

- Re-read current GOV.UK 2026/27 Warm Home Discount conditions and missing-letter helpline guidance, both official and source-linked (https://www.gov.uk/the-warm-home-discount-scheme/if-you-live-in-england-and-wales ; https://www.gov.uk/the-warm-home-discount-scheme/get-help). These sources distinguish qualifying-date evidence, automatic awards, letters requiring information and the 2027-02-26 contact deadline.
- The public action checker `warm-home-discount-checker.html` now has a **fail-closed official-source gate**. It disables next-action decisions unless all three required GOV.UK content snapshots (scheme conditions, supplier list and statutory 2026/27 eligibility statement) are recent (<=48 hours), intact, successful and not marked pending human review. If not, it displays a pause warning and gives direct official links. The browser neither transmits nor stores benefit answers.
- `eligibility-source-guard.js` and `tests/eligibility-source-guard.test.cjs` implement deterministic checks. GitHub Actions `policy-radar-safety-checks.yml` ran successfully at https://github.com/yl124915300-dot/yl124915300-dot.github.io/actions/runs/44075742531 with **10 passed, 0 failed**; another run after the checker sharing button also succeeded: https://github.com/yl124915300-dot/yl124915300-dot.github.io/actions/runs/44076111836.
- On the live site a synthetic anonymous browser run confirmed a recently checked status (2026-11-17T11:22:28Z), enabled action button and correct Northern Ireland guidance, with no JS errors. An isolated browser negative test with HTTP 503 interception was attempted but the browser tool did not support network interception; therefore that exact browser scenario remains untested. The Node regression covers error/stale/review states.
- Published `data-handling.html` and linked it from site sections. It explains local profile storage, direct postcode lookup to Postcodes.io, GitHub hosting and public GitHub Issues, lack of analytics/mail/payment backends, and privacy limitations. The checker also offers a one-tap OS share/copy of the public URL ONLY, never user's form answers.
- HubSpot account read returned `onboarded:false` and denied USER_INFORMATION permission. Lovable workspace lookup also failed. No verified external analytics/email-list provider has been connected, and no user profile or portal ID has been embedded in public code. UK ICO says cookies and similar non-essential storage technologies can require valid user consent; assess before deploying analytics.
- **Business metric**: public site works, no credible unique resident visitor or subscriber count, paid orders 0 verified, receipts GBP 0. Search-engine inclusion and actual external referrals not established. The privacy-safe share affordance is not itself evidence of acquisition.


## 17 November 2026 — segment subscriptions and monitor review alerts

- Extended `policy-radar/build_feeds.py` to generate **12 RSS feeds** (four UK nations × energy, support, childcare) strictly from editor-approved `data/approved_events.json`. A new `feeds/manifest.json` records which feeds contain approved items. Empty feeds are valid but do not prove that an area has no benefits.
- Added `my-radar.html` on-device nation/topic feed selector. The default England browser view displayed Energy **3 reviewed notices** and Support **0**. Public feed URLs and manifest have returned HTTP 200. A longer cross-nation interaction attempt timed out / hit a browser session limit; the Scotland feed's XML and manifest both show **1** approved notice, but that full UI switching path is not yet signed off by the browser test.
- The scheduled GitHub Actions workflow stages `policy-radar/feeds/`, regenerates public snapshots from the latest main branch and now produces a GitHub Actions review summary for failures or source fingerprint changes. This action deliberately fails when any source cannot be fetched or an unreviewed change persists, so a maintainer must inspect official evidence before public publishing.
- **Run #18** (https://github.com/yl124915300-dot/yl124915300-dot.github.io/actions/runs/44073413057) succeeded, including the health/review audit. Last status `2026-11-17T11:22:28Z`: **11 of 11** official source fetches succeeded, 0 failures, 0 pending fingerprint changes.
- No Cloudflare Web Analytics, Umami or accountless email subscriber provider has been connected or authorised for this existing static GitHub Pages site. The Lovable workspace lookup failed internally; the connected browser context is unavailable. Do not claim a tracking beacon, email subscription, unique visitor counts or conversion reporting has been installed. Do not embed third-party beacons without a verified property and suitable privacy disclosure.
- Existing RSS is reader-based and has no in-house subscriber counter or push notifications; visits and verified subscribers remain unknown. Revenue and verified paid orders remain **£0**.


## 17 November 2026 — latest follow-up execution

- Added **Warm Home Discount 2026/27 action checker**, public address: https://yl124915300-dot.github.io/policy-radar/warm-home-discount-checker.html. It is purely client-side and gathers no identity or benefits data; it shows action guidance, not approval.
- Rechecked the statutory 2026/27 eligibility statement and official GOV.UK summary: England/Wales core-group qualifying date 23 August 2026; the GOV.UK 2026/27 list contains Universal Credit, Housing Benefit, income-related ESA and Pension Credit, subject to participating electricity supplier/account-name requirements. Where a letter requests more information or an expected letter is missing, the official contact deadline is 26 February 2027. A separate park homes route exists. Scotland has separate rules; NI does not have the WHD scheme.
- Added the official supplier list and 2026/27 statutory statement as monitored source fingerprints. Confirmed automated snapshot at **2026-11-17T11:04:46Z**: **11/11 source fetches succeeded, zero failures**. First snapshots of new sources are baselines, not evidence of zero legal changes.
- Real browser tests verified the public checker page HTTP 200; tested NI inapplicability, Scotland separate route, England potential main eligibility/letter-not-received, a request for more information, Wales park home, and England nonqualifying benefit. No test results were counted as genuine users.
- IndexNow: submitted the new policy checker URL after the verification file was accessible; endpoint returned **HTTP 200**. This is only submission processing, not evidence of crawl, search indexing or user acquisition.
- User adoption and revenue **still unverified**: externally attributable unique visitors unknown, consented email subscribers unknown/no backend, genuine paid users 0 verified, net receipts **£0**.
- Client-side checker and policy summaries require manual re-verification whenever the relevant official version fingerprints change. Never automatically change legal eligibility advice based solely on a hash.
- The static site does not yet have a securely authenticated backend, and no provider integration for privacy-preserving audience measurement or opt-in email list has been verified. Do not claim otherwise. An external analytics provider would require a provisioned account, documented privacy purposes, and tests separating owner's QA from public usage.


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
