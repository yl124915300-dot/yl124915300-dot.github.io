import { constraint, count, date, deliveryCheck, extract, key, loaded, maximum, minimum, number, quoteCost, stable, text, yesNo } from './shared.js?v=4';

const units = {
  mg: ['mass', 0.001], g: ['mass', 1], kg: ['mass', 1000], oz: ['mass', 28.349523125],
  lb: ['mass', 453.59237], ml: ['volume', 1], cl: ['volume', 10], l: ['volume', 1000],
  'us fl oz': ['volume', 29.5735295625], 'uk fl oz': ['volume', 28.4130625],
  each: ['count', 1], ct: ['count', 1],
  克: ['mass', 1], 千克: ['mass', 1000], 毫升: ['volume', 1], 升: ['volume', 1000], 件: ['count', 1],
};
const quantityPattern = /(?<![\d.])(\d+(?:\.\d+)?)\s*(us fl oz|uk fl oz|mg|kg|ml|cl|oz|lb|each|ct|g|l|千克|克|毫升|升|件)(?![a-z])/iu;
const timesPack = /(?<![\d.])(\d+)\s*[x×]\s*(?=\d)/iu;
const packageCount = /\b(\d+)\s*(?:packs?|bottles?|rolls?|pieces?|boxes|count)\b|(\d+)\s*(?:瓶|盒|包|卷|件)/iu;
const productTypes = [
  [/(?:\b(?:oat milk|oat drink)\b|燕麦奶)/iu, 'oat milk'],
  [/(?:\b(?:milk|dairy milk)\b|牛奶)/iu, 'milk'],
  [/(?:\b(?:laundry detergent|detergent)\b|洗衣液|洗涤剂)/iu, 'laundry detergent'],
  [/(?:\b(?:dish soap|dishwashing liquid)\b|洗洁精)/iu, 'dish soap'],
  [/(?:\b(?:paper towels?|kitchen roll)\b|厨房纸)/iu, 'paper towels'],
  [/(?:\b(?:toilet paper|toilet rolls?)\b|卫生纸)/iu, 'toilet paper'],
  [/(?:\b(?:rice|coffee|tea|water|diapers?|shampoo|toothpaste|pasta|eggs?)\b|大米|咖啡|茶叶|瓶装水|纸尿裤|洗发水|牙膏|意面|鸡蛋)/iu, null],
];
const translations = { 大米: 'rice', 咖啡: 'coffee', 茶叶: 'tea', 瓶装水: 'water', 纸尿裤: 'diapers',
  洗发水: 'shampoo', 牙膏: 'toothpaste', 意面: 'pasta', 鸡蛋: 'eggs' };
export function productType(value) {
  for (const [pattern, type] of productTypes) {
    const match = pattern.exec(value);
    if (match) return type || translations[match[0]] || key(match[0]).replace(/^diaper$/u, 'diapers').replace(/^egg$/u, 'eggs');
  }
  return '';
}
function measurement(value, unit) {
  const numeric = number(value, Number.EPSILON);
  const definition = units[key(unit)];
  if (!definition || numeric === null || (definition[0] === 'count' && !Number.isInteger(numeric))) return null;
  const base = Number((numeric * definition[1]).toFixed(6));
  return Number.isFinite(base) && base > 0 ? { dimension: definition[0], base } : null;
}

