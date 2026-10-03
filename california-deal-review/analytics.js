(() => {
  const qa = new URLSearchParams(location.search).get('qa') === '1';
  let id = crypto.randomUUID();
  try {
    const saved = JSON.parse(sessionStorage.getItem('cdr-session') || 'null');
    if (saved && saved.qa === qa && Date.now() - saved.at < 1800000) id = saved.id;
    sessionStorage.setItem('cdr-session', JSON.stringify({ id, at: Date.now(), qa }));
  } catch {}
  const track = async kind => {
    try {
      return await fetch('https://california-deal-review.yl124915300.workers.dev/api/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, kind, qa }), keepalive: true });
    } catch { return null; }
  };
  track('VISITS');
  document.querySelectorAll('[data-payment-cta]').forEach(link => {
    link.addEventListener('click', async event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) { track('PAYMENT_CLICKS'); return; }
      event.preventDefault();
      await Promise.race([track('PAYMENT_CLICKS'), new Promise(resolve => setTimeout(resolve, 800))]);
      location.assign(link.href);
    });
  });
})();
