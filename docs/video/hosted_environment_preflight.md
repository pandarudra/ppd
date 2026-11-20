# Hosted environment preflight: Sentinel video walkthrough

**Status: inspection only. Nothing was executed against the hosted services.** This turn I read source files and local configuration, and ran only `pg_dump --version` and `psql --version`. I made no HTTP request, no database or Redis connection, no login, no simulation, no Gemini call, no backup, and no configuration change. No secret value is printed here (host names and the Supabase project reference are included because you asked for them).

Phases proposed: **A** authenticated read-only walkthrough, **B** limited simulator traffic plus exactly one demo incident, **C** exactly one Gemini Assistant request. Each needs its own separate approval.

---

## 1. Environment verification

| Item | Finding |
|---|---|
| Database | PostgreSQL on **Supabase**. Host `db.rwprwoyrzvayjvtynmnt.supabase.co`, port 5432, database `postgres`. **Project reference: `rwprwoyrzvayjvtynmnt`.** Direct connection (not the pooler). The connection user is not printed, so I can't say whether it is the superuser role `postgres`. |
| Redis | **Upstash**, TLS (`rediss://`). Host `set-jawfish-205399.upstash.io`, port 6379. Database identity = that host (Upstash has one endpoint per database). The credentials are a user plus password, both set. |
| Backend `.env` (git-ignored) | `DATABASE_URL` and `REDIS_URL` as above; `SECRET_KEY` set (49 chars, not the default placeholder); `ACCESS_TOKEN_EXPIRE_MINUTES=15`; `REFRESH_TOKEN_EXPIRE_DAYS=7`; `ML_SERVICE_URL=http://localhost:8001`; `FRONTEND_ORIGIN=http://localhost:5173`; `LLM_PROVIDER=gemini`, `GEMINI_MODEL=gemini-2.5-flash`; `GEMINI_API_KEY` and `NVIDIA_API_KEY` both set (values not read into the report). |
| Frontend `.env` | API `http://localhost:8000`, WebSocket `ws://localhost:8000`, default "your network" location 20.30, 85.82 ("Bhubaneswar, Odisha"). Nothing hosted. |
| ML service `.env` | `MODEL_DIR=./models` only. No external services. |
| Other env files | `backend/.env.test.local` points at a **local** Postgres (5433) and Redis (6380), but **nothing in the repo loads that file** (see risk R3). `docker-compose.yml` and `.env.example` describe a local Postgres 16 and Redis 7. |
| Production or shared services referenced | **None found.** No hostname in any file looks like a production system, and the only external endpoints are Supabase, Upstash, Google (Gemini) and NVIDIA (only if `LLM_PROVIDER=nvidia`). |
| **Is it "isolated development"?** | **I cannot verify it from the code.** Nothing labels the Supabase project or the Upstash database as dev, and nothing proves no other application or person uses them. `final project.md` calls the hosted stores the team's development setup and says the `.env` files hold live credentials. **You need to attest this** (see R1). |

---

## 2. Authentication side effects

Everything below is from `auth_service.py`, `routers/auth.py`, `dependencies.py`, `rate_limiter.py`, `audit_middleware.py`, `audit_service.py`.

| Operation | Database | Redis | Audit | Notes |
|---|---|---|---|---|
| **Login success** (`POST /auth/login`) | SELECT users by email; **UPDATE users** (`failed_attempts=0`, `locked_until=NULL`, `last_login=now`) | **SET `refresh:{user_id}`** = new refresh jti, TTL 7 days. **One key per user, so it overwrites that user's previous refresh token.** Plus rate-limit `INCR`/`EXPIRE` | **INSERT audit_logs** (after the response). Stores the request body (password redacted), the response (tokens redacted, but the **user object with email, name, role is kept**), IP, user agent. | No server-side session table exists; "session" = the JWT pair. |
| Login failure | UPDATE users (`failed_attempts+1`; **lock for 15 min at 5 failures**) | rate-limit keys | audit row with `success=false` | A typo storm would lock the seeded analyst. Limit: 10 logins per minute per IP. |
| Every authenticated request | SELECT users by id (cached 30 s per process for GETs) | **GET `blacklist:{jti}`**; rate-limit `INCR`+`EXPIRE` on `ratelimit:{path}:{user}:{minute}` | none for GET | Default rate limit 200 per minute per path per user. |
| Token refresh (`POST /auth/refresh`, automatic on a 401) | SELECT users | GET then **SET `refresh:{user_id}`** (rotation) | audit row (refresh token redacted) | Happens after the 15-minute access token expires. |
| Logout (`POST /auth/logout`) | none | **SET `blacklist:{jti}`** until the access token expires | audit row | **Does NOT delete `refresh:{user_id}`, so the refresh token stays valid until it expires (7 days) or is replaced by a new login** (R6). |
| WebSocket `/ws?token=…` | SELECT users | GET `blacklist:{jti}` | none | The token is in the URL query string, so it appears in uvicorn's local access log. |

