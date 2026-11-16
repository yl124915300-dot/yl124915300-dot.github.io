// Public page observations, not merchant quotes for a particular buyer.
// Recheck the SKU and visible terms before updating any observation timestamp.
const checkedAt = '2026-11-16T05:17:00Z';
const validUntil = '2026-11-17T05:17:00Z';
const us = { market: 'US', currency: 'USD', checkedAt, validUntil };

export const HEADPHONE_LISTINGS = [
  {
    ...us, id: 'bh-xm5', model: 'xm5', modelCode: 'WH1000XM5/B', condition: 'new', merchant: 'B&H Photo',
    url: 'https://www.bhphotovideo.com/c/product/1706293-REG/sony_6505727_sony_wh_1000xm5_wireless_noise_canceling.html',
    amount: 298, stock: 'listed', stockNote: 'Page displayed in stock; local availability unverified',
    fulfillment: 'Free delivery shown for Ashburn, VA only; check your location',
    returns: 'Page lists extended returns through Feb 1, 2027; verify terms',
  },
  {
    ...us, id: 'buydig-xm5', model: 'xm5', modelCode: 'WH1000XM5/B', condition: 'new', merchant: 'BuyDig',
    url: 'https://www.buydig.com/shop/product/SNWH1000XM5B/Sony-WH-1000XM5-Wireless-Industry-Leading-Noise-Canceling-Headphones-Black',
    amount: 398, checkedAt: '2026-11-16T05:20:00Z', stock: 'listed', stockNote: 'Page displayed in stock; local availability unverified',
    fulfillment: 'Page reports same or next business day dispatch; arrival depends on shipping and location',
    returns: 'Page advertises 30-day returns; verify exclusions',
  },
  {
    ...us, id: 'bh-xm4', model: 'xm4', modelCode: 'WH1000XM4/B', condition: 'new', merchant: 'B&H Photo',
    url: 'https://www.bhphotovideo.com/c/replacement_for/1582549-REG/sony_wh1000xm4_b_wh_1000xm4_wireless_noise_canceling_over_ear.html',
    stock: 'unavailable', stockNote: 'Exact model page shows no longer available',
  },
  {
    ...us, id: 'uniqcli-q45', model: 'q45', modelCode: 'A3040011', merchant: 'Uniqcli',
    url: 'https://getuniqcli.com/catalog/anker/a3040011',
    amount: 149.99, stock: 'backorder', stockNote: 'Page displayed back-order; seller eligibility unverified',
    fulfillment: 'Seller estimates 3–8 weeks before receiving stock, then processes shipment',
    evidenceNote: 'B2B catalog; verify condition, buyer eligibility and checkout charges',
  },
  {
    ...us, id: 'cdw-q45', model: 'q45', modelCode: 'A3040011', merchant: 'CDW',
    url: 'https://www.cdw.com/product/anker-soundcore-space-q45-binaural-wireless-headphones-w-mic-3.5mm-jack/8474254',
    stock: 'unavailable', stockNote: 'Seller discontinued this listing October 24, 2026',
  },
];
