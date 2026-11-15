const second = 1000;
const minute = 60 * second;
const minRefresh = 30 * second;
const policies = {
  'www.cheapshark.com': { ttl: 8 * minute, gap: 450 },
  'www.gamerpower.com': { ttl: 10 * minute, gap: second },
  'api-core.livingsocial.com': { ttl: 8 * minute, gap: second },
  'prices.openfoodfacts.org': { ttl: 20 * minute, gap: second },
};

function retryDelay(value, now) {
  if (!value) return 0;
  return /^\d+$/u.test(value) ? Number(value) * second : Math.max(0, Date.parse(value) - now) || 0;
}

function failure(message, status, until = 0) {
  return Object.assign(new Error(message), { status, until });
}

function waitUntil(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const cancel = () => { clearTimeout(id); reject(signal.reason); };
    const id = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, ms);
    signal.addEventListener('abort', cancel, { once: true });
  });
}

// Owned by one chat; never persists keys, public responses or network cooldowns to storage.
export function createMatchingSession({ fetcher = fetch, now = Date.now, online = () => navigator.onLine, pause = waitUntil } = {}) {
  const cache = new Map();
  const inflight = new Map();
  const hosts = new Map();
  const snapshots = new Map();
  const queue = [];
  const lifetime = new AbortController();
  let active = 0;

  function pump() {
    while (active < 2 && queue.length) {
      const job = queue.shift();
      job.signal.removeEventListener('abort', job.cancel);
      if (job.signal.aborted) {
        job.reject(job.signal.reason);
        continue;
      }
      active++;
      void job.run().then(job.resolve, job.reject).finally(() => { active--; pump(); });
    }
  }

  function schedule(run, signal) {
    return new Promise((resolve, reject) => {
      signal.throwIfAborted();
      const job = { run, signal, resolve, reject, cancel: () => {
        const i = queue.indexOf(job);
        if (i >= 0) queue.splice(i, 1);
        reject(signal.reason);
      } };
      signal.addEventListener('abort', job.cancel, { once: true });
      queue.push(job);
      pump();
    });
  }

  function save(map, id, value, max) {
    map.delete(id);
    map.set(id, value);
    if (map.size > max) map.delete(map.keys().next().value);
  }

  async function read(url, params, parent, force = false) {
    const endpoint = new URL(url);
    if (params) endpoint.search = new URLSearchParams(params);
    const policy = policies[endpoint.hostname];
    if (!policy || endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.port) {
      throw failure('Source not enabled', 'unavailable');
    }
    const metadata = endpoint.pathname === '/api/1.0/stores';
    const ttl = metadata ? 30 * minute : policy.ttl;
    const id = endpoint.href;
    const previous = cache.get(id);
    const signal = AbortSignal.any([parent, lifetime.signal]);
    signal.throwIfAborted();
    if (previous && now() < previous.until && (!force || metadata || now() - previous.at < minRefresh)) return previous.value;
    const shared = inflight.get(id);
    if (shared && !shared.signal.aborted) {
      const value = await shared.promise;
      signal.throwIfAborted();
      return value;
    }
    const promise = schedule(async () => {
      if (!online()) throw failure('Offline', 'offline');
      const host = hosts.get(endpoint.hostname) || { next: 0, until: 0, failures: 0, status: '' };
      hosts.set(endpoint.hostname, host);
      while (host.next > now() && host.until <= now()) await pause(host.next - now(), signal);
      signal.throwIfAborted();
      if (host.until > now()) throw failure('Source cooling down', host.status, host.until);
      host.next = now() + policy.gap;
      const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(9500)]);
      try {
        const response = await fetcher(endpoint, {
          mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error',
          headers: { Accept: 'application/json' }, signal: requestSignal, cache: 'no-store',
        });
        if (!response.ok) throw failure('HTTP ' + response.status,
          response.status === 429 ? 'rate limited' : 'unavailable',
          now() + retryDelay(response.headers.get('Retry-After'), now()));
        const data = await response.json();
        requestSignal.throwIfAborted();
        host.failures = 0;
        const at = now();
        const value = { data, source: id, checkedAt: new Date(at).toISOString(), until: at + ttl };
        save(cache, id, { at, value, until: value.until }, 64);
        return value;
      } catch (error) {
        signal.throwIfAborted();
        host.failures = Math.min(host.failures + 1, 6);
        const status = error.status || (error.name === 'TimeoutError' ? 'timed out' : 'unavailable');
        const floor = status === 'rate limited' ? 60 * second : 8 * second;
        host.until = Math.max(host.until, error.until || 0, now() + Math.min(10 * minute, floor * 2 ** (host.failures - 1)));
        host.status = status;
        throw failure(error.message, status, host.until);
      }
    }, signal);
    const entry = { signal, promise };
    inflight.set(id, entry);
    try { return await promise; }
    finally { if (inflight.get(id) === entry) inflight.delete(id); }
  }

  return {
    read,
    previous: key => snapshots.get(key),
    remember: (key, value) => save(snapshots, key, value, 32),
    dispose() {
      lifetime.abort();
      cache.clear();
      inflight.clear();
      hosts.clear();
      snapshots.clear();
    },
  };
}
