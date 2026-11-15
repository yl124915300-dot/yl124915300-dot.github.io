import { profiles } from './decision.js?v=3';
import { catalogDocs, catalogNames } from './catalogs.js?v=3';

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

function renderOffer(row, title, index) {
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
  card.append(element('p', (index + 1) + '. ' + note + ' · ' + row.score + '/100 priority · ' +
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
    ' · Catalog dated ' + shortDate(offer.priceTimestamp) : ' · Price timestamp unknown'), 'offer-meta'));
  extra.append(element('p', [
    'Seller region ' + (offer.sellerRegion || 'unknown'), 'Condition ' + (offer.condition || 'unknown'),
    offer.delivery?.label || 'Delivery / booking time unknown',
    'Returns ' + (offer.returns?.label || 'unknown'),
    'Long-term cost ' + (offer.tco || 'unknown'),
  ].join(' · '), 'offer-meta'));
  if (offer.raw.priceChangedAt) {
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

  const first = evaluated.find(row => !row.problems.length);
  if (first) {
    const label = first.pending.length ? 'Top candidate to verify' : 'Top ranked';
    container.append(element('p', label + ' · ' + first.offer.title +
      (first.offer.merchant ? ' · ' + first.offer.merchant : '') + ' · ' + first.score + '/100 priority', 'top-candidate'));
  }
  const baseline = groups.find(group => group.type === 'pc_game' && !group.alternative &&
    group.rows.some(row => row.match === 1 && row.offer.identity?.kind === 'catalog-game'));
  const tracks = [
    ['Same game across stores', groups.filter(group => group.sameTitleAcrossStores)],
    ['Other titles, editions and free claims', groups.filter(group =>
      group.type === 'pc_game' && (!group.sameTitleAcrossStores || group.alternative))],
    ['Related catalog offers', groups.filter(group => group.type === 'local_catalog')],
  ];
  for (const [heading, entries] of tracks) {
    if (!entries.length) continue;
    const section = element('section', '', 'comparison-track');
    section.append(element('h4', heading));
    if (heading === 'Same game across stores') {
      section.append(element('p', 'Grouped by CheapShark game ID and edition title. Activation, region and license terms can vary.', 'muted'));
    }
    if (heading === 'Other titles, editions and free claims') {
      section.append(element('p', 'Related titles can differ in edition, content and activation. Compare release and license details at the source.', 'muted'));
    }
    entries.slice(0, 5).forEach((group, groupIndex) => {
      const listing = element('details', '', 'comparison-group');
      listing.open = groupIndex === 0;
      listing.append(element('summary', group.title + ' · ' + group.rows.length +
        (group.rows.length === 1 ? ' listing' : ' listings')));
      if (heading === 'Other titles, editions and free claims') {
        const delta = editionDelta(group, baseline);
        if (delta) listing.append(element('p', delta, 'muted'));
      }
      const list = element('div', '', 'comparison-cards');
      group.rows.slice(0, 6).forEach((row, index) => list.append(renderOffer(row, group.title, index)));
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