**Minimum for one analyst login:** exactly one `POST /auth/login` as `analyst@sentinel.local`. Its footprint: 1 users-row UPDATE, 1 audit_logs INSERT, 1 Redis `refresh:` SET, 2 rate-limit commands. Do not call logout, because it adds a blacklist key and another audit row and does not revoke the refresh token anyway. Then reuse the saved session for all scenes.

**Planned recorder behaviour to fix before Phase A:** the plan as written logs in once for `--auth-setup`, and scene `02-login` logs in again. That is **two logins, and the second overwrites the refresh key the first created**. Minimum = one login: either skip scene 02, or record scene 02 as the only login and save the session from that same context.

I should disclose that **I already logged in twice as the analyst through the API** earlier in this session (counts and model checks), before this framework existed. Each wrote one `last_login` update, one audit row and one Redis refresh key, and the second replaced the first's refresh key.

---

## 3. Phase A: API and side-effect matrix

Per page, from the frontend source. All Phase A traffic is `GET` except one login. "Redis" below always includes the per-request `blacklist` GET and rate-limit `INCR`/`EXPIRE` from section 2.

| Page (route) | API endpoints called | Tables read | Writes or background jobs | External request? |
|---|---|---|---|---|
| Landing `/` | none | none | none | **No** (verified: only localhost contacted) |
| Login `/login` | `POST /auth/login` | users | users UPDATE, audit INSERT, Redis refresh key (section 2) | No |
| Overview `/dashboard` | `GET /analytics/dashboard`, `/analytics/geo`, `/analytics/trends`, `/alerts` (live feed), `/api/v1/system/health`, WebSocket | alerts, incidents, security_events, detection_results, users | **Redis SET `cache:dashboard`** (30 s TTL) on a cache miss; health check pings the ML service, runs `SELECT 1`, and Redis `PING` | **ML service on localhost only.** The browser's `ipwho.is` lookup is suppressed by the recorder's init script (without it, this page would send the public IP to a third party). |
| Live stream `/live` | WebSocket only (no REST) | users (at WS connect) | none | No |
| Alerts `/alerts` (+ drawer) | `GET /alerts`, `GET /alerts/{id}` | alerts, security_events, detection_results, users | none (the **Explain with AI**, status, comment and Open incident buttons are writes or LLM calls and are not used in Phase A) | No |
| Attack paths `/attack-paths` | `GET /analytics/attack-paths` (auto-refreshes every 20 s) | alerts, security_events | none | No |
| Incidents `/incidents` | `GET /incidents`, `GET /incidents/{id}`, `GET /incidents/{id}/timeline` | incidents, incident_alerts, alerts, security_events, investigation_history, users | none | No. **Empty today** (0 incidents), so Phase A shows an empty list unless Phase B runs. |
| Threat intel `/intelligence` | `GET /intelligence/iocs`, `GET /intelligence/lookup` | threat_intelligence | none (lookup does not update `last_seen`) | No |
| Models `/models` | `GET /analytics/models` | none (the backend calls the ML service) | none | **ML service on localhost** only |
| Assistant `/assistant` (view only) | none on load | none | none | **No.** Loading the page does not call Gemini (see section 5). |

