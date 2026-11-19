# SENTINEL

AI/ML-powered Security Operations Center platform. Full design docs live in [`plan/`](./plan/README.md); this README covers running the code.

## Stack

- `backend/` — FastAPI modular monolith (auth, events, alerts, incidents, threat intel, AI assistant, analytics, audit logging)
- `ml_service/` — separate FastAPI service: Isolation Forest + Random Forest + XGBoost ensemble, trained on a locally generated synthetic dataset (no external dataset download needed)
- `frontend/` — React + Vite + Tailwind SPA (Zustand, TanStack Query, React Router v6)
- PostgreSQL 16 + Redis 7

## Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- Docker + Docker Compose (for the Docker path), or local PostgreSQL 16 / Redis 7 (for the manual path)

## Quick start (Docker)

```bash
cp backend/.env.example backend/.env
cp ml_service/.env.example ml_service/.env
cp frontend/.env.example frontend/.env

docker compose up -d postgres redis
docker compose run --rm backend alembic upgrade head
docker compose run --rm backend python scripts/seed_data.py
docker compose run --rm ml_service python training/generate_synthetic_logs.py
docker compose run --rm ml_service python training/train.py

docker compose up
```

## Manual setup (no Docker)

Point `DATABASE_URL`/`REDIS_URL` in `backend/.env` (and `ml_service/.env`) at your own PostgreSQL/Redis instances, then:

```bash
# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python scripts/seed_data.py
uvicorn app.main:app --reload --port 8000

# ML service (separate shell)
cd ml_service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python training/generate_synthetic_logs.py
python training/train.py
uvicorn main:app --reload --port 8001

# Frontend (separate shell)
cd frontend
npm install
npm run dev
```

## Verify

- Frontend: http://localhost:5173
- Backend API docs: http://localhost:8000/docs
- ML service docs: http://localhost:8001/docs
- Backend tests: `pytest backend/tests -v` (needs `DATABASE_URL`/`REDIS_URL` pointed at a running Postgres/Redis)
- ML service tests: `pytest ml_service/tests -v` (needs trained model artifacts in `ml_service/models/`)

### Seeded logins

| Role | Email | Password |
|---|---|---|
| admin | `admin@sentinel.local` | `admin123` |
| analyst | `analyst@sentinel.local` | `analyst123` |

### Run the three services

`scripts/run_backend.sh [--seed]`, `scripts/run_ml.sh [--train unsw <csvs>]`, `scripts/run_frontend.sh`.

### Make the dashboard come alive

```bash
python backend/scripts/replay_traffic.py --rate 2        # steady benign + attack noise
python backend/scripts/simulate_attacks.py --list         # 17 named attack scenarios + a full kill-chain campaign
python backend/scripts/simulate_attacks.py phishing campaign
python backend/scripts/syslog_listener.py --port 5514    # forward real syslog (udp) into /events/ingest
```

Open http://localhost:5173, sign in, and watch the Overview map, Live stream and Attack paths fill in.
Attacker locations are a deterministic stand-in (no GeoIP database); set `VITE_HOME_LAT`/`VITE_HOME_LON` to place your network on the map.

### Try the detection pipeline

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"analyst@sentinel.local","password":"analyst123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

curl -s -X POST http://localhost:8000/api/v1/events/ingest \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"raw_log":"Nov 15 10:23:45 firewall kernel: DROP IN=eth0 SRC=203.0.113.50 DST=10.0.0.5 PROTO=TCP DPT=22","source_format":"syslog"}'
```

A HIGH-risk alert should appear on the Dashboard within a couple of seconds, pushed live over WebSocket.

## Status

This is a thin, end-to-end MVP slice built from the `plan/` blueprint — see
[`docs/superpowers/plans/2026-11-17-sentinel-mvp.md`](./docs/superpowers/plans/2026-11-17-sentinel-mvp.md)
for exactly what's implemented vs. deferred, and its workspace ledger for
every deviation/ruling made while building it.

The AI SOC Assistant runs in a deterministic **offline mode** (clearly
labeled `[OFFLINE MODE]` in its responses) until `LLM_PROVIDER` and a
matching API key (`NVIDIA_API_KEY` or `GEMINI_API_KEY`) are set in
`backend/.env` — both are free-tier providers, see `plan/TECH_STACK.md` §6.1.
