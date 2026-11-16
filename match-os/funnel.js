import { normalizeEntry } from './demand/topics.js?v=10';

export const steps = Object.freeze({
  entry: 'Opened a tagged entry',
  chat: 'Opened purchase chat',
  complete: 'Completed request',
  authorized: 'Approved a public catalog query',
  candidates: 'Saw at least one candidate',
  handoff: 'Approved a request handoff',
  outbound: 'Opened a purchase listing or store redirect',
  outcome: 'Chose a purchase outcome',
  merchant: 'Merchant order independently verified',
  fee: 'PayPal service fee verified (closed)',
});

const outcomes = new Set(['bought', 'not_bought', 'still_comparing']);
const blockers = new Set(['no_match', 'missing_terms', 'budget', 'changed_mind']);
const categories = new Set(['electronics', 'consumables', 'services', 'games']);

export function createFunnel(context, qa) {
  const { source, topic } = normalizeEntry(context.source, context.topic);
  const seen = new Set(source === 'direct' ? ['chat'] : ['entry', 'chat']);
  let outcome = null;
  let blocker = null;
  return {
    has: step => seen.has(step),
    mark(step) {
      const dependency = { complete: 'chat', authorized: 'complete', candidates: 'complete', handoff: 'complete', outbound: 'candidates' }[step];
      if (dependency && seen.has(dependency)) seen.add(step);
    },
    report(value) {
      if (!seen.has('complete')) return;
      outcome = outcomes.has(value) && seen.has('outbound') ? value : null;
      blocker = blockers.has(value) ? value : null;
      if (outcome || blocker) seen.add('outcome');
      else seen.delete('outcome');
    },
    export(currentCategories) {
      return { format: 'match_os_feedback_v1', sample: qa ? 'qa' : 'unverified_volunteer',
        source, topic, categories: [...new Set(currentCategories.filter(c => categories.has(c)))].sort(),
        steps: Object.keys(steps).filter(step => seen.has(step)),
        outcome_self_reported: outcome, blocker_self_reported: blocker, merchant_purchase_verified: false,
        paypal_service_fee: 'closed' };
    },
  };
}
