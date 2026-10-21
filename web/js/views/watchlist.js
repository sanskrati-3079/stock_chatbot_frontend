/* Personal watchlist with signals at a glance. */
(function (App) {
  const { ui, api, store } = App;

  async function renderBody(body, ctx, quiet = false) {
    const wl = store.get('watchlist');
    body.classList.toggle('quiet', quiet);
    if (!wl.length) {
      body.innerHTML = `<div class="empty"><div class="em">⭐</div><h3>Your watchlist is empty</h3>
        <p>Add a ticker above or use ☆ on the Analyze page.</p></div>`;
      return;
    }
    if (!body.children.length) body.innerHTML = ui.loadingLine('Updating signals…') + ui.skeletonCards(5, 160) + ui.skeletonCards(3, 280);

    const preds = await api.predictMany(wl, ctx.period);
    if (!ctx.alive()) return;

    const counts = { BUY: 0, HOLD: 0, SELL: 0 };
    const moves = [];
    Object.values(preds).forEach((p) => {
      if (!p) return;
      counts[p.signal] = (counts[p.signal] || 0) + 1;
      moves.push(p.change_pct_1d);
    });
    const avg = moves.length ? moves.reduce((s, v) => s + v, 0) / moves.length : 0;

    const summary = ui.cards([
      ui.card('Tracked', ui.count(wl.length, 0), 'tickers'),
      ui.card('Avg. move today', ui.change(avg), 'equal-weighted'),
      ...Object.entries(counts).map(([s, n]) =>
        ui.card(`${ui.SIGNAL_EMOJI[s] || ''} ${s}`, `<span style="color:${ui.SIGNAL_COLORS[s] || ui.NEUTRAL}">${ui.count(n, 0)}</span>`, 'signals')),
    ], 160);

    const items = wl.map((tk, i) => {
      const p = preds[tk];
      const card = !p
        ? ui.card(ui.esc(tk), '—', 'No data — check the symbol')
        : ui.card(ui.esc(p.ticker), ui.money(p.last_price, p.currency),
          `${ui.change(p.change_pct_1d)} · RSI ${p.rsi.toFixed(0)} · ${ui.signalBadge(p.signal, p.confidence)}`,
          ui.sparkline(p.history_close.slice(-40), ui.colorFor(p.forecast_trend_pct)));
      return `<div class="wl-item" style="--i:${i}" data-item="${ui.esc(tk)}">${card}
        <div class="wl-actions">
          <button class="btn" data-goto="analyze" data-ticker="${ui.esc(p ? p.ticker : tk)}">Analyze <span class="arrow">→</span></button>
          <button class="btn btn-danger" data-remove="${ui.esc(tk)}" title="Remove from watchlist" aria-label="Remove ${ui.esc(tk)}">✕</button>
        </div></div>`;
    }).join('');

    body.innerHTML = summary + `<div class="wl-grid" style="margin-top:6px">${items}</div>`;
    ui.animate(body);
  }

  App.views = App.views || {};
  App.views.watchlist = function (root, ctx) {
    root.innerHTML = `
      ${ui.section('Your watchlist', 'Track the stocks you care about. Saved in this browser.', 'Watchlist')}
      <form class="wl-add reveal" id="wlAdd" autocomplete="off">
        <input class="input" name="q" placeholder="Add a ticker — e.g. AMZN, HDFCBANK.NS, ETH-USD" aria-label="Add ticker">
        <button class="btn btn-primary" type="submit">＋ Add</button>
      </form>
      <div id="wlBody"></div>`;
    ui.animate(root);
    const body = root.querySelector('#wlBody');

    root.querySelector('#wlAdd').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = e.target.q.value.trim().toUpperCase();
      e.target.q.value = '';
      if (!q) return;
      if (store.get('watchlist').includes(q)) return ui.toast(`${q} is already in your watchlist`, 'ℹ️');
      store.set('watchlist', [...store.get('watchlist'), q]);
      ui.toast(`${q} added to your watchlist`, '⭐');
      App.refreshSidebar();
      renderBody(body, ctx);
    });

    body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-remove]');
      if (!b) return;
      const tk = b.dataset.remove;
      const item = b.closest('.wl-item');
      item.classList.add('removing');
      item.addEventListener('animationend', () => {
        store.toggleWatch(tk);
        App.refreshSidebar();
        renderBody(body, ctx, true);
      }, { once: true });
    });

    return renderBody(body, ctx);
  };
})(window.App);
