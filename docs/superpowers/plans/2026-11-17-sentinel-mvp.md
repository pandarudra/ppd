# SENTINEL MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working, end-to-end thin vertical slice of SENTINEL (AI/ML-powered SOC platform) covering every architectural layer in `plan/`: Postgres+Redis infra, FastAPI backend (auth, event ingestion, ML-driven alerting, incidents, threat intel, AI assistant), a separate ML inference service (Isolation Forest + Random Forest + XGBoost ensemble trained on synthetic data), and a React/Vite/Tailwind frontend covering the golden path (login → dashboard → events → alerts → incidents → AI assistant), all runnable via `docker-compose up`.

**Architecture:** Modular monolith backend (`backend/`) + separately deployable ML service (`ml_service/`) + SPA frontend (`frontend/`), exactly as specified in `plan/ARCHITECTURE.md` §5.1. Clean per-service folder structure matches `plan/ARCHITECTURE.md` §5.2/5.3/5.6 verbatim. This is a *thin* slice: all 13 DB tables and 13-step event flow are implemented, but only the subset of the 39 API endpoints and 12 UI pages needed to demonstrate the full pipeline end-to-end (ingest → ML score → alert → WebSocket push → incident → AI explanation). Deferred endpoints/pages are listed in Global Constraints.

**Tech Stack:** Python 3.11 + FastAPI + SQLAlchemy + Alembic + Pydantic + python-jose + passlib[bcrypt] + redis-py (backend); Python 3.11 + FastAPI + scikit-learn + xgboost + joblib (ml_service); React 18 + Vite + Tailwind CSS + Zustand + TanStack Query + Axios + Recharts (frontend); PostgreSQL 16 + Redis 7; Docker Compose.

**Spec:** `plan/README.md` (index), `plan/ARCHITECTURE.md`, `plan/DATABASE_SCHEMA.md`, `plan/API_SPECIFICATION.md`, `plan/AI_ML_DESIGN.md`, `plan/SECURITY_CONTROLS.md`, `plan/DESIGN.md`, `plan/TECH_STACK.md`, `plan/ROADMAP.md` — executors read the relevant spec section for each task; this plan does not repeat DDL/endpoint payloads that are already written out verbatim in those files.

## Global Constraints

- All table DDL comes verbatim from `plan/DATABASE_SCHEMA.md` §7.2 (13 tables) — do not redesign columns.
- All implemented endpoints must match the exact request/response JSON shapes in `plan/API_SPECIFICATION.md` §8.2 for that endpoint.
- JWT: access token 15 min, refresh token 7 days, HS256, per `plan/SECURITY_CONTROLS.md`.
- Passwords: bcrypt via passlib, cost factor 12.
- Roles: `admin`, `analyst`, `viewer`, `api_client` exactly as in `plan/ARCHITECTURE.md` §5.8.
- Risk/severity levels: `CRITICAL` (≥0.9), `HIGH` (0.75–0.9), `MEDIUM` (0.5–0.75), `LOW` (<0.5), per `plan/ARCHITECTURE.md` §5.9 Step 6.
- No real production data: ML trains on synthetic data generated locally (`ml_service/training/generate_synthetic_logs.py`), not downloaded datasets — keeps the build self-contained and offline-runnable.
- Two-person approval for `response_actions` (`requested_by != approved_by`) is a DB/service-level constraint; the full response-actions UI is deferred (see below).
- LLM calls must work with **no API key configured** — `llm_client.py` returns a clearly-labeled mock/offline response in that case rather than failing the request, so the slice runs with zero paid/external dependencies by default.
- **Deferred out of this slice** (document as TODO, do not build): `users` CRUD UI, `intelligence/enrich` external API call, `analytics/reports/generate` PDF export, alert correlation K-Means clustering (use simple source-IP+time-window grouping instead), pages Detection/Intelligence/Analytics/ModelPerformance/UserManagement/Settings, GeoIP enrichment (stub only), Kafka/SOAR V2 items, backend `GET /models`/`GET /models/{id}/metrics`/`POST /models/{id}/predict` (the ml_service's own `/models` and `/predict` cover this internally; no frontend page consumes the backend proxy versions in this slice), WebSocket `new_event_processed`/`model_prediction_complete` events (superseded by `new_alert` for this slice's purposes).

## Review Focus

- **Event ingestion with malformed/partial logs:** `POST /events/ingest` with a raw_log that doesn't match any known format (syslog/JSON/CSV) must still store the event (status reflects parse failure) rather than 500ing — exercised in Task 4.
- **Auth role escalation:** an `analyst`-role JWT calling an admin-only route (e.g. `POST /users`) must get 403, not 500 or silent success — exercised in Task 3.
- **Two-person approval bypass:** `requested_by == approved_by` on a response action must be rejected at the service layer — exercised in Task 7.
- **WebSocket without/invalid token:** connecting to `/ws` without a valid `token` query param must be rejected (close, not hang) — exercised in Task 6.
- **ML service unreachable:** if `ml_service` is down when the backend's background task calls it, the event must be marked `failed` (not stuck in `processing` forever, not crash the background task) — exercised in Task 6.

