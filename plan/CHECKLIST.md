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

## Left

### Core to your vision (not built)
- [ ] **Attack path / pattern view**: no graph or kill-chain view. Needs src -> dst -> port flow graph, grouping by attacker IP, stage sequence (recon -> brute force -> access), reusing `alert_groups`
- [ ] **Backend endpoint for path data**: e.g. `GET /analytics/attack-paths` and `/analytics/top-sources` (nothing aggregates by src/dst pair yet)
- [ ] **Live monitoring stream**: a real-time feed of every event (src IP, dst IP, port, proto, verdict). Today only alerts stream over WS, and Events is a static table
- [ ] **Past vs current attacks on one screen**: time-range selector + live/history toggle on the dashboard (`/trends` exists, not used in the UI)
- [ ] **Geo / top attackers / targeted assets panels** (src IP geo, most-hit dst)
- [ ] **Real log collection**: only the HTTP ingest API exists. Needs an agent or forwarder (syslog UDP listener, Filebeat/Fluent Bit) for actual org systems
- [ ] **Traffic generator / demo replayer** so the dashboard looks alive without real sources

### Planned pages not built (ROADMAP Phase 6, Week 13)
- [ ] Analytics & Reports page
- [ ] ML Model Performance page (`/models` endpoint exists)
- [ ] User Management page (admin)
- [ ] Settings page
- [ ] Threat Intel page (backend ready)
- [ ] Responsive pass for small screens
- [ ] Incident right-hand context panel and TI enrichment card (deliberately skipped in MVP)

### Quality and release
- [ ] Verify: run `pytest backend/tests`, `pytest ml_service/tests`, `npm run build`, and a manual `docker compose up` smoke test
- [ ] Frontend tests (React Testing Library: AlertCard, MetricCard, etc.)
- [ ] ML models are trained on synthetic data, so metrics of 1.0 are meaningless. Train/evaluate on UNSW-NB15 or CICIDS2017 per `AI_ML_DESIGN.md`
- [ ] Finalize root `README.md` (setup steps, seeded credentials)
- [ ] Load test (50 WS clients), security tests, production deployment (ROADMAP Phases 9-10)

### Housekeeping (uncommitted changes)
- [ ] `plan/DESIGN.md` was rewritten as a light "Kaspersky Clean" theme and `plan/UI_UX_DESIGN.md` was deleted. The old design was a dark SOC theme, and `plan/README.md` and the MVP plan still link to the deleted file. Decide on the theme and fix the links
- [ ] Commit the pending `frontend/package.json`, lockfile, `main.jsx` and `metrics.json` changes
