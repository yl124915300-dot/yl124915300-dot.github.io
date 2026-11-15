import { profiles } from './decision.js?v=7';
import { catalogDocs, catalogNames } from './catalogs.js?v=7';

import { evidenceLabels } from './evidence.js?v=7';

const statusLabels = {
  confirmed: 'Confirmed match', candidate: 'Candidate · verify before buying', conflict: 'Conflicts with must-haves',
};

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
  if (offer.price?.kind === 'observation') price = 'Observed ' + amount(offer.price.amount, currency);
  else if (listed !== null) {
    price = offer.price.kind === 'giveaway' ? 'Free claim listed' :
      (offer.price.kind === 'from' ? 'From ' : '') + amount(offer.price.amount, currency);
  }
  const part = (name, value) => name + ' ' + (Number.isFinite(value) ? amount(value, currency) : 'unknown');
  return [
    price + ' · ' + (total === null ? 'Final total unknown' : (row.status === 'confirmed' ? 'Total ' : 'Reported total ') + amount(total, currency)),
    [part('Shipping', offer.shipping), part('Tax', offer.tax), part('Fees', offer.fees)].join(' · '),
  ];
}

function sourceEvidence(card, row) {
  const source = row.provenance;
  card.dataset.evidence = source.tier;
  card.dataset.status = row.status;
  card.append(element('p', evidenceLabels[source.tier], 'row-priority'));
}

function explainEvidence(extra, row) {
  const source = row.provenance;
  const observation = source.observedAt
    ? 'Source date ' + (source.tier === 'observation' || source.tier === 'manual'
      ? source.observedAt.slice(0, 10) : shortDate(source.observedAt))
    : 'Source price date unknown';
  const read = source.retrievedAt ? (source.tier === 'link' || source.tier === 'manual' ? 'Added ' : 'Retrieved ') +
    shortDate(source.retrievedAt) : null;
  extra.append(element('p', [observation, read].filter(Boolean).join(' · '), 'offer-meta'));
  const identity = source.identity;
  const fields = [
    identity?.identifier && identity.type + ' ' + identity.identifier,
    identity?.specification,
    source.priceValidUntil && 'Price valid through ' + shortDate(source.priceValidUntil),
    source.proof && source.proof.type + ' evidence record ' + source.proof.id,
    source.scope?.city && [source.scope.city, source.scope.market].filter(Boolean).join(', '),
  ].filter(Boolean);
  if (fields.length) extra.append(element('p', fields.join(' · '), 'offer-meta'));
  if (catalogDocs[row.offer.provider]) extra.append(sourceLink(
    row.offer.provider === 'openprices' ? 'Open Prices · Open Database License' : 'Catalog source', catalogDocs[row.offer.provider]));
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
  sourceEvidence(card, row);
  card.append(element('p', statusLabels[row.status] + ' · ' + row.score + '/100 priority · ' +
    Math.round(row.match * 100) + '% term match · ' + Math.round(row.evidence * 100) + '/100 evidence', 'row-priority'));
  if (row.pending.length) card.append(element('p', row.pending.join(' · '), 'offer-meta'));
  const fulfillment = [offer.city, offer.availability, offer.activation && 'Activation: ' + offer.activation,
    offer.serviceScope, offer.restrictions].filter(Boolean);
  if (offer.rating) fulfillment.push('Merchant reviews ' + offer.rating.value + '/' + offer.rating.scale +
    ' (' + offer.rating.count + ')');
  card.append(element('p', fulfillment.join(' · '), 'offer-meta'));
  const extra = element('details', '', 'offer-details');
  extra.append(element('summary', 'Terms and evidence'));
  explainEvidence(extra, row);
  extra.append(element('p', [
    'Seller region ' + (offer.sellerRegion || 'unknown'), 'Condition ' + (offer.condition || 'unknown'),
    offer.delivery?.label || 'Delivery / booking time unknown',
    'Returns ' + (offer.returns?.label || 'unknown'),
    'Long-term cost ' + (offer.tco || 'unknown'),
  ].join(' · '), 'offer-meta'));
  if (offer.raw?.priceChangedAt) {
    extra.append(element('p', 'Source last changed this price ' + shortDate(offer.raw.priceChangedAt), 'offer-meta'));
  }
  if (offer.history && offer.history.currency === offer.price?.currency) {
    const historic = offer.history;
    const gap = offer.price.amount - historic.amount;
    const difference = gap >= 0
      ? amount(gap, historic.currency) + ' above that low'
      : 'current listing is below the recorded low';
    extra.append(element('p', 'Catalog historical low ' + amount(historic.amount, historic.currency) +
      ' on ' + shortDate(historic.at) + ' · ' + difference, 'offer-meta offer-history'));
    extra.append(sourceLink('Historical price record', historic.source));
  }
  card.append(extra, sourceLink('Review source ↗', offer.sourceUrl, 'secondary offer-link'));
  return card;
}

