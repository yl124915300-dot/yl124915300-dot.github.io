import { headphoneModels } from './modules/headphones.js?v=10';

const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
};

function link(label, href, merchant = false, purchasePath = merchant) {
  const a = node('a', label, merchant ? 'offer-link hp-merchant-link' : '');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  if (purchasePath) a.setAttribute('data-purchase-path', '');
  return a;
}

function icon(model) {
  // Generic original pictogram; same geometry for both models.
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 64 54');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'hp-icon hp-' + model.accent);
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', 'M11 32v-6a21 21 0 0 1 42 0v6 M16 29h2a4 4 0 0 1 4 4v11a4 4 0 0 1-4 4h-2a5 5 0 0 1-5-5v-9a5 5 0 0 1 5-5z M48 29h-2a4 4 0 0 0-4 4v11a4 4 0 0 0 4 4h2a5 5 0 0 0 5-5v-9a5 5 0 0 0-5-5z');
  svg.append(path);
  return svg;
}

export function renderHeadphonePreview(container) {
  const list = node('div', '', 'hp-card-grid');
  for (const model of headphoneModels.slice(0, 2)) {
    const card = node('article', '', 'hp-card hp-preview-card');
    card.append(icon(model), node('h2', model.name), node('p', model.sku, 'hp-sku'),
      node('p', model.anc), link('Manufacturer evidence', model.sources[0][1]));
    list.append(card);
  }
  container.replaceChildren(list, node('p',
    'Both support wired ANC. Sony documents audio with the power off, but calls use the phone mic. Q45’s wired mic is unverified. Current store prices and stock are checked separately.',
    'hp-preview-copy'));
}

const price = (amount, currency) => Number.isFinite(amount) && currency ?
  currency + ' ' + amount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'Unknown';
const observation = (iso) => {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return node('span', 'Unknown');
  const time = node('time', date.toISOString().replace('T', ' ').slice(0, 16) + ' UTC');
  time.dateTime = date.toISOString();
  return time;
};
function badge(label, type) { return node('span', label, 'hp-badge hp-' + type); }

function modelCard(entry, selected) {
  const { model, conflicts, unknown, best } = entry;
  const card = node('article', '', 'hp-card hp-model-card');
  card.dataset.model = model.id;
  card.dataset.selected = String(selected);
  const state = conflicts.length ? 'conflict' : unknown.length ? 'pending' : 'verified';
  card.dataset.fit = state;
  const head = node('div', '', 'hp-card-top');
  head.append(icon(model), badge({ conflict: 'Does not meet request', pending: 'Needs verification', verified: 'Feature fit verified' }[state], state));
  const reason = conflicts.length ? 'Excluded: ' + conflicts.join(' · ') :
    unknown.length ? 'Verify: ' + unknown.join(' · ') :
    'Manufacturer confirms ' + (entry.checks.filter(x => x.status === 'pass' && x.label !== 'Product type')
      .map(x => x.label.toLowerCase()).join(', ') || 'wired ANC and 3.5 mm audio') + '.';
  const lead = best && price(best.offer.price.amount, best.offer.price.currency);
  const choose = node('button', selected ? 'Selected for store comparison' : 'Compare stores', 'secondary hp-select');
  choose.type = 'button';
  choose.dataset.headphoneSelect = model.id;
  choose.setAttribute('aria-pressed', String(selected));
  choose.setAttribute('aria-label', (selected ? 'Selected: ' : 'Compare stores for ') + model.name);
  card.append(head, node('h5', model.name), node('p', model.sku + ' · black', 'hp-sku'),
    node('p', reason, 'hp-reason'), node('p', lead ? lead + ' listed · ' + (best.total != null ? price(best.total, best.offer.price.currency) + ' reported total' : 'total unknown') :
      'No eligible priced listing', 'hp-price'), choose);
  return card;
}

function matrix(entries) {
  const box = node('div', '', 'hp-matrix');
  const table = node('table', '', 'hp-table');
  table.append(node('caption', 'What changes between models'));
  const tr = node('tr');
  const feature = node('th', 'Feature');
  feature.scope = 'col';
  tr.append(feature);
  for (const { model } of entries) {
    const th = node('th', ({ xm4: 'Sony XM4', xm5: 'Sony XM5', q45: 'Space Q45' }[model.id]));
    th.scope = 'col';
    tr.append(th);
  }
  const thead = node('thead');
  thead.append(tr);
  const body = node('tbody');
  const rows = [
    ['Reference SKU', m => m.sku, false], ['3.5 mm analogue audio', () => 'Yes', false],
    ['ANC with cable', m => m.anc, true], ['Power needed for ANC', m => m.power, true],
    ['Audio with power off', m => m.passive, true], ['Built-in mic with cable', m => m.mic, true],
    ['Manufacturer sources', m => m.sources.map(([label, url]) => link(label, url)), false],
  ];
  for (const [label, value, different] of rows) {
    const line = node('tr', '', different ? 'hp-difference' : '');
    const th = node('th', label);
    th.scope = 'row';
    line.append(th);
    for (const { model } of entries) {
      const cell = node('td');
      const data = value(model);
      cell.append(...(Array.isArray(data) ? data : [data]));
      line.append(cell);
    }
    body.append(line);
  }
  table.append(thead, body);
  box.append(table);
  return box;
}

