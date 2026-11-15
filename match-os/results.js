import { profiles } from './decision.js?v=4';
import { catalogDocs, catalogNames } from './catalogs.js?v=4';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function sourceLink(label, href, className) {
  const link = element('a', label, className);
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function amount(value, currency) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currencyDisplay: 'code', currency }).format(value);
}

function shortDate(value) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function moneyFields(row) {
  const { offer, total, listed } = row;
  const currency = offer.price?.currency;
  let price = 'Listed price unknown';
  if (listed !== null) {
    price = offer.price.kind === 'giveaway' ? 'Free claim listed' :
      (offer.price.kind === 'from' ? 'From ' : '') + amount(offer.price.amount, currency);
  }
  const part = (name, value) => name + ' ' + (Number.isFinite(value) ? amount(value, currency) : 'unknown');
  return [
    price + ' · ' + (total === null ? 'Final total unknown' : 'Total ' + amount(total, currency)),
    [part('Shipping', offer.shipping), part('Tax', offer.tax), part('Fees', offer.fees)].join(' · '),
  ];
}

function renderOffer(row, title) {
  const { offer } = row;
  const card = element('article', '', 'offer-card');
  const heading = [offer.merchant, catalogNames[offer.provider]].filter(Boolean).join(' · ');
  card.dataset.provider = offer.provider;
  card.dataset.score = row.score;
  card.append(element('h5', heading || title));
  const [price, components] = moneyFields(row);
  card.append(element('p', price, 'offer-price'));
  card.append(element('p', components, 'offer-meta'));
  const note = row.pending.length ? 'Needs verification' : 'Known constraints met';
  card.append(element('p', note + ' · ' + row.score + '/100 priority · ' +
    Math.round(row.match * 100) + '% term match · ' + Math.round(row.evidence * 100) + '/100 evidence', 'row-priority'));
  if (row.pending.length) card.append(element('p', row.pending.join(' · '), 'offer-meta'));
  const fulfillment = [offer.city, offer.availability, offer.activation && 'Activation: ' + offer.activation,
    offer.serviceScope, offer.restrictions].filter(Boolean);
  if (offer.rating) fulfillment.push('Merchant reviews ' + offer.rating.value + '/' + offer.rating.scale +
    ' (' + offer.rating.count + ')');
  card.append(element('p', fulfillment.join(' · '), 'offer-meta'));
  const extra = element('details', '', 'offer-details');
  extra.append(element('summary', 'Terms and evidence'));
  extra.append(element('p', 'Checked ' + shortDate(offer.checkedAt) + (offer.priceTimestamp ?
    ' · Catalog dated ' + shortDate(offer.priceTimestamp) : ' · Price timestamp unknown') + ' · Source evidence ' + Math.round(offer.confidence * 100) + '/100', 'offer-meta'));
  extra.append(element('p', [
    'Seller region ' + (offer.sellerRegion || 'unknown'), 'Condition ' + (offer.condition || 'unknown'),
    offer.delivery?.label || 'Delivery / booking time unknown',
    'Returns ' + (offer.returns?.label || 'unknown'),
    'Long-term cost ' + (offer.tco || 'unknown'),
  ].join(' · '), 'offer-meta'));
  if (offer.raw?.priceChangedAt) {
    extra.append(element('p', 'Source last changed this price ' + shortDate(offer.raw.priceChangedAt), 'offer-meta'));
  }
  if (offer.history) {
    const historic = offer.history;
    const gap = offer.price.amount - historic.amount;
    const difference = gap >= 0
      ? amount(gap, historic.currency) + ' above that low'
      : 'current listing is below the recorded low';
    extra.append(element('p', 'Catalog historical low ' + amount(historic.amount, historic.currency) +
      ' on ' + shortDate(historic.at) + ' · ' + difference, 'offer-meta offer-history'));
  }
  extra.append(sourceLink('Catalog API', catalogDocs[offer.provider]));
  card.append(extra, sourceLink('Review source ↗', offer.sourceUrl, 'secondary offer-link'));
  return card;
}

