"""Exercise the published chat and live catalog GETs without opening a merchant or submitting a form."""
import json
import os
import re
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import expect, sync_playwright

SITE = os.getenv("MATCH_OS_URL", "https://yl124915300-dot.github.io/match-os/")
SOURCE_HOSTS = {
    "www.cheapshark.com", "www.gamerpower.com", "api-core.livingsocial.com",
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
        assert "cookie" not in request.all_headers()
        assert "referer" not in request.all_headers()
        assert "MO-" not in request.url
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")


def cleared(page):
    page.locator("#close").click()
    page.locator("#cancel").click()
    expect(page.locator("#reference")).to_be_hidden()
    expect(page.locator("#live-results .offer-card")).to_have_count(0)
    expect(page.locator("#messages")).to_be_empty()
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
    base_cards = group.locator(".offer-card[data-provider=cheapshark]")
    assert base_cards.count() >= 2
    merchants = []
    for card in base_cards.all():
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
    assert claims.count() >= 1
    expect(claims.first.locator(".offer-price")).to_contain_text("Free claim listed")
    assert urlparse(claims.first.locator("a.offer-link").get_attribute("href")).hostname == "www.gamerpower.com"
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
    expect(cards.first.locator(".offer-price")).to_contain_text("From USD")
    expect(cards.first).to_contain_text("deadline unverified")
    print("LOCAL_CARDS", cards.count(), cards.first.locator(".offer-price").inner_text())
    page.locator("#handoff").click()
    expect(page.locator("#sharing")).to_be_visible()
    expect(page.locator("#request-submit")).to_be_enabled()
    cleared(page)
    print("LOCAL_AND_MANUAL_HANDOFF_OK")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel="chrome", args=["--no-sandbox"])
    for name, case in [("desktop", paid_games), ("mobile", claim_games), ("local", local_services)]:
        if os.getenv("MATCH_OS_CASE") not in (None, name):
            continue
        options = playwright.devices["iPhone 13"] if name == "mobile" else {"viewport": {"width": 1280, "height": 900}}
        if name == "mobile":
            options = {key: value for key, value in options.items() if key not in ("default_browser_type", "user_agent")}
        context = browser.new_context(**options)
        page = context.new_page()
        page.on("pageerror", lambda error: print("PAGE_ERROR", error))
        page.on("response", lambda response: print("SOURCE_HTTP", urlparse(response.url).hostname, response.status)
                if urlparse(response.url).hostname in SOURCE_HOSTS else None)
        page.on("requestfailed", lambda request: print("SOURCE_FAILED", urlparse(request.url).hostname, request.failure)
                if urlparse(request.url).hostname in SOURCE_HOSTS else None)
        try:
            case(page)
        finally:
            context.close()
    browser.close()
