# StockSense AI — web frontend

Plain HTML, CSS and JavaScript port of the Streamlit app in `../frontend`. No build step.

## Run

```bash
./run_web.sh          # from the repo root, serves http://localhost:5173
```

You can also open `index.html` directly in a browser.

## Configure

Set the backend address in `js/config.js` (default `http://localhost:8000`).

The browser calls the FastAPI backend directly, so the backend must allow this origin via CORS:

```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])
```

## Layout

```
index.html            shell: navbar, sidebar, view container
css/styles.css        light theme, components, animations
js/config.js          BACKEND_URL
js/ui.js              formatting, cards, sparklines, motion helpers
js/store.js           state persisted in localStorage (watchlist, period, chart prefs)
js/api.js             backend client with 5-minute response cache
js/indicators.js      SMA, Bollinger, RSI, MACD, stats (matches core/indicators.py)
js/charts.js          Plotly theme; Plotly is loaded lazily from jsDelivr
js/views/*.js         home, analyze, compare, watchlist, chat, learn
js/app.js             hash router (#/analyze/AAPL), sidebar, global events
```