function editionDelta(group, baseline) {
  if (!baseline || group === baseline || group.type !== 'pc_game') return null;
  for (const candidate of group.rows) {
    const sameStore = baseline.rows.find(row => row.offer.storeId &&
      row.offer.storeId === candidate.offer.storeId && row.offer.price?.currency === candidate.offer.price?.currency &&
      row.offer.price?.kind === 'fixed');
    if (!sameStore || candidate.offer.price?.kind !== 'fixed') continue;
    const difference = candidate.offer.price.amount - sameStore.offer.price.amount;
    const comparison = difference === 0 ? 'same listed price' :
      amount(Math.abs(difference), candidate.offer.price.currency) + (difference > 0 ? ' more' : ' less');
    return candidate.offer.merchant + ' · ' + comparison + ' than ' + baseline.title + ' before taxes and fees.';
  }
  return null;
}

export function renderComparison(container, groups, evaluated, preference) {
  container.replaceChildren();
  const weights = profiles[preference].weights;
  if (!evaluated.length) return;
  const quality = { speed: 'delivery evidence', returns: 'return evidence' }[preference] || 'review evidence';
  container.append(element('p', 'Priority weights · match ' + weights[0] + '% · known cost ' + weights[1] +
    '% · evidence ' + weights[2] + '% · ' + quality + ' ' + weights[3] + '%. Unknowns reduce confidence.', 'score-guide muted'));

  const first = evaluated.find(row => !row.problems.length && row.offer.price?.kind !== 'giveaway');
  if (first) {
    const label = first.pending.length ? 'Top candidate to verify' : 'Top ranked';
    container.append(element('p', label + ' · ' + first.offer.title +
      (first.offer.merchant ? ' · ' + first.offer.merchant : '') + ' · ' + first.score + '/100 priority', 'top-candidate'));
  }
  const baseline = groups.find(group => group.type === 'pc_game' && !group.alternative &&
    group.rows.some(row => row.match === 1 && row.offer.identity?.kind === 'catalog-game'));
  const tracks = [
    ['Same game across stores', groups.filter(group => group.sameTitleAcrossStores)],
    ['Other titles and editions', groups.filter(group =>
      group.type === 'pc_game' && !group.rows.some(row => row.offer.price?.kind === 'giveaway') &&
      (!group.sameTitleAcrossStores || group.alternative))],
    ['Free claims', groups.filter(group => group.rows.some(row => row.offer.price?.kind === 'giveaway'))],
  ];
  for (const [heading, entries] of tracks) {
    if (!entries.length) continue;
    const section = element('section', '', 'comparison-track');
    section.append(element('h4', heading));
    if (heading === 'Same game across stores') {
      section.append(element('p', 'Grouped by CheapShark game ID and edition title. Activation, region and license terms can vary.', 'muted'));
    }
    if (heading === 'Other titles and editions') {
      section.append(element('p', 'Related titles can differ in content and activation. Compare release and license details at the source.', 'muted'));
    }
    entries.slice(0, 5).forEach((group, groupIndex) => {
      const listing = element('details', '', 'comparison-group');
      listing.open = groupIndex === 0;
      listing.append(element('summary', group.title + ' · ' + group.rows.length +
        (group.rows.length === 1 ? ' listing' : ' listings')));
      if (heading === 'Other titles and editions') {
        const delta = editionDelta(group, baseline);
        if (delta) listing.append(element('p', delta, 'muted'));
      }
      const list = element('div', '', 'comparison-cards');
      group.rows.slice(0, 6).forEach(row => list.append(renderOffer(row, group.title)));
      listing.append(list);
      section.append(listing);
    });
    container.append(section);
  }
  const excluded = evaluated.filter(row => row.problems.length);
  if (excluded.length) {
    const drawer = element('details', '', 'comparison-group');
    drawer.append(element('summary', excluded.length + ' listings excluded by mandatory requirements'));
    for (const row of excluded.slice(0, 8)) {
      drawer.append(element('p', row.offer.title + ' · ' + row.problems.join(' · '), 'offer-meta'));
    }
    container.append(drawer);
  }
}

