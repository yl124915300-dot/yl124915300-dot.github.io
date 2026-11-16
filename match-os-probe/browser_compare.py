"""Exercise the published chat and live catalog GETs without opening a merchant or submitting a form."""
import json
import os
import re
from urllib.parse import parse_qs, urljoin, urlparse

from playwright.sync_api import expect, sync_playwright

import demand_browser
import headphone_browser

SITE = os.getenv("MATCH_OS_URL", "https://yl124915300-dot.github.io/match-os/")
SOURCE_HOSTS = {
    "www.cheapshark.com", "www.gamerpower.com", "api-core.livingsocial.com", "prices.openfoodfacts.org",
}


def brief(page, text, details=None):
    page.goto(SITE, wait_until="domcontentloaded")
    expect(page.locator("#message")).to_be_enabled()
    page.locator("#message").fill(text)
    page.locator("#send").click()
    expect(page.locator("#quick-actions")).to_be_visible()
    if details:
        page.locator("#message").fill(details)
        page.locator("#send").click()
    else:
        page.locator("#skip").click()
    expect(page.locator("#review")).to_be_visible()


def source_requests(page):
    traffic = []
    page.on("request", lambda request: traffic.append(request)
            if urlparse(request.url).hostname in SOURCE_HOSTS else None)
    return traffic


def search(page, traffic):
    assert not traffic, "Provider query sent before consent"
    page.locator("#live-search").click()
    expect(page.locator("#live-search")).to_be_enabled(timeout=20_000)
    print("CATALOG_STATUS", page.locator("#live-status").inner_text())
    for request in traffic:
        assert request.method == "GET"
        if request.response():
            assert "cookie" not in request.all_headers(), "Catalog request sent a cookie"
            assert "referer" not in request.all_headers(), "Catalog request sent a referrer"
        assert "MO-" not in request.url
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")


def cleared(page):
    page.locator("#close").click()
    page.locator("#cancel").click()
    expect(page.locator("#reference")).to_be_hidden()
    expect(page.locator("#live-results .offer-card")).to_have_count(0)
    expect(page.locator("#messages")).to_be_empty()
    expect(page.locator("#route-preview")).to_be_empty()
    expect(page.locator("#quote-entry")).to_be_hidden()
    expect(page.locator("#ranking-tools")).to_be_hidden()


def paid_games(page):
    traffic = source_requests(page)
    brief(page, "Find PC game: LEGO Batman in Seattle, United States under USD 80 just comparing.")
    expect(page.locator("#catalog-consent")).to_contain_text("“LEGO Batman”")
    search(page, traffic)
    queries = [(urlparse(request.url), parse_qs(urlparse(request.url).query)) for request in traffic]
    assert any(url.hostname == "www.cheapshark.com" and query.get("title") == ["LEGO Batman"]
               for url, query in queries)
    assert any(url.hostname == "www.gamerpower.com" and query == {"type": ["game"]}
               for url, query in queries)
    assert all("Seattle" not in request.url for request in traffic)
    track = page.locator(".comparison-track").filter(has=page.get_by_role("heading", name="Same game across stores"))
    expect(track).to_be_visible()
    # Find by text via the summary to avoid accepting a sequel masquerading as the base game.
    group = track.locator(".comparison-group").filter(has=page.locator("summary").filter(has_text=re.compile(r"^LEGO Batman ·"))).first
    expect(group).to_be_visible()
    if group.get_attribute("open") is None:
        group.locator("summary").first.click()
    base_cards = group.locator(".offer-card[data-provider=cheapshark]")
    assert base_cards.count() >= 2
    merchants = []
    for card in base_cards.all():
        expect(card).to_have_attribute("data-evidence", "api")
        expect(card).to_have_attribute("data-status", "candidate")
        expect(card.locator(".offer-price")).to_contain_text("Final total unknown")
        link = card.locator("a.offer-link").get_attribute("href")
        assert urlparse(link).hostname == "www.cheapshark.com" and urlparse(link).path == "/redirect"
        merchants.append([card.locator("h5").inner_text(), card.locator(".offer-price").inner_text()])
    assert len({row[0] for row in merchants}) >= 2
    base_cards.first.get_by_text("Terms and evidence", exact=True).click()
    expect(base_cards.first.locator(".offer-history")).to_contain_text("Catalog historical low")
    print("PAID_COMPARISON", json.dumps(merchants))
    print("HISTORY", base_cards.first.locator(".offer-history").inner_text())
    score = page.locator(".top-candidate").inner_text()
    after_search = len(traffic)
    page.locator("#refine").click()
    page.locator("#message").fill("Prioritize exact match")
    page.locator("#send").click()
    expect(page.locator("#rank-profile")).to_have_value("fit")
    expect(page.locator(".score-guide")).to_contain_text("match 75%")
    assert page.locator(".top-candidate").inner_text() != score
    assert len(traffic) == after_search, "Ranking change made a new provider request"
    cleared(page)
    print("DESKTOP_COMPARE_RERANK_AND_CLEAR_OK")


