// Public editorial presets: only these topic IDs may be read from a URL.
export const topics = Object.freeze({
  'wired-anc-headphones': {
    category: 'electronics', label: 'Electronics', item: 'Over-ear headphones',
    title: 'Headphones that keep noise cancellation on with a 3.5 mm cable',
    description: 'Check wired ANC, connector and battery behavior before comparing headphone listings.',
    details: '3.5 mm wired ANC required',
    problem: 'A listing can say “wired and wireless” and “noise cancelling” without saying whether both work at once. This matters on a plane seat jack or a work computer where Bluetooth is disabled.',
    checks: [
      ['Exact connection', 'Find the manufacturer manual for the exact model number. Check 3.5 mm analogue audio; USB-C charging by itself does not indicate USB-C audio.'],
      ['Active cancellation on cable', 'Look for an explicit wired-mode ANC statement and whether the headset has to be switched on. Treat passive sound isolation and Bluetooth-only ANC as separate features.'],
      ['What you actually pay', 'Match model, condition and region; compare the included cable, shipping, tax and return window. Ask whether the mic or controls work in wired mode if you need them.'],
      ['Sony WH-1000XM4 (manual-verified)', 'Sony explicitly permits noise cancelling through its supplied 3.5 mm headphone cable while the headset is powered on. If powered off, wired audio can still work but ANC cannot. This is evidence for the WH-1000XM4 model only.'],
      ['soundcore Space Q45 (FAQ-verified)', 'soundcore says the Space Q45 can activate noise cancelling by pressing the NC button after its AUX cable is connected. This confirms the wired ANC behavior for the Q45, not a current price, bundled cable, stock or delivery promise.'],
    ],
    next: 'Check the manufacturer’s wired-mode instructions, then add the exact shop listings you’re comparing. Match model, condition and included cable before comparing delivered cost.',
    gap: 'This route has no approved live electronics retailer feed. Bring a public listing or a quote; stock, delivery, total and wired ANC remain pending until the listing and manual support them.',
    output: 'A side-by-side comparison of model, connector, wired ANC, condition and total when supplied, with conflicts and missing evidence marked.',
    sources: [['Sony WH-1000XM4 official manual: headphone cable and powered ANC', 'https://helpguide.sony.net/mdr/wh1000xm4/v1/en/contents/TP0002752734.html'], ['soundcore Space Q45 official FAQ: ANC with AUX cable', 'https://service.soundcore.com/article-description/soundcore-Space-Q45-Headphones-FAQ']],
  },
  'oat-milk-pack-price': {
    category: 'consumables', label: 'Everyday goods', item: 'Grocery: oat milk',
    title: 'Compare oat milk multipacks by actual price per litre',
    description: 'Compare the same oat milk variant and package, separate dated shelf prices from delivered totals, and account for minimum packs.',
    details: '6 pieces; include delivery',
    problem: 'A six-pack of one-litre cartons and six 946 mL cartons can look equivalent in a price list. A minimum order, delivery fee or substitution can erase a lower unit price.',
    checks: [
      ['Match the product', 'Enter the exact shelf name or printed package barcode. Barista, unsweetened and ordinary variants should stay separate. Check whether the barcode identifies a single carton or the whole case.'],
      ['Use a common unit', 'Divide the total attributable cost by the total litres you must buy. Six 946 mL cartons contain 5.676 L; six one-litre cartons contain 6 L. Keep a minimum order of two cases in the calculation.'],
      ['Check the observation', 'Compare the date, currency and store on the shelf record. Check the current seller basket for delivery, minimums, and substitution rules. Do not turn a dated receipt into a quote.'],
    ],
    next: 'Match the exact variety and total litres in the minimum order. Add current baskets to compare the delivered cost and cost per litre. Dated shelf records are a separate reference.',
    gap: 'Open Prices may have dated observations for an exact name or barcode in your market. Coverage can be empty; current stock, order minimums, tax and delivery are not verified by the history.',
    output: 'A separate history table and, if you add current quotes, comparable pack quantities, unit costs and delivered totals where the terms are known.',
    sources: [['Open Prices: records and data model', 'https://openfoodfacts.github.io/open-prices/guides/data/']],
  },
  'austin-60-minute-massage': {
    category: 'services', label: 'Local services', item: 'Local service: massage',
    title: 'Find a 60-minute solo massage in Austin without relying on “from” prices',
    description: 'Compare Austin massage options by treatment duration, party size, final cost, actual slot and cancellation rules.',
    place: { city: 'Austin', region: 'United States', code: 'US' }, details: '60 minutes; for one person',
    problem: 'Discount catalog cards often show the lowest option. It might cover 30 minutes, a different location or a weekday-only voucher, even when the title mentions 60 minutes.',
    checks: [
      ['Match the option', 'Open the offer menu and select 60 minutes for one person. Check whether the time means hands-on treatment or includes intake and changing. Do not compare a couple’s package with a solo price.'],
      ['Check the actual appointment', 'Confirm the Austin location and available slot before buying a voucher. Check first-visit limits, blackout dates, booking lead time, and whether the voucher expires before your visit.'],
      ['Get the complete price', 'Check taxes, mandatory charges and cancellation rules in the booking flow. A starting price is a lead; it does not establish the full cost or book a slot.'],
    ],
    next: 'Open the provider’s offer and select the 60-minute solo option. Ask the provider to confirm your slot, the complete price and cancellation terms before buying a voucher.',
    gap: 'LivingSocial / Groupon can supply public listing links and starting prices. Exact option prices, open slots and cancellation terms need merchant evidence.',
    output: 'Austin listings with visible duration and party evidence, unknown option or booking terms marked, and a place to compare a quote from the provider.',
    sources: [['LivingSocial public catalog for agents', 'https://agent.livingsocial.com/for-agents']],
  },
  'lego-batman-pc-editions': {
    category: 'games', label: 'PC games', item: 'PC game: LEGO Batman',
    title: 'Compare LEGO Batman PC editions and activation before buying a key',
    description: 'Separate the original LEGO Batman PC game from sequels and bundles, compare same-edition listings, and check activation.',
    details: 'Steam only',
    problem: 'Retailer search results can mix LEGO Batman: The Videogame, LEGO Batman 2 and LEGO Batman 3 with bundles. A lower price is only useful if it unlocks the right title on the right account.',
    checks: [
      ['Match game identity', 'Confirm title, edition and platform on the store page. Compare base-game offers in one group; keep sequels, DLC and bundles separate rather than treating them as cheaper copies.'],
      ['Check your account', 'Check PC platform, key redemption rules and regional restrictions before purchase. A giveaway may grant a temporary claim or require a different launcher.'],
      ['Distinguish price evidence', 'Use a dated historical low to decide whether to wait. Measure today’s value with only same-currency listings for the same edition, then check the store’s tax, fees and refund conditions.'],
    ],
    next: 'Compare the same title and edition across stores. Before paying, verify the Steam key, your account region, the final total and the store’s refund terms.',
    gap: 'CheapShark shows catalog prices for eligible US queries; GamerPower lists possible free claims. Neither verifies redemption for your account, final checkout cost or stock.',
    output: 'Same-edition options across stores, other editions and bundles separately, and any documented historical low or claim separated from purchase quotes.',
    sources: [['CheapShark developer documentation', 'https://apidocs.cheapshark.com/'], ['GamerPower API', 'https://www.gamerpower.com/api-read']],
  },
});