export function renderIntent(container, intent, comparison, preference) {
  const { groups, rows } = comparison;
  const section = element('section', '', 'intent-results');
  section.dataset.module = intent.category;
  section.append(element('h4', (intent.module?.label || 'Category needs clarification') + ' · ' + intent.item));
  container.append(section);
  if (intent.dependency) section.append(element('p', intent.dependency, 'muted'));
  if (intent.category === 'games' && rows.length) {
    if (intent.sharedDetails) section.append(element('p', 'Which item the additional must-haves apply to still needs clarification.', 'muted'));
    if (intent.sharedBudget) section.append(element('p', 'Prices are checked against the shared ceiling per item. Combined cost is unverified.', 'muted'));
    const table = element('div');
    renderComparison(table, groups, rows, preference);
    section.append(table);
    return;
  }
  if (!rows.length) {
    section.append(element('p', intent.module ? 'No sufficient live quotes for this request.' :
      'Edit the item in chat with its product type or service name to enable matching.', 'muted'));
    return;
  }
  const weights = profiles[preference].weights;
  section.append(element('p', 'Rule score out of 100 · match ' + weights[0] + '% · known cost ' +
    weights[1] + '% · evidence ' + weights[2] + '% · ' +
    ({ speed: 'timing', returns: 'cancellation or returns' }[preference] || 'review evidence') +
    ' ' + weights[3] + '%.', 'score-guide muted'));
  if (intent.sharedBudget) section.append(element('p', 'Budget is shared. Individual prices do not establish the combined cost.', 'muted'));
  if (intent.requiresDelivery) section.append(element('p', 'Delivery is part of this request.', 'muted'));
  const currencies = [...new Set(rows.map(row => row.offer.price?.currency || ''))];
  if (currencies.length > 1) section.append(element('p', 'Prices are grouped by currency. No exchange rate was applied.', 'muted'));
  for (const currency of currencies) {
    const currencyGroups = groups.filter(group => group.currency === currency);
    const groupRows = rows.filter(row => (row.offer.price?.currency || '') === currency);
    const currencySection = element('section', '', 'comparison-track');
    if (currencies.length > 1) currencySection.append(element('h5', currency || 'Currency unknown'));
    const tracks = [
      ['Same item or package across merchants', currencyGroups.filter(group => group.horizontal)],
      ['Individual listings and package alternatives', currencyGroups.filter(group => !group.horizontal)],
    ];
    for (const [heading, entries] of tracks) {
      if (!entries.length) continue;
      currencySection.append(element('h5', heading));
      for (const [index, group] of entries.slice(0, 6).entries()) {
        const drawer = element('details', '', 'comparison-group');
        drawer.open = index === 0;
        drawer.append(element('summary', group.title + ' · ' + group.rows.length + (group.rows.length === 1 ? ' listing' : ' listings')));
        drawer.append(element('p', group.horizontal ? intent.module.horizontal :
          group.rows[0].identity ? 'Exact identity available for this listing' : 'Insufficient evidence of exact equivalence', 'muted'));
        const list = element('div', '', 'comparison-cards');
        group.rows.slice(0, 6).forEach(row => list.append(renderCategoryOffer(row)));
        drawer.append(list);
        currencySection.append(drawer);
      }
    }
    const excluded = groupRows.filter(row => row.problems.length);
    if (excluded.length) {
      const drawer = element('details', '', 'comparison-group');
      drawer.append(element('summary', excluded.length + ' options with hard conflicts'));
      for (const row of excluded.slice(0, 8)) {
        drawer.append(renderCategoryOffer(row));
      }
      currencySection.append(drawer);
    }
    section.append(currencySection);
  }
}

