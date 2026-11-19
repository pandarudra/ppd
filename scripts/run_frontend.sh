#!/usr/bin/env bash
# Runs the Vite dev server on :5173.
set -euo pipefail
cd "$(dirname "$0")/../frontend"
[ -d node_modules ] || npm install
exec npm run dev
