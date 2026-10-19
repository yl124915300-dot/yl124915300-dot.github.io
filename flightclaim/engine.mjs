// FlightClaim Agent V0 — auditable, deterministic and deliberately conservative EU261 self-help screening.
// This is not an airline claim, legal opinion, outcome guarantee, or verification of flight facts.
export const RULESET_VERSION = "EU261 / 2004 Regulation and related case law; assessed 2026-10-19. EU 2026/2202 applies from 2027-10-23.";
export const SOURCES = Object.freeze({
  eu: "https://europa.eu/youreurope/citizens/travel/passenger-rights/air/",
  regulation: "https://eur-lex.europa.eu/eli/reg/2004/261/oj/eng",
  future: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex:32026R2202",
  uk: "https://www.caa.co.uk/air-passengers/travel-problems-and-rights/travel-complaints/making-a-claim/claiming-for-costs-and-compensation/",
  easyjet: "https://www.easyjet.com/en/claim/EU261",
  ryanair: "https://help.ryanair.com/hc/en-us/sections/12488602662545-EU-261-Passenger-Rights"
});
const nonneg = (v) => v === "" || v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Math.max(0, Number(v));
const known = (v) => v !== "" && v !== null && v !== undefined;
const eligibleCause = new Set(["airline_technical", "airline_operations"]);

export function assess(raw = {}) {
  const x = raw || {};
  const reasons = [], questions = [], cautions = [];
  let category = "REVIEW_REQUIRED", amount = null;
  let compensation = "REVIEW_REQUIRED";
  let refund = false, care = false;
  const departure = nonneg(x.departureDelay), arrival = nonneg(x.arrivalDelay);
  const cancelDays = nonneg(x.cancellationNoticeDays);
  const scope = String(x.scope || "unknown");
  const disruption = String(x.disruption || "unknown");
  const cause = String(x.cause || "unknown");
  const add = (code, message) => reasons.push({ code, message });
  const done = () => ({
    category, compensation, refundPossible: refund, carePossible: care,
    indicativeAmountEUR: amount, reasons, questions, cautions,
    ruleset: RULESET_VERSION,
    disclaimer: "Indicative self-help assessment only. Flight facts, carrier evidence, local deadlines, connection details and court decisions may change the result. You can claim directly from the airline for free."
  });

  if (scope === "uk_only") {
    category = "NOT_SUPPORTED"; compensation = "NOT_SUPPORTED";
    add("UK_ONLY", "UK-only journeys are not assessed by this EU checker; use the UK CAA guidance.");
    return done();
  }
  if (scope === "outside" || scope === "inbound_non_eu") {
    category = "GENERALLY_UNLIKELY"; compensation = "GENERALLY_UNLIKELY";
    add("EU_SCOPE_NOT_MET", "The stated route or operating-carrier combination is not usually covered by EU261.");
    cautions.push("Other national passenger-rights laws may still apply.");
    return done();
  }
  if (scope !== "eu_departure" && scope !== "inbound_eligible") {
    add("SCOPE_UNKNOWN", "EU/EEA/Swiss coverage and operating carrier must be verified.");
    questions.push("Was the departure in EU/EEA/Switzerland, or did an eligible carrier operate the inbound flight?");
    return done();
  }
  add("EU_SCOPE_POSSIBLE", "The selected route/operating-carrier class may fall within EU261.");
  if (x.connection === "unknown") {
    cautions.push("For connections, the final destination and single-reservation conditions may change the outcome.");
  }
  if (departure !== null && departure >= 5 && x.notTraveled === "yes") {
    refund = true;
    add("DELAY_REFUND_OPTION", "A five-hour-or-longer departure delay may allow reimbursement of unused travel if you choose not to travel.");
  }
  // Assistance threshold depends on distance: 2h / 3h / 4h under Article 6.
  const careThreshold = x.distance === "short" ? 2 : (x.distance === "medium" || (x.distance === "long" && x.intraEU === "yes")) ? 3 : x.distance === "long" ? 4 : null;
  if (departure !== null && careThreshold !== null && departure >= careThreshold) care = true;
  else if (departure !== null && departure >= 2 && careThreshold === null) questions.push("Distance is needed to evaluate the 2/3/4-hour duty-of-care threshold.");
  if (disruption === "cancellation") {
    refund = true;
    care = true;
    add("CANCELLATION_CHOICES", "A cancellation usually triggers a choice of ticket reimbursement or re-routing, plus assistance subject to the rules. A refund is not the same as compensation.");
    if (cancelDays === null) {
      add("NOTICE_UNKNOWN", "The cancellation notice period is essential for fixed-rate compensation.");
      questions.push("How many days before departure were you notified of cancellation?");
    } else if (cancelDays >= 14) {
      category = "GENERALLY_UNLIKELY"; compensation = category;
      add("NOTICE_14_DAYS", "Fixed-rate EU261 cancellation compensation is generally not due when notified at least 14 days before departure.");
    } else if (!known(x.rerouteEarlyDeparture) || !known(x.rerouteArrivalLate)) {
      add("REROUTING_UNKNOWN", "Cancellation compensation depends on notice time and replacement-flight timing.");
      questions.push("Did the airline offer an alternative flight, and when did it depart/arrive relative to the original?");
    } else {
      const early = nonneg(x.rerouteEarlyDeparture), late = nonneg(x.rerouteArrivalLate);
      const timely = cancelDays >= 7 ? (early <= 2 && late < 4) : (early <= 1 && late < 2);
      if (timely) {
        category = "GENERALLY_UNLIKELY"; compensation = category;
        add("REROUTING_EXCEPTION", "The supplied timely replacement-flight schedule may eliminate fixed-rate cancellation compensation.");
      } else {
        category = "POSSIBLY_ELIGIBLE"; compensation = category;
        add("CANCELLATION_TIMING", "The reported short notice and alternative-flight schedule may support compensation, subject to cause and evidence.");
      }
    }
  } else if (disruption === "delay") {
    if (arrival === null) {
      add("ARRIVAL_UNKNOWN", "The delay at the FINAL destination, not just departure, determines ordinary fixed-rate delay compensation.");
      questions.push("How many hours late did you reach the final destination on the same reservation?");
    } else if (arrival < 3) {
      category = "GENERALLY_UNLIKELY"; compensation = category;
      add("ARRIVAL_BELOW_THREE", "A final arrival delay below three hours generally does not qualify for fixed-rate EU261 delay compensation.");
    } else {
      category = "POSSIBLY_ELIGIBLE"; compensation = category;
      add("ARRIVAL_THREE_PLUS", "A final arrival delay of three hours or more may support compensation if no exempting circumstances apply.");
    }
  } else if (disruption === "denied") {
    care = true;
    if (x.involuntary !== "yes" || x.checkedIn !== "yes") {
      add("DENIED_NEEDS_FACTS", "Eligibility requires involuntary denied boarding, valid booking and timely check-in unless an exception applies.");
      questions.push("Was boarding refused involuntarily despite valid documents and timely check-in?");
    } else {
      category = "POSSIBLY_ELIGIBLE"; compensation = category;
      add("INVOLUNTARY_DENIED", "Involuntary denied boarding may trigger compensation, rerouting/refund choices and care.");
      refund = true;
    }
  } else {
    add("TYPE_UNKNOWN", "Select the type of disruption before making a determination.");
    questions.push("Was the flight delayed, cancelled, or were you denied boarding?");
  }

  // Do not wrongly convert an ATC or weather explanation into an automatic refusal.
  if (category === "POSSIBLY_ELIGIBLE") {
    if (!eligibleCause.has(cause)) {
      category = "REVIEW_REQUIRED"; compensation = category;
      add(cause === "atc" || cause === "weather" ? "EXTRAORDINARY_MAY_APPLY" : "CAUSE_UNVERIFIED",
        "The cause and the carrier's evidence need individual review; weather/ATC can sometimes excuse fixed-rate payment.");
    }
  }
  if (category === "REVIEW_REQUIRED" && (cause === "atc" || cause === "weather")) {
    add("EXTRAORDINARY_FACTS", "Extraordinary-circumstance defenses must be assessed case by case, not assumed.");
  }
  if (category === "POSSIBLY_ELIGIBLE" && disruption !== "cancellation") {
    if (x.distance === "short") amount = 250;
    else if (x.distance === "medium" || (x.distance === "long" && x.intraEU === "yes")) amount = 400;
    else if (x.distance === "long" && x.intraEU !== "yes") amount = disruption === "delay" && arrival !== null && arrival < 4 ? 300 : 600;
  }
  if (disruption === "cancellation") cautions.push("Amount reductions, rerouting and relevant court rulings require case-specific review.");
  cautions.push("Service providers may charge fees; you can first claim directly from the airline for free.");
  return done();
}

