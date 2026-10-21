#!/usr/bin/env bash
# Serve the HTML/CSS/JS frontend at http://localhost:5173
set -e
cd "$(dirname "$0")/web"
echo "StockSense AI → http://localhost:5173"
python3 -m http.server 5173
