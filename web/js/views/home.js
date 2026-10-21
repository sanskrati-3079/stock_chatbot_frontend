/* Landing page: hero, live market pulse, trending signals, features, FAQ. */
(function (App) {
  const { ui, api } = App;

  const INDICES = [
    ['^GSPC', 'S&P 500'], ['^IXIC', 'NASDAQ'], ['^DJI', 'Dow Jones'],
    ['^NSEI', 'NIFTY 50'], ['^BSESN', 'SENSEX'], ['BTC-USD', 'Bitcoin'],
  ];

  const FEATURES = [
    ['🎯', 'BUY / HOLD / SELL signals', 'A transparent scoring model combining RSI, moving-average crossovers, MACD momentum and trend.'],
    ['🔮', 'Short-term forecasts', 'A regression model projects the next five sessions, with an uncertainty band based on recent volatility.'],
    ['🕯️', 'Pro-grade charts', 'Candlesticks, volume, Bollinger Bands, RSI and MACD panels — interactive and zoomable.'],
    ['⚖️', 'Side-by-side compare', 'Rebase several stocks to 100 and compare returns, volatility, drawdowns and correlation.'],
    ['⭐', 'Personal watchlist', 'Track your favourite tickers and see every signal at a glance in one place.'],
    ['💬', 'Plain-English chat', 'Ask “should I buy Reliance?” — the assistant finds the ticker and explains its reasoning.'],
  ];

  const STEPS = [
    ['Pick a stock', 'Search by ticker or company name — US, NSE, BSE, crypto and indices are all supported.'],
    ['We crunch the data', 'Live prices from Yahoo Finance feed five technical indicators and a trend model.'],
    ['Get a clear answer', 'See the signal, its confidence and the exact reasons — then dig into charts and stats.'],
  ];

  const FAQ = [
    ['Where does the data come from?', 'Prices come from Yahoo Finance and are refreshed every few minutes. ' +
      'Indian stocks use the .NS (NSE) or .BO (BSE) suffix, e.g. TCS.NS.'],
    ['How is the signal calculated?', 'Each indicator adds or subtracts points: RSI extremes (±2), SMA20 vs SMA50 (±1), ' +
      'MACD histogram (±1) and the 5-day trend projection (±1). A total of +2 or more is BUY, −2 or less is SELL, ' +
      'otherwise HOLD. Confidence is 50% + 12.5% per point of score. See the Learn tab for details.'],
    ['Is this financial advice?', 'No. StockSense is an educational tool based purely on technical indicators. ' +
      'It ignores fundamentals, news and your personal situation. Always do your own research.'],
    ['Which markets are covered?', 'Almost any symbol on Yahoo Finance: NYSE, NASDAQ, NSE, BSE, LSE, major indices and crypto.'],
  ];

  function marketStatus() {
    const at = (timeZone) => {
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
        timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).formatToParts(new Date()).map((p) => [p.type, p.value]));
      return { weekday: !['Sat', 'Sun'].includes(parts.weekday), mins: (+parts.hour % 24) * 60 + +parts.minute };
    };
    const ny = at('America/New_York'), ist = at('Asia/Kolkata');
    return [
      ['NYSE', ny.weekday && ny.mins >= 570 && ny.mins < 960],    // 09:30–16:00 ET
      ['NSE', ist.weekday && ist.mins >= 555 && ist.mins < 930],  // 09:15–15:30 IST
      ['Crypto', true],
    ];
  }

  function heroVisual() {
    const bars = Array.from({ length: 24 }, (_, i) => {
      const h = 10 + ((i * 37) % 23) + (i % 5) * 3;
      return `<rect x="${i * 15 + 2}" y="${200 - h}" width="9" height="${h}" rx="2" style="animation-delay:${0.2 + i * 0.03}s"/>`;
    }).join('');
    const line = 'M0,150 C25,140 40,156 65,132 S105,110 130,116 S170,86 195,94 S235,64 260,70';
    return `
      <div class="hero-visual" aria-hidden="true">
        <div class="hv-card">
          <div class="hv-head"><i></i><i></i><i></i><span class="sk-line"></span></div>
          <svg class="hv-chart" viewBox="0 0 360 200">
            <defs>
              <linearGradient id="hvFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#6d4aff" stop-opacity=".26"/><stop offset="1" stop-color="#6d4aff" stop-opacity="0"/>
              </linearGradient>
              <linearGradient id="hvLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stop-color="#6d4aff"/><stop offset="1" stop-color="#0891b2"/>
              </linearGradient>
            </defs>
            <g class="hv-grid">${[40, 80, 120, 160].map((y) => `<line x1="0" x2="360" y1="${y}" y2="${y}"/>`).join('')}</g>
            <g class="hv-bars">${bars}</g>
            <path class="hv-area" d="${line} L260,200 L0,200 Z" fill="url(#hvFill)"/>
            <path class="hv-line" d="${line}" pathLength="1"/>
            <path class="hv-fc" d="M260,70 C290,60 320,46 356,34"/>
            <circle class="hv-pulse-ring" cx="260" cy="70" r="5"/>
            <circle class="hv-pulse" cx="260" cy="70" r="5"/>
          </svg>
        </div>
        <span class="float-chip c1">📉 RSI (14)</span>
        <span class="float-chip c2">〰️ SMA 20 / 50</span>
        <span class="float-chip c3">📊 MACD</span>
        <span class="float-chip c4">🔮 5-day forecast</span>
      </div>`;
  }

  function hero() {
    const pills = marketStatus().map(([name, open]) =>
      `<span class="pill"><span class="dot${open ? ' live' : ''}" style="background:${open ? ui.UP : '#94a3b8'}"></span>${name} · ${open ? 'Open' : 'Closed'}</span>`).join('');
    return `
      <section class="hero">
        <div class="hero-copy">
          <div class="pills rise">${pills}</div>
          <h1 class="rise">Smarter stock insights, explained in plain English.</h1>
          <p class="rise">Technical signals, short-term forecasts and pro-grade charts for thousands of stocks, indices and
            crypto — or just ask the AI assistant.</p>
          <div class="hero-cta rise">
            <button class="btn btn-primary btn-lg" data-goto="analyze">📈 Analyze a stock <span class="arrow">→</span></button>
            <button class="btn btn-lg" data-goto="chat">💬 Ask the AI</button>
            <button class="btn btn-lg" data-goto="compare">⚖️ Compare stocks</button>
          </div>
          <div class="stats-strip rise">
            <div class="stat"><div class="n">${ui.count(50000, 0, '', '+')}</div><div class="l">Tickers worldwide</div></div>
            <div class="stat"><div class="n">${ui.count(5, 0)}</div><div class="l">Technical indicators</div></div>
            <div class="stat"><div class="n">${ui.count(5, 0, '', '-day')}</div><div class="l">Price forecast</div></div>
            <div class="stat"><div class="n">~5 min</div><div class="l">Data freshness</div></div>
          </div>
        </div>
        ${heroVisual()}
      </section>`;
  }

  async function marketPulse(root, ctx) {
    const grid = root.querySelector('#pulse'), tape = root.querySelector('#tape');
    const hist = await api.historyMany(INDICES.map(([t]) => t), '1mo');
    if (!ctx.alive()) return;
    const items = [], tapeItems = [];
    for (const [tk, name] of INDICES) {
      const close = (hist[tk]?.close || []).filter((c) => c != null);
      if (close.length < 2) {
        items.push(ui.card(name, '—', 'Data unavailable'));
        continue;
      }
      const last = close[close.length - 1], prev = close[close.length - 2];
      const d1 = prev ? (last / prev - 1) * 100 : 0;
      const m1 = close[0] ? (last / close[0] - 1) * 100 : 0;
      items.push(ui.card(name, ui.count(last, 2), `${ui.change(d1)} today · ${ui.signed(m1, 1)}% 1M`, ui.sparkline(close, ui.colorFor(m1))));
      tapeItems.push(`<span class="tape-item"><b>${name}</b>${ui.num(last)} ${ui.change(d1)}</span>`);
    }
    grid.innerHTML = ui.cards(items, 160);
    ui.animate(grid);
    if (tapeItems.length) {
      const track = tapeItems.join('');
      tape.innerHTML = `<div class="tape-track">${track}${track}</div>`;
    } else {
      tape.remove();
    }
  }

  function maxBy(rows, key) {
    return rows.reduce((best, r) => {
      const a = key(r), b = key(best);
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i] ? r : best;
      return best;
    });
  }

  async function trending(root, ctx) {
    const el = root.querySelector('#trending');
    const preds = await api.predictMany(ui.POPULAR, ctx.period);
    if (!ctx.alive()) return;
    const rows = Object.values(preds).filter(Boolean);
    if (!rows.length) {
      el.innerHTML = ui.alert('info', api.SERVICE_DOWN);
      return;
    }

    const bestBuy = maxBy(rows, (p) => [p.signal === 'BUY' ? 1 : 0, p.confidence, p.forecast_trend_pct]);
    const oversold = maxBy(rows, (p) => [-p.rsi]);
    const mover = maxBy(rows, (p) => [Math.abs(p.change_pct_1d)]);
    const highlights = [
      ['🏆 Strongest signal', bestBuy, `${ui.SIGNAL_EMOJI[bestBuy.signal] || ''} ${bestBuy.signal} · ${bestBuy.confidence.toFixed(0)}%`],
      ['🧊 Lowest RSI', oversold, `RSI ${oversold.rsi.toFixed(1)}`],
      ['⚡ Biggest mover', mover, `${ui.change(mover.change_pct_1d)} today`],
    ];
    const hl = highlights.map(([label, p, sub]) => `
      <div class="hl">
        ${ui.card(label, ui.esc(p.ticker), `${ui.fmtMoney(p.last_price, p.currency)} · ${sub}`,
          ui.sparkline(p.history_close.slice(-30), ui.colorFor(p.forecast_trend_pct)))}
        <button class="btn btn-block" data-goto="analyze" data-ticker="${ui.esc(p.ticker)}">Analyze ${ui.esc(p.ticker)} <span class="arrow">→</span></button>
      </div>`).join('');

    const body = rows.map((p) => {
      const c = ui.SIGNAL_COLORS[p.signal] || ui.NEUTRAL;
      return `<tr class="clickable" data-goto="analyze" data-ticker="${ui.esc(p.ticker)}">
        <td class="tk">${ui.esc(p.ticker)}</td>
        <td class="r">${ui.fmtMoney(p.last_price, p.currency)}</td>
        <td class="r">${ui.change(p.change_pct_1d)}</td>
        <td>${ui.signalBadge(p.signal)}</td>
        <td><span class="mini-bar"><span data-w="${ui.clamp(p.confidence, 0, 100)}" style="background:${c}"></span></span>${p.confidence.toFixed(0)}%</td>
        <td class="r">${p.rsi.toFixed(1)}</td>
        <td class="r"><span class="${ui.cls(p.forecast_trend_pct)}">${ui.signed(p.forecast_trend_pct)}%</span></td>
        <td>${ui.sparkline(p.history_close.slice(-30), ui.colorFor(p.forecast_trend_pct), 110, 30)}</td>
      </tr>`;
    }).join('');

    el.innerHTML = `
      <div class="hl-grid" data-stagger>${hl}</div>
      <div class="table-wrap reveal"><table class="table stagger">
        <thead><tr><th>Ticker</th><th class="r">Price</th><th class="r">1D %</th><th>Signal</th><th>Confidence</th>
          <th class="r">RSI</th><th class="r">5D forecast</th><th>30D trend</th></tr></thead>
        <tbody>${body}</tbody>
      </table></div>`;
    ui.animate(el);
  }

  App.views = App.views || {};
  App.views.home = function (root, ctx) {
    root.innerHTML = `
      ${hero()}
      <div class="tape" id="tape"><div class="sk"></div></div>

      ${ui.section('Market pulse', 'Major indices and crypto over the last month.', 'Live overview')}
      <div id="pulse">${ui.skeletonCards(6, 160)}</div>

      ${ui.section('Trending signals', "Today's model output for popular stocks, refreshed every few minutes.", 'Signals')}
      <div id="trending">${ui.skeletonCards(3, 260)}<div class="sk sk-chart" style="height:320px"></div></div>

      ${ui.section('Everything you need to read the market', 'Built for curious investors — no jargon required.', 'Features')}
      ${ui.cards(FEATURES.map(([i, t, d]) => `<div class="card feature"><div class="ic">${i}</div><div class="t">${t}</div><div class="d">${d}</div></div>`), 280)}

      ${ui.section('How it works', '', '3 simple steps')}
      ${ui.cards(STEPS.map(([t, d], n) => `<div class="card feature step" data-n="${n + 1}"><div class="num">${n + 1}</div><div class="t">${t}</div><div class="d">${d}</div></div>`), 260)}

      ${ui.section('Frequently asked questions', '', 'FAQ')}
      <div class="reveal">${FAQ.map(([q, a]) => ui.accordion(q, ui.esc(a))).join('')}</div>
      <button class="btn" data-goto="learn" style="margin-top:6px">📚 Learn how the indicators work <span class="arrow">→</span></button>

      <div class="footer"><b>StockSense AI</b> · Market data via Yahoo Finance, delayed and refreshed every ~5 minutes.<br>
        ⚠️ For educational purposes only. Signals are generated from technical indicators and are not financial advice.</div>`;
    ui.animate(root);
    return Promise.all([marketPulse(root, ctx), trending(root, ctx)]);
  };
})(window.App);