def claim_games(page):
    traffic = source_requests(page)
    brief(page, "Find free PC games in Seattle, United States under USD 1 just comparing.")
    search(page, traffic)
    claims = page.locator(".offer-card[data-provider=gamerpower]")
    if claims.count():
        expect(page.get_by_role("heading", name="Free claims", exact=True)).to_be_visible()
        expect(claims.first.locator(".offer-price")).to_contain_text("Free claim listed")
        assert urlparse(claims.first.locator("a.offer-link").get_attribute("href")).hostname == "www.gamerpower.com"
    else:
        # Provider activity changes. Successful zero-claim samples still prove the browser read.
        replies = [request.response() for request in traffic if urlparse(request.url).hostname == "www.gamerpower.com"]
        assert any(reply and reply.status in (200, 201) and isinstance(reply.json(), list) for reply in replies)
    expect(page.locator("#live-status")).to_contain_text("CheapShark ")
    expect(page.locator("#live-status")).to_contain_text("GamerPower ")
    print("GIVEAWAY_CARDS", claims.count())
    cleared(page)
    print("MOBILE_FREE_CLAIM_AND_CLEAR_OK")


def local_services(page):
    traffic = source_requests(page)
    brief(page, "Find massage in Austin, United States under USD 180 by Friday.", "one person and 60 minutes")
    search(page, traffic)
    assert len(traffic) == 1
    request = urlparse(traffic[0].url)
    assert request.hostname == "api-core.livingsocial.com"
    args = parse_qs(request.query)
    assert "Austin" in args["q"][0] and "minutes" not in args["q"][0]
    cards = page.locator(".offer-card[data-provider=livingsocial]")
    assert cards.count() >= 2
    expect(cards.first).to_have_attribute("data-evidence", "api")
    expect(cards.first).to_have_attribute("data-status", "candidate")
    expect(cards.first.locator(".offer-price")).to_contain_text("From USD")
    expect(cards.first).to_contain_text("Unknown — Appointment deadline")
    print("LOCAL_CARDS", cards.count(), cards.first.locator(".offer-price").inner_text())
    page.locator("#handoff").click()
    expect(page.locator("#sharing")).to_be_visible()
    expect(page.locator("#request-submit")).to_be_enabled()
    cleared(page)
    print("LOCAL_AND_MANUAL_HANDOFF_OK")


