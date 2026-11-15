import { constraint, count, date, extract, key, loaded, maximum, number, stable, text, yesNo } from './shared.js?v=5';

const definitions = [
  [/(?:\bdeep tissue massage\b|深层组织按摩)/iu, 'deep tissue massage'],
  [/(?:\bswedish massage\b|瑞典式按摩)/iu, 'swedish massage'],
  [/(?:\bprenatal massage\b|孕期按摩)/iu, 'prenatal massage'],
  [/(?:\b(?:massage|massages)\b|按摩)/iu, 'massage'],
  [/(?:\b(?:hair ?cuts?)\b|剪发|理发)/iu, 'haircut'],
  [/\bhair styling\b|发型设计/iu, 'hair styling'],
  [/(?:\b(?:house cleaning|home cleaning|cleaning service)\b|家政|保洁)/iu, 'home cleaning'],
  [/\bcar wash\b|洗车/iu, 'car wash'],
  [/\b(?:auto detailing|car detailing)\b|汽车美容/iu, 'car detailing'],
  [/(?:\b(?:manicure|pedicure|nail salon)\b|美甲)/iu, 'nail care'],
  [/(?:\b(?:restaurant|food delivery|dining|dinner)\b|餐厅|外卖|餐饮)/iu, 'dining'],
  [/\bfacial\b|面部护理/iu, 'facial'],
  [/\bspa\b|水疗/iu, 'spa'],
  [/(?:\b(?:tutoring|repair service|plumber|photograph(?:y|er))\b|维修|摄影|家教)/iu, null],
];
export function serviceDefinition(value) {
  for (const [pattern, category] of definitions) {
    const match = pattern.exec(value);
    if (match) return category || key(match[0]);
  }
  return '';
}
const family = type => type.endsWith('massage') ? 'massage' : type;
const duration = /\b(\d{1,3}(?:\.\d+)?)\s*[- ]?\s*(minutes?|mins?|hours?|hrs?|h)\b|(\d{1,3}(?:\.\d+)?)\s*(分钟|小时)/iu;
const party = /\b(?:for\s+)?(one|two|three|four|\d{1,2})\s+(?:people|persons?|guests?|adults?)\b|([一两二三四\d]+)人/iu;
const distance = /(?:\bwithin\s+|半径\s*)(\d+(?:\.\d+)?)\s*(km|kilometers?|miles?|mi|公里)\b|(?:半径\s*)(\d+(?:\.\d+)?)\s*公里/iu;
const partyNumber = value => ({ one: 1, two: 2, three: 3, four: 4, 一: 1, 两: 2, 二: 2, 三: 3, 四: 4 })[key(value)] || count(value);

