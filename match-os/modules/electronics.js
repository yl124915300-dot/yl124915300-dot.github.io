import { constraint, count, deliveryCheck, extract, includes, key, loaded, minimum, number, stable, text, yesNo } from './shared.js?v=7';

const aliases = { 苹果: 'apple', 三星: 'samsung', 索尼: 'sony', 谷歌: 'google', 联想: 'lenovo' };
const brand = value => aliases[key(value)] || key(value);
const condition = value => ({ 'brand new': 'new', sealed: 'new', 全新: 'new', 二手: 'used',
  翻新: 'refurbished', 'open-box': 'open box' })[key(value)] || key(value);
const region = value => ({ usa: 'us', 'united states': 'us', 美版: 'us', 国行: 'cn',
  日版: 'jp', 欧版: 'eu', 'china mainland': 'cn' })[key(value)] || key(value);
const connector = value => key(value).replace(/^usb[ -]?c$/u, 'usb-c').replace(/^3[.]5\s*mm$/u, '3.5 mm');
const list = (value, normalize) => [...new Set(text(value).split(/[,，/]+/u).map(normalize).filter(Boolean))].sort();
const storage = gb => number(gb, 1);
const productKinds = [
  [/\b(?:charger|cable|adapter|case|accessor\w*)\b|充电器|充电线|配件|保护壳/iu, 'accessory'],
  [/\b(?:phone|smartphone|iphone|pixel|galaxy [sz])\b|手机/iu, 'phone'],
  [/\b(?:laptop|notebook|macbook|thinkpad)\b|笔记本/iu, 'laptop'],
  [/\b(?:tablet|ipad)\b|平板/iu, 'tablet'],
  [/\b(?:headphones?|earbuds?|airpods|wh[- ]?1000xm\d+)\b|耳机/iu, 'audio'],
  [/\b(?:monitor|display)\b|显示器/iu, 'monitor'],
  [/\b(?:camera)\b|相机/iu, 'camera'],
];
const kind = value => productKinds.find(([pattern]) => pattern.test(value))?.[1] || '';
const storagePattern = /(?<![\d.])(\d+(?:\.\d+)?)\s*(TB|GB)(?!\p{L})/iu;
const fromStorage = m => Number(m[1]) * (m[2].toLowerCase() === 'tb' ? 1000 : 1);
const familyPatterns = [
  [/\b(iphone|ipad|macbook(?: air| pro)?|pixel|galaxy [asz]|thinkpad [a-z]|playstation|airpods(?: pro)?|switch)\s*(\d{1,4})?(?:\s*(pro max|pro|plus|mini|ultra|air|fold|flip))?(?!\w)/iu,
    m => [key(m[1]), m[2] ? Number(m[2]) : null, key(m[3])]],
  [/\b(?:sony\s+)?(wh[- ]?1000xm)(\d{1,2})\b/iu, m => ['wh-1000xm', Number(m[2]), '']],
];
export function modelReference(value) {
  const name = text(value);
  for (const [pattern, parse] of familyPatterns) {
    const match = pattern.exec(name);
    if (match) {
      const [family, generation, suffix] = parse(match);
      return { family, generation, model: [family, generation, suffix].filter(Boolean).join(' '), raw: match[0] };
    }
  }
  return null;
}

const schema = [
  ['productKind', 'Product type (phone, laptop, headphones…)'], ['brand', 'Brand', 'Apple'], ['model', 'Exact model'], ['family', 'Product family'], ['generation', 'Generation'], ['modelCode', 'Manufacturer model number, if shown'],
  ['storageGB', 'Storage in GB'], ['configuration', 'Configuration (chip, RAM, connectivity)'],
  ['region', 'Region version (US, CN, JP…)'], ['condition', 'Condition (new, used, refurbished, open box)'],
  ['warrantyMonths', 'Warranty months'], ['connector', 'Connector or charging standard (USB-C, Lightning…)'],
  ['wiredAnc', 'Active noise cancellation works with cable (yes or no)'], ['compatibleWith', 'Compatible models, comma separated'], ['deliveryDate', 'Arrival date (YYYY-MM-DD)'],
];

