/* Client-side indicator and statistics calculations on OHLCV history (port of core/indicators.py). */
(function (App) {
  const dayKey = (d) => String(d).slice(0, 10);
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const std = (a) => {
    if (a.length < 2) return NaN;
    const m = mean(a);
    return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
  };

  /** Columnar frame of daily bars, rows without a close dropped. Dates are 'YYYY-MM-DD'. */
  function toFrame(hist) {
    const f = { dates: [], open: [], high: [], low: [], close: [], volume: [] };
    (hist.dates || []).forEach((d, i) => {
      const c = hist.close[i];
      if (c == null || Number.isNaN(c)) return;
      f.dates.push(dayKey(d));
      f.open.push(hist.open[i] ?? c);
      f.high.push(hist.high[i] ?? c);
      f.low.push(hist.low[i] ?? c);
      f.close.push(c);
      f.volume.push(hist.volume[i] ?? 0);
    });
    return f;
  }

  const rolling = (a, n, fn) => a.map((_, i) => fn(a.slice(Math.max(0, i - n + 1), i + 1)));

  // pandas ewm(alpha=..., min_periods=...) with adjust=True, skipping NaN.
  function ewmAdjusted(a, alpha, minPeriods) {
    let num = 0, den = 0, seen = 0;
    return a.map((x) => {
      num *= 1 - alpha;
      den *= 1 - alpha;
      if (!Number.isNaN(x)) { num += x; den += 1; seen += 1; }
      return seen >= minPeriods && den ? num / den : NaN;
    });
  }

  // pandas ewm(span=..., adjust=False)
  function ewmSpan(a, span) {
    const alpha = 2 / (span + 1);
    const out = [];
    a.forEach((x, i) => out.push(i === 0 ? x : alpha * x + (1 - alpha) * out[i - 1]));
    return out;
  }

  function addIndicators(f) {
    const close = f.close;
    const sma20 = rolling(close, 20, mean);
    const sma50 = rolling(close, 50, mean);
    const sd = rolling(close, 20, (w) => std(w) || 0);

    const delta = close.map((c, i) => (i ? c - close[i - 1] : NaN));
    const gain = ewmAdjusted(delta.map((d) => (Number.isNaN(d) ? NaN : Math.max(d, 0))), 1 / 14, 14);
    const loss = ewmAdjusted(delta.map((d) => (Number.isNaN(d) ? NaN : Math.max(-d, 0))), 1 / 14, 14);
    const rsi = gain.map((g, i) => {
      const l = loss[i];
      if (Number.isNaN(g) || Number.isNaN(l) || l === 0) return 50;
      return 100 - 100 / (1 + g / l);
    });

    const ema12 = ewmSpan(close, 12), ema26 = ewmSpan(close, 26);
    const macd = ema12.map((v, i) => v - ema26[i]);
    const macdSignal = ewmSpan(macd, 9);

    return {
      ...f,
      sma20,
      sma50,
      bbUpper: sma20.map((m, i) => m + 2 * sd[i]),
      bbLower: sma20.map((m, i) => m - 2 * sd[i]),
      rsi,
      macd,
      macdSignal,
      macdHist: macd.map((v, i) => v - macdSignal[i]),
    };
  }

  const dailyReturns = (close) => close.slice(1).map((c, i) => c / close[i] - 1);

  function stats(f) {
    const close = f.close;
    const rets = dailyReturns(close);
    const volD = rets.length > 1 ? std(rets) : 0;
    let peak = -Infinity, dd = 0;
    close.forEach((c) => { peak = Math.max(peak, c); dd = Math.min(dd, c / peak - 1); });
    const meanD = rets.length ? mean(rets) : 0;
    return {
      period_return: close.length > 1 ? (close[close.length - 1] / close[0] - 1) * 100 : 0,
      high: Math.max(...f.high),
      low: Math.min(...f.low),
      volatility: volD * Math.sqrt(252) * 100,
      daily_vol: volD,
      max_drawdown: dd * 100,
      sharpe: volD ? (meanD / volD) * Math.sqrt(252) : 0,
      avg_volume: f.volume.length ? mean(f.volume) : 0,
      up_days: rets.length ? (rets.filter((r) => r > 0).length / rets.length) * 100 : 0,
      best_day: rets.length ? Math.max(...rets) * 100 : 0,
      worst_day: rets.length ? Math.min(...rets) * 100 : 0,
      sessions: close.length,
    };
  }

  const weekday = (d) => new Date(d + 'T00:00:00Z').getUTCDay();
  const tradesWeekends = (dates) => dates.some((d) => [0, 6].includes(weekday(d)));

  /** Next n session dates after the last bar (skips weekends unless the asset trades them). */
  function forecastDates(dates, n) {
    const weekends = tradesWeekends(dates);
    const d = new Date(dates[dates.length - 1] + 'T00:00:00Z');
    const out = [];
    while (out.length < n) {
      d.setUTCDate(d.getUTCDate() + 1);
      if (weekends || ![0, 6].includes(d.getUTCDay())) out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }

  function pearson(a, b) {
    const ma = mean(a), mb = mean(b);
    let num = 0, da = 0, db = 0;
    a.forEach((x, i) => { num += (x - ma) * (b[i] - mb); da += (x - ma) ** 2; db += (b[i] - mb) ** 2; });
    return da && db ? num / Math.sqrt(da * db) : NaN;
  }

  App.ind = { toFrame, addIndicators, dailyReturns, stats, tradesWeekends, forecastDates, pearson };
})(window.App);
