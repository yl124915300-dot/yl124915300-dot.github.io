/* Policy Radar UK — eligibility guidance source freshness gate.
 * This is a safety interlock, NOT an entitlement assessment.
 * Keep this module dependency-free and unit-testable in Node.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PolicyRadarSourceGuard = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const REQUIRED = [
    "warm-home-discount",
    "warm-home-discount-suppliers",
    "warm-home-discount-eligibility-statement-2026"
  ];
  const MAX_AGE_MS = 48 * 60 * 60 * 1000;
  const CLOCK_TOLERANCE_MS = 5 * 60 * 1000;
  function check(snapshot, nowMillis) {
    const now = Number.isFinite(nowMillis) ? nowMillis : Date.now();
    if (!snapshot || snapshot.schema_version !== 1 || !Array.isArray(snapshot.sources)) {
      return { ok: false, reason: "official-source snapshot missing or invalid" };
    }
    const checked = Date.parse(snapshot.last_checked_utc || "");
    if (!Number.isFinite(checked) || checked > now + CLOCK_TOLERANCE_MS ||
        now - checked > MAX_AGE_MS) {
      return { ok: false, reason: "official-source checks are more than 48 hours old or have an invalid timestamp" };
    }
    for (const id of REQUIRED) {
      const row = snapshot.sources.find(x => x && x.id === id);
      if (!row || row.fetch_status !== "ok" ||
          !/^[a-f0-9]{64}$/i.test(row.content_sha256 || "")) {
        return { ok: false, reason: "required official source missing or failed: " + id };
      }
      const success = Date.parse(row.last_success_utc || "");
      if (!Number.isFinite(success) || success > now + CLOCK_TOLERANCE_MS ||
          now - success > MAX_AGE_MS) {
        return { ok: false, reason: "required official source was not recently verified: " + id };
      }
      if (row.pending_human_review === true) {
        return { ok: false, reason: "official guidance changed and awaits editorial review: " + id };
      }
    }
    return { ok: true, last_checked_utc: snapshot.last_checked_utc };
  }
  return { check, REQUIRED: REQUIRED.slice() };
});
