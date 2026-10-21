/* Conversational assistant backed by the /chat endpoint. */
(function (App) {
  const { ui, api, store } = App;
  const KEY = 'stocksense:chat:v1';
  const SUGGESTIONS = [
    ['Should I buy Reliance?', 'NSE · signal + reasoning'],
    ['Predict TCS', '5-day trend forecast'],
    ['Is Tesla a good buy today?', 'US · technical view'],
    ['NVIDIA forecast', 'Momentum & RSI check'],
  ];
  const GREETING = "Hi! I'm **StockSense**, your stock analysis assistant. Ask me about almost any listed stock worldwide — " +
    "US, NSE, BSE, crypto or indices — and I'll give you a technical signal with the reasoning behind it.";

  // Conversation lives for this browser tab, like the Streamlit session.
  let messages;
  const load = () => {
    try { messages = JSON.parse(sessionStorage.getItem(KEY)) || null; } catch (_) { messages = null; }
    if (!Array.isArray(messages) || !messages.length) reset();
  };
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(messages)); } catch (_) { /* ignore */ } };
  const reset = () => { messages = [{ role: 'assistant', content: GREETING }]; save(); };
  let pending = false;

  function dataBlock(data) {
    const chg = data.change_pct_1d, ft = data.forecast_trend_pct || 0;
    return `
      <div class="data-head"><span class="tk">${ui.esc(data.ticker)}</span>${ui.signalBadge(data.signal, data.confidence, true)}</div>
      ${ui.cards([
        ui.card('Price', ui.money(data.last_price, data.currency), ui.change(chg, 2, ' today'),
          ui.sparkline((data.history_close || []).slice(-40), ui.colorFor(ft))),
        ui.signalCard(data),
        ui.rsiCard(Number(data.rsi)),
        ui.card('5-day forecast', ui.change(ft), 'Linear trend projection'),
      ], 170)}
      ${ui.accordion('Why this signal?', `<ul>${(data.reasons || []).map((r) => `<li>${ui.esc(r)}</li>`).join('')}</ul>`)}
      <button class="btn btn-primary" data-goto="analyze" data-ticker="${ui.esc(data.ticker)}">Open full analysis for ${ui.esc(data.ticker)} <span class="arrow">→</span></button>`;
  }

  function messageHtml(msg) {
    const user = msg.role === 'user';
    const content = msg.data ? dataBlock(msg.data) : user ? ui.esc(msg.content) : ui.md(msg.content);
    return `<div class="msg ${user ? 'user' : 'bot'}"><div class="avatar">${user ? '🧑' : '🤖'}</div>` +
      `<div class="bubble${msg.data ? ' wide' : ''}">${content}</div></div>`;
  }

  const typingHtml = '<div class="msg bot" id="typing"><div class="avatar">🤖</div><div class="bubble"><span class="typing"><span></span><span></span><span></span></span></div></div>';

  function suggestionsHtml() {
    return `<div class="suggestions" id="sugs">${SUGGESTIONS.map(([q, hint], i) =>
      `<button class="suggestion" style="--i:${i}" data-ask="${ui.esc(q)}">${ui.esc(q)}<small>${hint}</small></button>`).join('')}</div>`;
  }

  App.views.chat = function (root, ctx) {
    if (!messages) load();
    root.innerHTML = `
      <div class="chat-wrap">
        <div class="sec-row">
          ${ui.section('AI stock assistant', "Ask in plain English — I'll find the ticker and explain the signal.", 'Chat')}
          <button class="btn" id="chatClear">🗑️ Clear chat</button>
        </div>
        <div class="msgs" id="msgs" style="margin-top:1.2rem">${messages.map(messageHtml).join('')}${pending ? typingHtml : ''}</div>
        ${messages.length === 1 && !pending ? suggestionsHtml() : ''}
        <form class="composer" id="composer" autocomplete="off">
          <input class="input" name="q" placeholder="Ask about a stock, e.g. 'should I buy TCS today?'" aria-label="Message" ${pending ? 'disabled' : ''}>
          <button class="btn btn-primary" type="submit" aria-label="Send" ${pending ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </form>
      </div>`;
    ui.animate(root);

    const list = root.querySelector('#msgs'), form = root.querySelector('#composer');
    const input = form.q, sendBtn = form.querySelector('button');
    const scrollDown = (el) => el && el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    const append = (html) => {
      list.insertAdjacentHTML('beforeend', html);
      const el = list.lastElementChild;
      ui.animate(el);
      scrollDown(el);
      return el;
    };
    const setBusy = (busy) => { input.disabled = busy; sendBtn.disabled = busy; if (!busy) input.focus(); };

    async function send(text) {
      if (pending || !text.trim()) return;
      root.querySelector('#sugs')?.remove();
      const prompt = text.trim();
      messages.push({ role: 'user', content: prompt });
      save();
      append(messageHtml(messages[messages.length - 1]));
      pending = true;
      setBusy(true);
      append(typingHtml);

      const result = await api.chat(prompt, store.get('period'));
      messages.push({ role: 'assistant', content: result.reply, data: result.data || null });
      save();
      pending = false;
      if (!ctx.alive()) {
        // The user left and came back while waiting: redraw the fresh chat view with the reply.
        if (App.current === 'chat') App.rerender();
        return;
      }
      root.querySelector('#typing')?.remove();
      append(messageHtml(messages[messages.length - 1]));
      setBusy(false);
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value;
      input.value = '';
      send(text);
    });
    root.addEventListener('click', (e) => {
      const s = e.target.closest('[data-ask]');
      if (s) send(s.dataset.ask);
    });
    root.querySelector('#chatClear').addEventListener('click', () => {
      if (pending) return;
      reset();
      ctx.rerender();
    });

    if (messages.length > 1) scrollDown(list.lastElementChild);
    else input.focus({ preventScroll: true });
  };
})(window.App);