export const electronics = {
  id: 'electronics', label: 'Electronics', schema,
  horizontal: 'Matching model, configuration, region, condition and charging standard',
  normalize(raw) {
    const reference = modelReference(raw.model);
    return {
      productKind: kind(text(raw.productKind) || text(raw.model)) || key(raw.productKind),
      brand: brand(raw.brand), model: reference?.model || key(raw.model), modelCode: key(raw.modelCode),
      family: reference?.family || key(raw.family),
      generation: reference?.generation || count(raw.generation), storageGB: storage(raw.storageGB),
      configuration: key(raw.configuration), region: region(raw.region), condition: condition(raw.condition),
      warrantyMonths: number(raw.warrantyMonths), connector: connector(raw.connector), wiredAnc: yesNo(raw.wiredAnc),
      compatibleWith: list(raw.compatibleWith, value => modelReference(value)?.model || key(value)),
    };
  },
  requirements(brief, item) {
    const ram = /(?:\bRAM\s*[:=]?\s*(\d+)\s*GB|(\d+)\s*GB\s*RAM\b)/iu;
    const withoutRam = item.replace(ram, ' ');
    const found = extract({ ...brief, details: brief.details.replace(/\binclude delivery\b/giu, '') }, withoutRam, [
      ['ram', ram, m => Number(m[1] || m[2])],
      ['storageGB', storagePattern, fromStorage],
      ['region', /\b(?:(US|USA|JP|CN|EU|UK|global)\s+(?:version|model))\b|美版|国行|日版|欧版/iu, m => region(m[1] || m[0])],
      ['condition', /\b(?:brand new|new only|sealed|refurbished|used only|open[- ]box)\b|全新|二手|翻新/iu, m => condition(m[0].replace(/ only$/iu, ''))],
      ['wiredAnc', /\b(?:wired\s+(?:anc|active noise cancellation)|(?:anc|active noise cancellation)\s+(?:in wired mode|while wired|with (?:a |the )?cable))\b/iu, () => true],
      ['connector', /\b(?:usb[- ]?c|lightning|micro[- ]?usb|qi2?|3[.]5\s*mm)\b/iu, m => connector(m[0])],
      ['warrantyMonths', /(?:(\d{1,3})\s*months?[ -]+warranty|\bwarranty\s*[:=]?\s*(\d{1,3})\s*months?|(\d{1,3})\s*个月保修)/iu,
        m => Number(m[1] || m[2] || m[3])],
    ]);
    const ramInItem = ram.exec(item);
    if (ramInItem) found.hard.ram = Number(ramInItem[1] || ramInItem[2]);
    const reference = modelReference(item);
    const productKind = kind(item);
    const accessory = productKind === 'accessory';
    if (productKind) found.hard.productKind = productKind;
    if (reference) {
      if (accessory) found.hard.compatibleWith = reference.model;
      else found.hard.model = reference.model;
    }
    return { ...found, reference, accessory };
  },
  identity(a) {
    const base = stable(a.brand, a.model, a.configuration, a.region, a.condition, a.connector);
    if (!base || (/iphone|ipad|macbook|pixel|galaxy|thinkpad|laptop|phone|tablet/u.test(a.model) && a.storageGB === null)) return null;
    return stable(base, a.modelCode || 'unknown code', a.storageGB ?? 'not applicable');
  },
  assess(a, intent, offer) {
    const { hard, soft, reference, accessory } = intent.requirements;
    const rules = (wanted) => Object.entries(wanted).map(([field, value]) => {
      if (value === null) return constraint(field + ' needs clarification', null, true);
      if (field === 'warrantyMonths') return minimum('Warranty months', a.warrantyMonths, value);
      if (field === 'compatibleWith') return includes('Compatible with ' + value, a.compatibleWith, value);
      if (field === 'ram') {
        const match = /(?:(\d+)\s*gb\s*ram|ram\s*[:=]?\s*(\d+)\s*gb)/iu.exec(a.configuration);
        return constraint('RAM in GB', match ? Number(match[1] || match[2]) : null, value);
      }
      return constraint({ storageGB: 'Storage in GB', model: 'Exact model', region: 'Region version', wiredAnc: 'Active noise cancellation with cable', productKind: 'Product type' }[field] || field, a[field], value);
    });
    const checks = [...rules(hard), ...deliveryCheck(offer, intent)];
    const relatedModel = !accessory && reference && a.family === reference.family && a.model !== reference.model;
    let relation = 'Requested model and configuration';
    if (relatedModel) {
      const delta = a.generation !== null && reference.generation !== null ? a.generation - reference.generation : 0;
      relation = delta > 0 ? 'Newer generation of ' + reference.family :
        delta < 0 ? 'Earlier generation of ' + reference.family : 'Different model or trim in ' + reference.family;
    } else if (accessory) relation = 'Accessory compatibility';
    else if (hard.storageGB && a.storageGB !== null && a.storageGB !== hard.storageGB) relation = 'Same model, different capacity';
    const match = relatedModel ? 0.58 : (reference || Object.keys(hard).length ? 1 : 0.65);
    return { checks, soft: rules(soft), relation, match, alternative: Boolean(relatedModel || relation === 'Same model, different capacity'),
      facts: [loaded(a.brand), loaded(a.model), a.modelCode, loaded(a.storageGB, ' GB'), a.configuration, a.region,
        a.condition, loaded(a.warrantyMonths, ' months warranty'), a.connector,
        a.wiredAnc === null ? null : a.wiredAnc ? 'Wired ANC reported' : 'No wired ANC reported',
        a.compatibleWith.length ? 'Compatible with ' + a.compatibleWith.join(', ') : null] };
  },
};
