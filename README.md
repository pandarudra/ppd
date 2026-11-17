# SENTINEL

AI/ML-powered Security Operations Center platform. Full design docs live in [`plan/`](./plan/README.md); this README covers running the code.

## Stack

- `backend/` — FastAPI modular monolith (auth, events, alerts, incidents, threat intel, AI assistant)
- `ml_service/` — separate FastAPI service: Isolation Forest + Random Forest + XGBoost ensemble
- `frontend/` — React + Vite + Tailwind SPA
- PostgreSQL 16 + Redis 7

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

- Frontend: http://localhost:5173 (seeded login: `admin@sentinel.local` / `admin123`)
- Backend API docs: http://localhost:8000/docs
- ML service docs: http://localhost:8001/docs

## Status

This is a thin, end-to-end MVP slice built from the `plan/` blueprint — see
`docs/superpowers/plans/2026-11-17-sentinel-mvp.md` for exactly what's
implemented vs. deferred.
