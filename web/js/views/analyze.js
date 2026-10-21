/* Deep-dive analysis for a single ticker. */
(function (App) {
  const { ui, api, store, ind, charts } = App;
  const OVERLAYS = ['SMA 20', 'SMA 50', 'Bollinger Bands', 'Forecast'];
  const OVERLAY_COLORS = { 'SMA 20': ui.SMA20_C, 'SMA 50': ui.SMA50_C, 'Bollinger Bands': ui.BB_C, Forecast: ui.ACCENT };
  const KINDS = ['Candlestick', 'Line', 'Area'];
  const TABS = [['price', '📈 Price chart'], ['ind', '📊 Indicators'], ['fc', '🔮 Forecast'], ['stats', '📋 Statistics'], ['sig', '🧠 Signal breakdown']];

  // ----------------------------- Search -----------------------------
  function chipsHtml() {
    const recent = store.get('recent');
    const chips = recent.length ? recent.slice(0, 6) : ui.POPULAR.slice(0, 6);
    return `<span class="lbl">${recent.length ? 'Recent' : 'Popular'}</span>` + chips.map((t) =>
      `<button class="chip${t === store.get('ticker') ? ' on' : ''}" data-goto="analyze" data-ticker="${ui.esc(t)}">${ui.esc(t)}</button>`).join('');
  }

  function searchBar() {
    return `
      <form class="search-row" id="anSearch" autocomplete="off">
        <label class="input-icon">
          <svg viewBox="0 0 24 24" width="18" height="18"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <input class="input" name="q" placeholder="Search ticker or company — e.g. NVDA, Infosys, BTC-USD" aria-label="Search">
        </label>
        <button class="btn btn-primary btn-lg" type="submit">Analyze <span class="arrow">→</span></button>
      </form>
      <div class="recent-chips" id="anChips">${chipsHtml()}</div>`;
  }

  // ----------------------------- Tabs -----------------------------
  function priceTab(el, df, data) {
    el.innerHTML = `
      <div class="toolbar">
        <div class="field"><span class="field-label">Chart type</span>
          <div class="seg" data-ink-host>${KINDS.map((k) => `<button type="button" data-kind="${k}">${k}</button>`).join('')}<span class="ink"></span></div>
        </div>
        <div class="field grow"><span class="field-label">Overlays</span>
          <div class="chip-row">${OVERLAYS.map((o) => `<button type="button" class="chip" data-ov="${o}"><span class="dot" style="background:${OVERLAY_COLORS[o]}"></span>${o}</button>`).join('')}</div>
        </div>
        <label class="switch"><input type="checkbox" data-vol><span class="track"></span>Volume</label>
      </div>
      <div class="chart-card"><div class="chart" id="anPrice"></div></div>`;

    const seg = el.querySelector('.seg'), volBox = el.querySelector('[data-vol]');
    const sync = () => {
      seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.kind === store.get('anKind')));
      el.querySelectorAll('[data-ov]').forEach((b) => b.classList.toggle('on', store.get('anOverlays').includes(b.dataset.ov)));
      volBox.checked = store.get('anVol');
      ui.syncInk(seg);
    };

    const draw = () => {
      const kind = store.get('anKind'), overlays = store.get('anOverlays'), showVol = store.get('anVol');
      const x = df.dates, traces = [];
      if (kind === 'Candlestick') {
        traces.push({
          type: 'candlestick', x, open: df.open, high: df.high, low: df.low, close: df.close, name: 'Price',
          increasing: { line: { color: ui.UP }, fillcolor: ui.UP }, decreasing: { line: { color: ui.DOWN }, fillcolor: ui.DOWN },
        });
      } else {
        if (kind === 'Area') {
          const floor = Math.min(...df.close) * 0.98;
          traces.push({ type: 'scatter', mode: 'lines', x, y: x.map(() => floor), line: { width: 0 }, hoverinfo: 'skip', showlegend: false });
        }
        traces.push({
          type: 'scatter', mode: 'lines', x, y: df.close, name: 'Close', line: { color: ui.ACCENT, width: 2.4 },
          fill: kind === 'Area' ? 'tonexty' : 'none', fillcolor: 'rgba(109,74,255,0.12)',
        });
      }
      if (overlays.includes('Bollinger Bands')) {
        traces.push({ type: 'scatter', mode: 'lines', x, y: df.bbUpper, name: 'BB upper', line: { color: ui.BB_C, width: 1 } });
        traces.push({ type: 'scatter', mode: 'lines', x, y: df.bbLower, name: 'BB lower', line: { color: ui.BB_C, width: 1 }, fill: 'tonexty', fillcolor: 'rgba(148,163,184,0.15)' });
      }
      if (overlays.includes('SMA 20')) traces.push({ type: 'scatter', mode: 'lines', x, y: df.sma20, name: 'SMA 20', line: { color: ui.SMA20_C, width: 1.5 } });
      if (overlays.includes('SMA 50')) traces.push({ type: 'scatter', mode: 'lines', x, y: df.sma50, name: 'SMA 50', line: { color: ui.SMA50_C, width: 1.5 } });
      const fc = data.forecast_prices || [];
      if (overlays.includes('Forecast') && fc.length) {
        const fx = [x[x.length - 1], ...ind.forecastDates(x, fc.length)];
        const fy = [df.close[df.close.length - 1], ...fc];
        traces.push({
          type: 'scatter', mode: 'lines+markers', x: fx, y: fy, name: 'Forecast',
          line: { color: ui.colorFor(fy[fy.length - 1] - fy[0]), width: 2, dash: 'dash' }, marker: { size: 5 },
        });
      }
      if (showVol) {
        traces.push({
          type: 'bar', x, y: df.volume, name: 'Volume', yaxis: 'y2', opacity: 0.5, showlegend: false,
          marker: { color: df.close.map((c, i) => (c >= df.open[i] ? ui.UP : ui.DOWN)) },
        });
      }
      charts.plot(el.querySelector('#anPrice'), traces, charts.layout(showVol ? 560 : 480, true, {
        xaxis: { rangeslider: { visible: false }, rangebreaks: charts.rangebreaks(ind.tradesWeekends(x)) },
        yaxis: { domain: showVol ? [0.25, 1] : [0, 1] },
        yaxis2: { domain: [0, 0.2], side: 'right', gridcolor: charts.GRID, zeroline: false, automargin: true, visible: showVol },
      }));
    };

    seg.addEventListener('click', (e) => {
      const b = e.target.closest('[data-kind]');
      if (!b) return;
      store.set('anKind', b.dataset.kind);
      sync(); draw();
    });
    el.querySelector('.chip-row').addEventListener('click', (e) => {
      const b = e.target.closest('[data-ov]');
      if (!b) return;
      const cur = store.get('anOverlays'), ov = b.dataset.ov;
      store.set('anOverlays', cur.includes(ov) ? cur.filter((o) => o !== ov) : [...cur, ov]);
      sync(); draw();
    });
    volBox.addEventListener('change', () => { store.set('anVol', volBox.checked); draw(); });
    sync(); draw();
  }

  function indicatorsTab(el, df) {
    el.innerHTML = `
      <div class="chart-card"><div class="chart-title">RSI (14) <span>— above 70 is overbought, below 30 is oversold.</span></div><div class="chart" id="anRsi"></div></div>
      <div class="chart-card"><div class="chart-title">MACD (12, 26, 9) <span>— histogram above zero signals bullish momentum.</span></div><div class="chart" id="anMacd"></div></div>`;
    const x = df.dates, rb = charts.rangebreaks(ind.tradesWeekends(x));
    const band = (y0, y1, color) => ({ type: 'rect', xref: 'paper', x0: 0, x1: 1, y0, y1, fillcolor: color, opacity: 0.08, line: { width: 0 } });
    const hline = (y, color) => ({ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: y, y1: y, line: { color, dash: 'dot', width: 1 } });

    charts.plot(el.querySelector('#anRsi'),
      [{ type: 'scatter', mode: 'lines', x, y: df.rsi, name: 'RSI (14)', line: { color: ui.ACCENT, width: 2 } }],
      charts.layout(260, true, {
        shapes: [band(70, 100, ui.DOWN), band(0, 30, ui.UP), hline(70, ui.DOWN), hline(30, ui.UP)],
        yaxis: { range: [0, 100] }, xaxis: { rangebreaks: rb },
      }));

    charts.plot(el.querySelector('#anMacd'), [
      { type: 'bar', x, y: df.macdHist, name: 'Histogram', opacity: 0.6, marker: { color: df.macdHist.map((v) => (v >= 0 ? ui.UP : ui.DOWN)) } },
      { type: 'scatter', mode: 'lines', x, y: df.macd, name: 'MACD', line: { color: ui.SMA50_C, width: 1.8 } },
      { type: 'scatter', mode: 'lines', x, y: df.macdSignal, name: 'Signal', line: { color: ui.SMA20_C, width: 1.8 } },
    ], charts.layout(280, true, { xaxis: { rangebreaks: rb } }));
  }

  function forecastTab(el, df, data, st) {
    const fc = data.forecast_prices || [];
    if (!fc.length) {
      el.innerHTML = ui.alert('info', 'No forecast available for this ticker.');
      return;
    }
    const last = df.close[df.close.length - 1];
    const dates = ind.forecastDates(df.dates, fc.length);
    const band = fc.map((_, i) => last * st.daily_vol * Math.sqrt(i + 1));
    const tailX = df.dates.slice(-60), tailY = df.close.slice(-60);
    const fx = [df.dates[df.dates.length - 1], ...dates];
    const fmtDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' });

    el.innerHTML = `
      <div class="grid-2">
        <div class="chart-card"><div class="chart" id="anFc"></div></div>
        <div class="stack">
          <div class="table-wrap"><table class="table stagger">
            <thead><tr><th>Date</th><th class="r">Price</th><th class="r">vs today</th></tr></thead>
            <tbody>${dates.map((d, i) => `<tr><td>${fmtDate(d)}</td><td class="r">${ui.num(fc[i])}</td>
              <td class="r"><span class="${ui.cls(fc[i] - last)}">${ui.signed((fc[i] / last - 1) * 100)}%</span></td></tr>`).join('')}</tbody>
          </table></div>
          <div class="callout">The forecast is a linear trend fitted to the last 30 sessions. The shaded band shows a ±1
            standard-deviation range from recent volatility. Treat it as a direction, not a price target.</div>
        </div>
      </div>`;

    charts.plot(el.querySelector('#anFc'), [
      { type: 'scatter', mode: 'lines', x: tailX, y: tailY, name: 'History', line: { color: ui.ACCENT, width: 2.2 } },
      { type: 'scatter', mode: 'lines', x: fx, y: [last, ...fc.map((p, i) => p + band[i])], line: { width: 0 }, showlegend: false, hoverinfo: 'skip' },
      { type: 'scatter', mode: 'lines', x: fx, y: [last, ...fc.map((p, i) => p - band[i])], line: { width: 0 }, fill: 'tonexty', fillcolor: 'rgba(109,74,255,0.12)', name: '±1σ range', hoverinfo: 'skip' },
      { type: 'scatter', mode: 'lines+markers', x: fx, y: [last, ...fc], name: 'Forecast', line: { color: ui.colorFor(fc[fc.length - 1] - last), width: 2.4, dash: 'dash' } },
    ], charts.layout(400, true, { xaxis: { rangebreaks: charts.rangebreaks(ind.tradesWeekends(df.dates)) } }));
  }

  function statsTab(el, s, cur) {
    const pct = (v, d = 2, c = ui.cls(v)) => `<span class="${c}">${ui.count(v, d, v >= 0 ? '+' : '', '%')}</span>`;
    el.innerHTML = ui.cards([
      ui.card('Period return', pct(s.period_return), `${s.sessions} sessions`),
      ui.card('Period high', ui.money(s.high, cur), 'Highest intraday price'),
      ui.card('Period low', ui.money(s.low, cur), 'Lowest intraday price'),
      ui.card('Volatility', ui.count(s.volatility, 1, '', '%'), 'Annualized std. deviation'),
      ui.card('Max drawdown', `<span class="down">${ui.count(s.max_drawdown, 2, '', '%')}</span>`, 'Worst peak-to-trough fall'),
      ui.card('Sharpe ratio', ui.count(s.sharpe, 2), 'Annualized, risk-free = 0'),
      ui.card('Best day', pct(s.best_day, 2, 'up'), 'Largest daily gain'),
      ui.card('Worst day', pct(s.worst_day, 2, 'down'), 'Largest daily loss'),
      ui.card('Up days', ui.count(s.up_days, 0, '', '%'), 'Share of sessions closing higher'),
      ui.card('Avg volume', ui.fmtBig(s.avg_volume), 'Shares traded per session'),
    ], 180);
  }

  function gauge(value, color) {
    const len = Math.PI * 80;
    const v = ui.clamp(Number(value), 0, 100);
    return `
      <div class="gauge">
        <svg viewBox="0 0 200 112">
          <path class="g-track" d="M20 100 A80 80 0 0 1 180 100"/>
          <path class="g-fill" d="M20 100 A80 80 0 0 1 180 100" style="stroke:${color};stroke-dasharray:${len};stroke-dashoffset:${len}" data-off="${len * (1 - v / 100)}"/>
        </svg>
        <div class="g-val">${ui.count(v, 0, '', '%')}</div>
      </div>
      <div class="gauge-scale"><span>0</span><span>50</span><span>100</span></div>`;
  }

  function signalTab(el, data) {
    const color = ui.SIGNAL_COLORS[data.signal] || ui.NEUTRAL;
    const reasons = (data.reasons || []).map((r, i) => {
      const low = r.toLowerCase();
      const c = ['bullish', 'uptrend', '+'].some((w) => low.includes(w)) ? ui.UP
        : ['bearish', 'downtrend'].some((w) => low.includes(w)) ? ui.DOWN : ui.NEUTRAL;
      return `<div class="reason"><div class="i" style="background:${c}22;color:${c}">${i + 1}</div><div>${ui.esc(r)}</div></div>`;
    }).join('');
    el.innerHTML = `
      <div class="grid-halves" style="grid-template-columns:minmax(0,1fr) minmax(0,1.6fr)">
        <div class="card gauge-card">
          ${gauge(data.confidence, color)}
          <div class="gauge-label"><span style="color:${color}">${ui.esc(data.signal)}</span> confidence</div>
        </div>
        <div>
          <div class="chart-title" style="padding:0 0 10px">Why this signal?</div>
          <div class="reasons" data-stagger>${reasons || '<div class="reason">No reasons provided.</div>'}</div>
          <button class="btn" data-goto="learn" style="margin-top:14px">📚 How is the signal calculated? <span class="arrow">→</span></button>
        </div>
      </div>`;
  }

  // ----------------------------- Page -----------------------------
  function loading(ticker) {
    return `${ui.loadingLine(`Analyzing ${ticker}…`)}${ui.skeletonCards(5, 160)}<div class="sk sk-chart"></div>`;
  }

  function header(data, period) {
    const tk = data.ticker, cur = data.currency, chg = data.change_pct_1d;
    return `
      <div class="an-head reveal">
        <div>
          <div class="an-ticker">${ui.esc(tk)} ${ui.signalBadge(data.signal, data.confidence, true)}</div>
          <div class="an-meta">Technical analysis · ${ui.esc(cur || '')} · ${period} history</div>
        </div>
        <div class="an-price">
          <div class="v">${ui.money(data.last_price, cur)}</div>
          <div class="chg">${ui.change(chg, 2, ' today')}</div>
        </div>
      </div>
      <div class="an-actions reveal"><button class="btn" id="wlToggle"></button></div>`;
  }

  function summaryCards(data) {
    const cur = data.currency, ft = data.forecast_trend_pct || 0, macd = data.macd_hist || 0;
    const { sma20, sma50 } = data;
    return ui.cards([
      ui.signalCard(data),
      ui.rsiCard(Number(data.rsi)),
      ui.card('MACD histogram', `<span class="${ui.cls(macd)}">${ui.signed(macd, 3)}</span>`, macd > 0 ? 'Bullish momentum' : 'Bearish momentum'),
      ui.card('SMA 20 / 50', ui.money(sma20, cur),
        `vs ${ui.fmtMoney(sma50, cur)} · <span class="${ui.cls(sma20 - sma50)}">${sma20 > sma50 ? 'Uptrend' : 'Downtrend'}</span>`),
      ui.card(`${(data.forecast_prices || []).length}-day forecast`, ui.change(ft), 'Linear trend projection'),
    ], 160);
  }

  function bindWatchToggle(root, tk) {
    const btn = root.querySelector('#wlToggle');
    const paint = () => {
      const inWl = store.get('watchlist').includes(tk);
      btn.innerHTML = inWl ? '★ In watchlist' : '☆ Add to watchlist';
      btn.classList.toggle('btn-primary', !inWl);
    };
    btn.addEventListener('click', () => {
      const added = store.toggleWatch(tk);
      paint();
      btn.classList.remove('pulse'); void btn.offsetWidth; btn.classList.add('pulse');
      ui.toast(added ? `${tk} added to your watchlist` : `${tk} removed from your watchlist`, added ? '⭐' : '✕');
      App.refreshSidebar();
    });
    paint();
  }

  function mountTabs(body, df, data, period) {
    const st = ind.stats(df);
    const renderers = {
      price: (el) => priceTab(el, df, data),
      ind: (el) => indicatorsTab(el, df),
      fc: (el) => forecastTab(el, df, data, st),
      stats: (el) => statsTab(el, st, data.currency),
      sig: (el) => signalTab(el, data),
    };
    body.insertAdjacentHTML('beforeend', `
      <div class="tabs" role="tablist" data-ink-host>${TABS.map(([k, label]) => `<button class="tab" role="tab" data-tab="${k}">${label}</button>`).join('')}<span class="ink"></span></div>
      ${TABS.map(([k]) => `<div class="tab-panel" data-panel="${k}"></div>`).join('')}`);
    const tabs = body.querySelector('.tabs');
    const done = {};
    const activate = (key) => {
      store.set('anTab', key);
      tabs.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === key));
      body.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === key));
      ui.syncInk(tabs);
      const panel = body.querySelector(`[data-panel="${key}"]`);
      if (!done[key]) {
        done[key] = true;
        renderers[key](panel);
        ui.animate(panel);
      } else {
        charts.resize(panel);
      }
    };
    tabs.addEventListener('click', (e) => { const t = e.target.closest('[data-tab]'); if (t) activate(t.dataset.tab); });
    activate(renderers[store.get('anTab')] ? store.get('anTab') : 'price');
  }

  App.views.analyze = async function (root, ctx) {
    const ticker = store.get('ticker');
    root.innerHTML = `${searchBar()}<div id="anBody">${loading(ticker)}</div>`;
    root.querySelector('#anSearch').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = e.target.q.value.trim();
      if (q) App.goto('analyze', q);
    });
    const body = root.querySelector('#anBody');

    const [p, h] = await Promise.allSettled([api.predict(ticker, ctx.period), api.history(ticker, ctx.period)]);
    if (!ctx.alive()) return;
    if (p.status === 'rejected') {
      body.innerHTML = p.reason?.notFound
        ? ui.alert('error', `Couldn't find data for <b>${ui.esc(ticker)}</b>. Check the symbol — Indian stocks need a .NS or .BO suffix (e.g. TCS.NS).`)
        : ui.alert('error', api.SERVICE_DOWN);
      return;
    }
    const data = p.value;
    let df = null;
    if (h.status === 'fulfilled') {
      try {
        const frame = ind.toFrame(h.value);
        if (frame.close.length) df = ind.addIndicators(frame);
      } catch (err) {
        console.warn('Could not parse history:', err);
      }
    }

    store.remember(data.ticker);
    root.querySelector('#anChips').innerHTML = chipsHtml();
    body.innerHTML = header(data, ctx.period) + summaryCards(data);
    bindWatchToggle(body, data.ticker);

    if (!df) {
      body.insertAdjacentHTML('beforeend', ui.alert('warn', 'Detailed price history is unavailable right now — showing summary only.') + '<div id="anSig" style="margin-top:1rem"></div>');
      signalTab(body.querySelector('#anSig'), data);
    } else {
      mountTabs(body, df, data, ctx.period);
    }
    ui.animate(body);
  };
})(window.App);