def goods_and_edit(page):
    traffic = source_requests(page)
    brief(page, "Find iPhone 15 128 GB + USB-C charger + oat milk with delivery in Austin, United States under USD 800 just comparing.")
    route = page.locator("#route-preview")
    expect(route).to_contain_text("Electronics · iPhone 15 128 GB")
    expect(route).to_contain_text("Verify compatibility with iphone 15")
    expect(route).to_contain_text("Everyday essentials · oat milk")
    expect(route).to_contain_text("Delivery required")
    expect(page.locator("#live-search")).to_be_enabled()
    expect(page.locator("#catalog-consent")).to_contain_text("Open Prices receives the product name")
    expect(page.locator("#live-status")).to_contain_text("No external search has run")
    expect(page.locator("#live-results .offer-card")).to_have_count(0)
    page.locator("#quote-entry summary").click()
    quote_form = page.locator("#quote-form")
    expect(quote_form.get_by_text("Manufacturer model number", exact=False)).to_be_visible()
    page.locator("#quote-target").select_option("2")
    expect(quote_form.get_by_text("Net content per piece", exact=True)).to_be_visible()
    page.get_by_role("button", name="Edit maximum budget").click()
    page.locator("#message").fill("USD 700")
    page.locator("#send").click()
    expect(page.locator("#summary")).to_contain_text("USD 700")
    page.get_by_role("button", name="Edit item / service").click()
    page.locator("#message").fill("Oat milk + delivery")
    page.locator("#send").click()
    expect(route).not_to_contain_text("Electronics")
    expect(route).to_contain_text("Everyday essentials")
    expect(page.locator("#live-search")).to_be_enabled()
    assert not traffic, "A source received a query before consent"
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    cleared(page)
    print("GOODS_ROUTE_OPTIONS_EDIT_NO_NETWORK_AND_CLEAR_OK")


def mixed_live(page):
    traffic = source_requests(page)
    brief(page, "Find oat milk + massage in Austin, United States under USD 180 just comparing.")
    expect(page.locator("#route-preview")).to_contain_text("Everyday essentials")
    expect(page.locator("#route-preview")).to_contain_text("Local services")
    search(page, traffic)
    expect(page.locator("#live-status")).to_contain_text("Open Prices")
    expect(page.locator('[data-module="services"] .offer-card').first).to_be_visible()
    expect(page.locator("#live-results")).to_contain_text("Combined budget fit is unverified")
    services = [request for request in traffic if urlparse(request.url).hostname == 'api-core.livingsocial.com']
    assert len(services) == 1 and "oat" not in services[0].url
    products = [request for request in traffic if urlparse(request.url).hostname == 'prices.openfoodfacts.org']
    assert products and all("Austin" not in request.url and "massage" not in request.url for request in products)
    cleared(page)
    print("MIXED_ROUTE_ISOLATION_OK")


def observations(page, with_barcode):
    # Public product query for QA. The observed prices come from the real public API.
    traffic = source_requests(page)
    item = "grocery: Nutella barcode 3017620422003" if with_barcode else "grocery: Nutella"
    brief(page, f"Find iPhone 15 128 GB + {item} in Grenoble, France under EUR 800 just comparing.")
    consent = page.locator("#catalog-consent")
    expect(consent).to_contain_text("only public barcode 3017620422003" if with_barcode else "the product name “Nutella”")
    search(page, traffic)
    paths = [urlparse(request.url) for request in traffic]
    assert [url.path for url in paths] == (["/api/v1/prices"] if with_barcode else ["/api/v1/products", "/api/v1/prices"])
    assert all(request.response() and request.response().status == 200 for request in traffic)
    for url in paths:
        params = parse_qs(url.query)
        assert params.keys() <= {"product_code", "product_code__in", "product_name__like", "price_count__gte",
                                 "order_by", "size", "proof__type"}
        assert all(term not in url.query for term in ("Grenoble", "iPhone", "France", "EUR"))
    cards = page.locator(".offer-card[data-evidence=observation]")
    expect(cards.first).to_be_visible()
    expect(cards.first).to_contain_text("Dated price observation")
    expect(cards.first).to_have_attribute("data-status", "candidate")
    expect(cards.first.locator(".offer-price")).to_contain_text("Observed EUR")
    expect(cards.first.locator(".offer-price")).to_contain_text("Final total unknown")
    url = urlparse(cards.first.locator("a.offer-link").get_attribute("href"))
    assert url.hostname == "prices.openfoodfacts.org" and re.fullmatch(r"/api/v1/prices/\d+", url.path)
    expect(page.locator('[data-module="electronics"]')).to_contain_text("No sufficient live quotes")
    expect(page.locator("#live-results")).to_contain_text("Combined budget fit is unverified")
    expect(page.locator(".offer-card[data-status=confirmed]")).to_have_count(0)
    cards.first.get_by_text("Terms and evidence", exact=True).click()
    expect(cards.first).to_contain_text("Source date")
    expect(cards.first).to_contain_text("Retrieved")
    print("OPEN_PRICES_OBSERVATIONS", cards.count(), "barcode" if with_barcode else "name")
    cleared(page)


