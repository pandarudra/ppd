# SENTINEL: Status Checklist

Vision: one collective dashboard of past and live attacks on an org's systems, with alerts, attack path/pattern, and continuous monitoring detail (src IP, dst IP, port, protocol).

Status comes from reading the code. Tests and builds were **not** re-run for this list.

## Done

### Infra
- [x] docker-compose (postgres, redis, backend, ml_service, frontend), `.env.example` files, Dockerfiles
- [x] Alembic migration `0001_initial_schema`, 13 ORM models, `seed_data.py`

### Backend (FastAPI)
- [x] Auth: login, logout, refresh, me, change-password, JWT + Redis blacklist, lockout
- [x] RBAC (`require_role`), user admin endpoints
- [x] Rate limiter, audit middleware + audit log
- [x] Event ingest (single + batch), log normalizer (syslog/json/csv/unknown), list/filter/get/delete, detection detail
- [x] ML pipeline: background `process_event` -> ml_service -> detection result -> alert -> WebSocket `new_alert`
- [x] Alert CRUD: status, assign, comment, correlate (same source_ip within 10 min -> alert group)
- [x] Incidents: create, link alerts, timeline, response actions with two-person approval
- [x] Threat intel: IOC lookup/list/add
- [x] AI assistant: analyze / explain / recommend, RAG context, offline fallback, output filter
- [x] Analytics: `/dashboard`, `/trends` (Redis cached)
- [x] WebSocket `/ws` with token auth, ping/pong, health broadcast
- [x] Tests: models, auth, events, pipeline, incidents, assistant, audit, analytics, e2e

### ML service
- [x] Synthetic data generator, training (Isolation Forest, Random Forest, XGBoost), saved models + `metrics.json`
- [x] `/predict`, `/batch`, `/health`, `/models`, ensemble scoring, predict test

### Frontend (React/Vite/Tailwind)
- [x] Router with protected routes, Zustand stores, Axios client with refresh, `useWebSocket` with backoff
- [x] Pages: Login, Dashboard (KPI cards, severity chart, live alert feed, service health), Events (table + detail drawer), Alerts (queue + drawer + AI explain), Incidents (list + workspace + timeline), Assistant (chat)

### SOC UI pass
- [x] Attack path / pattern view: `/attack-paths` (source -> target -> port flow graph + per-attacker kill chain: recon -> brute force -> access -> exfiltration)
- [x] Backend: `GET /analytics/attack-paths`, `/top-sources`, `/top-targets`, `/geo`, `/models`
- [x] Live monitoring stream: `new_event` WebSocket message for every scored event, `/live` page (src, dst, port, proto, verdict)
- [x] Past vs current on one screen: Live/History toggle + 1h/24h/7d/30d range on the dashboard
- [x] World attack map, top attackers and targeted-assets panels (geo is a deterministic stand-in, see below)
- [x] Syslog UDP forwarder `backend/scripts/syslog_listener.py`; demo replayer `backend/scripts/replay_traffic.py`
- [x] Pages: Landing, Analytics, Model Performance, Threat Intel, User Management (admin), Settings
- [x] Responsive pass (icon rail -> drawer, wrapping grids, scrollable tables)
- [x] Incident context panel with threat-intel enrichment per source IP
- [x] Frontend tests (vitest + RTL, `npm test`), backend tests for geo/stage helpers
- [x] Theme decided: `plan/DESIGN.md` dark system is the source of truth; broken links fixed

## Left

- [ ] **Real geolocation**: `backend/app/services/geo.py` hashes public IPs onto a fixed city list. Swap `locate()` for a GeoLite2 lookup
- [ ] **Real log collection at scale**: only a single-process UDP forwarder exists. Filebeat/Fluent Bit config and TLS syslog are not done
- [ ] Verify end to end: `pytest backend/tests` (needs a disposable Postgres/Redis, NOT the production URLs in `backend/.env`) and a `docker compose up` smoke test. Only `ml_service` tests, `npm test` and `npm run build` were run for this update
- [ ] Train/evaluate on UNSW-NB15 or CICIDS2017 (`scripts/run_ml.sh --train ...`). The dataset is not in the repo, and current metrics come from `prepared_balanced.csv`
- [ ] Load test (50 WS clients), security tests, production deployment (ROADMAP Phases 9-10)
- [ ] Detection page from ARCHITECTURE 5.2 (not in this checklist's scope; Live stream covers the per-event view)
- [ ] Commit the pending changes
