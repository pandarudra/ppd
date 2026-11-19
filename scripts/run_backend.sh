#!/usr/bin/env bash
# Runs migrations then the FastAPI backend on :8000. Add --seed to seed demo users.
set -euo pipefail
cd "$(dirname "$0")/../backend"
[ -d venv ] || { python3 -m venv venv; venv/bin/pip install -r requirements.txt; }
. venv/bin/activate
alembic upgrade head
[ "${1:-}" = "--seed" ] && python scripts/seed_data.py
exec uvicorn app.main:app --reload --port 8000
