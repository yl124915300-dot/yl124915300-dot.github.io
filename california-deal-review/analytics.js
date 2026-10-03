(() => {
  const params = new URLSearchParams(location.search);
  const qa = params.get('qa') === '1';
  const pages = {
    '/california-3-day-used-car-return/': 'return',
    '/dealer-add-ons-california/': 'addons',
    '/dealer-changed-price-california/': 'price',
    '/used-car-contract-review-california/': 'contract'
  };
  const path = location.pathname.replace(/\/index\.html$/, '/').replace(/\/?$/, '/');
  const page = pages[path] || document.documentElement.dataset.analyticsPage || 'main';
  const allowed = new Set(['main', 'return', 'addons', 'price', 'contract', 'direct', 'external', 'launch_x', 'launch_threads', 'launch_linkedin', 'launch_youtube', 'launch_blog', 'youtube', 'news', 'x', 'threads', 'linkedin', 'google', 'bing']);
  const explicitSource = params.get('utm_source') || params.get('source');
  const explicit = allowed.has(explicitSource) ? explicitSource : null;
  let source = explicit || 'direct';
  if (!explicit && document.referrer) {
    try {
      const ref = new URL(document.referrer);
      if (ref.origin !== location.origin) {
        if (/(^|\.)google\.[a-z.]+$/.test(ref.hostname)) source = 'google';
        else if (/(^|\.)bing\.com$/.test(ref.hostname)) source = 'bing';
        else if (/(^|\.)(x|twitter|t)\.co(m)?$/.test(ref.hostname)) source = 'x';
        else if (/(^|\.)threads\.(net|com)$/.test(ref.hostname)) source = 'threads';
        else if (/(^|\.)(youtube\.com|youtu\.be)$/.test(ref.hostname)) source = 'youtube';
        else if (/(^|\.)linkedin\.com$/.test(ref.hostname)) source = 'linkedin';
        else source = 'external';
      }
    } catch {}
  }
  let id = crypto.randomUUID();
  try {
    const saved = JSON.parse(sessionStorage.getItem('cdr-session') || 'null');
    if (saved && saved.qa === qa && Date.now() - saved.at < 1800000 && /^[0-9a-f-]{36}$/i.test(saved.id || '')) {
      id = saved.id;
      if (!explicit && allowed.has(saved.source)) source = saved.source;
    }
    sessionStorage.setItem('cdr-session', JSON.stringify({ id, at: Date.now(), qa, source }));
  } catch {}
  const track = async kind => {
    try {
      return await fetch('https://california-deal-review.yl124915300.workers.dev/api/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, kind, qa, page, source }), keepalive: true });
    } catch { return null; }
  };
  track('VISITS');
  document.querySelectorAll('[data-payment-cta]').forEach(link => {
    try {
      const checkout = new URL(link.href);
      checkout.searchParams.set('source', page);
      checkout.searchParams.set('utm_source', source);
      link.href = checkout.toString();
    } catch {}
    link.addEventListener('click', async event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) { track('CTA_CLICKS'); return; }
      event.preventDefault();
      await Promise.race([track('CTA_CLICKS'), new Promise(resolve => setTimeout(resolve, 800))]);
      location.assign(link.href);
    });
    link.addEventListener('auxclick', event => { if (event.button === 1) track('CTA_CLICKS'); });
  });
})();