function renderCategoryOffer(row) {
  const { offer, priceBasis, runRate } = row;
  const manual = offer.provider === 'user';
  const card = element('article', '', 'offer-card');
  card.dataset.provider = offer.provider;
  card.dataset.score = row.score;
  card.append(element('h5', [offer.merchant, manual ? 'Entered by you' : catalogNames[offer.provider]].filter(Boolean).join(' · ') ||
    offer.title));
  if (offer.merchant) card.append(element('p', offer.title, 'offer-meta'));
  const [price, components] = moneyFields(row);
  card.append(element('p', price, 'offer-price'));
  card.append(element('p', components, 'offer-meta'));
  if (row.quantity > 1 && row.listed !== null) card.append(element('p',
    'Minimum order ' + row.quantity + ' packs · known subtotal and charges ' + amount(row.listed, offer.price.currency), 'offer-meta'));
  card.append(element('p', row.relation, 'offer-meta'));
  const status = row.problems.length ? 'Conflict with must-haves' : row.pending.length ? 'Needs verification' : 'Known constraints met';
  card.append(element('p', status + (row.problems.length ? '' : ' · ' + row.score + '/100 priority'), 'row-priority'));
  card.append(element('p', row.checks.map(check => ({ pass: 'Met', unknown: 'Unknown', conflict: 'Conflict' })[check.status] +
    ' — ' + check.label).join(' · '), 'offer-meta'));
  const facts = [...row.facts.filter(Boolean), offer.delivery?.label].filter(Boolean);
  if (facts.length) card.append(element('p', facts.join(' · '), 'offer-meta'));
  if (priceBasis) {
    card.append(element('p', amount(priceBasis.amount, offer.price.currency) + ' per ' + priceBasis.unit + ' at listed price' +
      (priceBasis.total === null ? ' · delivered unit cost unknown' :
        ' · ' + amount(priceBasis.total, offer.price.currency) + ' per ' + priceBasis.unit + ' delivered'), 'offer-meta'));
  }
  if (runRate) {
    card.append(element('p', 'At your usage · ' + amount(runRate.estimate, offer.price.currency) + ' per ' + runRate.cadence +
      ' before charges or waste · ' + runRate.packs + ' packs to cover one ' + runRate.cadence + ' (' +
      amount(runRate.subtotal, offer.price.currency) + ' before charges) · minimum purchase lasts ' +
      new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(runRate.restockPeriods) +
      ' ' + runRate.cadence + 's at that usage.', 'offer-meta'));
  }
  const evidence = element('details', '', 'offer-details');
  evidence.append(element('summary', 'Terms and evidence'));
  evidence.append(element('p',
    (manual ? 'Entered ' : 'Catalog read ') + shortDate(offer.checkedAt) +
    (offer.priceTimestamp ? (manual ? ' · Observed ' : ' · Catalog updated ') + shortDate(offer.priceTimestamp) : ' · Price timestamp unknown') +
    ' · Source evidence ' + Math.round(offer.confidence * 100) + '/100' +
    ' · Listing evidence after gaps ' + Math.round(row.evidence * 100) + '/100', 'offer-meta'));
  if (row.unitPriority) evidence.append(element('p', 'Cost priority includes comparable unit cost.', 'offer-meta'));
  const [fit, cost, , fulfillment] = row.components.map(component => Math.round(component * 100));
  evidence.append(element('p', 'Fit ' + fit + '/100 · Cost ' + cost + '/100 · Review, timing or policy evidence ' +
    fulfillment + '/100', 'offer-meta'));
  if (manual) evidence.append(element('p', 'User-entered observation. Merchant terms and availability remain unverified.', 'offer-meta'));
  if (offer.rating) evidence.append(element('p', 'Merchant reviews ' + offer.rating.value + '/' + offer.rating.scale +
    ' (' + offer.rating.count + ')', 'offer-meta'));
  if (offer.restrictions) evidence.append(element('p', offer.restrictions, 'offer-meta'));
  if (offer.expires) evidence.append(element('p', 'Listing expires ' + shortDate(offer.expires), 'offer-meta'));
  if (catalogDocs[offer.provider]) evidence.append(sourceLink('Catalog API', catalogDocs[offer.provider]));
  card.append(evidence, sourceLink('Review source ↗', offer.sourceUrl, 'secondary offer-link'));
  return card;
}
