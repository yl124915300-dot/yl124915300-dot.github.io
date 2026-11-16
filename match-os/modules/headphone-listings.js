// Public page observations, not merchant quotes for a particular buyer.
// Recheck the SKU and visible terms before updating any observation timestamp.
const checkedAt = '2026-11-16T05:17:00Z';
const validUntil = '2026-11-17T05:17:00Z';
const us = { market: 'US', currency: 'USD', checkedAt, validUntil };
const xm5Returns = {
  label: 'Listing shows extended returns through Feb 1, 2027; check item eligibility and exclusions',
  url: 'https://www.bhphotovideo.com/find/HelpCenter/ReturnExchange.jsp',
};

export const HEADPHONE_LISTINGS = [
  {
    ...us, id: 'bh-xm5', model: 'xm5', modelCode: 'WH1000XM5/B', condition: 'new', merchant: 'B&H Photo',
    url: 'https://www.bhphotovideo.com/c/product/1706293-REG/sony_6505727_sony_wh_1000xm5_wireless_noise_canceling.html',
    amount: 398, checkedAt: '2026-11-16T05:44:00Z', validUntil: '2026-11-17T05:44:00Z',
    stock: 'listed', stockNote: 'Seller page showed in stock; stock for your location is unknown',
    fulfillment: 'Page showed free delivery Nov 18 for its Centreville, VA example. Check your ZIP and delivery date.',
    returns: xm5Returns,
  },
  {
    ...us, id: 'buydig-xm5', model: 'xm5', modelCode: 'WH1000XM5/B', condition: 'new', merchant: 'BuyDig',
    url: 'https://www.buydig.com/shop/product/SNWH1000XM5B/Sony-WH-1000XM5-Wireless-Industry-Leading-Noise-Canceling-Headphones-Black',
    amount: 398, checkedAt: '2026-11-16T05:44:00Z', validUntil: '2026-11-17T05:44:00Z',
    stock: 'listed', stockNote: 'Seller page showed in stock; stock for your location is unknown',
    fulfillment: 'Page advertises free shipping and same or next business day dispatch. Location and delivery method affect arrival and cost.',
    returns: { label: 'Page advertises 30-day returns; check reason, condition and costs', url: 'https://www.buydig.com/shop/content/Policies.htm#return' },
  },
  {
    ...us, id: 'bh-ch730n', model: 'ch730n', modelCode: 'WHCH730N/B', condition: 'new', merchant: 'B&H Photo',
    url: 'https://www.bhphotovideo.com/c/product/1998821-REG/sony_whch730n_b_whch730n_wireless_noise_canceling_over_ear.html',
    amount: 98, checkedAt: '2026-11-16T05:56:00Z', validUntil: '2026-11-17T05:56:00Z',
    stock: 'listed', stockNote: 'Seller page showed in stock; stock for your location is unknown',
    fulfillment: 'Page showed free delivery Nov 18 for its Centreville, VA example. Check your ZIP and delivery date.',
    returns: xm5Returns,
  },
  {
    ...us, id: 'bh-xm4', model: 'xm4', modelCode: 'WH1000XM4/B', condition: 'new', merchant: 'B&H Photo',
    url: 'https://www.bhphotovideo.com/c/replacement_for/1582549-REG/sony_wh1000xm4_b_wh_1000xm4_wireless_noise_canceling_over_ear.html',
    stock: 'unavailable', stockNote: 'Exact model page shows no longer available',
  },
  {
    ...us, id: 'uniqcli-q45', model: 'q45', modelCode: 'A3040011', merchant: 'Uniqcli',
    url: 'https://getuniqcli.com/catalog/anker/a3040011',
    amount: 149.99, checkedAt: '2026-11-16T05:46:00Z', validUntil: '2026-11-17T05:46:00Z',
    stock: 'backorder', stockNote: 'Page displayed back-order; seller eligibility unverified',
    fulfillment: 'Seller estimates 3–8 weeks before receiving stock, then processes shipment',
    evidenceNote: 'B2B catalog; verify condition, buyer eligibility and checkout charges',
  },
  {
    ...us, id: 'cdw-q45', model: 'q45', modelCode: 'A3040011', merchant: 'CDW',
    url: 'https://www.cdw.com/product/anker-soundcore-space-q45-binaural-wireless-headphones-w-mic-3.5mm-jack/8474254',
    stock: 'unavailable', stockNote: 'Seller discontinued this listing October 24, 2026',
  },
];