def manual_and_expiry(page):
    # Synthetic URL and amounts are used only to test local behavior.
    traffic = source_requests(page)
    page.clock.install()
    brief(page, "Find iPhone 15 in Austin, United States under USD 100 just comparing.")
    expect(page.locator("#live-search")).to_be_hidden()
    page.locator("#quote-entry summary").click()
    form = page.locator("#quote-form")
    form.locator('[name=url]').fill("https://api.bestbuy.com/v1/products/TEST-ONLY")
    form.get_by_role("button", name="Add to comparison").click()
    link = page.locator(".offer-card[data-evidence=link]")
    expect(link).to_have_count(1)
    expect(link).to_contain_text("Listed price unknown")
    for name, value in {"title": "Synthetic QA only", "merchant": "Synthetic",
                        "url": "https://example.test/qa-only", "merchantSku": "TEST-ONLY", "amount": "40",
                        "currency": "USD", "observedAt": page.evaluate("new Date().toISOString().slice(0, 10)")}.items():
        form.locator(f"[name={name}]").fill(value)
    form.get_by_role("button", name="Add to comparison").click()
    quote = page.locator(".offer-card[data-evidence=manual]")
    expect(quote).to_have_count(1)
    expect(quote).to_have_attribute("data-status", "candidate")
    expect(page.locator(".offer-card[data-status=confirmed]")).to_have_count(0)
    assert not traffic
    page.clock.fast_forward(30 * 60_000)
    expect(page.locator("#end-title")).to_have_text("Session expired")
    expect(page.locator("#live-results .offer-card")).to_have_count(0)
    expect(page.locator("#messages")).to_be_empty()
    expect(page.locator("#reference")).to_be_hidden()
    print("MANUAL_LINK_TIERS_AND_TTL_OK")


def pending_cancel(page):
    traffic = source_requests(page)
    brief(page, "Find grocery: Nutella in Grenoble, France under EUR 80 just comparing.")
    # Synthetic network failure after cancellation. No product response is injected.
    pending = []
    page.route("https://prices.openfoodfacts.org/**", lambda route: pending.append(route))
    with page.expect_request(lambda request: urlparse(request.url).hostname == "prices.openfoodfacts.org"):
        page.locator("#live-search").click()
    expect(page.locator("#live-status")).to_contain_text("Searching the authorized catalogs")
    cleared(page)
    assert len(traffic) == 1
    for route in pending:
        route.abort()
    expect(page.locator("#live-results")).to_be_empty()
    print("PENDING_REQUEST_CANCEL_CLEARED_OK")


