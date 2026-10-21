/* Shared constants, formatting and HTML snippet helpers. */
(function (App) {
  const UP = '#16a34a', DOWN = '#dc2626', NEUTRAL = '#64748b', HOLD = '#d97706';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ui = {
    ACCENT: '#6d4aff', UP, DOWN, NEUTRAL,
    SMA20_C: '#d97706', SMA50_C: '#0891b2', BB_C: '#94a3b8',
    SIGNAL_COLORS: { BUY: UP, SELL: DOWN, HOLD },
    SIGNAL_EMOJI: { BUY: '🟢', SELL: '🔴', HOLD: '🟡' },
    CURRENCY_SYMBOLS: { USD: '$', INR: '₹', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', HKD: 'HK$' },
    POPULAR: ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'TCS.NS', 'RELIANCE.NS', 'INFY.NS', 'BTC-USD'],
    PERIODS: ['1mo', '3mo', '6mo', '1y', '2y', '5y'],
  };

  // ----------------------------- Formatting -----------------------------
  ui.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  ui.num = (v, d = 2) => Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  ui.signed = (v, d = 2) => (v >= 0 ? '+' : '') + Number(v).toFixed(d);
  ui.symbol = (currency) => ui.CURRENCY_SYMBOLS[(currency || '').toUpperCase()] || '';
  ui.fmtMoney = (v, currency) => ui.symbol(currency) + ui.num(v, 2);
  ui.fmtBig = (n) => {
    for (const [unit, div] of [['B', 1e9], ['M', 1e6], ['K', 1e3]]) {
      if (Math.abs(n) >= div) return (n / div).toFixed(2) + unit;
    }
    return ui.num(n, 0);
  };
  ui.cls = (v) => (v > 0 ? 'up' : v < 0 ? 'down' : 'flat');
  ui.arrow = (v) => (v > 0 ? '▲' : v < 0 ? '▼' : '■');
  ui.colorFor = (v) => (v > 0 ? UP : v < 0 ? DOWN : NEUTRAL);
  ui.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  ui.change = (v, d = 2, suffix = '') => `<span class="${ui.cls(v)}">${ui.arrow(v)} ${ui.signed(v, d)}%${suffix}</span>`;

  // Animated number: renders the final value, then counts up to it on ui.animate().
  ui.count = (v, d = 2, prefix = '', suffix = '') =>
    `<span data-count="${v}" data-dec="${d}" data-prefix="${ui.esc(prefix)}" data-suffix="${ui.esc(suffix)}">${ui.esc(prefix)}${ui.num(v, d)}${ui.esc(suffix)}</span>`;
  ui.money = (v, currency) => ui.count(v, 2, ui.symbol(currency));

  // ----------------------------- HTML snippets -----------------------------
  ui.section = (title, subtitle = '', eyebrow = '') =>
    `<div class="sec reveal">${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}` +
    `<div class="sec-title">${title}</div>${subtitle ? `<div class="sec-sub">${subtitle}</div>` : ''}</div>`;

  let sparkId = 0;
  ui.sparkline = (values, color, width = 160, height = 44) => {
    const vals = (values || []).filter((v) => v != null && !Number.isNaN(v));
    if (vals.length < 2) return '';
    const lo = Math.min(...vals), hi = Math.max(...vals), rng = hi - lo || 1;
    const step = width / (vals.length - 1);
    const pts = vals.map((v, i) => [i * step, height - 3 - ((v - lo) / rng) * (height - 6)]);
    const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `M0,${height} L` + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L') + ` L${width},${height} Z`;
    const gid = `spk${++sparkId}`;
    return `<svg class="spark" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" height="${height}">` +
      `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${color}" stop-opacity="0.35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>` +
      `<path d="${area}" fill="url(#${gid})"/>` +
      `<polyline points="${line}" fill="none" stroke="${color}" stroke-width="1.8" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
  };

  ui.signalBadge = (signal, confidence = null, pop = false) => {
    const c = ui.SIGNAL_COLORS[signal] || NEUTRAL;
    const conf = confidence != null ? ` · ${Number(confidence).toFixed(0)}%` : '';
    return `<span class="badge${pop ? ' pop' : ''}" style="color:${c};background:${c}1f;border-color:${c}66">${ui.esc(signal)}${conf}</span>`;
  };

  ui.card = (label, value, sub = '', extra = '', style = '', valueCls = '') =>
    `<div class="card" style="${style}"><div class="k">${label}</div>` +
    `<div class="v ${valueCls}">${value}</div><div class="s">${sub}</div>${extra}</div>`;

  ui.cards = (items, minWidth = 190) => `<div class="cards" data-stagger style="--min:${minWidth}px">${items.join('')}</div>`;

  ui.signalCard = (data) => {
    const color = ui.SIGNAL_COLORS[data.signal] || NEUTRAL;
    const conf = ui.clamp(Number(data.confidence), 0, 100);
    return ui.card(
      'Signal',
      `<span style="color:${color}">${ui.esc(data.signal)}</span>`,
      `Confidence ${conf.toFixed(1)}%`,
      `<div class="bar"><span data-w="${conf}" style="background:${color}"></span></div>`,
      `border-color:${color}55;background:linear-gradient(135deg,${color}22,#ffffff 70%)`,
    );
  };

  ui.rsiCard = (rsi) => {
    const label = rsi < 30 ? 'Oversold' : rsi > 70 ? 'Overbought' : 'Neutral zone';
    return ui.card('RSI (14)', ui.count(rsi, 2), label,
      `<div class="rsi-track"><div class="m" data-left="${ui.clamp(rsi, 0, 100)}"></div></div>`);
  };

  ui.alert = (kind, html) => {
    const icon = { info: 'ℹ️', warn: '⚠️', error: '⛔' }[kind] || 'ℹ️';
    return `<div class="alert alert-${kind}"><span>${icon}</span><div>${html}</div></div>`;
  };

  ui.skeletonCards = (n, minWidth = 190) =>
    `<div class="cards" style="--min:${minWidth}px">${'<div class="sk sk-card"></div>'.repeat(n)}</div>`;

  ui.loadingLine = (text) => `<div class="loading-line"><span class="spinner"></span>${ui.esc(text)}</div>`;

  ui.accordion = (title, body, open = false) =>
    `<details class="acc"${open ? ' open' : ''}><summary>${title}<span class="plus">+</span></summary><div class="acc-body">${body}</div></details>`;

  // Minimal, safe markdown for chat replies: **bold**, *italic*, `code`, "- " lists, line breaks.
  ui.md = (text) => {
    const inline = (s) => ui.esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, '$1<i>$2</i>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    const out = [];
    let list = null, para = [];
    const flushPara = () => { if (para.length) out.push(`<p>${para.join('<br>')}</p>`); para = []; };
    const flushList = () => { if (list) out.push(`<ul>${list.join('')}</ul>`); list = null; };
    for (const raw of String(text || '').split('\n')) {
      const line = raw.trim();
      const m = line.match(/^(?:[-*•]|\d+\.)\s+(.*)$/);
      if (m) { flushPara(); (list = list || []).push(`<li>${inline(m[1])}</li>`); }
      else if (!line) { flushPara(); flushList(); }
      else { flushList(); para.push(inline(line)); }
    }
    flushPara(); flushList();
    return out.join('');
  };

  // ----------------------------- Motion -----------------------------
  function countUp(el) {
    const to = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0;
    const pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    el.removeAttribute('data-count');
    if (reducedMotion || !Number.isFinite(to)) return;
    const t0 = performance.now(), dur = 1100;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + ui.num(to * e, dec) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      revealObserver.unobserve(e.target);
      e.target.querySelectorAll('[data-count]').forEach(countUp);
    }), { rootMargin: '0px 0px -30px 0px', threshold: 0.04 })
    : null;

  /** Wire up entrance animations for freshly inserted HTML. */
  ui.animate = (root) => {
    root.querySelectorAll('[data-stagger]').forEach((g) => [...g.children].forEach((el, i) => el.style.setProperty('--i', i)));
    root.querySelectorAll('.table.stagger tbody tr').forEach((el, i) => el.style.setProperty('--i', Math.min(i, 14)));
    const targets = root.querySelectorAll('.reveal:not(.in), [data-stagger]:not(.in)');
    targets.forEach((el) => (revealObserver ? revealObserver.observe(el) : el.classList.add('in')));
    // Numbers outside a reveal target count up right away.
    root.querySelectorAll('[data-count]').forEach((el) => { if (!el.closest('.reveal:not(.in), [data-stagger]:not(.in)')) countUp(el); });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      root.querySelectorAll('[data-w]').forEach((el) => { el.style.width = el.dataset.w + '%'; el.removeAttribute('data-w'); });
      root.querySelectorAll('[data-left]').forEach((el) => { el.style.left = el.dataset.left + '%'; el.removeAttribute('data-left'); });
      root.querySelectorAll('[data-off]').forEach((el) => { el.style.strokeDashoffset = el.dataset.off; el.removeAttribute('data-off'); });
    }));
  };

  /** Slide a host's `.ink` element under its active child (nav, tabs, segmented controls). */
  ui.syncInk = (host) => {
    const ink = host.querySelector(':scope > .ink');
    const active = host.querySelector(':scope > .on, :scope > .active');
    if (!ink) return;
    if (!active) { ink.style.width = '0'; return; }
    ink.style.width = active.offsetWidth + 'px';
    ink.style.transform = `translateX(${active.offsetLeft}px)`;
  };
  ui.syncAllInks = () => document.querySelectorAll('[data-ink-host]').forEach(ui.syncInk);

  ui.toast = (msg, icon = '✓') => {
    const host = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span>${icon}</span><span>${ui.esc(msg)}</span>`;
    host.appendChild(el);
    setTimeout(() => { el.classList.add('out'); el.addEventListener('animationend', () => el.remove(), { once: true }); }, 2400);
  };

  App.ui = ui;
})(window.App);