function editionDelta(group, baseline) {
  if (!baseline || group === baseline || group.type !== 'pc_game') return null;
  for (const candidate of group.rows) {
    if (candidate.provenance?.tier !== 'api') continue;
    const sameStore = baseline.rows.find(row => row.provenance?.tier === 'api' && row.offer.storeId &&
      row.offer.storeId === candidate.offer.storeId && row.offer.price?.currency === candidate.offer.price?.currency &&
      row.offer.price?.kind === 'fixed');
    if (!sameStore || candidate.offer.price?.kind !== 'fixed') continue;
    const difference = candidate.offer.price.amount - sameStore.offer.price.amount;
    const comparison = difference === 0 ? 'same listed price' :
      amount(Math.abs(difference), candidate.offer.price.currency) + (difference > 0 ? ' more' : ' less');
    return candidate.offer.merchant + ' · ' + comparison + ' than ' + baseline.title + ' before taxes and fees · CheapShark, retrieved ' +
      shortDate(candidate.provenance.retrievedAt) + '.';
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
    const label = first.status === 'confirmed' ? 'Highest priority confirmed match' : 'Highest priority candidate';
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
      section.append(element('p', 'Catalog records share the same game ID, edition title and currency. Confirm activation and regional terms before comparing checkout totals.', 'muted'));
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
  const observations = rows.filter(row => row.provenance.tier === 'observation')
    .sort((a, b) => b.provenance.observedAt.localeCompare(a.provenance.observedAt));
  if (observations.length) {
    const history = element('section', '', 'comparison-track');
    history.append(element('h5', 'Dated observations from Open Prices'));
    history.append(element('p', 'Shelf tags and receipts from the requested country. Local stock, current price and delivery remain unknown.', 'muted'));
    const list = element('div', '', 'comparison-cards');
    for (const row of observations) list.append(renderCategoryOffer(row));
    history.append(list);
    section.append(history);
  }
  const quotes = rows.filter(row => row.provenance.tier !== 'observation');
  const currencies = [...new Set(quotes.map(row => row.offer.price?.currency || ''))];
  if (currencies.length > 1) section.append(element('p', 'Prices are grouped by currency. No exchange rate was applied.', 'muted'));
  for (const currency of currencies) {
    const currencyGroups = groups.filter(group => group.currency === currency);
    const groupRows = quotes.filter(row => (row.offer.price?.currency || '') === currency);
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
        drawer.append(element('p', group.horizontal
          ? (group.rows[0].provenance.tier === 'manual' ? 'Reported terms align · ' : '') + intent.module.horizontal
          : 'Review this listing on its own', 'muted'));
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
  const isHistory = row.provenance.tier === 'observation';
  const card = element('article', '', 'offer-card');
  card.dataset.provider = offer.provider;
  card.dataset.score = row.score;
  card.append(element('h5', [offer.merchant, manual ? 'Entered by you' : catalogNames[offer.provider]].filter(Boolean).join(' · ') ||
    offer.title));
  if (offer.merchant) card.append(element('p', offer.title, 'offer-meta'));
  sourceEvidence(card, row);
  const [price, components] = moneyFields(row);
  card.append(element('p', price, 'offer-price'));
  card.append(element('p', components, 'offer-meta'));
  if (row.quantity > 1 && row.listed !== null) card.append(element('p',
    'Minimum order ' + row.quantity + ' packs · known subtotal and charges ' + amount(row.listed, offer.price.currency), 'offer-meta'));
  card.append(element('p', statusLabels[row.status] + (row.problems.length || isHistory || !offer.price
    ? '' : ' · ' + row.score + '/100 priority'), 'row-priority'));
  if (isHistory) {
    card.append(element('p', [row.provenance.observedAt.slice(0, 10), row.provenance.scope.city,
      row.provenance.identity.specification].filter(Boolean).join(' · '), 'offer-meta'));
  } else {
    card.append(element('p', row.relation, 'offer-meta'));
    card.append(element('p', row.checks.map(check => ({
      pass: manual ? 'Reported fit' : 'Met', unknown: 'Unknown', conflict: 'Conflict',
    })[check.status] + ' — ' + check.label).join(' · '), 'offer-meta'));
    const facts = [...row.facts.filter(Boolean), offer.delivery?.label].filter(Boolean);
    if (facts.length) card.append(element('p', facts.join(' · '), 'offer-meta'));
  }
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
  explainEvidence(evidence, row);
  if (row.pending.length) evidence.append(element('p', row.pending.join(' · '), 'offer-meta'));
  if (row.unitPriority) evidence.append(element('p', 'Cost priority includes comparable unit cost.', 'offer-meta'));
  if (offer.price && !isHistory) {
    const [fit, cost, , fulfillment] = row.components.map(component => Math.round(component * 100));
    evidence.append(element('p', 'Fit ' + fit + '/100 · Cost ' + cost + '/100 · Review, timing or policy evidence ' +
      fulfillment + '/100', 'offer-meta'));
  }
  if (offer.returns?.label) evidence.append(element('p', offer.returns.label, 'offer-meta'));
  if (offer.rating) evidence.append(element('p', 'Merchant reviews ' + offer.rating.value + '/' + offer.rating.scale +
    ' (' + offer.rating.count + ')', 'offer-meta'));
  if (offer.restrictions) evidence.append(element('p', offer.restrictions, 'offer-meta'));
  if (offer.expires) evidence.append(element('p', 'Listing expires ' + shortDate(offer.expires), 'offer-meta'));
  card.append(evidence, sourceLink(isHistory ? 'Review dated record ↗' : 'Review source ↗',
    offer.sourceUrl, 'secondary offer-link'));
  return card;
}
