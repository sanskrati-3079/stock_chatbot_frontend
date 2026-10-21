/* Plotly theme + helpers shared by every chart. */
(function (App) {
  const GRID = 'rgba(15,23,42,0.07)';
  const PLOTLY_SRC = 'https://cdn.jsdelivr.net/npm/plotly.js-dist-min@2.35.2/plotly.min.js';

  // Plotly is large (~4.5 MB), so load it in the background instead of blocking the first paint.
  const ready = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = PLOTLY_SRC;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
  const CONFIG = { displaylogo: false, responsive: true, modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'] };

  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  function merge(target, src) {
    Object.entries(src).forEach(([k, v]) => {
      target[k] = isObj(v) && isObj(target[k]) ? merge({ ...target[k] }, v) : v;
    });
    return target;
  }

  function layout(height = 420, legend = true, extra = {}) {
    return merge({
      height,
      margin: { l: 8, r: 8, t: legend ? 36 : 12, b: 8 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { family: 'Inter, sans-serif', color: '#475569', size: 12 },
      showlegend: legend,
      legend: { orientation: 'h', y: 1.02, yanchor: 'bottom', x: 0, bgcolor: 'rgba(0,0,0,0)' },
      hovermode: 'x unified',
      hoverlabel: { bgcolor: '#ffffff', bordercolor: '#e2e8f0', font: { color: '#0f172a', family: 'Inter, sans-serif' } },
      xaxis: { showgrid: false, linecolor: GRID, zeroline: false, automargin: true },
      yaxis: { gridcolor: GRID, zeroline: false, side: 'right', automargin: true },
    }, extra);
  }

  async function plot(el, traces, lay) {
    if (typeof Plotly === 'undefined') {
      if (!el.firstChild) el.innerHTML = `<div class="sk" style="height:${lay.height || 400}px"></div>`;
      const ok = await ready;
      if (!el.isConnected) return;
      if (!ok) {
        el.innerHTML = App.ui.alert('warn', 'Charts could not be loaded. Check your internet connection and refresh.');
        return;
      }
      el.innerHTML = '';
    }
    const first = !el.classList.contains('chart-in');
    Plotly.react(el, traces, lay, CONFIG);
    if (first) el.classList.add('chart-in');
  }

  const rangebreaks = (weekends) => (weekends ? [] : [{ bounds: ['sat', 'mon'] }]);

  function purge(root) {
    if (typeof Plotly === 'undefined') return;
    root.querySelectorAll('.js-plotly-plot').forEach((el) => Plotly.purge(el));
  }

  function resize(root) {
    if (typeof Plotly === 'undefined') return;
    root.querySelectorAll('.js-plotly-plot').forEach((el) => Plotly.Plots.resize(el));
  }

  App.charts = { GRID, layout, plot, rangebreaks, purge, resize };
})(window.App);