def intake(page, channel):
    site_host = urlparse(SITE).hostname
    external = []
    page.on("request", lambda request: external.append(request.url)
            if urlparse(request.url).hostname not in (site_host, None) else None)
    if channel == "framefind_results":
        page.goto(urljoin(SITE, "/video-find/"), wait_until="domcontentloaded")
        expect(page.locator("#match-intent-cta")).to_be_hidden()
        page.locator("#item-description").fill("Sony WH-1000XM5 headphones")
        page.locator("#search-products").click()
        page.locator("#match-intent-link").focus()
        page.keyboard.press("Enter")
        expect(page).to_have_url(SITE + "#entry=framefind_results")
        item = "Sony WH-1000XM5 headphones"
    else:
        page.goto(SITE + "#entry=github_guide&ignore=discarded", wait_until="domcontentloaded")
        item = "Over-ear headphones with active noise cancellation in wired mode"

    expect(page.locator("#reference")).to_be_hidden()
    expect(page.locator("#entry-preview")).to_contain_text(item)
    assert page.evaluate("sessionStorage.getItem('matchos:framefind_interest_v1')") is None
    page.get_by_role("button", name="Use this item and start chat").click()
    expect(page.locator("#entry-preview")).to_be_hidden()
    expect(page.locator("#message")).to_be_focused()
    expect(page.locator("#ref")).to_have_text(re.compile(r"^MO-[A-F0-9]{20}$"))
    ref = page.locator("#ref").inner_text()
    for reply in ("USD 180", "Austin, United States", "within 7 days"):
        page.locator("#message").fill(reply)
        page.locator("#send").click()
    expect(page.locator("#messages")).to_contain_text("active noise cancellation work while wired")
    page.locator("#message").fill("3.5 mm wired ANC and returns")
    page.locator("#send").click()
    expect(page.locator("#summary")).to_contain_text(item)
    page.locator("#handoff").click()
    expect(page.locator("[name=acquisition_source]")).to_have_value(channel)
    assert page.locator("[name=acquisition_campaign], [name=acquisition_medium]").count() == 0
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")

    page.locator("#email").fill("intake-qa@example.test")
    page.locator("#request-submit").click()
    page.locator("[name=fee_acknowledged]").check()
    page.locator("#request-submit").click()
    assert not external, "External traffic before the buyer chose to share"
    page.locator("#public-option summary").click()
    expect(page.locator("#github")).to_be_disabled()
    page.evaluate("window.open = (url) => { window.qaDraft = url; }")
    page.locator("#public-consent").check()
    page.locator("#github").click()
    draft = urlparse(page.evaluate("window.qaDraft"))
    draft_body = parse_qs(draft.query)["body"][0]
    assert draft.hostname == "github.com" and f"Entry: {channel}" in draft_body
    assert ref not in draft_body and "example.test" not in draft_body and "discarded" not in draft_body
    assert not external, "No public draft or catalog search should leave this test"

    if channel == "github_guide":
        page.locator("[name=research_consent]").check()
        page.route("https://formsubmit.co/**", lambda route: route.fulfill(
            status=200, content_type="text/html", body="<p>QA intercepted. No request delivered.</p>"))
        with page.expect_request(lambda request: urlparse(request.url).hostname == "formsubmit.co") as post:
            page.locator("#request-submit").click()
        assert post.value.method == "POST"
        payload = parse_qs(post.value.post_data)
        assert payload["transaction_reference"] == [ref] and payload["acquisition_source"] == [channel]
        assert payload["fee_acknowledged"] == ["yes"] and payload["research_consent"] == ["yes"]
        assert payload["item"] == [item] and "discarded" not in post.value.post_data
        page.goto(urljoin(SITE, "received.html"))
        expect(page.locator("#request-code")).to_have_text(ref)
        page.reload()
        expect(page.locator("#request-ref")).to_be_hidden()
    else:
        cleared(page)
        expect(page.locator("#payload")).to_be_empty()
        expect(page.locator("#email")).to_have_value("")
        expect(page.locator("#public-consent")).not_to_be_checked()
        expect(page.locator("#entry-preview")).to_be_empty()
        page.locator("#restart").click()
        expect(page.locator("#start-chat")).to_have_text("Start purchase chat")
        assert not external

    print("OPT_IN_INTAKE_OK", channel)


def unlisted_entry(page):
    page.goto(SITE + "?utm_campaign=arbitrary-tag#entry=unknown")
    expect(page.locator("#entry-preview")).to_be_hidden()
    page.locator("#start-chat").click()
    expect(page.locator("#message")).to_be_focused()
    page.locator("#message").fill("Find a laptop in Austin, United States under USD 800 by Friday.")
    page.locator("#send").click()
    page.locator("#skip").click()
    page.locator("#handoff").click()
    expect(page.locator("[name=acquisition_source]")).to_have_value("direct")
    assert "arbitrary-tag" not in page.locator("#payload").inner_html()
    print("UNLISTED_ENTRY_DROPPED_OK")