function merchantCard(row) {
  const { offer, provenance } = row;
  const card = node('article', '', 'hp-store-card');
  card.dataset.merchant = offer.merchant;
  const expired = row.stale && (offer.provider === 'merchant-page' || provenance.tier === 'manual');
  const state = expired ? 'stale' : row.problems.length ? 'conflict' : row.status === 'confirmed' ? 'verified' : 'pending';
  card.dataset.state = state;
  const content = node('dl', '', 'hp-facts');
  const fields = [
    ['Listing SKU', provenance.identity?.identifier || offer.attrs?.modelCode || 'Unknown'],
    ['Condition', offer.attrs?.condition || 'Unknown'],
    ['Delivered total', price(expired ? null : row.total, offer.price?.currency)],
    ['Shipping / tax / fees', [offer.shipping, offer.tax, offer.fees].map(x => price(x, offer.price?.currency)).join(' / ')],
    ['Availability', expired ? 'Unknown now; recheck the source' : offer.stockNote || 'Unknown'],
    ['Delivery / pickup', offer.delivery?.label || 'Unknown'],
    ['Returns', offer.returns?.label || 'Unknown'],
    ['Observed', observation(provenance.observedAt || provenance.retrievedAt)],
    ['Evidence', offer.merchantEvidence || (offer.provider === 'user' ? 'Entered by you, unverified' : 'Public seller page')],
    ['Recheck after', provenance.priceValidUntil ? observation(provenance.priceValidUntil) : 'Unknown'],
  ];
  for (const [label, value] of fields) {
    const row = node('div');
    const dd = node('dd');
    dd.append(value);
    row.append(node('dt', label), dd);
    content.append(row);
  }
  card.append(badge({ stale: 'Expired', conflict: 'Does not meet request', verified: 'Verified', pending: 'Needs verification' }[state], state),
    node('h6', offer.merchant || offer.title),
    node('p', price(offer.price?.amount, offer.price?.currency) + (offer.price ? (expired ? ' · historical listed price' : ' · listed price') : ' · listed price'), 'hp-price'),
    content);
  if (row.problems.length || row.pending.length) {
    const why = node('details', '', 'hp-evidence-details');
    why.append(node('summary', row.problems.length ? 'Why it was excluded' : 'What still needs checking'));
    const list = node('ul');
    for (const text of [...row.problems, ...row.pending]) list.append(node('li', text));
    why.append(list);
    card.append(why);
  }
  card.append(link(expired || row.problems.length ? 'Recheck at source' : 'View merchant listing', offer.sourceUrl, true, !expired && !row.problems.length));
  return card;
}

export function renderHeadphones(container, comparison, selected, market, currency) {
  const section = node('section', '', 'hp-board');
  section.dataset.module = 'electronics';
  const cards = node('div', '', 'hp-card-grid');
  for (const entry of comparison.models) cards.append(modelCard(entry, entry.model.id === selected));

  const entry = comparison.models.find(candidate => candidate.model.id === selected);
  const heading = node('h5', 'Compare stores · ' + entry.model.name, 'hp-store-title');
  heading.id = 'hp-store-title';
  heading.tabIndex = -1;
  const matching = entry.rows.filter(row => row.provenance.identity?.verified && row.offer.attrs?.modelCode === entry.model.sku && row.offer.attrs.condition === 'new');
  const other = entry.rows.filter(row => !matching.includes(row));
  const freshCount = matching.filter(row => !row.stale && !row.problems.length &&
    row.offer.price?.currency === currency && row.offer.attrs.condition === 'new').length;
  const notes = node('p', freshCount ?
    'Same SKU and condition. Check stock, final price and eligibility with the store.' :
    'No current eligible price evidence for this SKU and market. Open a source below or add a local listing.', 'muted');
  const marketLine = node('p', entry.model.sku + ' · ' + market + ' · ' + currency, 'hp-sku');
  const stores = node('section', '', 'hp-stores');
  stores.setAttribute('aria-labelledby', heading.id);
  stores.append(heading, marketLine, notes);
  if (matching.length) {
    const grid = node('div', '', 'hp-store-grid');
    for (const row of matching) grid.append(merchantCard(row));
    stores.append(grid);
  }
  if (other.length || comparison.other.length) {
    stores.append(node('h6', 'Separate leads · exact listing SKU or condition needs verification'));
    const grid = node('div', '', 'hp-store-grid');
    for (const row of [...other, ...comparison.other]) grid.append(merchantCard(row));
    stores.append(grid);
  }
  section.append(cards, matrix(comparison.models), stores);
  container.append(section);
}
