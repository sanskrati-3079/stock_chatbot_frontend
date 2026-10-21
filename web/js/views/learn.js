/* Educational content: indicators, signal methodology and glossary. */
(function (App) {
  const { ui } = App;

  const INDICATORS = [
    ['📉', 'RSI (Relative Strength Index)',
      'Measures the speed of recent price moves on a 0–100 scale over 14 sessions. Above 70 suggests the stock is ' +
      'overbought (may pull back); below 30 suggests oversold (may bounce).'],
    ['〰️', 'SMA 20 / SMA 50',
      'Simple moving averages of the last 20 and 50 closing prices. When the faster SMA 20 is above the slower ' +
      'SMA 50 the short-term trend is up — a “golden cross” style setup.'],
    ['📊', 'MACD (12, 26, 9)',
      'The gap between the 12- and 26-day exponential averages, compared with its own 9-day average. A positive ' +
      'histogram means upward momentum is building.'],
    ['🎚️', 'Bollinger Bands',
      'A 20-day average with bands two standard deviations above and below. Prices hugging the upper band signal ' +
      'strength; wide bands mean high volatility.'],
    ['🔮', 'Linear trend forecast',
      'A straight line fitted to the last 30 closes and extended five sessions ahead. Good for direction, not ' +
      'precise targets.'],
    ['🌪️', 'Volatility & drawdown',
      'Volatility is the annualized standard deviation of daily returns. Max drawdown is the largest fall from a ' +
      'peak during the period — a gauge of downside risk.'],
  ];

  const SCORING = [
    ['RSI below 30', '+2'], ['RSI above 70', '−2'],
    ['SMA 20 above SMA 50', '+1'], ['SMA 20 below SMA 50', '−1'],
    ['MACD histogram positive', '+1'], ['MACD histogram negative', '−1'],
    ['Forecast trend above +1%', '+1'], ['Forecast trend below −1%', '−1'],
  ];

  const GLOSSARY = [
    ['Ticker', 'The short symbol a security trades under, e.g. AAPL. Indian stocks add .NS (NSE) or .BO (BSE).'],
    ['Candlestick', "A bar showing a session's open, high, low and close. Green when it closed higher than it opened."],
    ['Volume', 'The number of shares traded in a session. Big moves on high volume are considered more meaningful.'],
    ['Sharpe ratio', 'Return per unit of risk. Above 1 is generally considered good.'],
    ['Correlation', 'How closely two assets move together, from −1 (opposite) to +1 (in lockstep).'],
    ['Overbought / oversold', 'Conditions where price has risen or fallen quickly and may be due for a reversal.'],
  ];

  App.views = App.views || {};
  App.views.learn = function (root) {
    root.innerHTML = `
      ${ui.section('Learn the indicators', 'Understand exactly what drives every signal you see.', 'Learn')}
      ${ui.cards(INDICATORS.map(([i, t, d]) => `<div class="card feature"><div class="ic">${i}</div><div class="t">${t}</div><div class="d">${d}</div></div>`), 300)}

      ${ui.section('How the signal is scored', 'Each rule adds or subtracts points; the total decides the signal.', 'Methodology')}
      <div class="grid-halves" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)">
        <div class="table-wrap reveal"><table class="table score-table stagger">
          <thead><tr><th>Condition</th><th class="r">Points</th></tr></thead>
          <tbody>${SCORING.map(([c, p]) => `<tr><td>${c}</td><td class="r ${p.startsWith('+') ? 'up' : 'down'}">${p}</td></tr>`).join('')}</tbody>
        </table></div>
        <div class="card reveal">
          <div class="k">Decision</div>
          <div class="decision">
            ${ui.signalBadge('BUY')} score ≥ +2<br>
            ${ui.signalBadge('HOLD')} score between −1 and +1<br>
            ${ui.signalBadge('SELL')} score ≤ −2
          </div>
          <div class="k" style="margin-top:16px">Confidence</div>
          <div class="s" style="font-size:.95rem">50% + 12.5% × |score|, capped at 100%.</div>
        </div>
      </div>

      ${ui.section('Glossary', '', 'Jargon buster')}
      <div class="reveal">${GLOSSARY.map(([term, desc]) => ui.accordion(term, ui.esc(desc))).join('')}</div>

      <div class="callout reveal" style="margin-top:1.5rem">⚠️ Technical indicators look only at past price and volume.
        They ignore earnings, news and macro events, and they can stay “wrong” for a long time. Use them as one input
        among many — never as the sole reason to trade.</div>`;
    ui.animate(root);
  };
})(window.App);
