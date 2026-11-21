import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const base = new URL(".", import.meta.url);
const read = name => fs.readFileSync(new URL(name, base), "utf8");
const entries = JSON.parse(read("rules-directory.json"));
const html = read("refunds.html");
const service = read("service.html");
const site = read("sitemap.xml");
test("public refund directory covers distinct official rule families", () => {
  assert.equal(entries.public_entries.length, 13);
  const ids = entries.public_entries.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const r of entries.public_entries) {
    assert.ok(r.title && r.category && r.region && r.official_source);
    const source = new URL(r.official_source);
    assert.equal(source.protocol, "https:");
    assert.match(html, new RegExp('id="'+r.id+'"'));
    assert.equal(r.paid_service_available, false);
    assert.equal(r.fee_for_official_claim, 0);
  }
});
test("no live checkout or hidden case data submissions", () => {
  assert.equal(entries.payments.state, "CLOSED_UNVERIFIED");
  assert.equal(entries.no_private_case_upload, true);
  assert.doesNotMatch(html, /<form\b|fetch\s*\(|XMLHttpRequest|sendBeacon|<script\b[^>]*src=/i);
  assert.match(html, /尚未开放收费|暂不接受订单/);
  assert.match(service, /disabled/);
});
test("navigation and discovery include the directory", () => {
  for(const page of ["index.html","radar.html","service.html"]) {
    assert.match(read(page), /href="\.\/refunds\.html"/);
  }
  assert.match(site, /\/flightclaim\/refunds\.html/);
});

test("denial guidance stays free and has a voluntary enquiry rather than checkout", () => {
  const denied = read("denied.html");
  assert.match(denied, /<h1>Airline rejected your EU261 claim\?<\/h1>/);
  assert.match(denied, /Currently not for sale/);
  assert.match(denied, /europa\.eu\/youreurope\/citizens\/travel\/passenger-rights\/air/);
  assert.match(denied, /transport\.ec\.europa\.eu\/transport-themes\/passenger-rights\/national-enforcement-bodies-neb/);
  assert.doesNotMatch(denied, /<form\b|fetch\s*\(|XMLHttpRequest|sendBeacon/i);
  assert.match(read("refunds.html"), /href="\.\/denied\.html"/);
  assert.match(read("service.html"), /href="\.\/denied\.html"/);
  assert.match(read("radar.html"), /href="\.\/denied\.html"/);
  assert.match(read("sitemap.xml"), /\/flightclaim\/denied\.html/);
});