export function evidenceChecklist(x = {}) {
  const all = [
    "Booking confirmation and flight itinerary (keep passenger details private until required by airline)",
    "Scheduled and actual arrival time at your FINAL destination",
    "Airline's written explanation of the disruption",
    "Boarding pass and any rebooking/connection evidence",
    "Screenshots or written record of any airline response"
  ];
  if (x.disruption === "cancellation") all.push("When cancellation notice arrived and alternate-flight details");
  if (x.disruption === "denied") all.push("Evidence of timely check-in, valid reservation and involuntary denial");
  if (x.departureDelay >= 2 || x.disruption === "cancellation") all.push("Reasonable food, hotel and ground-transport receipts if seeking expenses");
  return all;
}

export function claimLetter(x = {}, r = assess(x)) {
  const delay = nonneg(x.arrivalDelay);
  return [
    "Subject: Request for airline review under Regulation (EC) No 261/2004",
    "",
    "To: [Operating airline's official compensation/customer-relations team]",
    "From: [Your full name — fill in privately]",
    "Booking reference: [Fill in only on airline's secure form]",
    "Flight: " + (x.flightNumber || "[flight number]") + ", travel date " + (x.flightDate || "[date]"),
    "Route: " + (x.origin || "[departure airport]") + " to " + (x.destination || "[final destination]"),
    "",
    "Dear Customer Relations Team,",
    "Please review my passenger-rights claim in relation to this flight.",
    "Disruption type: " + (x.disruption || "[type]") + ".",
    "Final arrival delay: " + (delay === null ? "[to be confirmed]" : delay + " hours") + ".",
    "Reported cause: " + (x.cause || "not confirmed") + ".",
    "",
    "I request your written assessment of my rights to statutory compensation, ticket reimbursement (where applicable), and reimbursement of reasonable care expenses as separate matters. Please identify the factual reason and any extraordinary-circumstance evidence on which you rely.",
    "",
    "This letter is a preparation aid, not a filed claim. I will submit accurate personal and booking details through your official channel.",
    "Attached/provided separately: [boarding pass] [booking confirmation] [receipts] [other evidence].",
    "",
    "Sincerely,",
    "[Your name]",
    "",
    "Preliminary local-only checker category: " + r.category + "; not a final legal determination.",
    "EU guidance: " + SOURCES.eu
  ].join("\n");
}