---

### Task 1: Project Scaffold & Infra

**Files:**
- Create: `docker-compose.yml`, `.gitignore`, `README.md`
- Create: `backend/.env.example`, `backend/requirements.txt`, `backend/Dockerfile`
- Create: `ml_service/.env.example`, `ml_service/requirements.txt`, `ml_service/Dockerfile`
- Create: `frontend/.env.example`, `frontend/Dockerfile`
- Create: `backend/app/main.py` (placeholder `/health`), `ml_service/main.py` (placeholder `/health`)

**Interfaces:**
- Produces: `docker-compose.yml` with services `postgres`, `redis`, `backend` (port 8000), `ml_service` (port 8001), `frontend` (port 5173); env vars as listed in `plan/TECH_STACK.md` §6.2.
- Produces: `GET /health` on both backend and ml_service returning `{"status": "ok"}`.

- [ ] **Step 1: Write `docker-compose.yml`** with the 5 services above, named volumes for `postgres_data`, and `env_file` pointing at each service's `.env` (not `.env.example`).
- [ ] **Step 2: Write `.env.example` files** for backend (`DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `ALGORITHM=HS256`, `ACCESS_TOKEN_EXPIRE_MINUTES=15`, `REFRESH_TOKEN_EXPIRE_DAYS=7`, `ML_SERVICE_URL=http://ml_service:8001`, `LLM_PROVIDER`, `NVIDIA_API_KEY`, `GEMINI_API_KEY`), ml_service (`MODEL_DIR=./models`), frontend (`VITE_API_URL=http://localhost:8000`, `VITE_WS_URL=ws://localhost:8000`).
- [ ] **Step 3: Write minimal `main.py`** for backend and ml_service: FastAPI app + `GET /health` returning `{"status": "ok"}`.
- [ ] **Step 4: Write `Dockerfile`** for backend and ml_service (python:3.11-slim, pip install -r requirements.txt, uvicorn entrypoint) and frontend (node:18-slim, npm install, vite dev entrypoint).
- [ ] **Step 5: Run `docker compose config`** to verify the compose file parses.
Expected: no errors, 5 services listed.
- [ ] **Step 6: Commit.**

```bash
git init
git add docker-compose.yml .gitignore README.md backend/.env.example backend/requirements.txt backend/Dockerfile backend/app/main.py ml_service/.env.example ml_service/requirements.txt ml_service/Dockerfile ml_service/main.py frontend/.env.example frontend/Dockerfile
git commit -m "chore: scaffold docker-compose infra and service skeletons"
```

---

### Task 2: Database Layer (Models + Migration + Seed)

**Files:**
- Create: `backend/app/core/config.py`, `backend/app/core/database.py`
- Create: `backend/app/models/{__init__.py,user.py,event.py,detection.py,alert.py,incident.py,intelligence.py,ml_model.py,response_action.py,audit_log.py}`
- Create: `backend/alembic.ini`, `backend/alembic/env.py`, `backend/alembic/versions/0001_initial_schema.py`
- Create: `backend/scripts/seed_data.py`
- Test: `backend/tests/conftest.py`, `backend/tests/test_models.py`

**Interfaces:**
- Produces: SQLAlchemy `Base` (declarative) in `database.py`; one ORM class per table in `plan/DATABASE_SCHEMA.md` §7.2 (13 tables, exact columns/constraints/indexes).
- Produces: `get_db()` dependency (yields `Session`) for later tasks to import from `app.core.database`.
- Produces: `settings` object in `config.py` (Pydantic `BaseSettings`) reading the env vars from Task 1.

- [ ] **Step 1: Write `config.py`** — Pydantic `Settings` class with fields for every env var in `backend/.env.example`.
- [ ] **Step 2: Write `database.py`** — SQLAlchemy engine from `settings.DATABASE_URL`, `SessionLocal`, `Base`, `get_db()` generator dependency.
- [ ] **Step 3: Write all 13 ORM models** in `backend/app/models/`, one file per logical group as listed in `plan/ARCHITECTURE.md` §5.4 table, matching `plan/DATABASE_SCHEMA.md` §7.2 DDL exactly (types, CHECK constraints via SQLAlchemy `CheckConstraint`, FKs, indexes).
- [ ] **Step 4: Init Alembic** (`alembic init alembic`), configure `env.py` to import `Base.metadata` from `app.core.database` and `settings.DATABASE_URL`.
- [ ] **Step 5: Generate migration** `0001_initial_schema` via `alembic revision --autogenerate -m "initial schema"`, inspect the generated file against the DDL for correctness.
- [ ] **Step 6: Write `scripts/seed_data.py`** — creates one admin user (`admin@sentinel.local` / `admin123`, role=admin), one analyst (`analyst@sentinel.local` / `analyst123`), 5 sample `threat_intelligence` IOC rows, and registers 3 placeholder `ml_models` rows (updated for real metrics in Task 5).
- [ ] **Step 7: Write test** `test_models.py::test_create_user_and_event` — creates a `User` and a `SecurityEvent` in an in-memory/test Postgres (or SQLite fallback for CI — note SQLite can't enforce `INET`/`CHECK` the same way, so use a disposable Postgres test DB via `DATABASE_URL` override), asserts both round-trip.
- [ ] **Step 8: Run migration + seed against a running `postgres` container** (`docker compose up -d postgres`, `alembic upgrade head`, `python scripts/seed_data.py`).
Expected: no errors; `SELECT count(*) FROM users;` returns 2.
- [ ] **Step 9: Run `pytest backend/tests/test_models.py -v`.**
Expected: PASS.
- [ ] **Step 10: Commit.**

---

### Task 3: Core, Auth & RBAC

**Files:**
- Create: `backend/app/core/security.py`, `backend/app/core/dependencies.py`, `backend/app/core/redis_client.py`
- Create: `backend/app/schemas/{auth.py,user.py}`
- Create: `backend/app/services/auth_service.py`
- Create: `backend/app/routers/{auth.py,users.py}`
- Create: `backend/app/middleware/rate_limiter.py`
- Modify: `backend/app/main.py` (register routers)
- Test: `backend/tests/test_auth.py`

**Interfaces:**
- Consumes: `get_db` from Task 2 (`app.core.database`), ORM `User` model from Task 2.
- Produces: `get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User` in `dependencies.py`.
- Produces: `require_role(*roles: str)` dependency factory in `dependencies.py` (later tasks import this for every protected route).
- Produces: `create_access_token`, `create_refresh_token`, `verify_token`, `hash_password`, `verify_password` in `security.py`.
- Produces: endpoints exactly matching `plan/API_SPECIFICATION.md` §"Authentication Endpoints" (`POST /api/v1/auth/login`, `/logout`, `/refresh`, `GET /auth/me`, `PUT /auth/change-password`) and §"Users Endpoints" (`GET/POST /users`, `GET/PUT /users/{user_id}`).

- [ ] **Step 1: Write the failing test** `test_login_success_and_invalid_credentials` in `test_auth.py`: POST valid seed-admin credentials → 200 with `access_token`/`refresh_token`/`user`; POST wrong password → 401.
- [ ] **Step 2: Run test to verify it fails** (`pytest backend/tests/test_auth.py -v`) — expect FAIL (route not defined).
- [ ] **Step 3: Implement `security.py`** — JWT creation/verification per `plan/SECURITY_CONTROLS.md` (HS256, 15min/7day expiry, `jti` claim), bcrypt hash/verify (cost 12).
- [ ] **Step 4: Implement `redis_client.py`** — async Redis connection pool from `settings.REDIS_URL`.
- [ ] **Step 5: Implement `dependencies.py`** — `get_current_user` (decodes JWT, checks Redis blacklist for `jti`, loads user from DB, 401 on any failure), `require_role(*roles)` (403 if `current_user.role not in roles`).
- [ ] **Step 6: Implement `auth_service.py` + `routers/auth.py`** — login (bcrypt verify, increment `failed_attempts`/lock after 5 per `plan/DESIGN.md` Page 1, issue tokens, store refresh `jti` in Redis), logout (blacklist current `jti`), refresh (rotate refresh token), me, change-password.
- [ ] **Step 7: Implement `routers/users.py`** — list/create/get/update, all behind `Depends(require_role("admin"))` except `GET /users/{id}` which also allows the user fetching their own profile.
- [ ] **Step 8: Implement `middleware/rate_limiter.py`** — Redis sliding-window per `plan/SECURITY_CONTROLS.md` (`login: 10/min/IP`, `general API: 200/min/user`), applied as FastAPI middleware.
- [ ] **Step 9: Register routers in `main.py`** under `/api/v1` prefix.
- [ ] **Step 10: Run test to verify it passes.**
Expected: PASS.
- [ ] **Step 11: Write and run `test_role_middleware`** (Review Focus: role escalation) — analyst JWT calling `POST /api/v1/users` → 403; no token → 401.
Expected: PASS.
- [ ] **Step 12: Commit.**

---

### Task 4: Event Ingestion & Normalization

**Files:**
- Create: `backend/app/schemas/event.py`
- Create: `backend/app/services/event_service.py`, `backend/app/services/log_normalizer.py`
- Create: `backend/app/routers/events.py`
- Test: `backend/tests/test_events.py`

**Interfaces:**
- Consumes: `get_db`, `get_current_user`, `require_role` from Task 3; `SecurityEvent` model from Task 2.
- Produces: `event_service.save_event(db, schema: EventIngestSchema) -> SecurityEvent` (used by Task 6's background task trigger point).
- Produces: `log_normalizer.detect_format(raw_log: str) -> str` (`"syslog"|"json"|"csv"|"unknown"`) and `log_normalizer.normalize(raw_log: str, source_format: str) -> dict` (returns `{source_ip, dest_ip, source_port, dest_port, protocol, event_type, event_timestamp, normalized_data}`, best-effort — missing fields are `None`, never raises).
- Produces: endpoints matching `plan/API_SPECIFICATION.md` §"Event Ingestion Endpoints" and §"Security Events Endpoints" (`POST /events/ingest`, `POST /events/ingest/batch`, `GET /events/status/{event_id}`, `GET /events`, `GET /events/{event_id}`, `GET /events/{event_id}/detection`, `DELETE /events/{event_id}`). `detection` sub-fields are populated in Task 6; return `null`/pending here.

- [ ] **Step 1: Write failing tests** in `test_events.py`: `test_ingest_syslog_event` (valid syslog line → 202, `status: accepted`), `test_ingest_malformed_log_does_not_500` (Review Focus — garbage string, `source_format` omitted → still 202, event saved with `status="pending"`/`source_format="unknown"`, fields `None`).
- [ ] **Step 2: Run tests to verify they fail.**
- [ ] **Step 3: Implement `log_normalizer.py`** — `detect_format` (regex for RFC5424 syslog prefix; `json.loads` success → json; else try `csv` sniff; else `unknown`), `normalize` per format (syslog: regex-extract `SRC=`/`DST=`/`DPT=`/`PROTO=` style KV pairs as in the `plan/API_SPECIFICATION.md` ingest example; json: direct key mapping; unknown: all fields `None`). Never raises — catches and returns best-effort dict.
- [ ] **Step 4: Implement `event_service.py`** — `save_event` (normalize, insert `SecurityEvent` row, commit, return it), `list_events` (filters: source_ip, event_type, status, date range; pagination), `get_event`, `delete_event`.
- [ ] **Step 5: Implement `routers/events.py`** — all 7 endpoints per spec; `ingest`/`ingest/batch` call `event_service.save_event` and (stub for now) `background_tasks.add_task` — the actual task body is added in Task 6, so for this task add a no-op placeholder function `process_event_stub` that just logs, to keep the router shape stable.
- [ ] **Step 6: Register router in `main.py`.**
- [ ] **Step 7: Run tests to verify they pass.**
Expected: PASS, including the malformed-log test.
- [ ] **Step 8: Commit.**

---

### Task 5: ML Service (Synthetic Data, Training, Inference API)

**Files:**
- Create: `ml_service/training/generate_synthetic_logs.py`, `ml_service/training/data_prep.py`, `ml_service/training/train.py`
- Create: `ml_service/pipeline/feature_extractor.py`, `ml_service/pipeline/preprocessor.py`
- Create: `ml_service/ensemble/ensemble.py`
- Create: `ml_service/model_registry.py`
- Modify: `ml_service/main.py` (replace health-only placeholder)
- Test: `ml_service/tests/test_predict.py`

**Interfaces:**
- Produces: `generate_synthetic_logs.py` script → writes `ml_service/data/synthetic_events.csv` with columns matching the 15–20 features named in `plan/AI_ML_DESIGN.md` §4.1/4.4 (e.g. `failed_auth_ratio`, `port_entropy`, `connection_duration`, `packet_size_avg`, `src_port`, `dst_port`, `protocol_enc`, `bytes_sent`, `bytes_recv`, ...) plus a `label` column (0=benign, 1=attack), ~5000 rows, ~10% attack rate, with attack rows having a distinguishable statistical shift (so trained models score meaningfully above chance — this is synthetic, not claiming real-world accuracy).
- Produces: `train.py` → trains `IsolationForest`, `RandomForestClassifier`, `XGBClassifier` per hyperparameters in `plan/AI_ML_DESIGN.md` §4.4 Stage 4, saves `models/isolation_forest.joblib`, `models/random_forest.joblib`, `models/xgboost_model.joblib`, `models/scaler.joblib`, prints held-out metrics (F1/precision/recall/AUC — no hard threshold gate since data is synthetic, just report).
- Produces: `model_registry.py::ModelRegistry.load_all()` / `.predict(features: dict) -> dict` implementing the exact weighted-ensemble formula in `plan/ARCHITECTURE.md` §5.6 (`0.3*IF + 0.35*RF + 0.35*XGB`), returning `{prediction, confidence, anomaly_score, model_scores: {isolation_forest, random_forest, xgboost}}`.
- Produces: `feature_extractor.py::extract_features(normalized_data: dict) -> dict` — maps the `event_service.normalize()` output shape (Task 4) to the model's feature names, filling sane defaults for missing fields.
- Produces: endpoints matching `plan/API_SPECIFICATION.md`-implied ML contract used by the backend: `POST /predict` (body: `{features: {...}}` → `{prediction, confidence_score, risk_level, anomaly_score, model_scores}`), `POST /batch`, `GET /health` (now also checks models loaded), `GET /models`.

- [ ] **Step 1: Write `generate_synthetic_logs.py`** and run it to produce `data/synthetic_events.csv`.
- [ ] **Step 2: Write `data_prep.py`** — load CSV, split 70/15/15 stratified (`random_state=42`), fit `StandardScaler` on train only.
- [ ] **Step 3: Write `train.py`** implementing Stage 4 of `plan/AI_ML_DESIGN.md` §4.4, save artifacts + print `classification_report`/AUC to stdout.
- [ ] **Step 4: Run `python training/train.py`.**
Expected: 4 `.joblib` files written to `ml_service/models/`, metrics printed without error.
- [ ] **Step 5: Write the failing test** `test_predict_returns_valid_schema` in `test_predict.py`: POST `/predict` with a sample feature dict → 200, response has all 4 top-level keys and `model_scores` has all 3 sub-keys, `confidence_score` in `[0,1]`.
- [ ] **Step 6: Implement `model_registry.py`, `pipeline/feature_extractor.py`, `pipeline/preprocessor.py`, `ensemble/ensemble.py`.**
- [ ] **Step 7: Implement `main.py`** — FastAPI app, `lifespan` event calls `ModelRegistry.load_all()`, routes `/predict`, `/batch`, `/health`, `/models` (reads registered metrics from the 4 artifacts' saved companion JSON of metrics written in Step 3).
- [ ] **Step 8: Run test to verify it passes.**
Expected: PASS.
- [ ] **Step 9: Commit** (include `models/*.joblib` via Git LFS-free — these are small synthetic models, fine to commit directly; note in commit message they're synthetic/demo artifacts, not production models).

---

### Task 6: Detection & Alert Pipeline (Backend ↔ ML Service, WebSocket)

**Files:**
- Create: `backend/app/services/detection_service.py`, `backend/app/services/alert_service.py`
- Create: `backend/app/background/{ml_processor.py,alert_correlator.py}`
- Create: `backend/app/ws/manager.py`
- Create: `backend/app/routers/alerts.py`
- Create: `backend/app/schemas/alert.py`
- Modify: `backend/app/routers/events.py` (wire real background task), `backend/app/main.py` (mount `/ws`, start correlator)
- Test: `backend/tests/test_pipeline.py`

**Interfaces:**
- Consumes: `ModelRegistry`/`/predict` HTTP contract from Task 5 (called via `httpx` at `settings.ML_SERVICE_URL`); `event_service`, `log_normalizer` from Task 4.
- Produces: `alert_service.create_alert(db, event, detection_result) -> Alert`, `alert_service.list_alerts(...)`, `alert_service.update_status(...)`, `alert_service.assign(...)`.
- Produces: `ws.manager.ws_manager` singleton with `.connect(ws, user, role)`, `.broadcast_to_role(role, message)`, `.broadcast_all(message)` (later tasks — Incidents, Assistant — import this singleton to push `incident_created` etc.).
- Produces: `GET /ws?token=...` endpoint; endpoints matching `plan/API_SPECIFICATION.md` §"Alerts Endpoints" (`GET /alerts`, `GET /alerts/{id}`, `PUT /alerts/{id}/status`, `PUT /alerts/{id}/assign`, `POST /alerts/{id}/comment`, `POST /alerts/correlate`).

- [ ] **Step 1: Write failing integration test** `test_full_pipeline_event_to_alert` — POST a high-risk synthetic event via `/events/ingest`, run the background task inline (call `ml_processor.process_event` directly in the test rather than waiting on FastAPI's task queue), assert a `detection_results` row and (if risk ≥ MEDIUM) an `alerts` row exist.
- [ ] **Step 2: Write failing test** `test_ml_service_down_marks_event_failed` (Review Focus) — point `ML_SERVICE_URL` at an unreachable port, run `process_event`, assert event `status == "failed"` and no exception propagates.
- [ ] **Step 3: Run tests to verify they fail.**
- [ ] **Step 4: Implement `detection_service.py`** — `call_ml_service(features: dict) -> dict | None` (httpx POST to `/predict`, returns `None` on connection error/timeout instead of raising), `save_detection_result(db, event, ml_response) -> DetectionResult`, `risk_level_for(confidence: float) -> str` (thresholds from Global Constraints).
- [ ] **Step 5: Implement `alert_service.py`** — `create_alert` (auto title/description from event_type + source_ip per `plan/API_SPECIFICATION.md` alert example, severity = risk_level), list/get/update_status/assign/comment.
- [ ] **Step 6: Implement `ws/manager.py`** per the class sketch in `plan/ARCHITECTURE.md` §5.3, plus a `/ws` route in a new `backend/app/routers/websocket.py` that rejects (closes with 1008) connections with a missing/invalid token (Review Focus) before calling `.connect()`; the route's receive loop replies `{"type":"pong","timestamp":...}` to any `{"type":"ping"}` client message.
- [ ] **Step 7: Implement `background/ml_processor.py::process_event(event_id)`** — feature-extract via Task 4's `normalized_data` + Task 5's `feature_extractor` shape, call `detection_service`, on success call `alert_service.create_alert` if risk ≥ MEDIUM and then `ws_manager.broadcast_to_role("analyst", {"type":"new_alert", "payload": {...}})`; on ML-service-down, set event status `failed` and return (no raise).
- [ ] **Step 8: Implement `background/alert_correlator.py`** — simple grouping (Global Constraints: no K-Means) — on each new alert, find other `open` alerts sharing the same `source_ip` within a 10-minute window; if ≥2 found, create/attach an `alert_groups` row.
- [ ] **Step 9: Wire `routers/events.py`** — replace the Task 4 stub with `background_tasks.add_task(ml_processor.process_event, saved_event.id)`.
- [ ] **Step 10: Implement `routers/alerts.py`** per spec endpoints, including `POST /alerts/correlate` (manual trigger of the same grouping logic); `PUT /alerts/{id}/status` and `/assign` broadcast `alert_updated` via `ws_manager` after committing.
- [ ] **Step 11: Run tests to verify they pass.**
Expected: PASS for both pipeline and ML-down tests.
- [ ] **Step 12: Commit.**

---

### Task 7: Incident Management & Threat Intelligence

**Files:**
- Create: `backend/app/services/{incident_service.py,intelligence_service.py}`
- Create: `backend/app/routers/{incidents.py,intelligence.py}`
- Create: `backend/app/schemas/{incident.py,intelligence.py}`
- Test: `backend/tests/test_incidents.py`

**Interfaces:**
- Consumes: `Alert`, `Incident`, `IncidentAlert`, `InvestigationHistory`, `ResponseAction`, `ThreatIntelligence` models (Task 2); `ws_manager` (Task 6).
- Produces: `incident_service.create_incident`, `.link_alerts`, `.update`, `.get_timeline`, `.log_history(incident_id, user_id, action_type, description, metadata=None)` (Task 8/9 import `log_history` to append AI-analysis / response-action entries).
- Produces: `response_action` creation with enforced `requested_by != approved_by` (raises `HTTPException(400)` otherwise) — no dedicated UI yet, but the service function and a minimal `POST/PUT /incidents/{id}/response-actions` pair of routes exist for Task 9/frontend's "Request Action" button.
- Produces: endpoints matching `plan/API_SPECIFICATION.md` §"Incidents Endpoints" (`GET/POST /incidents`, `GET/PUT /incidents/{id}`, `POST /incidents/{id}/alerts`, `GET /incidents/{id}/timeline`) and §"Threat Intelligence Endpoints" `GET /intelligence/lookup`, `GET/POST /intelligence/iocs` (skip `POST /intelligence/enrich` — Global Constraints).

- [ ] **Step 1: Write failing test** `test_incident_lifecycle` — create incident linking 2 seeded alerts → timeline has a `note_added` entry; `PUT` status to `investigating` → timeline has `status_changed` entry.
- [ ] **Step 2: Write failing test** `test_two_person_approval_rejected` (Review Focus) — request a response action as user A, attempt to approve as user A → 400/403; approve as user B → success, timeline logs both identities.
- [ ] **Step 3: Run tests to verify they fail.**
- [ ] **Step 4: Implement `incident_service.py`** including the two-person-rule check.
- [ ] **Step 5: Implement `intelligence_service.py`** — `lookup(ioc_value, ioc_type) -> ThreatIntelligence | None`, `add_ioc`, `list_iocs`.
- [ ] **Step 6: Implement `routers/incidents.py` and `routers/intelligence.py`** per spec, broadcasting `incident_created`/`incident_updated` via `ws_manager`.
- [ ] **Step 7: Run tests to verify they pass.**
Expected: PASS.
- [ ] **Step 8: Commit.**

---

### Task 8: AI SOC Assistant (RAG + LLM)

**Files:**
- Create: `backend/app/llm/{llm_client.py,prompt_templates.py}`
- Create: `backend/app/services/assistant_service.py`
- Create: `backend/app/routers/assistant.py`
- Create: `backend/app/schemas/assistant.py`
- Test: `backend/tests/test_assistant.py`

**Interfaces:**
- Consumes: `alert_service.get_alert`, `event_service.get_event`, `detection_service` result, `intelligence_service.lookup`, `incident_service.log_history` (all prior tasks).
- Produces: `llm_client.complete(prompt: str) -> str` — reads `settings.LLM_PROVIDER` (`"nvidia"|"gemini"`); if no corresponding API key is set, returns a deterministic mock string prefixed `"[OFFLINE MODE] "` instead of raising (Global Constraints).
- Produces: endpoints matching `plan/API_SPECIFICATION.md` §"AI Assistant Endpoints" (`POST /assistant/analyze`, `POST /assistant/explain/{alert_id}`, `POST /assistant/recommend/{incident_id}`), response shape exactly as in the spec examples.

- [ ] **Step 1: Write failing test** `test_output_filter_blocks_shell_patterns` (Review Focus-adjacent, per `plan/SECURITY_CONTROLS.md` output filtering) — mock `llm_client.complete` to return a string containing `rm -rf /`, assert the filtered response the API returns does not contain it (replaced with a redaction marker).
- [ ] **Step 2: Write failing test** `test_explain_alert_offline_mode_works_without_api_key` — with no `GEMINI_API_KEY`/`NVIDIA_API_KEY` set, `POST /assistant/explain/{alert_id}` still returns 200 with the `[OFFLINE MODE]` explanation, not a 500.
- [ ] **Step 3: Run tests to verify they fail.**
- [ ] **Step 4: Implement `prompt_templates.py`** — `SYSTEM_PROMPT` and `build_analysis_prompt(question, context)` exactly as in `plan/ARCHITECTURE.md` §5.7, JSON-encoding all context values (prompt-injection mitigation per `plan/SECURITY_CONTROLS.md`).
- [ ] **Step 5: Implement `llm_client.py`** — provider-agnostic `complete()`, offline fallback, output filter (regex-redact `rm -rf`, `eval(`, `exec(`, `os.system` patterns per `plan/SECURITY_CONTROLS.md`), 2000-char input cap.
- [ ] **Step 6: Implement `assistant_service.py`** — `gather_context(alert_id=None, incident_id=None, event_ids=None)` (fetches alert/event/detection/TI-matches/up-to-3-similar-past-incidents), `analyze`, `explain_alert`, `recommend_for_incident` (parses the LLM text into the structured sections from the spec's response examples — simple heuristic section-splitting, not strict parsing), logs every call to `investigation_history` via `incident_service.log_history` when an incident context exists.
- [ ] **Step 7: Implement `routers/assistant.py`** per spec, rate-limited at 20/min/analyst (reuse Task 3's rate limiter with a distinct key prefix).
- [ ] **Step 8: Run tests to verify they pass.**
Expected: PASS.
- [ ] **Step 9: Commit.**

---

### Task 9: Analytics, Audit Logging & Final Backend Wiring

**Files:**
- Create: `backend/app/services/{analytics_service.py,audit_service.py}`
- Create: `backend/app/routers/analytics.py`
- Create: `backend/app/middleware/audit_middleware.py`
- Modify: `backend/app/main.py` (register remaining routers/middleware, CORS, startup system-health WS broadcaster)
- Test: `backend/tests/test_analytics.py`, `backend/tests/test_audit.py`

**Interfaces:**
- Consumes: all prior services/models.
- Produces: `GET /api/v1/analytics/dashboard`, `GET /api/v1/analytics/trends` matching `plan/API_SPECIFICATION.md` (skip `reports/generate` per Global Constraints).
- Produces: `AuditMiddleware` that logs every POST/PUT/DELETE to `audit_logs` with before/after state, per `plan/SECURITY_CONTROLS.md` (Review Focus: this is what proves the two-person-approval and role-escalation tests above are actually auditable).

- [ ] **Step 1: Write failing test** `test_dashboard_kpis` — seed a few events/alerts, GET `/analytics/dashboard`, assert `total_events`, `open_alerts`, `alerts_by_severity` are present and correct.
- [ ] **Step 2: Write failing test** `test_audit_log_written_on_mutation` — PUT an alert status, then query `audit_logs` for a row with matching `resource_type="alert"` and non-null `before_state`/`after_state`.
- [ ] **Step 3: Run tests to verify they fail.**
- [ ] **Step 4: Implement `analytics_service.py`** — aggregate queries (counts, group-by-severity, simple hourly bucket for last 24h) with a 30s Redis cache per `plan/ARCHITECTURE.md` §5.4.
- [ ] **Step 5: Implement `audit_service.py` + `audit_middleware.py`** — captures request body as `before_state` (for PUT, fetch the row first), response body as `after_state`, writes one `audit_logs` row per mutating request, including failures.
- [ ] **Step 6: Implement `routers/analytics.py`.**
- [ ] **Step 7: Wire `main.py`** — register all routers under `/api/v1`, add `AuditMiddleware`, CORS restricted to `FRONTEND_ORIGIN` env var, a startup `asyncio` task broadcasting `system_health_update` via `ws_manager` every 30s.
- [ ] **Step 8: Run tests to verify they pass; run full backend suite** (`pytest backend/tests -v`).
Expected: all PASS.
- [ ] **Step 9: Commit.**

---

### Task 10: Frontend Foundation (Routing, Stores, API Client, WebSocket)

**Files:**
- Create: `frontend/package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `index.html`
- Create: `frontend/src/{main.jsx,App.jsx}`
- Create: `frontend/src/api/{client.js,authApi.js,eventsApi.js,alertsApi.js,incidentsApi.js,assistantApi.js}`
- Create: `frontend/src/stores/{authStore.js,alertStore.js,incidentStore.js,wsStore.js}`
- Create: `frontend/src/hooks/{useWebSocket.js,useAuth.js}`
- Create: `frontend/src/components/layout/{Sidebar.jsx,Navbar.jsx,PageWrapper.jsx}`
- Create: `frontend/src/components/common/{Button.jsx,Card.jsx,Badge.jsx,Spinner.jsx}`
- Create: `frontend/src/utils/{severityColors.js,formatters.js,constants.js}`

**Interfaces:**
- Produces: `authStore` (Zustand) — `{token, user, login(email,pw), logout(), isAuthenticated}`; `alertStore` — `{alerts, prependAlert, updateAlert, setAlerts}`; `incidentStore`, `wsStore` likewise.
- Produces: `apiClient` (Axios instance) with JWT bearer interceptor reading `authStore.token`, and a 401-response interceptor that calls `authApi.refresh()` once then retries.
- Produces: `useWebSocket()` hook per the sketch in `plan/ARCHITECTURE.md` §5.2, dispatching `new_alert`/`alert_updated`/`incident_created`/`system_health_update` into the stores above.
- Produces: `<App />` with React Router v6 routes `/login` (public) and `/dashboard`, `/events`, `/alerts`, `/incidents`, `/assistant` (protected — redirect to `/login` if `!isAuthenticated`).

- [ ] **Step 1: Scaffold Vite project** (`npm create vite@latest frontend -- --template react`), install `tailwindcss`, `zustand`, `@tanstack/react-query`, `axios`, `react-router-dom`, `recharts`, `lucide-react`; configure Tailwind with the dark palette tokens from `plan/DESIGN.md` §9.1.
- [ ] **Step 2: Implement stores** (`authStore.js` etc.) — plain Zustand `create()` stores per the API above.
- [ ] **Step 3: Implement `api/client.js`** and per-domain API files wrapping the backend endpoints from Tasks 3/4/6/7/8 (one function per endpoint, matching exact paths/payloads from `plan/API_SPECIFICATION.md`).
- [ ] **Step 4: Implement `hooks/useWebSocket.js`** per the architecture sketch, auto-reconnect with exponential backoff on close.
- [ ] **Step 5: Implement layout components and `App.jsx`** with protected-route wrapper component checking `authStore.isAuthenticated` and (for admin-only routes, none in this slice) role.
- [ ] **Step 6: Run `npm run build`.**
Expected: builds with no errors (pages referenced by routes are placeholders until Task 11, but a trivial placeholder div per route is enough to make the build succeed).
- [ ] **Step 7: Commit.**

---

### Task 11: Frontend Core Pages

**Files:**
- Create: `frontend/src/pages/{Login.jsx,Dashboard.jsx,Events.jsx,Alerts.jsx,Incidents.jsx,Assistant.jsx}`
- Create: `frontend/src/components/{alerts/AlertCard.jsx,alerts/AlertDetailDrawer.jsx,events/EventTable.jsx,events/EventDetailDrawer.jsx,incidents/IncidentWorkspace.jsx,incidents/IncidentTimeline.jsx,assistant/ChatWindow.jsx,assistant/MessageBubble.jsx,charts/AlertSeverityChart.jsx,common/MetricCard.jsx,common/SeverityBadge.jsx,common/DataTable.jsx,common/DetailDrawer.jsx}`

**Interfaces:**
- Consumes: everything from Task 10 (stores, api, hooks, layout).
- Produces: working pages wired to TanStack Query against the live backend API.

- [ ] **Step 1: Build `Login.jsx`** per `plan/DESIGN.md` Page 1 (email/password form, loading state, error toast, redirect to `/dashboard` on success).
- [ ] **Step 2: Build `Dashboard.jsx`** per Page 2 — KPI MetricCards from `GET /analytics/dashboard`, `AlertSeverityChart` (Recharts BarChart), live alert feed (last 20 from `alertStore`, prepended via WebSocket), system health pills from `wsStore`.
- [ ] **Step 3: Build `Events.jsx`** per Page 3 — filter bar + `DataTable` + `EventDetailDrawer` (raw log, normalized JSON, detection scores) on row click.
- [ ] **Step 4: Build `Alerts.jsx`** per Page 5 — filter sidebar + alert queue table + `AlertDetailDrawer` (status actions, assignment, comment, "Get AI Explanation" button calling `assistantApi.explainAlert`, "Link to Incident").
- [ ] **Step 5: Build `Incidents.jsx`** per Page 6 (simplified 2-panel: list + workspace, skip the right context panel's TI enrichment card per Global Constraints) — linked alerts tab, timeline tab (from `IncidentTimeline`), notes tab, "Get AI Recommendations" button.
- [ ] **Step 6: Build `Assistant.jsx`** per Page 7 — chat window, context selector (pin an alert/incident id), suggested-prompt chips, calls `assistantApi.analyze`.
- [ ] **Step 7: Manual smoke test** — `docker compose up`, log in as seeded admin, ingest a synthetic malicious event via `curl`, verify it appears as an alert on the dashboard within a few seconds without page refresh, open it, get an AI explanation, create an incident from it, view its timeline.
- [ ] **Step 8: Commit.**

---

### Task 12: Integration Verification

**Files:**
- Create: `backend/tests/test_e2e.py`
- Modify: `README.md` (final setup instructions, matching `plan/TECH_STACK.md` §6.2)

**Interfaces:**
- Consumes: the full running stack.

- [ ] **Step 1: Write `test_e2e.py::test_full_scenario_1`** — implements `plan/ROADMAP.md` §12.1 "Scenario 1 — Full Detection Pipeline": ingest a synthetic SSH brute-force-shaped event → poll `/events/status/{id}` until `processed` → assert an alert exists with risk HIGH-or-above → assert a WebSocket client (test fixture) received a `new_alert` message.
- [ ] **Step 2: Run `docker compose up -d`, `alembic upgrade head`, `python scripts/seed_data.py`, `python ml_service/training/train.py`, run the full `pytest backend/tests -v`.**
Expected: all tests PASS.
- [ ] **Step 3: Finalize `README.md`** with the setup steps from `plan/TECH_STACK.md` §6.2, adapted to this repo's actual structure, plus the 2 seeded login credentials.
- [ ] **Step 4: Commit.**

---
