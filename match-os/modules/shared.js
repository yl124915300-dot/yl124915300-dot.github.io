export const text = value => String(value ?? '').normalize('NFKC').trim();
export const key = value => text(value).toLowerCase().replace(/\s+/gu, ' ');
export const number = (value, minimum = 0) => {
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/u.test(text(value))) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : null;
};
export const count = value => {
  const parsed = number(value, 1);
  return Number.isSafeInteger(parsed) ? parsed : null;
};
export const yesNo = value => /^(yes|true|是)$/iu.test(text(value)) ? true :
  /^(no|false|否)$/iu.test(text(value)) ? false : null;
export const date = value => {
  const valueText = text(value);
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?$/u.test(valueText)) return null;
  const time = Date.parse(valueText);
  const day = valueText.slice(0, 10);
  const utcDay = Date.parse(day + 'T00:00:00Z');
  return Number.isFinite(time) && Number.isFinite(utcDay) && new Date(utcDay).toISOString().slice(0, 10) === day
    ? new Date(time).toISOString() : null;
};
export const stable = (...values) => values.every(value => value !== null && value !== undefined && value !== '')
  ? JSON.stringify(values) : null;
export const constraint = (label, actual, expected, passes = (left, right) => left === right) => ({
  label, status: actual === null || actual === undefined || actual === '' ? 'unknown' :
    passes(actual, expected) ? 'pass' : 'conflict',
});
export const minimum = (label, actual, expected) => constraint(label, actual, expected, (a, b) => a >= b);
export const maximum = (label, actual, expected) => constraint(label, actual, expected, (a, b) => a <= b);
export const includes = (label, values, value) => constraint(label, values?.length ? values : null,
  value, (actual, expected) => actual.includes(expected));
export const loaded = (value, unit) => value === null || value === '' || value === undefined ? null : value + (unit || '');
export const clamp = value => Math.max(0, Math.min(1, value));

export function extract(brief, item, patterns) {
  const hard = {};
  const soft = {};
  const unmatched = [];
  const clauses = [item, ...(brief.details || '').split(/[;；,，\n]+/u)];
  for (const [index, clause] of clauses.entries()) {
    const target = /\b(?:prefer(?:red)?|prioriti[sz]e|ideally|nice to have)\b|优先|最好/iu.test(clause) ? soft : hard;
    let leftover = text(clause);
    // Complex negation/disjunction must not be converted into a positive exact constraint.
    if (/\b(?:not|never|or|except|avoid)\b|不要|或者|除外|不需要/iu.test(clause)) {
      if (index > 0) unmatched.push(clause);
      continue;
    }
    for (const [field, pattern, parse] of patterns) {
      const match = pattern.exec(leftover);
      if (!match) continue;
      const value = parse(match);
      if (value === null) continue;
      if (Object.hasOwn(target, field) && target[field] !== value) {
        target[field] = null;
        unmatched.push(clause);
      } else target[field] = value;
      leftover = leftover.replace(match[0], ' ');
    }
    leftover = leftover.replace(/\b(?:prefer(?:red)?|ideally|must(?: have| be)?|required|only|and|please|with|for)\b|优先|最好|必须|仅/giu, '');
    if (target === hard && index > 0 && /[\p{L}\p{N}]/u.test(leftover)) unmatched.push(clause);
  }
  return { hard, soft, unmatched };
}

export function quoteCost(offer, quantity = 1) {
  if (!offer.price) return { listed: null, total: null };
  const charges = [offer.shipping, offer.tax, offer.fees];
  const known = offer.price.amount * quantity + charges.filter(Number.isFinite).reduce((a, b) => a + b, 0);
  const listed = Math.round(known * 1000) / 1000;
  return { listed, total: offer.price.kind === 'fixed' && charges.every(Number.isFinite) ? listed : null };
}

export function deliveryCheck(offer, intent) {
  if (/^(?:just comparing|先比较|recurring)$/iu.test(intent.when) && !intent.requiresDelivery) return [];
  const explicitDate = /^\d{4}-\d{2}-\d{2}$/u.exec(intent.when)?.[0];
  if (explicitDate && offer.deliveryDate) {
    return [constraint('Delivery date', offer.deliveryDate.slice(0, 10), explicitDate, (a, b) => a <= b)];
  }
  return [constraint(intent.requiresDelivery ? 'Delivery to requested area and time' : 'Delivery deadline', null, true)];
}
