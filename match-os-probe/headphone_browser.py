"""Headphone social landing and local session acceptance; no real buyer or order."""
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

from playwright.sync_api import expect

ENTRY = "?entry=pinterest_pin&topic=wired-anc-headphones&qa=1"
TEST_TIME = datetime(2026, 11, 17, 5, 43, tzinfo=timezone.utc)
XM5_URL = "https://www.bhphotovideo.com/c/product/1706293-REG/sony_6505727_sony_wh_1000xm5_wireless_noise_canceling.html"
CH730N_URL = "https://www.bhphotovideo.com/c/product/1998821-REG/sony_whch730n_b_whch730n_wireless_noise_canceling_over_ear.html"


def headphone_session(page, site, touch=False):
    origins = []
    def record(request):
        if urlparse(request.url).netloc != urlparse(site).netloc:
            origins.append(request.url)
    page.on("request", record)
    page.clock.install(time=TEST_TIME)
    page.goto(site + ENTRY)
    expect(page.locator("#hp-preview")).to_contain_text("Sony WH-1000XM4")
    expect(page.locator("#hp-preview")).to_contain_text("soundcore Space Q45")
    expect(page.locator("#reference")).to_be_hidden()
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    if touch:
        cta = page.locator("#start-chat").bounding_box()
        view = page.locator("#scroll").bounding_box()
        assert cta["y"] + cta["height"] <= view["y"] + view["height"], (cta, view)

    page.locator("#hp-start-market").select_option("US")
    page.locator("#hp-start-budget").fill("150")
    action = lambda locator: locator.tap() if touch else locator.click()
    action(page.locator("#start-chat"))
    expect(page.locator(".hp-model-card")).to_have_count(4)
    expect(page.locator(".hp-model-card[data-selected=true]")).to_have_attribute("data-model", "ch730n")
    stores = page.locator(".hp-stores")
    expect(stores).to_contain_text("WHCH730N/B")
    expect(stores).to_contain_text("USD 98")
    expect(stores.locator("dl")).to_contain_text("Delivered total")
    expect(stores.locator("dl")).to_contain_text("Unknown")
    expect(stores.locator("a[data-purchase-path]")).to_have_attribute("href", CH730N_URL)
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    expect(page.locator(".hp-table")).to_contain_text("Built-in mic with cable")
    expect(page.locator(".hp-table")).to_contain_text("Audio with power off")
    expect(page.locator("#live-search")).to_be_hidden()
    ref = page.locator("#ref").text_content()

    page.locator("#hp-budget").fill("420")
    action(page.locator("[data-headphone-select=xm5]"))
    expect(stores.locator(".hp-store-card")).to_have_count(2)
    expect(stores.locator("[data-merchant='B&H Photo']")).to_contain_text("USD 398")
    expect(stores.locator("[data-merchant='BuyDig']")).to_contain_text("USD 398")
    expect(stores.locator("[data-merchant='BuyDig']")).to_contain_text("Unknown")

    page.locator("#hp-budget").fill("200")
    expect(page.locator(".hp-model-card[data-model=xm5]")).to_have_attribute("data-fit", "conflict")
    expect(page.locator("#hp-changes")).to_contain_text("Budget updated to USD 200")
    page.locator("#hp-budget").fill("420")
    page.locator("#rank-profile").select_option("price")
    expect(page.locator("#hp-changes")).to_contain_text("Ranking updated: Lower known cost")
    page.locator("#hp-deadline").fill("2026-11-18")
    expect(page.locator("#hp-changes")).to_contain_text("Deadline changed")
    action(stores.locator("button[data-headphone-handoff]"))
    expect(page.locator("#sharing")).to_be_visible()
    expect(page.locator('#payload input[name="when"]')).to_have_value("2026-11-18")

    action(page.locator("#hp-controls label").filter(has_text="Built-in mic over cable"))
    expect(page.locator(".hp-model-card[data-model=xm5]")).to_contain_text("Excluded: Built-in microphone over cable")
    expect(page.locator(".hp-model-card[data-model=q45]")).to_have_attribute("data-fit", "pending")
    action(page.locator("#hp-controls label").filter(has_text="Built-in mic over cable"))

    page.locator("#hp-market").select_option("GB")
    expect(stores.locator(".hp-store-card")).to_have_count(0)
    expect(page.locator("#hp-currency")).to_have_value("GBP")
    page.locator("#hp-market").select_option("US")
    expect(stores.locator(".hp-store-card")).to_have_count(2)
    expect(page.locator("#ref")).to_have_text(ref)
    assert not origins, origins

    page.context.set_offline(True)
    expect(page.locator("#live-status")).to_contain_text("Offline")
    expect(stores.locator(".hp-store-card")).to_have_count(2)
    page.context.set_offline(False)
    # External navigation is intercepted so a synthetic acceptance never looks like a buyer.
    seller = stores.locator('a[href="' + XM5_URL + '"]')
    expect(seller).to_be_visible()
    page.context.route(XM5_URL, lambda route: route.fulfill(status=200, body="Synthetic merchant handoff"))
    with page.expect_popup() as popup:
        action(seller)
    expect(popup.value).to_have_url(XM5_URL)
    popup.value.close()

    page.clock.fast_forward(3 * 60_000)
    expect(stores.locator('[data-state="stale"]')).to_have_count(2)
    expect(stores.locator('[data-state="stale"]').first).to_contain_text("historical listed price")

    action(page.locator("#close"))
    action(page.locator("#cancel"))
    expect(page.locator("#end-title")).to_have_text("Session closed")
    expect(page.locator("#hp-changes")).to_be_empty()
    expect(page.locator("#live-results")).to_be_empty()
    expect(page.locator("#messages")).to_be_empty()
    expect(page.locator("#ref")).to_be_empty()
    print("HEADPHONES_SOCIAL_COMPARISON_BUDGET_MARKET_FEATURES_OFFLINE_EXPIRY_OUTBOUND_CANCEL_OK", flush=True)