if not os.getenv("MATCH_OS_URL") and not os.getenv("MATCH_OS_CASE"):
    demand_browser.verify_discovery(SITE)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel="chrome", args=["--no-sandbox"])
    failures = []
    cases = [("desktop", paid_games), ("mobile", claim_games), ("local", local_services),
             ("goods-desktop", goods_and_edit), ("goods-mobile", goods_and_edit), ("mixed-mobile", mixed_live),
             ("observations-desktop", lambda page: observations(page, False)),
             ("observations-mobile", lambda page: observations(page, True)),
             ("manual-expiry", manual_and_expiry), ("pending-cancel", pending_cancel),
             ("intake-desktop", lambda page: intake(page, "github_guide")),
             ("intake-mobile", lambda page: intake(page, "framefind_results")),
             ("intake-unlisted-entry", unlisted_entry),
             ("demand-games-desktop", lambda page: demand_browser.games(page, SITE)),
             ("demand-services-mobile", lambda page: demand_browser.services(page, SITE)),
             ("demand-goods-mobile", lambda page: demand_browser.goods(page, SITE)),
             ("demand-electronics-desktop", lambda page: demand_browser.electronics(page, SITE)),
             ("headphones-desktop", lambda page: headphone_browser.headphone_session(page, SITE)),
             ("headphones-mobile", lambda page: headphone_browser.headphone_session(page, SITE, touch=True)),
             ("headphones-goal-mobile", lambda page: headphone_browser.headphone_buyer_goal(page, SITE)),
             ("headphones-ttl", lambda page: headphone_browser.headphone_ttl(page, SITE)),
             ("agent-link-desktop", lambda page: headphone_browser.agent_link(page, SITE, False)),
             ("agent-link-mobile", lambda page: headphone_browser.agent_link(page, SITE, True)),
             ("social-post-desktop", lambda page: demand_browser.social(page, SITE, "x_post", False)),
             ("social-profile-mobile", lambda page: demand_browser.social(page, SITE, "youtube_profile", True))]
    for name, case in cases:
        if os.getenv("MATCH_OS_CASE") and not name.startswith(os.environ["MATCH_OS_CASE"]):
            continue
        options = playwright.devices["iPhone 13"] if "mobile" in name else {"viewport": {"width": 1280, "height": 900}}
        if "mobile" in name:
            options = {key: value for key, value in options.items() if key not in ("default_browser_type", "user_agent")}
        # Use the descriptive User-Agent documented by CheapShark, with automation identified.
        options["user_agent"] = "MATCH-OS-Catalog-QA/3.0 (automated Chrome; https://yl124915300-dot.github.io/match-os/)"
        context = browser.new_context(**options)
        page = context.new_page()
        page_errors = []
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on("response", lambda response: print("SOURCE_HTTP", urlparse(response.url).hostname, response.status)
                if urlparse(response.url).hostname in SOURCE_HOSTS else None)
        page.on("requestfailed", lambda request: print("SOURCE_FAILED", urlparse(request.url).hostname, request.failure)
                if urlparse(request.url).hostname in SOURCE_HOSTS else None)
        cdp = context.new_cdp_session(page)
        request_hosts = {}
        def remember_request(event):
            host = urlparse(event["request"]["url"]).hostname
            if host in SOURCE_HOSTS:
                request_hosts[event["requestId"]] = host
        def wire_response(event):
            host = request_hosts.get(event["requestId"])
            if host:
                print("SOURCE_WIRE_STATUS", host, event["statusCode"])
        def wire_failure(event):
            host = request_hosts.get(event["requestId"])
            if host and event.get("corsErrorStatus"):
                print("SOURCE_CORS_FAILURE", host, event["corsErrorStatus"]["corsError"])
        cdp.on("Network.requestWillBeSent", remember_request)
        cdp.on("Network.responseReceivedExtraInfo", wire_response)
        cdp.on("Network.loadingFailed", wire_failure)
        cdp.send("Network.enable")
        try:
            case(page)
            assert not page_errors, page_errors
        except Exception as error:
            print("CASE_FAILED", name, error)
            if name == "desktop":
                diagnostic = context.request.get("https://www.cheapshark.com/api/1.0/stores", timeout=8_000)
                print("DOCUMENTED_API_CLIENT_STATUS", diagnostic.status)
                if diagnostic.status == 400:
                    try:
                        print("DOCUMENTED_API_CLIENT_MESSAGE", str(diagnostic.json().get("error", ""))[:230])
                    except (ValueError, AttributeError):
                        pass
            failures.append(name)
        finally:
            context.close()
    browser.close()
    if failures:
        raise SystemExit("Browser cases that failed: " + ", ".join(failures))