**Cross-cutting Phase A facts:**
- **Database writes during Phase A: only the login's users UPDATE and audit INSERT.** No GET writes to the database.
- **Redis writes: per-request rate-limit keys (60 s TTL), the refresh key, and the dashboard cache key.**
- **Rough Redis command volume:** each request is about 3 commands. A page load makes roughly 5 to 10 requests, so about 15 to 30 commands per page, and the full 9-page Phase A is on the order of 300 to 500 commands. Check your Upstash plan's daily command limit against this estimate; I could not read your plan.
- **Always-on background load already running, independent of the recorder:** the backend broadcasts a health snapshot every 30 s (one `SELECT 1` plus one Redis `PING`).

---

## 4. Phase B: write-operation matrix

### 4.1 Simulator (`backend/scripts/simulate_attacks.py` via `scripts/run_simulation.sh`)

| Question | Answer |
|---|---|
| Events for the proposed run (`phishing` + `campaign`) | phishing: 4 scenario events + 2 benign noise = **6**. campaign: 4+6+(3+2)+2 = 17 scenario events + 4 stages × 2 noise = **25**. **Total 31 `POST /events/ingest`.** Plus 1 login per simulator run, plus 1 more only if the 15-minute token expires. |
| Pace | 0.6 s between events by default, so about 20 to 25 s per run. Rate limit on ingest is 1,000 per minute. |
| **Hazards to avoid** | `scripts/run_simulation.sh` with **no arguments runs `all`** (roughly 125 to 135 events). **`--loop` never stops** (repeats every 5 s). `--repeat N` multiplies everything. Use explicit scenario names only. |
| Tables written per event | `security_events` INSERT (+2 status UPDATEs: processing then processed), `detection_results` INSERT, **`alerts` INSERT if risk is MEDIUM or above**, `alert_groups` INSERT/UPDATE and `alerts.alert_group_id` UPDATE (correlation), `audit_logs` INSERT (every `POST` is audited, including the raw log in `before_state`). |
| Upper bound of rows created | 31 security_events, 31 detection_results, at most 31 alerts (21 attack events, plus up to 10 benign events if they are flagged; an earlier measurement found about 25% of benign traffic flagged MEDIUM), a handful of alert_groups, and 32 audit_logs (31 ingests + 1 login). **About 130 rows in total.** |
| Queues | **None.** There is no Redis queue or worker. Scoring runs in FastAPI background tasks inside the backend process. Redis only gets rate-limit keys. The ML service (localhost:8001) is called once per event. |
| Alert creation | MEDIUM, HIGH or CRITICAL becomes an alert. A rule layer may raise risk (never lower it). |
| **Indirect changes to existing records** | **Yes: (1)** correlation attaches **all open alerts with the same source IP created in the last 10 minutes** to the new alert's group, which UPDATEs those existing alert rows (`alert_group_id`) and the group's `alert_count`. Only alerts newer than 10 minutes are affected, but the simulator's attacker IPs come from a fixed list of 12 and are reused across runs, so a run within 10 minutes of an earlier run can touch earlier alerts. **(2)** the login UPDATEs the logging-in user's row. **(3)** Nothing else. |
| **Simulator account** | The simulator logs in as `analyst@sentinel.local` by default, the same account the recorder uses. **Its login overwrites the analyst's Redis refresh key and invalidates the recorder's saved refresh token** (R5). `--email admin@sentinel.local` avoids that (ingest allows admin). |

### 4.2 Incident creation and transitions

