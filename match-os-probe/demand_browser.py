"""Synthetic browser acceptance. All injected amounts/listings are QA fixtures."""
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlparse
from urllib.request import urlopen

from playwright.sync_api import expect


def verify_discovery(site):
    # The existing cloud workflow already checks core chat files on this commit.
    # Expand the public byte comparison to nested guides and root discovery.
    root = Path(__file__).resolve().parents[1]
    guides = root / "match-os/demand"
    revision = "?revision=" + os.environ.get("GITHUB_SHA", "verify")
    for file in [root / "sitemap.xml", root / "video-find/index.html", *sorted(guides.rglob("*"))]:
        if not file.is_file():
            continue
        rel = file.relative_to(root).as_posix().removesuffix("index.html")
        with urlopen(urljoin(site, "/" + rel) + revision, timeout=12) as result:
            assert result.read() == file.read_bytes(), f"Published bytes differ: {rel}"
    with urlopen(urljoin(site, "/robots.txt"), timeout=12) as result:
        assert "Sitemap: https://yl124915300-dot.github.io/sitemap.xml" in result.read().decode()
    print("GUIDE_AND_DISCOVERY_BYTES_CONFIRMED", flush=True)


def reply(page, value):
    page.locator("#message").fill(value)
    page.locator("#send").click()


def edit(page, label, value):
    page.get_by_role("button", name="Edit " + label, exact=True).click()
    reply(page, value)
    expect(page.locator("#review")).to_be_visible()


def open_demand(page, site, slug, item, replies):
    path = "demand/" + slug + "/"
    page.goto(urljoin(site, path))
    expect(page.locator('link[rel="canonical"]')).to_have_attribute(
        "href", "https://yl124915300-dot.github.io/match-os/" + path)
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    page.locator("#open-chat").click()
    expect(page).to_have_url(site + "#entry=demand_page&topic=" + slug)
    expect(page.locator("#reference")).to_be_hidden()
    expect(page.locator("#entry-preview")).to_contain_text(item)
    page.locator("#start-chat").click()
    for line in replies:
        reply(page, line)
    expect(page.locator("#review")).to_be_visible()
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")


def feedback(page, kind=None, source="demand_page"):
    if not page.locator("#funnel").evaluate("(node) => node.open"):
        page.locator("#funnel summary").click()
    if kind:
        page.locator("#outcome").select_option(kind)
    expect(page.locator("#feedback-export")).to_be_hidden()
    page.locator("#prepare-feedback").click()
    data = json.loads(page.locator("#feedback-text").input_value())
    assert set(data) == {"format", "sample", "source", "topic", "categories", "steps",
                         "outcome_self_reported", "blocker_self_reported", "merchant_purchase_verified",
                         "paypal_service_fee"}
    assert data["sample"] == "qa" and data["source"] == source
    assert data["merchant_purchase_verified"] is False and data["paypal_service_fee"] == "closed"
    assert "fee" not in data["steps"]
    return data


def cancel(page):
    page.locator("#close").click()
    page.locator("#cancel").click()
    expect(page.locator("#end-title")).to_have_text("Session closed")
    expect(page.locator("#funnel-steps")).to_be_empty()
    expect(page.locator("#feedback-text")).to_have_value("")
    expect(page.locator("#live-results")).to_be_empty()
    assert page.evaluate("Object.keys(sessionStorage).filter(k => k.startsWith('matchos:')).length") == 0


def respond(route, data, status=200, headers=None):
    route.fulfill(status=status, json=data, headers={"Access-Control-Allow-Origin": "*", **(headers or {})})


