# SENTINEL: 20-Week Development Roadmap, Testing Strategy & Risk Matrix

> **Document Version:** 1.0  
> **Duration:** 10 Phases × 20 Weeks  
> **Coverage:** Sprint Tasks, Testing Gates, 10 Risk Mitigations, and Academic Gap Analysis

---

# PART 11: DEVELOPMENT ROADMAP

## Phase 1: Project Setup & Architecture (Weeks 1–2)

**Tasks:**
- Set up GitHub organization and repository with branch protection rules (main, develop, feature/*)
- Write `docker-compose.yml` with services: postgres, redis, backend, ml_service, frontend
- Initialize FastAPI project with folder structure (routers, services, models, schemas, middleware)
- Initialize React + Vite + Tailwind project with ESLint and Prettier config
- Set up Alembic for database migrations
- Create `.env.example` files for all services
- Write initial `README.md` with setup instructions
- Configure VS Code workspace settings and recommended extensions
- Set up pre-commit hooks (black, isort, eslint)

**Dependencies:** None (first phase)

**Deliverables:**
- Running `docker-compose up` environment with all services starting
- Empty FastAPI with `/health` endpoint returning 200
- Empty React app rendering a placeholder page

**Testing:**
- `docker-compose up` runs without errors
- `GET /health` returns `{"status": "ok"}`
- PostgreSQL and Redis connections verified via health check

**Completion Criteria:** Every team member can clone the repo and run the full stack in <15 minutes.

---

## Phase 2: Database & Backend Foundation (Weeks 3–4)

**Tasks:**
- Write SQLAlchemy ORM models for all 13 tables
- Write Alembic migration for initial schema
- Write Pydantic schemas for all entities
- Implement `core/security.py`: JWT creation, verification, bcrypt hashing
- Implement `routers/auth.py`: login, logout, refresh, me, change-password
- Implement `routers/users.py`: CRUD operations (admin only)
- Implement JWT middleware and role-based `require_role()` dependency
- Implement Redis-based rate limiter middleware
- Implement AuditLogger service and middleware
- Write seed data script: admin user, sample analysts, sample roles

**Dependencies:** Phase 1 complete

**Deliverables:**
- Full authentication API working end-to-end
- Database schema fully created via migration
- OpenAPI docs at `/docs` showing all auth endpoints

**Testing:**
- pytest: auth tests (login, logout, refresh, invalid credentials, rate limit)
- pytest: role middleware tests (401 for unauthenticated, 403 for wrong role)
- Alembic: `upgrade head` and `downgrade -1` without errors

**Completion Criteria:** Login API returns JWT. Protected endpoints reject unauthenticated requests. Audit logs written for every login.

---

## Phase 3: Event Ingestion & Normalization (Week 5)

**Tasks:**
- Implement format detector (syslog RFC5424, JSON, CEF, CSV)
- Implement parsers for each format (using `pylogparser`, `json`, `pandas`)
- Implement field normalizer: extract source_ip, dest_ip, ports, protocol, event_type, timestamp
- Implement IP enrichment stub (GeoIP with geoip2 library, private range detection)
- Implement `routers/events.py`: ingest, ingest/batch, status/{event_id}, list, detail, detection
- Write background task skeleton for ML processing (calls a stub endpoint initially)
- Write TI cross-check: query `threat_intelligence` table for source/dest IPs

**Dependencies:** Phase 2 complete

**Deliverables:**
- `POST /api/v1/events/ingest` accepts syslog, JSON, and CSV payloads
- Events stored in PostgreSQL with normalized_data populated
- Background task fires and logs a placeholder for ML results

**Testing:**
- pytest: ingest 50 synthetic syslog lines → verify all saved with correct field extraction
- pytest: batch ingest 200 events → verify all accepted
- pytest: format detection correctly identifies syslog/JSON/CSV

**Completion Criteria:** 95%+ of synthetic test log lines correctly parsed and stored.

---

## Phase 4: AI/ML Model Development (Weeks 6–8)

**Week 6: Data Preparation**
- Download NSL-KDD and CICIDS2017 datasets
- Write `data_prep.py`: clean, deduplicate, encode categoricals, scale numerics
- Define feature set (15–20 features)
- Generate synthetic normal/attack logs with `generate_synthetic_logs.py`
- Document feature engineering decisions

**Week 7: Model Training**
- Train Isolation Forest with contamination tuning
- Train Random Forest with n_estimators and max_depth grid search
- Train XGBoost with hyperparameter tuning (learning rate, max_depth, n_estimators)
- Save all models with joblib
- Implement ensemble weighted voting

**Week 8: ML Service API**
- Build `ml_service/main.py` FastAPI app
- Implement `/predict` endpoint using ModelRegistry
- Implement `/batch` endpoint for bulk event scoring
- Implement `/health` and `/models` endpoints
- Register trained models in `ml_models` table
- Write model integrity verification

**Dependencies:** Phase 3 complete

**Deliverables:**
- Three trained model artifacts in `ml_service/models/`
- ML service running on port 8001 with working `/predict` endpoint
- Model performance metrics: RF F1 ≥ 0.90, XGB F1 ≥ 0.90, IF AUC ≥ 0.85

**Testing:**
- pytest: 5-fold cross-validation on held-out test set
- pytest: `/predict` with 100 known-malicious and 100 known-normal samples → verify accuracy
- pytest: model integrity check catches tampered model file

**Completion Criteria:** Ensemble model achieves F1 ≥ 0.90 on NSL-KDD test set.

---

## Phase 5: Detection & Alert Pipeline (Weeks 9–10)

**Tasks:**
- Wire background task to call `POST http://ml_service:8001/predict` with feature vector
- Save `detection_results` from ML service response
- Implement alert generation logic (threshold: confidence ≥ 0.5 → create alert)
- Implement severity mapping: CRITICAL (≥0.9), HIGH (0.75–0.9), MEDIUM (0.5–0.75)
- Implement `alert_service.py`: create, update, assign, group
- Implement alert correlator background task (group by source_ip and time window)
- Implement `routers/alerts.py`: all 6 alert endpoints
- Implement WebSocketManager and wire to alert creation
- Test full pipeline: ingest event → ML → alert → WebSocket broadcast

**Dependencies:** Phases 3 and 4 complete

**Deliverables:**
- Full pipeline working end-to-end: syslog → database → ML score → alert → WebSocket
- Alerts visible in `/api/v1/alerts` within 2 seconds of event ingestion
- Alert correlation grouping tested with batch of related events

**Testing:**
- Integration test: ingest 20 high-risk synthetic events → verify 20 alerts created
- Integration test: WebSocket client receives `new_alert` within 3 seconds
- Integration test: 5 events from same source IP → grouped into one `alert_group`

**Completion Criteria:** End-to-end pipeline works. Alert appears on dashboard within 3 seconds of log ingestion.

---

## Phase 6: Frontend & Dashboard (Weeks 11–13)

**Week 11: Foundation**
- Set up React project with React Router v6 protected routes
- Implement Zustand stores (auth, alert, incident, ws)
- Implement Axios client with JWT interceptor and 401 auto-refresh
- Implement useWebSocket hook
- Build Layout components: Sidebar, Navbar, PageWrapper
- Build Login page with auth API integration

**Week 12: Core Pages**
- Build SOC Dashboard (KPI cards, charts, live alert feed)
- Build Security Events Explorer (table, filters, detail drawer)
- Build Alerts Management (table, filters, detail drawer, status actions)
- Connect all pages to backend APIs using TanStack Query

**Week 13: Remaining Pages**
- Build Incidents page (list + workspace + timeline)
- Build Analytics & Reports page
- Build ML Model Performance page
- Build User Management page (admin)
- Build Settings page
- Responsive adjustments for smaller screens

**Dependencies:** Phases 2, 3, 5 complete

**Deliverables:**
- All 12 pages rendering with real data from the backend
- Real-time alert updates visible on dashboard without page refresh
- Login → Dashboard → Alert Detail → Incident Creation flow working end-to-end

**Testing:**
- React Testing Library: unit tests for AlertCard, SeverityBadge, MetricCard
- Manual smoke test: full analyst workflow on a fresh data set
- Accessibility: check heading hierarchy and ARIA labels on key components

**Completion Criteria:** All pages load without errors. Live alert feed updates in real time.

---

## Phase 7: AI SOC Assistant (Weeks 14–15)

**Tasks:**
- Implement `assistant_service.py`: context retrieval from PostgreSQL (alert, event, detection, TI, similar incidents)
- Implement prompt builder with SYSTEM_PROMPT and context injection
- Implement LLM API client (Gemini or OpenAI) with retry logic and rate limit handling
- Implement response parser (extract sections: threat assessment, evidence, steps, actions)
- Implement `routers/assistant.py`: analyze, explain/{alert_id}, recommend/{incident_id}
- Implement prompt injection detection and output filtering
- Build AI SOC Assistant frontend page (chat UI, context selector, structured response display)
- Wire "Get AI Explanation" and "Get AI Recommendations" buttons on alert/incident pages
- Implement conversation logging to `investigation_history`

**Dependencies:** Phase 6 complete, LLM API key configured

**Deliverables:**
- Working AI chat interface that returns structured security analysis
- "Explain Alert" one-click action producing an AI explanation in <15 seconds
- All AI responses logged in investigation_history

**Testing:**
- Unit test: prompt builder correctly injects all context fields
- Unit test: output filter detects and redacts shell command patterns
- Integration test: analyze endpoint returns structured JSON with all 5 sections
- Manual test: 10 different alert types → verify relevant, coherent AI responses

**Completion Criteria:** AI assistant produces coherent, context-aware security analysis for ≥90% of test alerts.

---

## Phase 8: Incident Management & Response (Weeks 16–17)

**Tasks:**
- Implement `incident_service.py`: create, update, link alerts, timeline
- Implement `routers/incidents.py`: all 6 endpoints
- Implement `investigation_history` logging for all incident actions
- Implement `response_actions` table, service, and endpoints
- Implement two-person approval enforcement (requested_by ≠ approved_by)
- Implement `intelligence_service.py` and `routers/intelligence.py`
- Implement IOC lookup (local DB + optional external API stub)
- Build Incident Investigation Workspace frontend (3-panel layout)
- Build Threat Intelligence page
- Full incident workflow: create → investigate → request action → approve → close

**Dependencies:** Phases 5, 6, 7 complete

**Deliverables:**
- Full incident lifecycle working (open → investigating → contained → resolved → closed)
- Two-person approval flow for response actions tested
- TI lookup working for IP, domain, and hash IOC types

**Testing:**
- Integration test: analyst creates incident, links alerts, adds notes → timeline has all entries
- Integration test: response action by user A cannot be approved by user A (403)
- Integration test: response action approved by user B → status = approved, audit log updated

**Completion Criteria:** Full incident workflow from alert → incident → response action → audit log works end-to-end.

---

## Phase 9: Integration Testing (Weeks 18–19)

**Tasks:**
- Write end-to-end test scenarios covering the full SENTINEL pipeline
- Write performance tests: bulk event ingestion (1000 events/min target)
- Write security tests: auth bypass attempts, SQL injection probes, role escalation attempts
- Write ML evaluation report: confusion matrix, precision/recall/F1 for all models
- Fix all integration issues found during testing
- Load test the WebSocket manager (50 concurrent connections)
- Document all known bugs and limitations
- Code review: each module reviewed by a different team member

**Dependencies:** Phases 1–8 complete

**Deliverables:**
- pytest test suite with ≥80% backend code coverage
- Security test report (all attempted bypasses blocked)
- ML evaluation report with final metrics
- Bug tracker: all P1 bugs resolved, P2 bugs documented

**Testing:**
- E2E: ingest 500 synthetic events → verify detection → alerts → incident created → AI analyzed → closed
- Security: 20+ auth/injection/IDOR probes → all blocked
- Performance: 1000 events/min sustained for 5 minutes without errors

**Completion Criteria:** All P1 bugs resolved. pytest suite passes. Security probes blocked. ML F1 ≥ 0.90.

---

## Phase 10: Deployment & Documentation (Week 20)

**Tasks:**
- Write production `docker-compose.prod.yml` with nginx reverse proxy
- Configure nginx: HTTPS (self-signed cert for demo), rate limiting, proxy headers
- Write `Dockerfile` for each service with multi-stage builds (dev/prod)
- Configure GitHub Actions CI workflow (test on every push to develop)
- Write full project documentation:
  - Architecture documentation (auto-generated from this blueprint)
  - API reference (auto-generated from FastAPI OpenAPI JSON)
  - User manual (analyst and admin guides)
  - Deployment guide
  - ML model training and evaluation guide
- Record a 10-minute demo video of the full analyst workflow
- Final code cleanup: remove debug logs, TODOs, unused imports
- Tag v1.0.0 release on GitHub

**Dependencies:** Phase 9 complete

**Deliverables:**
- Production-ready Docker Compose configuration
- Complete documentation suite
- GitHub release v1.0.0
- 10-minute demo video
- Project report (referencing this blueprint)

**Completion Criteria:** `docker-compose -f docker-compose.prod.yml up` starts a fully functional SENTINEL instance. Demo video shows complete analyst workflow.

---

# PART 12: FINAL DELIVERABLES SUMMARY

## 12.1 Testing & Evaluation Strategy

### Unit Testing

**Backend (pytest):**
- `tests/unit/test_auth.py` — JWT creation, verification, blacklisting, bcrypt
- `tests/unit/test_event_service.py` — normalization, field extraction
- `tests/unit/test_alert_service.py` — severity mapping, grouping logic
- `tests/unit/test_ml_pipeline.py` — feature extraction, model prediction output format
- `tests/unit/test_rate_limiter.py` — sliding window behavior
- Coverage target: **≥80%** using `pytest-cov`

**Frontend (React Testing Library):**
- Component tests: AlertCard, SeverityBadge, MetricCard, DataTable
- Store tests: Zustand authStore, alertStore mutations
- Hook tests: useWebSocket message handling

### Integration Testing

**Backend (pytest + httpx.AsyncClient):**
- Full auth flow: login → access protected route → logout → access returns 401
- Full event pipeline: ingest → background task fires → detection result saved → alert created
- WebSocket: connect with JWT → send ping → receive pong → receive new_alert broadcast
- Incident workflow: create → link alerts → update status → verify timeline

### ML Model Evaluation

For each model (Isolation Forest, Random Forest, XGBoost):
- **5-fold stratified cross-validation** on NSL-KDD training set
- **Held-out test set** (20% of NSL-KDD): final accuracy, precision, recall, F1, AUC-ROC
- **Confusion matrix** analysis: false positive rate must be ≤ 10% (critical for SOC usability)
- **Feature importance analysis** (Random Forest and XGBoost)
- **Ensemble evaluation**: compare ensemble vs. individual models on test set

**Acceptance Thresholds:**

| Model | Min F1 | Max FPR |
|---|---|---|
| Isolation Forest | 0.85 | 15% |
| Random Forest | 0.90 | 10% |
| XGBoost | 0.90 | 10% |
| Ensemble | 0.92 | 8% |

### Performance Testing

- **Event ingestion throughput:** 1000 events/minute sustained for 5 minutes (using `locust`)
- **API response time:** 95th percentile < 500ms for all GET endpoints
- **ML prediction latency:** 95th percentile < 200ms for single prediction
- **WebSocket concurrency:** 50 simultaneous connections without dropped messages
- **Dashboard load time:** Initial render < 3 seconds on a cold cache

### Security Testing

| Test | Method | Pass Criteria |
|---|---|---|
| SQL injection via event raw_log | UNION-based payloads in ingest body | Query executes safely, no data leaked |
| JWT forgery | Tamper with JWT payload, wrong signature | 401 Unauthorized |
| Role escalation | Analyst calls admin-only endpoint | 403 Forbidden |
| IDOR — view another user's data | Access resource owned by different user | 404 or 403 |
| Brute force login | 20 rapid login attempts | Rate limit 429 after 10 |
| Prompt injection via log content | Inject `\n\nIgnore above instructions` in raw_log | AI response unaffected |
| Auth bypass — missing token | Call protected endpoint without header | 401 Unauthorized |

### End-to-End Testing Scenarios

**Scenario 1 — Full Detection Pipeline:**
Ingest synthetic SSH brute-force log → verify ML detects as HIGH → verify alert created → verify WebSocket delivers alert to dashboard → analyst acknowledges alert.

**Scenario 2 — Full Incident Lifecycle:**
3 related HIGH alerts exist → analyst creates incident → links all 3 alerts → runs AI analysis → AI recommends isolation → analyst requests block-IP action → second analyst approves → audit log records both users → incident closed.

**Scenario 3 — False Positive Handling:**
Ingest synthetic benign log that scores as MEDIUM → analyst reviews AI explanation → marks as false positive → alert closed → audit log updated → no incident created.

---

## 12.2 Risks, Limitations & Future Scope

### Technical & Project Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | ML models have high false positive rate on novel attack types not in training data | High | High | Tune contamination parameter; allow analyst feedback loop to refine; use multiple models |
| R2 | LLM API rate limits or cost overruns during heavy demo usage | Medium | High | Implement per-analyst LLM rate limit (20 req/min); use Gemini Flash free tier; cache similar responses |
| R3 | WebSocket connection instability under concurrent load | Medium | Medium | Implement client-side reconnect with exponential backoff; test with 50 concurrent connections in Phase 9 |
| R4 | PostgreSQL performance degradation with millions of events | Medium | High | Add partial indexes (WHERE status='pending'); implement event archival after 90 days; add query caching via Redis |
| R5 | Team member unavailability during critical phases | Medium | High | Document all modules thoroughly; pair-program critical paths; no single point of knowledge failure |
| R6 | Scope creep beyond the 20-week schedule | High | High | Strict phase-gate reviews; defer V2 features (Kafka, SOAR integration) explicitly to backlog |
| R7 | LLM responses contain hallucinated threat intelligence | Medium | High | Prompt engineering requires LLM to cite only provided context; output filter rejects responses containing external URLs or references to data not in context |
| R8 | Synthetic dataset does not represent real-world traffic patterns | High | Medium | Use both NSL-KDD and CICIDS2017; clearly document dataset limitations in paper; plan real-world log collection for V2 |
| R9 | bcrypt cost factor 12 causes login latency >1 second on constrained hardware | Low | Low | Reduce to cost factor 10 if login exceeds 1s; document the tradeoff |
| R10 | Model file tampering or corruption in Docker volume | Low | High | SHA-256 integrity check at service startup; store model artifacts in read-only Docker volume |

### Known Limitations

1. **Synthetic data only:** SENTINEL's ML models are trained on NSL-KDD and CICIDS2017, which are benchmark datasets that do not fully capture real-world traffic complexity and advanced persistent threats. Real-world performance will differ.

2. **No real SOAR integration:** Response actions in SENTINEL V1 are logged and require manual human execution. There is no automated connection to firewalls, EDR platforms, or ticketing systems.

3. **Single-organization scope:** The platform is not multi-tenant. All analysts share one database. Extending to multiple organizations would require schema-level tenant isolation.

4. **LLM accuracy:** The AI SOC Assistant can produce plausible-sounding but incorrect analysis (hallucination). All AI outputs must be treated as advisory and reviewed by a qualified analyst.

5. **No network packet capture:** SENTINEL ingests log files and event records, not raw PCAP files. Deep packet inspection and protocol-level analysis are out of scope for V1.

6. **Limited threat intelligence sources:** V1 uses a local TI database manually populated plus an optional AbuseIPDB integration. Commercial TI feeds (VirusTotal Enterprise, Recorded Future, Mandiant) are not integrated.

7. **No encryption at rest:** Database and Redis contents are not encrypted at rest in the default configuration. This requires OS-level disk encryption for production deployment.

8. **Horizontal scaling not tested:** The WebSocket manager is single-process. Scaling the backend to multiple instances requires a Redis-backed WebSocket pub/sub adapter (not implemented in V1).

### Future Scope

1. **Kafka integration for V2:** Replace background tasks with a Kafka event streaming pipeline for truly scalable, fault-tolerant event ingestion at enterprise volumes.

2. **SOAR automation hooks:** Integrate with open-source SOAR platforms (TheHive, Shuffle) to automatically trigger playbook execution when a response action is approved.

3. **Deep learning models:** Replace or augment Random Forest with LSTM or Transformer-based models for sequence anomaly detection in time-series event streams.

4. **Real-time network flow analysis:** Integrate with NetFlow/IPFIX collectors to analyze network behavior patterns, not just discrete log events.

5. **Multi-tenancy:** Extend the schema with organization-level isolation for use as a commercial multi-customer SOC platform.

6. **Custom ML model upload:** Allow analysts to upload and deploy their own trained models through the admin interface without code changes.

7. **Federated threat intelligence:** Implement STIX/TAXII protocol support to consume and share structured threat intelligence with partner organizations.

8. **Analyst feedback loop for ML improvement:** Build a feedback mechanism where analyst false-positive/true-positive decisions are captured and used to periodically retrain models (active learning pipeline).

9. **Mobile SOC app:** React Native mobile application for on-call analysts to receive push notifications and triage critical alerts.

10. **Compliance reporting:** Auto-generate compliance reports in NIST CSF, ISO 27001, and SOC 2 formats from incident and audit log data.

---

## 12.3 Research Gap Addressed

SENTINEL directly addresses the research gaps identified in **Khayat et al. (2025)** in the following ways:

### Gap 1: Lack of AI/ML Integration in Practical SOC Platforms
> **Paper finding:** Most academic SOC frameworks are theoretical, with limited working implementations combining multiple ML models in a unified platform.

**SENTINEL's response:** SENTINEL implements a full, working ensemble of three distinct ML approaches — Isolation Forest (unsupervised anomaly detection), Random Forest (supervised classification), and XGBoost (gradient boosting) — in a single, deployable platform. The ensemble approach reduces the weaknesses of any single model, achieving higher F1 and lower false positive rates than individual models alone.

### Gap 2: Real-Time Detection and Response Capability
> **Paper finding:** Existing research platforms lack real-time event-to-alert pipelines with sub-second latency.

**SENTINEL's response:** SENTINEL's WebSocket-based real-time pipeline delivers alert notifications to analyst dashboards within 3 seconds of event ingestion, using FastAPI background tasks, Redis pub/sub, and WebSocket broadcasting — with no polling required.

### Gap 3: Explainability of ML Decisions for SOC Analysts
> **Paper finding:** Black-box ML detections are not actionable without explanation, reducing analyst trust and adoption.

**SENTINEL's response:** SENTINEL provides two layers of explainability: (1) model-level feature importance values and per-model confidence scores visible in the UI, and (2) an AI SOC Assistant powered by an LLM that generates natural-language explanations of why a detection was triggered, what evidence supports it, and what actions are recommended — specifically designed to bridge the gap between ML output and analyst comprehension.

### Gap 4: Incident Correlation and Context Aggregation
> **Paper finding:** Standalone alert systems do not support structured incident investigation workflows, forcing analysts to correlate manually.

**SENTINEL's response:** SENTINEL's alert correlation engine automatically groups related alerts by shared IOCs, and the incident management system provides a structured workspace for linking alerts, maintaining investigation timelines, and tracking resolution — all in one platform.

### Gap 5: LLM-Augmented Security Analysis
> **Paper finding:** The emerging use of large language models for security analysis lacks practical RAG implementations tailored to structured SOC data.

**SENTINEL's response:** SENTINEL implements a complete RAG pipeline: for every analyst question, structured context (alerts, events, detection scores, threat intelligence, similar past incidents) is retrieved from PostgreSQL and injected into a carefully engineered security-analysis prompt before calling the LLM API. This grounds the LLM's response in real, specific evidence rather than generic security knowledge.

### Gap 6: Student-Accessible SOC Platform Architecture
> **Paper finding:** No openly available, well-documented reference architecture exists for academic teams to build practical SOC platforms.

**SENTINEL's response:** This blueprint (Parts 1–2) constitutes a comprehensive, end-to-end engineering specification — from database schema to API design to ML pipeline — explicitly designed for a student development team to implement within a 20-week academic project. The modular monolith architecture, Docker Compose deployment, and phased roadmap lower the barrier to entry while producing a production-quality result.

---

*End of SENTINEL Engineering Blueprint — Part 2*

*Document Version: 1.0 | Generated: November 2024*
*Covers: Parts 5–12 (Architecture, Stack, Database, API, UI/UX, Security, Roadmap, Deliverables)*