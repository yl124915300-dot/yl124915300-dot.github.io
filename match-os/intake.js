import { BASE, topics, wirelessHeadphoneTopic } from './demand/topics.js?v=10';
import { headphoneGoals, headphoneMarkets, headphoneTopic } from './modules/headphones.js?v=14';

export { wirelessHeadphoneTopic };
export const agentLinkLifetime = 15 * 60_000;
const defaultGoals = { [wirelessHeadphoneTopic]: 'explore', [headphoneTopic]: 'wired-anc' };
const keys = new Set(['compare', 'topic', 'market', 'goal', 'until']);

export function agentTemplate(topic) {
  if (topic === wirelessHeadphoneTopic) return { category: 'electronics', item: 'Over-ear headphones' };
  return Object.hasOwn(topics, topic) ? topics[topic] : null;
}

export function isHeadphoneTemplate(topic) {
  return Object.hasOwn(defaultGoals, topic);
}

function templateFields(topic, market, goal) {
  if ([topic, market, goal].some(value => typeof value !== 'string')) return null;
  const template = agentTemplate(topic);
  if (!template) return null;
  if (market && (!Object.hasOwn(headphoneMarkets, market) ||
      (template.place && template.place.code !== market))) return null;
  if (goal && (!isHeadphoneTemplate(topic) || !headphoneGoals.some(option => option.id === goal))) return null;
  return { topic, market, goal: goal || (isHeadphoneTemplate(topic) ? defaultGoals[topic] : '') };
}

export function makeAgentLink({ topic, market = '', goal = '' }, now = Date.now()) {
  const fields = templateFields(topic, market, goal);
  if (!fields) return null;
  const until = Math.floor((now + agentLinkLifetime) / 60_000);
  const params = new URLSearchParams({ compare: '1', topic, until: String(until) });
  if (fields.market) params.set('market', fields.market);
  if (fields.goal) params.set('goal', fields.goal);
  return BASE + '/match-os/#' + params;
}

export function isAgentFragment(hash) {
  return new URLSearchParams(hash.slice(1)).has('compare');
}

export function readAgentLink(hash, now = Date.now()) {
  const params = new URLSearchParams(hash.slice(1));
  for (const key of params.keys()) {
    if (!keys.has(key) || params.getAll(key).length !== 1) return null;
  }
  const until = params.get('until');
  if (params.get('compare') !== '1' || !/^\d{1,8}$/.test(until ?? '')) return null;
  const expires = Number(until) * 60_000;
  if (expires <= now || expires > now + agentLinkLifetime) return null;
  const fields = templateFields(params.get('topic'), params.get('market') ?? '', params.get('goal') ?? '');
  return fields && { ...fields, expires };
}
