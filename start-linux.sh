#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
echo "Dragonfarm: Reborn v0.7.1 — open http://127.0.0.1:8765"
python3 -m http.server 8765 --bind 127.0.0.1
