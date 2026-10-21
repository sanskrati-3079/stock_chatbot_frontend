/* App state, persisted in this browser via localStorage (falls back to memory if unavailable). */
(function (App) {
  const KEY = 'stocksense:state:v1';
  const DEFAULTS = {
    ticker: 'AAPL',
    recent: [],
    watchlist: ['AAPL', 'TSLA', 'NVDA', 'TCS.NS', 'RELIANCE.NS'],
    period: '6mo',
    cmpOptions: null,
    cmpSel: ['AAPL', 'MSFT', 'NVDA'],
    anKind: 'Candlestick',
    anOverlays: ['SMA 20', 'SMA 50', 'Forecast'],
    anVol: true,
    anTab: 'price',
  };

  const state = { ...DEFAULTS };
  try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (_) { /* private mode etc. */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* ignore */ } };

  App.store = {
    get: (k) => state[k],
    set(k, v) { state[k] = v; save(); },

    /** Add or remove a ticker; returns true if it is now in the watchlist. */
    toggleWatch(ticker) {
      const wl = state.watchlist.filter((t) => t !== ticker);
      const added = wl.length === state.watchlist.length;
      this.set('watchlist', added ? [...wl, ticker] : wl);
      return added;
    },

    remember(ticker) {
      this.set('recent', [ticker, ...state.recent.filter((t) => t !== ticker)].slice(0, 6));
    },
  };
})(window.App);