| Question | Answer |
|---|---|
| Creation logic | `POST /incidents` creates one `incidents` row (UUID `incident_id`, status `open`), one `incident_alerts` row per linked alert, and one `investigation_history` row ("Incident created from N linked alert(s)"), plus one audit row and a WebSocket broadcast. **It does not modify the alert** (its status stays `open`). |
| Unique identification | Yes: the response carries the incident's UUID `incident_id`, and `created_by`, `created_at` and the title ("Incident: <alert title>") are recorded. Compare the incidents count before and after (baseline: 0 at last observation). |
| Retries and duplicates | **No idempotency.** There is no unique constraint on title, creator or alert (the only constraint is `(incident_id, alert_id)`, which does not stop one alert in two incidents). Two `POST`s make two incidents. The UI disables the button only after success; React Query does not auto-retry mutations; the axios 401 retry fires before the handler runs, so it does not duplicate. **Residual risk:** a timeout or error after the server committed, then a second click or a recorder re-run. The recorder's `once` guard checks only a local manifest file, not the database. |
| Status transitions | `PUT /incidents/{id}` accepts **any string** (no state machine, no enum on the server; only the UI's dropdown limits it to open, investigating, contained, resolved, closed, reopened). Effects: UPDATE incident, `updated_at`; `closed_at` set for resolved or closed and **never cleared on reopen**; history row only if the status actually changed; audit row with before and after state. |
| Response proposal and approval | Backend only (`POST .../response-actions`, `PUT .../response-actions/{id}`; approval refuses the requester as approver). **No UI screens**, so demonstrating them needs a second authenticated actor and direct API calls: more auth operations and more writes. Not in the proposed scope. |

---

## 5. Phase C: Gemini request and cost-risk assessment

| Question | Answer |
|---|---|
| Provider and model | `LLM_PROVIDER=gemini`, `GEMINI_MODEL=gemini-2.5-flash`. Key set; billing tier and quota unknown to me. |
| Exact endpoint and code | `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, key in the `x-goog-api-key` header, 60 s timeout (`llm/llm_client.py::_call_gemini`). |
| Routes that call it | `POST /assistant/analyze` (Assistant page and event drawer), `POST /assistant/explain/{alert_id}` ("Explain with AI"), `POST /assistant/recommend/{incident_id}` (incident "recommend"). **Each request makes exactly one Gemini call.** |
| Prompt and data sent | A fixed system prompt plus JSON context: pinned alert (title, severity, status), detection (label, confidence, risk, model scores), event (source and destination IP, type, normalised fields), threat-intel matches, up to 3 same-severity incidents, **and, when nothing is pinned, the 15 most recent alerts** (title, severity, status, source IP, destination IP and port, timestamp). The analyst question is capped at 2,000 characters. Estimated size: roughly 1,000 to 1,500 input tokens for "Summarize recent alerts". |
| Retries | **None in the code** (one attempt). Any HTTP, key or parse error is swallowed and the endpoint returns **HTTP 200 with an `[OFFLINE MODE]` text**, so a failed call (for example a 429) looks like success to the UI and a naive retry by a person would send a second request. |
| Logging | The code does not log prompts or responses. On failure it logs a warning with the exception and traceback (the key is in a header, not the URL). **But `AuditMiddleware` stores the full request body and the full response (including the model's whole answer) in `audit_logs.before_state` / `after_state` in the hosted database**, so Gemini output persists in Supabase. |
| Does page loading trigger Gemini? | **No.** Calls happen only on a mutation: pressing Send, pressing Enter, clicking one of the Assistant's **suggestion chips (each chip sends immediately)**, "Explain with AI", or "Recommend". |
| Can one request be enforced? | **Not by the application.** The only server limit is 20 requests per minute on `/assistant/`. **Enforcement is possible at the browser**: a Playwright route handler on `**/api/v1/assistant/**` that counts requests, lets the first through and aborts any other, with all other scenes' routes blocked from calling it. It has not been built; I would propose it. |
| **Cost and risk** | **Cost:** one request is a small fraction of a cent on a paid tier at current Flash prices, or one request of free-tier quota (verify current pricing and your tier). `gemini-2.5-flash` also spends "thinking" tokens, billed as output, and no `maxOutputTokens` is set, so output length is unbounded by the code (one request, so bounded in practice). **Risks:** (1) the 15 recent alerts, including IPs, go to Google (all current data looks simulated, which I can't confirm); (2) the answer is stored in `audit_logs`; (3) an unnoticed failure returns 200, so tooling may "retry"; (4) the model output can differ from run to run, so the scene's timing is variable (up to the 60 s timeout). |

---

## 6. Redis operation matrix

There are **no queues, workers or pub/sub**. The WebSocket manager is in-process. All Redis use is the six patterns below.

| Key pattern | Operation | When | Needed for the demo? |
|---|---|---|---|
| `ratelimit:{path}:{ip-or-user:id}:{minute}` | `INCR` + `EXPIRE 60` | every request | Automatic. Cannot be skipped. |
| `blacklist:{jti}` | `GET` every authenticated request; `SET … EX` at logout | auth | GET automatic; the SET only if you log out (not recommended). |
| `refresh:{user_id}` | `SET … EX 7d` at login and refresh; `GET` at refresh | auth | Automatic. **One key per user.** |
| `cache:dashboard` | `GET`, `SET EX 30` | Overview page | Automatic. |
| (health) | `PING` | every 30 s, plus each WebSocket connect | Automatic. |

**Must remain prohibited:**
- `FLUSHDB` / `FLUSHALL`. **`backend/tests/conftest.py` runs `flushdb()` against `settings.REDIS_URL` in an autouse fixture, which today is your Upstash database. Never run `pytest` in `backend/` with the current `.env`** (it would also `create_all` on the hosted Postgres).
- `KEYS *`, or any scan-and-delete pattern.
- `DEL` or `UNLINK` on `refresh:*` or `blacklist:*` (revokes or un-revokes sessions). The one possible exception is deleting the single `refresh:{analyst_id}` key after Phase A, and only with separate approval.
- Manual `SET` of auth keys, `CONFIG`, `SELECT` of another logical database, deleting or resetting the Upstash database in its console.

---

## 7. Backup and recovery (nothing created or restored)

| Option | What it is | Notes |
|---|---|---|
| Supabase dashboard backups | Database → Backups | Availability depends on your plan; I could not check it. |
| `pg_dump` over the direct connection | Local `pg_dump` is **16.15**. **The Supabase server's major version is unknown; `pg_dump` refuses to dump a newer server**, so this may fail (R9). | Needs the connection credentials. Best as a data-only or table-limited dump. |
| Table snapshots (CSV via `psql`) | Counts and key columns only | Smallest; enough to prove what changed. |
| Redis | **No backup needed.** Every key is ephemeral or re-creatable (log in again). | |

**Sensitive data a backup contains:** `users` (emails, bcrypt password hashes), `audit_logs` (request and response bodies, including login responses with user details and, after Phase C, the full AI answer), `security_events` (raw logs). **Storage requirements:** outside the repository and outside any synced folder, file mode 600, ideally encrypted, with a deletion date. Free disk is 3.3 GB, enough for this small database (254 events as last seen).

**Recovery implications:** a **full restore would overwrite everything**, including rows other people or tools wrote since the dump, and Supabase's own schemas, so it is not the right tool here. The right recovery is **targeted deletion of exactly the rows this demo created**, identified by UUID or `created_at >= T0` (events, detections, alerts, groups, incident and its links and history; audit rows are normally kept). That is only safe with a **baseline snapshot of the existing rows that correlation might modify** (`alerts.id`, `alert_group_id`, `status`, `updated_at`), because those indirect changes cannot be undone from counts alone. Any deletion needs its own approval and must run inside a transaction with explicit foreign-key order. Verify cascade rules in the migration before relying on them.

---

## 8. Baseline database-count checklist (to capture before any execution)

Run read-only, record the output, and keep it with the dated plan. All 13 tables: `users`, `roles`, `security_events`, `detection_results`, `alerts`, `alert_groups`, `incidents`, `incident_alerts`, `investigation_history`, `response_actions`, `threat_intelligence`, `audit_logs`, `ml_models`.

| # | Check | What to record |
|---|---|---|
| 1 | `SELECT count(*)` for each table above | 13 counts. Last seen through the API earlier: events 254, alerts 189 (all open, 26 critical), incidents 0, indicators 5. |
| 2 | `SELECT max(created_at), count(*) FILTER (WHERE status='open') FROM alerts` | Newest alert time, to know whether the 10-minute correlation window overlaps any real alert. |
| 3 | `SELECT id, alert_group_id, status, updated_at FROM alerts` exported to CSV | The baseline needed to detect indirect changes. |
| 4 | `SELECT id, email, role, is_active, failed_attempts, locked_until, last_login FROM users` | Confirms the two seeded accounts and their lock state before login. |
| 5 | `SELECT count(*), max(timestamp) FROM audit_logs` | Audit baseline. |
| 6 | `SELECT count(*) FROM alert_groups` and `SELECT alert_group_id, count(*) FROM alerts GROUP BY 1` | Group baseline. |
| 7 | Server version: `SHOW server_version;` | Decides whether `pg_dump` 16 works (R9). |
| 8 | Redis: `DBSIZE`, and a non-destructive `SCAN 0 MATCH refresh:* COUNT 100` | Which refresh keys exist before login. |
| 9 | Upstash and Supabase plan, quota and pause settings | Confirms the demo fits the limits. |

---

## 9. Proposed stop and recovery procedure

**Stop (in order, whenever something looks wrong):**
1. **Ctrl-C the recorder.** It has a SIGINT handler that closes the browser.
2. **Ctrl-C the simulator.** Events already posted are kept, and queued background tasks finish in a few seconds. To stop processing sooner, stop the ML service: events then end as `failed` and **create no alerts**. That is a safe brake, but it does write `failed` statuses.
3. **Do not log out as a "cleanup".** Instead delete `.auth/state.json` (it holds tokens). The refresh token stays valid for 7 days unless replaced by another login, so remove the file first, then decide separately about replacing or deleting `refresh:{analyst_id}`.
4. Stop sending Assistant traffic. The recorder cannot be told to cancel an in-flight Gemini request, so allow up to 60 s.

**Recover (each step needs its own approval):**
1. Compare the post-run counts and the `alerts` CSV against the baseline.
2. List the created rows by UUID and time window (the incident's UUID is in the recorder manifest and the API response).
3. If removal is wanted: delete in a transaction, children first (history, response actions, incident links, incident, then alerts, alert groups, detections, events), with explicit `WHERE` clauses and a row-count check before commit. Revert any changed `alert_group_id` values from the CSV.
4. Leave audit rows in place, or delete them only on request.
5. Remove the saved session file and the Phase C answer if you do not want it kept.

---

## 10. Unresolved risks

| # | Risk | Severity | Needed from you |
|---|---|---|---|
| R1 | Nothing proves the Supabase project and Upstash database are isolated dev instances | **High** | A written confirmation (project name, who else uses it), or a decision to use a local Postgres and Redis instead |
| R2 | The DB role in `DATABASE_URL` may be the `postgres` superuser | Medium | Whether a read-limited role exists |
| R3 | `pytest` in `backend/` would `flushdb` the Upstash database and `create_all` on Supabase; `.env.test.local` is not loaded by anything | **High** | Agreement that no test run happens with this `.env` |
| R4 | `scripts/run_backend.sh` runs `alembic upgrade head` (and `--seed` if passed) against the hosted database on every start; it is already running | Medium | None, but do not restart casually |
| R5 | The simulator's default login (analyst) overwrites the analyst's refresh key and breaks the recorder's saved session | Medium | Use `--email admin@sentinel.local` for the simulator, or run it first |
| R6 | Logout does not revoke the refresh token (valid 7 days); the saved session file holds it | Medium | Delete `.auth/state.json` after use |
| R7 | The audit log keeps login user details, ingest raw logs, and Gemini answers in the hosted database | Medium | Whether that retention is acceptable |
| R8 | Incident creation is not idempotent, and the recorder's `once` guard checks only a local file | Medium | Pre- and post-checks against the incident count (baseline 0) |
| R9 | `pg_dump` 16 may not match the server version | Low | Run `SHOW server_version;` first |
| R10 | Correlation can UPDATE older open alerts from the same IP within 10 minutes | Medium | Capture the `alerts` baseline CSV (check 3) and avoid back-to-back runs |
| R11 | Bare `run_simulation.sh` runs `all`; `--loop` is unbounded | Medium | Use only explicit scenario names |
| R12 | Gemini: tier and quota unknown, no output cap, failures look like successes, and "exactly one" is not enforceable server-side | Medium | A browser-level route guard (not built) and your quota confirmation |
| R13 | The 15 recent alerts sent to Google may include real data if the database holds any | Medium | Confirmation that all alerts are simulated |
| R14 | The incident response-action and approval flow has no UI | Low | Decide whether to drop it from the video or authorise API calls with a second actor |
| R15 | Upstash and Supabase plan limits (daily Redis commands, free-tier pausing) are unknown | Low | Plan details |
| R16 | The WebSocket token appears in the local uvicorn access log | Low | None |
| R17 | Two logins were already made through the API earlier in this session (last-login update, audit rows, refresh key) | Info | Disclosed |
| R18 | I did not confirm whether the frontend calls `/auth/me` at startup | Info | Will confirm at runtime in Phase A |

**No execution phase will start until you approve each phase separately.**
