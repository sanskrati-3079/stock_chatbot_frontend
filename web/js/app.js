/* App shell: hash router, navbar, sidebar and global interactions. */
(function (App) {
  const { ui, api, store, charts } = App;
  const ROUTES = ['home', 'analyze', 'compare', 'watchlist', 'chat', 'learn'];
  const $ = (sel) => document.querySelector(sel);
  const view = $('#view'), nav = $('#nav'), sidebar = $('#sidebar'), scrim = $('#scrim');
  let renderId = 0;

  App.current = 'home';

  // ----------------------------- Navigation -----------------------------
  App.goto = (page, ticker) => {
    if (ticker) store.set('ticker', ticker);
    const hash = page === 'analyze' && ticker ? `#/analyze/${encodeURIComponent(ticker)}` : `#/${page}`;
    if (location.hash === hash) route();
    else location.hash = hash;
  };

  function parseHash() {
    const [, page, ticker] = location.hash.split('/');
    return [ROUTES.includes(page) ? page : 'home', ticker ? decodeURIComponent(ticker) : null];
  }

  function route({ scroll = true } = {}) {
    const [page, ticker] = parseHash();
    if (ticker) store.set('ticker', ticker);
    App.current = page;

    nav.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.dataset.route === page));
    ui.syncInk(nav);
    nav.querySelector('a.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    App.refreshSidebar();
    closeDrawer();

    const id = ++renderId;
    const ctx = { period: store.get('period'), alive: () => id === renderId, rerender: () => App.rerender() };
    charts.purge(view);
    view.innerHTML = '';
    view.classList.remove('page-enter');
    void view.offsetWidth; // restart the entrance animation
    view.classList.add('page-enter');
    if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = page === 'home' ? 'StockSense AI' : `${nav.querySelector('a.active')?.textContent.trim()} · StockSense AI`;

    Promise.resolve()
      .then(() => App.views[page](view, ctx))
      .catch((err) => {
        console.error(err);
        if (ctx.alive()) view.innerHTML = ui.alert('error', api.SERVICE_DOWN);
      });
  }
  App.rerender = () => route({ scroll: false });

  // ----------------------------- Sidebar -----------------------------
  const periodSeg = $('#periodSeg');
  periodSeg.innerHTML = ui.PERIODS.map((p) => `<button type="button" data-period="${p}">${p}</button>`).join('') + '<span class="ink"></span>';
  periodSeg.addEventListener('click', (e) => {
    const b = e.target.closest('[data-period]');
    if (!b || b.dataset.period === store.get('period')) return;
    store.set('period', b.dataset.period);
    App.refreshSidebar();
    App.rerender();
  });

  App.refreshSidebar = () => {
    const page = App.current, ticker = store.get('ticker');
    periodSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.period === store.get('period')));
    ui.syncInk(periodSeg);

    $('#popularGrid').innerHTML = ui.POPULAR.map((t) => {
      const active = page === 'analyze' && ticker === t;
      return `<button class="chip${active ? ' solid on' : ''}" data-goto="analyze" data-ticker="${t}">${t}</button>`;
    }).join('');

    const wl = store.get('watchlist');
    $('#sbWatch').innerHTML = wl.length
      ? `<div class="side-label">⭐ Watchlist</div><div class="chip-grid">${wl.slice(0, 8).map((t) =>
        `<button class="chip${page === 'analyze' && ticker === t ? ' on' : ''}" data-goto="analyze" data-ticker="${ui.esc(t)}">${ui.esc(t)}</button>`).join('')}</div>`
      : '';
  };

  $('#sbSearch').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = e.target.q.value.trim();
    e.target.q.value = '';
    if (q) App.goto('analyze', q);
  });

  async function refreshStatus() {
    const online = await api.isOnline();
    const el = $('#status');
    el.classList.toggle('ok', online);
    el.classList.toggle('down', !online);
    el.querySelector('.status-text').textContent = online ? 'All systems operational' : 'Service unavailable';
  }

  // Mobile drawer
  function openDrawer() { sidebar.classList.add('open'); scrim.classList.add('open'); }
  function closeDrawer() { sidebar.classList.remove('open'); scrim.classList.remove('open'); }
  $('#menuBtn').addEventListener('click', openDrawer);
  scrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

  // ----------------------------- Global interactions -----------------------------
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-goto]');
    if (target) {
      e.preventDefault();
      App.goto(target.dataset.goto, target.dataset.ticker);
    }
  });

  // Ripple feedback on buttons and chips
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.btn, .chip');
    if (!el || el.disabled) return;
    const r = el.getBoundingClientRect(), size = Math.max(r.width, r.height);
    const span = document.createElement('span');
    span.className = 'ripple';
    span.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    el.appendChild(span);
    span.addEventListener('animationend', () => span.remove(), { once: true });
  });

  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(ui.syncAllInks, 80); });
  // Re-measure once web fonts swap in, since text widths change.
  document.fonts?.ready.then(ui.syncAllInks);
  document.fonts?.addEventListener?.('loadingdone', ui.syncAllInks);
  window.addEventListener('load', ui.syncAllInks);

  window.addEventListener('hashchange', () => route());
  route();
  refreshStatus();
  setInterval(refreshStatus, 30000);
})(window.App);