const socialSources = new Set([
  'pinterest_pin', 'youtube_profile', 'instagram_profile', 'instagram_story', 'tiktok_profile', 'x_post',
]);
const ownedSources = new Set(['direct', 'framefind_results', 'github_guide', 'demand_page']);

export function socialSource(search) {
  const entries = new URLSearchParams(search).getAll('entry');
  return entries.length === 1 && socialSources.has(entries[0]) ? entries[0] : null;
}

export function normalizeEntry(source, topic) {
  const canCarryTopic = source === 'demand_page' || socialSources.has(source);
  if (canCarryTopic && Object.hasOwn(topics, topic)) return { source, topic };
  if (!canCarryTopic && ownedSources.has(source)) return { source, topic: null };
  return { source: 'direct', topic: null };
}

export function entryContext(hash, search) {
  // Read only fixed editorial labels. A fragment takes precedence over query
  // parameters, and duplicate entry/topic parameters are ambiguous.
  const query = new URLSearchParams(search);
  const params = hash ? new URLSearchParams(hash.slice(1)) : query;
  const entries = params.getAll('entry');
  const selectedTopics = params.getAll('topic');
  if (entries.length > 1 || selectedTopics.length > 1) return normalizeEntry();
  const source = entries[0];
  if (hash || socialSources.has(source)) return normalizeEntry(source, selectedTopics[0]);
  if (!source && query.get('utm_source') === 'framefind_results') return normalizeEntry('framefind_results');
  return normalizeEntry();
}

export const socialChatURL = (source, topic) => '/match-os/?' + new URLSearchParams({ entry: source, topic });
export const demandURL = topic => '/match-os/demand/' + (topic ? topic + '/' : '');
export const BASE = 'https://yl124915300-dot.github.io';
