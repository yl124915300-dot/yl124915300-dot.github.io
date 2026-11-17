"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { check, REQUIRED } = require("../eligibility-source-guard.js");

const NOW = Date.parse("2026-11-17T12:00:00Z");
const iso = ms => new Date(ms).toISOString();
function snapshot() {
  return {
    schema_version: 1,
    last_checked_utc: iso(NOW - 5 * 60 * 1000),
    sources: REQUIRED.map(id => ({
      id,
      fetch_status: "ok",
      content_sha256: "a".repeat(64),
      last_success_utc: iso(NOW - 5 * 60 * 1000),
      pending_human_review: false
    }))
  };
}
test("recent complete official-source snapshot enables decision aid", () => {
  const r = check(snapshot(), NOW);
  assert.equal(r.ok, true);
  assert.equal(r.last_checked_utc, iso(NOW - 5*60*1000));
});
test("missing official source blocks decision aid", () => {
  const x=snapshot(); x.sources.pop();
  const r=check(x,NOW);
  assert.equal(r.ok,false);
  assert.match(r.reason,/missing or failed/);
});
test("HTTP fetch error status blocks decision aid", () => {
  const x=snapshot(); x.sources[0].fetch_status="error";
  assert.equal(check(x,NOW).ok,false);
});
test("changed government source pending human review blocks decisions", () => {
  const x=snapshot(); x.sources[1].pending_human_review=true;
  const r=check(x,NOW);
  assert.equal(r.ok,false);assert.match(r.reason,/editorial review/);
});
test("stale global source snapshot blocks decisions", () => {
  const x=snapshot(); x.last_checked_utc=iso(NOW-49*60*60*1000);
  assert.equal(check(x,NOW).ok,false);
});
test("stale individual source blocks decisions even when global snapshot recent", () => {
  const x=snapshot();x.sources[2].last_success_utc=iso(NOW-49*60*60*1000);
  const r=check(x,NOW);
  assert.equal(r.ok,false);assert.match(r.reason,/not recently verified/);
});
test("future date outside clock tolerance blocks decisions", () => {
  const x=snapshot();x.last_checked_utc=iso(NOW+10*60*1000);
  assert.equal(check(x,NOW).ok,false);
});
test("malformed content fingerprint blocks decisions", () => {
  const x=snapshot();x.sources[0].content_sha256="not-a-hash";
  assert.equal(check(x,NOW).ok,false);
});
test("null or unexpected schema blocks decisions", () => {
  assert.equal(check(null,NOW).ok,false);
  const x=snapshot();x.schema_version=2;
  assert.equal(check(x,NOW).ok,false);
});
test("checker defaults button to disabled until official verification succeeds", () => {
  const html=fs.readFileSync(path.join(__dirname,"..","warm-home-discount-checker.html"),"utf8");
  assert.match(html,/id="check-action" disabled/);
  assert.match(html,/src="\.\/eligibility-source-guard\.js"/);
  assert.match(html,/window\.PolicyRadarSourceGuard/);
  assert.match(html,/if\(!guidanceReady\)/);
  assert.match(html,/www\.gov\.uk\/the-warm-home-discount-scheme\/get-help/);
});
