/*
 * Runtime configuration.
 * BACKEND_URL points at the FastAPI backend (see backend/main.py). It is never shown in the UI.
 * The backend must allow this page's origin via CORS (e.g. FastAPI's CORSMiddleware).
 */
window.App = window.App || {};
App.config = {
  BACKEND_URL: 'http://localhost:8000',
};
