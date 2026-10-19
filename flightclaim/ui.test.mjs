import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const dom = new JSDOM(html, {
  url: "https://flightclaim.example/flightclaim/",
  pretendToBeVisual: true,
  runScripts: "outside-only"
});
dom.window.scrollTo = () => {};
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document, location: dom.window.location,
  history: dom.window.history, localStorage: dom.window.localStorage,
  FormData: dom.window.FormData, confirm: () => true
});
Object.defineProperty(globalThis, "navigator", {
  configurable: true, value: dom.window.navigator
});
await import("./app.mjs");
const $ = selector => document.querySelector(selector);
const value = (name, input) => { $("#wizardForm").elements.namedItem(name).value = input; };

test("anonymous wizard validates, evaluates EU delay, prepares letter and creates a local-only case", () => {
  assert.equal($("#view-home").hidden, false);
  document.querySelector('nav [data-nav="checker"]').click();
  assert.equal($("#view-checker").hidden, false);
  $("#nextStep").click();
  assert.equal($("#wizardError").hidden, false, "scope is required");
  value("scope", "eu_departure");
  value("flightNumber", "EZY1234");
  value("flightDate", "2026-10-18");
  value("origin", "CDG");
  value("destination", "VIE");
  $("#nextStep").click();
  assert.match($("#stepLabel").textContent, /2 of 5/);
  assert.equal($("#wizardError").hidden, true, "previous validation must clear after correction");

  value("disruption", "delay");
  $("#nextStep").click();
  value("arrivalDelay", "4");
  value("departureDelay", "4");
  $("#nextStep").click();
  value("cause", "airline_technical");
  value("distance", "short");
  $("#nextStep").click();
  assert.match($("#resultState").textContent, /Potential claim/);
  assert.match($("#letterText").value, /EZY1234/);
  assert.match($("#letterText").value, /not a filed claim/i);
  assert.equal($("#amountNote").hidden, true, "amount must be opt-in");
  const amountButton = [...$("#resultState").querySelectorAll("button")].find(el => /Show possible amount/.test(el.textContent));
  assert.ok(amountButton);
  amountButton.click();
  assert.match($("#amountNote").textContent, /€250/);

  $("#saveDraft").click();
  const drafts = JSON.parse(localStorage.getItem("flightclaim_v0_local_drafts"));
  assert.equal(drafts.length, 1);
  assert.match(drafts[0].ref, /^FC-LOCAL-/);
  assert.equal(drafts[0].status, "DRAFT");
  assert.equal(drafts[0].answers.flightNumber, "EZY1234");

  document.querySelector('nav [data-nav="drafts"]').click();
  assert.match($("#draftList").textContent, /LOCAL ONLY/);
  assert.match($("#draftList").textContent, /EZY1234/);
  const card = $("#draftList .draft");
  card.querySelector("select").value = "SENT_BY_TRAVELER";
  card.querySelector("textarea").value = "Submitted directly to airline";
  [...card.querySelectorAll("button")].find(el => /Save my manual notes/.test(el.textContent)).click();
  const saved = JSON.parse(localStorage.getItem("flightclaim_v0_local_drafts"));
  assert.equal(saved[0].status, "SENT_BY_TRAVELER");
  [...card.querySelectorAll("button")].find(el => el.textContent === "Delete").click();
  assert.equal(JSON.parse(localStorage.getItem("flightclaim_v0_local_drafts")).length, 0);
  const newCheck = document.querySelector('[data-new-check="true"]');
  assert.ok(newCheck);
  newCheck.click();
  assert.match($("#stepLabel").textContent, /1 of 5/, "new check starts at first step");
  assert.equal($("#wizardForm").elements.namedItem("scope").value, "", "previous flight scope cleared");
  assert.equal($("#wizardForm").elements.namedItem("arrivalDelay").value, "", "previous delay cleared");
  assert.equal($("#letterText").value, "", "old claim letter removed");
});