def games(page, site):
    reads = []
    def cheap(route):
        url = urlparse(route.request.url)
        assert route.request.method == "GET"
        params = parse_qs(url.query)
        reads.append(url.path)
        if url.path.endswith("/stores"):
            data = [{"storeID": "1", "storeName": "Steam", "isActive": 1}]
        elif "title" in params:
            assert params["title"] == ["LEGO Batman"]
            data = [{"gameID": "6", "external": "LEGO Batman"}]
        else:
            assert not ({"budget", "city", "topic"} & params.keys())
            game = {"info": {"title": "LEGO Batman", "steamAppID": "21000"},
                    "deals": [{"storeID": "1", "dealID": "SYNTHETIC-QA", "price": "4.99"}]}
            data = {"6": game} if "ids" in params else game
        respond(route, data)
    page.route("https://www.cheapshark.com/api/**", cheap)
    page.route("https://www.gamerpower.com/api/**", lambda route: respond(route, []))
    popup_urls = []
    def never_shop(route):
        popup_urls.append(route.request.url)
        route.fulfill(content_type="text/plain", body="Synthetic navigation only; no merchant visited.")
    page.context.route("https://www.cheapshark.com/redirect?**", never_shop)
    open_demand(page, site, "lego-batman-pc-editions", "LEGO Batman",
                ["USD 30", "Seattle, United States", "just comparing"])
    assert not reads
    page.locator("#live-search").click()
    expect(page.locator(".offer-card").first).to_be_visible()
    expect(page.locator("#live-search")).to_be_enabled()
    initial = len(reads)
    page.locator("#rank-profile").select_option("price")
    edit(page, "maximum budget", "USD 2")
    expect(page.locator("#live-status")).to_contain_text("No eligible candidates")
    edit(page, "maximum budget", "USD 30")
    expect(page.locator(".offer-card").first).to_be_visible()
    expect(page.locator("#live-search")).to_be_enabled()
    page.locator("#live-search").click()
    expect(page.locator("#live-search")).to_be_enabled()
    assert len(reads) == initial, "Unchanged or too-recent public queries should be cached"
    with page.expect_popup() as popup:
        page.locator(".offer-card a.offer-link").first.click()
    expect(popup.value.locator("body")).to_contain_text("Synthetic navigation only")
    popup.value.close()
    assert len(popup_urls) == 1 and "SYNTHETIC-QA" in popup_urls[0]
    data = feedback(page, "not_bought")
    assert data["steps"] == ["entry", "chat", "complete", "authorized", "candidates", "outbound", "outcome"]
    assert data["outcome_self_reported"] == "not_bought"
    edit(page, "item / service", "PC game: Another synthetic game")
    expect(page.locator("#live-search")).to_have_text("Authorize catalog search")
    expect(page.locator("#live-status")).to_contain_text("needs approval")
    assert len(reads) == initial, "Edited title must be authorized before any new query"
    cancel(page)
    print("DEMAND_QA_GAMES_PREFILL_CACHE_RECONSENT_OUTBOUND_FEEDBACK_CANCEL_OK")


def services(page, site):
    source_time = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
    page.clock.install()
    reads = []
    def source(route):
        query = parse_qs(urlparse(route.request.url).query)
        assert set(query) == {"q", "country", "limit"}
        reads.append(query["q"][0])
        if len(reads) == 2:
            respond(route, {}, 429, {"Retry-After": "120", "Access-Control-Expose-Headers": "Retry-After"})
        else:
            respond(route, {"asOf": source_time, "offers": [{"id": "browser-qa",
                "title": "60-minute massage for one", "status": "active", "city": "Austin",
                "offerUrl": "https://www.groupon.com/deals/synthetic-qa",
                "price": {"fromMinor": 4000, "currency": "USD"}}]})
    page.route("https://api-core.livingsocial.com/**", source)
    open_demand(page, site, "austin-60-minute-massage", "massage", ["USD 150", "just comparing"])
    expect(page.locator("#summary")).to_contain_text("Austin")
    page.locator("#live-search").click()
    card = page.locator(".offer-card").first
    expect(card).to_have_attribute("data-evidence", "api")
    page.clock.fast_forward(8 * 60_000 + 1000)
    expect(page.locator("#live-status")).to_contain_text("rate limited")
    expect(card).to_have_attribute("data-evidence", "stale")
    expect(card).to_have_attribute("data-status", "candidate")
    assert len(reads) == 2
    page.locator("#live-search").click()
    expect(page.locator("#live-status")).to_contain_text("rate limited")
    assert len(reads) == 2, "429 cooldown should suppress repeat traffic"
    page.locator("#revoke-search").click()
    expect(page.locator("#live-status")).to_contain_text("revoked")
    expect(page.locator(".offer-card")).to_have_count(0)
    page.clock.fast_forward(22 * 60_000)
    expect(page.locator("#end-title")).to_have_text("Session expired")
    expect(page.locator("#funnel-steps")).to_be_empty()
    assert len(reads) == 2
    print("DEMAND_QA_SERVICE_EXPIRY_429_STALE_FALLBACK_REVOCATION_CLEAR_OK")