export const consumables = {
  id: 'consumables', label: 'Everyday essentials',
  horizontal: 'Same product, formula, sales packaging, pack count and per-piece net content',
  schema: [
    ['product', 'Product type'], ['brand', 'Brand'], ['variant', 'Exact variety or formula'],
    ['net', 'Net content per piece', '500'], ['unit', 'Unit (g, kg, ml, L, count)', 'ml'],
    ['pieces', 'Pieces per sales pack'], ['bundle', 'Single or uniform pack / assortment', 'single'],
    ['minPacks', 'Minimum packs per order'], ['subscription', 'Subscription required (yes or no)'],
    ['deliveryThreshold', 'Minimum order value for delivery'], ['deliveryDate', 'Arrival date (YYYY-MM-DD)'],
    ['expires', 'Product expiry (YYYY-MM-DD)'],
  ],
  normalize(raw) {
    return {
      product: productType(raw.product) || key(raw.product), brand: key(raw.brand), variant: key(raw.variant),
      net: measurement(raw.net, raw.unit === 'count' ? 'ct' : raw.unit), pieces: count(raw.pieces),
      bundle: key(raw.bundle), minPacks: count(raw.minPacks),
      subscription: yesNo(raw.subscription), deliveryThreshold: number(raw.deliveryThreshold),
      expires: date(raw.expires),
    };
  },
  requirements(brief, item) {
    const patterns = [
      ['maxPacks', /\b(?:buy|order)\s+(?:at most|up to)\s+(\d+)\s+packs?\b/iu, m => Number(m[1])],
      ['pieces', new RegExp(timesPack.source + '|' + packageCount.source, 'iu'), m => Number(m[1] || m[2] || m[3])],
      ['net', quantityPattern, m => {
        const net = measurement(m[1], m[2]);
        return net && JSON.stringify(net);
      }],
      ['subscription', /\b(?:no subscription|one[- ]time purchase)\b|不要订阅|无需订阅|一次性购买/iu, () => false],
      ['expiry', /\b(?:expires? after|expiry after|best before after)\s+(\d{4}-\d{2}-\d{2})\b|有效期晚于\s*(\d{4}-\d{2}-\d{2})/iu, m => date(m[1] || m[2])],
    ];
    const use = /(?<!\d)(\d+(?:\.\d+)?)\s*(kg|g|ml|l|ct|千克|克|毫升|升|件)\s*(?:per\s+(week|month)|\/\s*(week|month)|每(周|月))/iu;
    const details = text(brief.details);
    const consumption = use.exec(details);
    const usage = consumption ? measurement(consumption[1], consumption[2]) : null;
    const cadence = consumption ? (/^month$|^月$/iu.test(consumption[3] || consumption[4] || consumption[5]) ? 'month' : 'week') : null;
    return { ...extract({ ...brief, details: details.replace(use, '') }, item, patterns), usage, cadence, product: productType(item) };
  },
  identity(a) {
    if (!a.net || !['single', 'uniform pack'].includes(a.bundle) || (a.bundle === 'single' && a.pieces !== 1)) return null;
    return stable(a.product, a.brand, a.variant, a.net.dimension, a.net.base, a.pieces, a.bundle);
  },
  assess(a, intent, offer, now) {
    const { hard, soft, usage, cadence, product } = intent.requirements;
    const packSize = a.net && a.pieces && ['single', 'uniform pack'].includes(a.bundle) &&
      (a.bundle !== 'single' || a.pieces === 1) ? a.net.base * a.pieces : null;
    const unitsLabel = (a.net && ({ mass: 'kg', volume: 'L', count: 'piece' })[a.net.dimension]) || '';
    const costBasis = unitsLabel === 'piece' ? 1 : 1000;
    const quantity = a.minPacks || 1;
    const cost = a.minPacks ? quoteCost(offer, quantity) : { listed: null, total: null };
    const priceBasis = offer.price?.kind === 'fixed' && packSize
      ? { unit: unitsLabel, product: a.product, amount: offer.price.amount * costBasis / packSize, size: packSize, total: cost.total === null ? null : cost.total * costBasis / (packSize * quantity) }
      : null;
    const rules = wanted => Object.entries(wanted).map(([field, expected]) => {
      if (expected === null) return constraint(field + ' needs clarification', null, true);
      if (field === 'net') return constraint('Net content per piece', a.net && JSON.stringify(a.net), expected);
      if (field === 'pieces') return constraint('Pieces per pack', a.pieces, expected);
      if (field === 'expiry') return minimum('Product expiry', a.expires, expected);
      if (field === 'maxPacks') return maximum('Minimum order quantity', a.minPacks, expected);
      return constraint('Subscription required', a.subscription, expected);
    });
    const checks = [...rules(hard), ...deliveryCheck(offer, intent)];
    if (product) checks.push(constraint('Product type', a.product, product));
    if (a.expires) checks.push(minimum('Product still in date', a.expires.slice(0, 10), new Date(now).toISOString().slice(0, 10)));
    if (a.minPacks === null) checks.push(constraint('Minimum order quantity', null, true));
    if (a.subscription !== false && hard.subscription === undefined) {
      checks.push(constraint('One-time sale terms', a.subscription === true ? null : a.subscription, false));
    }
    if (intent.requiresDelivery && a.deliveryThreshold !== null) {
      checks.push(minimum('Basket meets delivery threshold', offer.price ? offer.price.amount * quantity : null, a.deliveryThreshold));
    }
    const runRate = usage && priceBasis && usage.dimension === a.net.dimension && a.minPacks && a.subscription === false
      ? { cadence, packs: Math.max(a.minPacks, Math.ceil(usage.base / packSize)), restockPeriods: packSize * a.minPacks / usage.base }
      : null;
    if (runRate) {
      runRate.subtotal = runRate.packs * offer.price.amount;
      runRate.estimate = usage.base / packSize * offer.price.amount;
    }
    const alternative = checks.some(check => check.status === 'conflict' && /content|pack/u.test(check.label));
    return { checks, soft: rules(soft), relation: alternative ? 'Different pack size or net content' : 'Comparable product and pack options',
      alternative, match: a.product && a.net ? 1 : 0.65, quantity,
      facts: [a.brand, a.variant, a.net && a.net.base + ' ' + ({ mass: 'g', volume: 'ml', count: 'pieces' })[a.net.dimension] +
        ' per piece', loaded(a.pieces, ' per sales pack'), loaded(a.minPacks, ' minimum packs'),
        a.subscription === null ? 'Subscription terms unknown' : a.subscription ? 'Subscription required' : 'One-time purchase',
        a.expires && 'Product expiry ' + a.expires.slice(0, 10),
        a.deliveryThreshold !== null && offer.price ? 'Delivery requires ' + offer.price.currency + ' ' + a.deliveryThreshold : null],
      priceBasis, runRate, equivalenceTerms: a.subscription === null ? null : String(a.subscription) };
  },
};
