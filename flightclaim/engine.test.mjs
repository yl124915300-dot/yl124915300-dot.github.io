import test from "node:test";
import assert from "node:assert/strict";
import { assess, evidenceChecklist, claimLetter, SOURCES } from "./engine.mjs";

const base = {
  scope: "eu_departure", disruption: "delay", arrivalDelay: 4, departureDelay: 4,
  cause: "airline_technical", distance: "short", intraEU: "yes"
};
const run = (x) => assess({ ...base, ...x });

test("EU outbound, final delay 4h, airline technical issue: possible €250", () => {
  const r = run({});
  assert.equal(r.category, "POSSIBLY_ELIGIBLE");
  assert.equal(r.indicativeAmountEUR, 250);
});
test("Departure delay 4h cannot substitute for final arrival 3h", () => {
  assert.equal(run({ arrivalDelay: 2.5 }).category, "GENERALLY_UNLIKELY");
});
test("ATC stated as reason requires review, not automatic exclusion", () => {
  const r = run({ cause: "atc" });
  assert.equal(r.category, "REVIEW_REQUIRED");
  assert.equal(r.indicativeAmountEUR, null);
});
test("Inbound non-EU operated flight generally outside EU261", () => {
  assert.equal(run({ scope: "inbound_non_eu" }).category, "GENERALLY_UNLIKELY");
});
test("UK-only route unsupported, links CAA", () => {
  assert.equal(run({ scope: "uk_only" }).category, "NOT_SUPPORTED");
  assert.match(SOURCES.uk, /caa/);
});
test("Long haul 3.5h delay gets indicative €300 if eligible", () => {
  assert.equal(run({ distance: "long", intraEU: "no", arrivalDelay: 3.5 }).indicativeAmountEUR, 300);
});
test("Long haul 4.5h delay gets indicative €600 if eligible", () => {
  assert.equal(run({ distance: "long", intraEU: "no", arrivalDelay: 4.5 }).indicativeAmountEUR, 600);
});
test("Unknown distance does not generate invented award", () => {
  assert.equal(run({ distance: "unknown" }).indicativeAmountEUR, null);
});
test("Cancellation notice 14 days before: no fixed-rate compensation but refund choice", () => {
  const r = run({ disruption: "cancellation", cancellationNoticeDays: 14 });
  assert.equal(r.category, "GENERALLY_UNLIKELY");
  assert.equal(r.refundPossible, true);
});
test("Cancellation within 7 days, timely reroute: generally no fixed compensation", () => {
  const r = run({ disruption: "cancellation", cancellationNoticeDays: 5, rerouteEarlyDeparture: 1, rerouteArrivalLate: 1 });
  assert.equal(r.category, "GENERALLY_UNLIKELY");
});
test("Cancellation within 7 days, late reroute and airline cause: potentially eligible", () => {
  const r = run({ disruption: "cancellation", cancellationNoticeDays: 5, rerouteEarlyDeparture: 2, rerouteArrivalLate: 5 });
  assert.equal(r.category, "POSSIBLY_ELIGIBLE");
  assert.equal(r.indicativeAmountEUR, null);
});
test("Cancellation missing rerouting must be reviewed, no fabricated award", () => {
  const r = run({ disruption: "cancellation", cancellationNoticeDays: 5, rerouteEarlyDeparture: "", rerouteArrivalLate: "" });
  assert.equal(r.category, "REVIEW_REQUIRED");
});
test("Departure >=5h, did not travel: possible unused ticket refund separately", () => {
  const r = run({ arrivalDelay: "", departureDelay: 5.5, notTraveled: "yes" });
  assert.equal(r.refundPossible, true);
  assert.equal(r.category, "REVIEW_REQUIRED");
});
test("Care flag and checklist tied to disruption", () => {
  const r = run({ departureDelay: 2.5, arrivalDelay: 1 });
  assert.equal(r.carePossible, true);
  assert.ok(evidenceChecklist({ disruption: "cancellation" }).some(s => s.includes("notice")));
});
test("Generated claim letter has placeholders and is not a submitted airline claim", () => {
  const text = claimLetter({ ...base, flightNumber: "EZY123", flightDate: "2026-10-18" });
  assert.match(text, /EZY123/);
  assert.match(text, /not a filed claim/i);
  assert.match(text, /\[Your full name/);
});

test("Medium-distance routes require 3h departure delay for routine care assistance", () => {
  assert.equal(run({ distance: "medium", departureDelay: 2.5 }).carePossible, false);
  assert.equal(run({ distance: "medium", departureDelay: 3 }).carePossible, true);
});
test("Long non-intra-EU routes require 4h departure delay for routine care assistance", () => {
  assert.equal(run({ distance: "long", intraEU: "no", departureDelay: 3.5 }).carePossible, false);
  assert.equal(run({ distance: "long", intraEU: "no", departureDelay: 4 }).carePossible, true);
});
test("Unknown distance does not invent a fixed care eligibility threshold", () => {
  const r = run({ distance: "unknown", departureDelay: 2.5 });
  assert.equal(r.carePossible, false);
  assert.ok(r.questions.some(q => q.includes("2/3/4-hour")));
});