def goods(page, site):
    reads = []
    def empty(route):
        reads.append(route.request.url)
        respond(route, {"items": []})
    page.route("https://prices.openfoodfacts.org/**", empty)
    open_demand(page, site, "oat-milk-pack-price", "oat milk",
                ["USD 35", "Austin, United States", "within 7 days"])
    page.context.set_offline(True)
    page.locator("#live-search").click()
    expect(page.locator("#live-status")).to_contain_text("Offline")
    assert reads == []
    page.context.set_offline(False)
    page.locator("#live-search").click()
    expect(page.locator("#live-status")).to_contain_text("No eligible candidates")
    assert len(reads) == 1 and "Austin" not in reads[0] and "35" not in reads[0]
    data = feedback(page, "no_match")
    assert data["blocker_self_reported"] == "no_match"
    assert "candidates" not in data["steps"] and "outbound" not in data["steps"]
    cancel(page)
    print("DEMAND_QA_DAILY_GOODS_OFFLINE_NO_RESULTS_FEEDBACK_OK")


def electronics(page, site):
    page.goto(urljoin(site, "demand/wired-anc-headphones/"))
    page.locator("#open-chat").click()
    expect(page).to_have_url(site + "#entry=demand_page&topic=wired-anc-headphones")
    expect(page.locator("#hp-preview article")).to_have_count(2)
    page.locator("#hp-start-market").select_option("US")
    page.locator("#hp-start-budget").fill("150")
    page.locator("#start-chat").click()
    expect(page.locator("#live-search")).to_be_hidden()
    expect(page.locator("#summary")).to_contain_text("3.5 mm wired ANC")
    page.locator("#quote-entry summary").click()
    form = page.locator("#quote-form")
    for key, value in {"wiredAnc": "yes", "connector": "3.5 mm", "url": "https://example.test/headphones",
                       "title": "Synthetic wired ANC headphones", "productKind": "headphones", "condition": "new"}.items():
        form.locator(f"[name={key}]").fill(value)
    form.get_by_role("button", name="Add to comparison").click()
    expect(page.locator(".hp-store-card").filter(has_text="Synthetic wired ANC headphones")).to_contain_text("Needs verification")
    data = feedback(page)
    assert "candidates" in data["steps"] and "authorized" not in data["steps"]
    cancel(page)
    print("DEMAND_QA_ELECTRONICS_NO_LIVE_SOURCE_MANUAL_AND_CLEAR_OK")

def social(page, site, source, use_profile):
    traffic = []
    page.on("request", lambda request: traffic.append(request.url)
            if urlparse(request.url).netloc != urlparse(site).netloc else None)
    topic = "oat-milk-pack-price" if use_profile else "lego-batman-pc-editions"
    if use_profile:
        page.goto(urljoin(site, "demand/?entry=" + source + "&click_id=qa_untrusted"))
        guide = page.locator(f'[data-guide="{topic}"]')
        guide.click()
        expect(page.locator("#open-chat")).to_have_attribute(
            "href", "/match-os/?entry=" + source + "&topic=" + topic)
        page.locator("#open-chat").click()
    else:
        page.goto(site + "?entry=" + source + "&topic=" + topic + "&click_id=qa_untrusted")
    expect(page.locator("#reference")).to_be_hidden()
    expect(page.locator("#entry-preview")).to_contain_text("oat milk" if use_profile else "LEGO Batman")
    expect(page.locator("#entry-preview")).not_to_contain_text("qa_untrusted")
    page.locator("#start-chat").click()
    for answer in ("USD 70", "Seattle, United States", "this week"):
        reply(page, answer)
    expect(page.locator("#review")).to_be_visible()
    expect(page.locator("#topic-evidence a").first).to_be_visible()
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    data = feedback(page, "missing_terms", source)
    assert data["topic"] == topic
    assert set(data["steps"]) == {"entry", "chat", "complete", "outcome"}
    assert not traffic, "Loading, opening and previewing a social request must stay local"
    submissions = []
    def receive(route):
        submissions.append(parse_qs(route.request.post_data))
        route.fulfill(status=200, content_type="text/html", body="<p>QA interception</p>")
    page.context.route("https://formsubmit.co/**", receive)
    with page.expect_popup() as popup:
        page.get_by_role("button", name="Send this summary via FormSubmit").click()
    popup.value.wait_for_load_state()
    assert len(submissions) == 1 and set(submissions[0]) == {"_subject", "pilot_feedback"}
    assert json.loads(submissions[0]["pilot_feedback"][0]) == data
    assert "Seattle" not in json.dumps(submissions) and "qa_untrusted" not in json.dumps(submissions)
    popup.value.close()
    cancel(page)
    expect(page.locator("#feedback-payload")).to_have_value("")
    print("SOCIAL_ROUTE_AND_VOLUNTARY_FUNNEL_OK", source, topic, flush=True)
