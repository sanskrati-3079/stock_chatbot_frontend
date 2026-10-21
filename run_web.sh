#!/usr/bin/env bash
# Serve the HTML/CSS/JS frontend locally at http://localhost:5173
set -e
cd "$(dirname "$0")/web"
echo "StockSense AI → http://localhost:5173"
if command -v npx >/dev/null 2>&1; then
  npx --yes serve -l 5173 .
else
  python3 -m http.server 5173
fi