def headphone_ttl(page, site):
    page.clock.install(time=TEST_TIME)
    page.goto(site + ENTRY)
    page.locator("#hp-start-market").select_option("US")
    page.locator("#hp-start-budget").fill("420")
    page.locator("#start-chat").click()
    expect(page.locator(".hp-model-card")).to_have_count(4)
    page.locator("[data-headphone-select=xm5]").click()
    page.locator("#quote-entry summary").click()
    form = page.locator("#quote-form")
    for key, value in {
        "url": "https://example.test/manual", "title": "QA quote", "merchant": "QA shop",
        "model": "WH-1000XM5", "modelCode": "WH1000XM5/B", "amount": "500", "currency": "USD",
        "productKind": "headphones", "wiredAnc": "yes", "analogAudio": "yes", "observedAt": "2026-11-17",
    }.items():
        form.locator(f"[name={key}]").fill(value)
    form.get_by_role("button", name="Add to comparison").click()
    card = page.locator('[data-merchant="QA shop"]')
    expect(card).to_have_attribute("data-state", "conflict")
    form.locator('[name="amount"]').fill("390")
    form.get_by_role("button", name="Add to comparison").click()
    expect(card).to_have_count(1)
    expect(card).to_have_attribute("data-state", "pending")
    expect(card).to_contain_text("USD 390")
    page.clock.fast_forward(30 * 60_000)
    expect(page.locator("#end-title")).to_have_text("Session expired")
    expect(page.locator("#live-results")).to_be_empty()
    expect(page.locator("#quote-fields")).to_be_empty()
    expect(page.locator("#hp-budget")).to_have_value("")
    expect(page.locator("#ref")).to_be_empty()
    assert page.evaluate("Object.keys(sessionStorage).filter(key => key.startsWith('matchos:')).length === 0")
    print("HEADPHONES_MANUAL_PRICE_CHANGED_AND_30_MINUTE_CLEAR_OK", flush=True)
