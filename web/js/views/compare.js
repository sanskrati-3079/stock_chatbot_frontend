/* Compare several tickers side by side. */
(function (App) {
  const { ui, api, store, ind, charts } = App;
  const PALETTE = ['#6d4aff', '#0891b2', '#d97706', '#16a34a', '#dc2626', '#db2777'];
  const MAX = 6;

  const options = () => store.get('cmpOptions') || [...ui.POPULAR];

  /** Align closes on date (forward-filled, leading gaps dropped), like the pandas version. */
  function align(frames) {
    const keys = Object.keys(frames);
    const dates = [...new Set(keys.flatMap((k) => frames[k].dates))].sort();
    const cols = keys.map((k) => {
      const byDate = new Map(frames[k].dates.map((d, i) => [d, frames[k].close[i]]));
      let last = null;
      return dates.map((d) => (byDate.has(d) ? (last = byDate.get(d)) : last));
    });
    const keep = dates.map((_, i) => cols.every((c) => c[i] != null));
    return { keys, dates: dates.filter((_, i) => keep[i]), cols: cols.map((c) => c.filter((_, i) => keep[i])) };
  }

  function chipsHtml() {
    const sel = store.get('cmpSel');
    return options().map((t) => {
      const i = sel.indexOf(t);
      const dot = i >= 0 ? `<span class="dot" style="background:${PALETTE[i % PALETTE.length]}"></span>` : '';
      return `<button type="button" class="chip${i >= 0 ? ' on' : ''}" data-cmp="${ui.esc(t)}">${dot}${ui.esc(t)}</button>`;
    }).join('');
  }

  async function renderResults(body, ctx, isCurrent) {
    const sel = store.get('cmpSel');
    if (sel.length < 2) {
      body.innerHTML = `<div class="empty"><div class="em">⚖️</div><h3>Pick at least two tickers to compare</h3><p>Select from the list above or add your own.</p></div>`;
      return;
    }
    body.innerHTML = ui.loadingLine('Fetching data…') + '<div class="sk sk-chart"></div>';

    const [hists, preds] = await Promise.all([api.historyMany(sel, ctx.period), api.predictMany(sel, ctx.period)]);
    if (!isCurrent()) return;

    const frames = {};
    sel.forEach((tk) => {
      const h = hists[tk];
      if (h && h.close && h.close.length) {
        const f = ind.toFrame(h);
        if (f.close.length) frames[tk] = f;
      }
    });
    const missing = sel.filter((tk) => !frames[tk]);
    let html = missing.length ? ui.alert('warn', `No data for: ${missing.map(ui.esc).join(', ')}`) : '';
    const { keys, dates, cols } = align(frames);
    if (keys.length < 2 || dates.length < 2) {
      body.innerHTML = html || ui.alert('info', api.SERVICE_DOWN);
      return;
    }
    const color = (tk) => PALETTE[sel.indexOf(tk) % PALETTE.length];

    const rows = keys.map((tk) => {
      const s = ind.stats(frames[tk]), p = preds[tk] || {};
      return {
        tk, price: frames[tk].close[frames[tk].close.length - 1], ret: s.period_return, vol: s.volatility,
        dd: s.max_drawdown, sharpe: s.sharpe, rsi: p.rsi, signal: p.signal, conf: p.confidence,
      };
    }).sort((a, b) => b.ret - a.ret);

    html += `
      <div class="chart-card reveal"><div class="chart-title">Performance <span>— rebased to 100</span></div><div class="chart" id="cmpPerf"></div></div>
      <div class="table-wrap reveal" style="margin-bottom:14px"><table class="table stagger">
        <thead><tr><th>Ticker</th><th class="r">Price</th><th class="r">Return</th><th class="r">Volatility</th><th class="r">Max DD</th>
          <th class="r">Sharpe</th><th class="r">RSI</th><th>Signal</th><th>Confidence</th></tr></thead>
        <tbody>${rows.map((r) => `
          <tr class="clickable" data-goto="analyze" data-ticker="${ui.esc(r.tk)}">
            <td class="tk"><span class="chip-dot" style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${color(r.tk)};margin-right:8px"></span>${ui.esc(r.tk)}</td>
            <td class="r">${ui.num(r.price)}</td>
            <td class="r"><span class="${ui.cls(r.ret)}">${ui.signed(r.ret)}%</span></td>
            <td class="r">${r.vol.toFixed(1)}%</td>
            <td class="r"><span class="down">${r.dd.toFixed(2)}%</span></td>
            <td class="r">${r.sharpe.toFixed(2)}</td>
            <td class="r">${r.rsi != null ? r.rsi.toFixed(1) : '—'}</td>
            <td>${r.signal ? ui.signalBadge(r.signal) : '—'}</td>
            <td>${r.conf != null ? `<span class="mini-bar"><span data-w="${ui.clamp(r.conf, 0, 100)}" style="background:${ui.SIGNAL_COLORS[r.signal] || ui.NEUTRAL}"></span></span>${r.conf.toFixed(0)}%` : '—'}</td>
          </tr>`).join('')}</tbody>
      </table></div>
      <div class="grid-halves">
        <div class="chart-card reveal"><div class="chart-title">Correlation of daily returns</div><div class="chart" id="cmpCorr"></div></div>
        <div class="chart-card reveal"><div class="chart-title">Risk vs. return</div><div class="chart" id="cmpRisk"></div></div>
      </div>`;
    charts.purge(body);
    body.innerHTML = html;
    ui.animate(body);

    // Normalised performance
    charts.plot(body.querySelector('#cmpPerf'), keys.map((tk, j) => ({
      type: 'scatter', mode: 'lines', x: dates, y: cols[j].map((v) => (v / cols[j][0]) * 100), name: tk,
      line: { color: color(tk), width: 2.2 }, hovertemplate: `%{y:.1f}<extra>${tk}</extra>`,
    })), charts.layout(440, true, {
      shapes: [{ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: 100, y1: 100, line: { color: '#94a3b8', dash: 'dot', width: 1 } }],
    }));

    // Correlation heatmap
    const rets = cols.map((c) => ind.dailyReturns(c));
    const corr = rets.map((a) => rets.map((b) => Math.round(ind.pearson(a, b) * 100) / 100));
    charts.plot(body.querySelector('#cmpCorr'), [{
      type: 'heatmap', z: corr, x: keys, y: keys, zmin: -1, zmax: 1, showscale: false,
      colorscale: [[0, '#dc2626'], [0.5, '#f8fafc'], [1, '#6d4aff']], text: corr, texttemplate: '%{text}',
      hovertemplate: '%{y} × %{x}: %{z}<extra></extra>',
    }], charts.layout(340, false, { hovermode: 'closest', yaxis: { side: 'left', autorange: 'reversed' } }));

    // Risk vs return scatter
    charts.plot(body.querySelector('#cmpRisk'), rows.map((r) => ({
      type: 'scatter', mode: 'markers+text', x: [r.vol], y: [r.ret], text: [r.tk], textposition: 'top center', name: r.tk,
      marker: { size: 16, color: color(r.tk), line: { width: 0 } },
      hovertemplate: `${r.tk}<br>Volatility %{x:.1f}%<br>Return %{y:.2f}%<extra></extra>`,
    })), charts.layout(340, false, {
      hovermode: 'closest',
      xaxis: { title: { text: 'Annualized volatility %' }, showgrid: true, gridcolor: charts.GRID },
      yaxis: { title: { text: 'Period return %' }, side: 'left' },
    }));
  }

  App.views.compare = function (root, ctx) {
    root.innerHTML = `
      ${ui.section('Compare stocks', 'Rebase up to six tickers to 100 and compare performance, risk and signals.', 'Compare')}
      <div class="panel reveal">
        <div class="panel-row" style="margin-bottom:12px">
          <span class="counter" id="cmpCount"></span>
          <form class="add-form" id="cmpAdd" autocomplete="off">
            <input class="input" name="q" placeholder="Add another ticker — e.g. AMZN, HDFCBANK.NS" aria-label="Add ticker">
            <button class="btn btn-primary" type="submit">＋ Add</button>
          </form>
        </div>
        <div class="chip-row" id="cmpChips"></div>
      </div>
      <div id="cmpBody"></div>`;
    ui.animate(root);

    const chips = root.querySelector('#cmpChips'), count = root.querySelector('#cmpCount'), body = root.querySelector('#cmpBody');
    let loadId = 0, timer = null;
    const paint = () => {
      chips.innerHTML = chipsHtml();
      count.textContent = `${store.get('cmpSel').length} of ${MAX} selected`;
    };
    const load = (delay = 0) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const id = ++loadId;
        renderResults(body, ctx, () => ctx.alive() && id === loadId).catch((err) => {
          console.error(err);
          if (ctx.alive()) body.innerHTML = ui.alert('error', api.SERVICE_DOWN);
        });
      }, delay);
    };

    chips.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cmp]');
      if (!b) return;
      const tk = b.dataset.cmp, sel = store.get('cmpSel');
      if (sel.includes(tk)) store.set('cmpSel', sel.filter((t) => t !== tk));
      else if (sel.length >= MAX) return ui.toast(`You can compare up to ${MAX} tickers`, 'ℹ️');
      else store.set('cmpSel', [...sel, tk]);
      paint();
      load(350);
    });

    root.querySelector('#cmpAdd').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = e.target.q.value.trim().toUpperCase();
      e.target.q.value = '';
      if (!q) return;
      const opts = options();
      if (!opts.includes(q)) store.set('cmpOptions', [...opts, q]);
      const sel = store.get('cmpSel');
      if (!sel.includes(q)) {
        if (sel.length >= MAX) ui.toast(`You can compare up to ${MAX} tickers`, 'ℹ️');
        else store.set('cmpSel', [...sel, q]);
      }
      paint();
      load();
    });

    paint();
    load();
  };
})(window.App);