export const services = {
  id: 'services', label: 'Local services', horizontal: 'Same service, city, coverage, duration, party size and package',
  schema: [
    ['service', 'Exact service'], ['city', 'Service city'], ['market', 'Service country code'],
    ['minutes', 'Minutes per appointment'], ['party', 'People included'], ['package', 'Exact package inclusions'],
    ['coverage', 'Service coverage or on-site'], ['distanceKm', 'Distance from requested area in km'],
    ['slot', 'Confirmed offered slot (ISO with timezone)'], ['cancelable', 'Free cancellation (yes or no)'],
    ['cancelTerms', 'Cancellation conditions'], ['minimumCharge', 'Minimum charge for service'],
  ],
  normalize(raw) {
    return {
      service: serviceDefinition(raw.service) || key(raw.service), city: key(raw.city), market: key(raw.market),
      minutes: number(raw.minutes, 1), party: count(raw.party), package: key(raw.package),
      coverage: key(raw.coverage), distanceKm: number(raw.distanceKm), slot: date(raw.slot),
      cancelable: yesNo(raw.cancelable), cancelTerms: text(raw.cancelTerms), minimumCharge: number(raw.minimumCharge),
      listedOptions: raw.listedOptions,
    };
  },
  requirements(brief, item) {
    const timing = /^(?:(by|on)\s+)?(.+)$/iu.exec(brief.when);
    const slot = date(timing?.[2]);
    return { ...extract(brief, item, [
      ['minutes', duration, m => Number(m[1] || m[3]) * (/^h|小时/iu.test(m[2] || m[4]) ? 60 : 1)],
      ['party', party, m => partyNumber(m[1] || m[2])],
      ['distanceKm', distance, m => Number(m[1] || m[3]) * (/^(?:mi|mile)/iu.test(m[2] || '') ? 1.609344 : 1)],
      ['cancelable', /\b(?:free cancellation|refundable|must be cancelable)\b|免费取消|必须可取消/iu, () => true],
    ]), service: serviceDefinition(item) || key(item.replace(/^local service\s*[:：]\s*/iu, '')), slot, by: key(timing?.[1]) === 'by', dayOnly: /^\d{4}-\d{2}-\d{2}$/u.test(timing?.[2] || '') };
  },
  identity(a, offer) {
    return offer.price?.kind === 'fixed'
      ? stable(a.service, a.city, a.market, a.minutes, a.party, a.package, a.coverage)
      : null;
  },
  assess(a, intent, offer) {
    const { hard, soft, service, slot, by, dayOnly } = intent.requirements;
    const geography = intent.brief.place;
    const rules = wanted => Object.entries(wanted).map(([field, expected]) => {
      if (expected === null) return constraint(field + ' needs clarification', null, true);
      if (field === 'distanceKm') return maximum('Distance within requested radius', a.distanceKm, expected);
      const label = { minutes: 'Service duration', party: 'People included', cancelable: 'Free cancellation' }[field];
      return constraint(label, a[field], expected);
    });
    const relationship = a.service && service && a.service !== service && family(a.service) === family(service);
    const serviceMatch = a.service && service ? family(a.service) === family(service) : null;
    const matchedType = service === 'massage' && family(a.service) === service ? service :
      (service !== 'massage' && a.service === 'massage' && relationship ? null : a.service);
    const checks = [
      constraint('Requested service', matchedType, service),
      constraint('Requested city or verified coverage', a.city, key(geography.city)),
      constraint('Requested country', a.market, key(geography.code)),
      ...rules(hard),
    ];
    if (!/^(?:just comparing|先比较)$/iu.test(intent.when)) {
      checks.push(constraint('Appointment deadline', slot && a.slot ? a.slot : null, slot, (time, requested) => {
        const actualValue = dayOnly ? time.slice(0, 10) : time;
        const target = dayOnly ? requested.slice(0, 10) : requested;
        return by ? actualValue <= target : actualValue === target;
      }));
    }
    if (a.minimumCharge !== null && offer.price?.currency === intent.brief.budget.currency) {
      checks.push(maximum('Service minimum charge fits budget', a.minimumCharge, intent.brief.budget.amount));
    }
    if (offer.price?.kind === 'from') checks.push(constraint('Selected option price and bookable appointment', null, true));
    return {
      checks, soft: rules(soft), match: serviceMatch ? (relationship ? 0.75 : 1) : 0.5,
      relation: relationship ? 'Different service within ' + family(service) : 'Service package, duration and appointment',
      alternative: Boolean(relationship || rules(hard).some(check => check.status === 'conflict')), relevant: serviceMatch !== false,
      facts: [a.service, a.city, a.coverage, loaded(a.minutes, ' min'), loaded(a.party, ' people'),
        a.package, a.slot && 'Quoted slot ' + a.slot, a.cancelTerms || 'Cancellation terms unknown',
        a.minimumCharge !== null && offer.price ? 'Minimum charge ' + offer.price.currency + ' ' + a.minimumCharge : null,
        a.listedOptions?.duration?.length ? 'Title lists ' + a.listedOptions.duration.join(' / ') + ' min; option price unknown' : null,
        a.listedOptions?.party?.length ? 'Title lists party size ' + a.listedOptions.party.join(' / ') : null],
    };
  },
};
