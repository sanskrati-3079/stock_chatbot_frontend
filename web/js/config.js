/*
 * Runtime configuration. The backend URL is never shown in the UI.
 *
 * On Vercel, requests go to /api/* and vercel.json forwards them to the backend,
 * so the browser only talks to this site's own domain.
 * Anywhere else (local ./run_web.sh, opening index.html directly) the backend is called directly.
 */
window.App = window.App || {};
App.config = {
  BACKEND_URL: /\.vercel\.app$/.test(location.hostname)
    ? '/api'
    : 'https://stock-chatbot-backend-peach.vercel.app',
};
