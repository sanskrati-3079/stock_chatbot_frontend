/*
 * Thin client for the FastAPI backend.
 * Failures surface as a generic "service unavailable" message; the backend address is never shown.
 */
(function (App) {
  const BASE = (App.config.BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '');
  const SERVICE_DOWN = 'The analysis service is temporarily unavailable. Please try again in a moment.';
  const TTL = 5 * 60 * 1000;

  class ApiError extends Error {
    constructor(message, notFound = false) {
      super(message);
      this.notFound = notFound;
    }
  }

  // Promise cache so concurrent and repeated requests share one fetch (like st.cache_data).
  const cache = new Map();
  function cached(key, ttl, fn) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.t < ttl) return hit.p;
    const p = fn();
    cache.set(key, { t: Date.now(), p });
    p.catch(() => cache.delete(key));
    return p;
  }

  async function request(path, { params, method = 'GET', body, timeout = 30000 } = {}) {
    const url = new URL(BASE + path, window.location.href);
    Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    let resp;
    try {
      resp = await fetch(url, {
        method,
        signal: ctrl.signal,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      console.warn(`${method} ${path} failed:`, err);
      throw new ApiError(SERVICE_DOWN);
    } finally {
      clearTimeout(timer);
    }
    if (resp.status === 404) throw new ApiError('Ticker not found.', true);
    if (!resp.ok) {
      console.warn(`${method} ${path} -> ${resp.status}`);
      throw new ApiError(SERVICE_DOWN);
    }
    try {
      return await resp.json();
    } catch (_) {
      throw new ApiError(SERVICE_DOWN);
    }
  }

  const enc = encodeURIComponent;

  const predict = (ticker, period = '6mo') =>
    cached(`p:${ticker}:${period}`, TTL, () => request(`/stock/${enc(ticker)}/predict`, { params: { period } }));

  const history = (ticker, period = '6mo') =>
    cached(`h:${ticker}:${period}`, TTL, () => request(`/stock/${enc(ticker)}/history`, { params: { period, interval: '1d' } }));

  /** Fetch many tickers in parallel; failed ones map to null. */
  async function many(fn, tickers, period) {
    const results = await Promise.all(tickers.map((t) => fn(t, period).catch(() => null)));
    return Object.fromEntries(tickers.map((t, i) => [t, results[i]]));
  }

  App.api = {
    SERVICE_DOWN,
    ApiError,
    predict,
    history,
    predictMany: (tickers, period = '6mo') => many(predict, tickers, period),
    historyMany: (tickers, period = '1mo') => many(history, tickers, period),

    isOnline: () => cached('health', 30000, () =>
      request('/health', { timeout: 3000 }).then(() => true, () => false)),

    async chat(message, period) {
      try {
        return await request('/chat', { method: 'POST', body: { message, period }, timeout: 45000 });
      } catch (_) {
        return { reply: `⚠️ ${SERVICE_DOWN}`, ticker: null, data: null };
      }
    },
  };
})(window.App);
