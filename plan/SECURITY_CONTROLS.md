# SENTINEL: Security, Safety & Governance Controls

> **Document Version:** 1.0  
> **Focus:** Authentication, RBAC, Pydantic Validation, Rate Limiting, Audit Trails, AI Guardrails & Human-in-the-Loop SOAR

---

# PART 10: SECURITY & SAFETY CONTROLS

## JWT Token Lifecycle and Refresh

- **Access tokens:** 15-minute expiry, signed with HS256 and a 256-bit secret key
- **Refresh tokens:** 7-day expiry, stored in Redis with the JWT ID (`jti`) as key
- **Blacklist on logout:** `jti` added to Redis with TTL matching remaining token lifetime
- **Every request:** Middleware validates signature, expiry, and blacklist status before processing
- **Refresh flow:** Client sends refresh token to `/api/v1/auth/refresh`; old refresh token is rotated (deleted and replaced) to prevent reuse
- **Token in memory only:** Frontend stores access_token in Zustand (memory), never in localStorage. Refresh token in httpOnly, Secure, SameSite=Strict cookie

## bcrypt Password Hashing

```python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

- Cost factor 12 (≈400ms hash time) — high enough to be computationally expensive for attackers, acceptable for user login
- Salt is embedded in the hash (bcrypt standard)

## Role-Based Middleware Enforcement

Every protected endpoint uses `Depends(require_role(...))`. Role checks happen in middleware, not in business logic, ensuring no bypass is possible even if service layer code has a bug. Admin-only routes include an additional audit log entry for every access.

## Input Validation (Pydantic + Parameterized Queries)

All API request bodies are Pydantic models. Pydantic rejects:
- Unexpected fields (by default in strict mode)
- Out-of-range values (severity CHECK constraints replicated in Pydantic)
- Malformed UUIDs, IPs, email addresses

SQLAlchemy ORM never constructs raw SQL strings. All queries use parameterized bindings, eliminating SQL injection by design.

## API Rate Limiting

```python
# Redis sliding window rate limiter
async def rate_limit(user_id: str, limit: int = 100, window: int = 60):
    key = f"ratelimit:{user_id}:{int(time.time() // window)}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, window)
    if count > limit:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
```

Default limits:
- Login endpoint: 10 requests / minute (per IP)
- Event ingestion: 1000 events / minute (per api_client)
- LLM assistant: 20 requests / minute (per analyst)
- General API: 200 requests / minute (per authenticated user)

## Secrets Management

```bash
# .env (never committed to Git — in .gitignore)
SECRET_KEY=<256-bit random hex>
DATABASE_URL=postgresql://...
LLM_PROVIDER=nvidia # or gemini
NVIDIA_API_KEY=nvapi-... # From build.nvidia.com (free API endpoints)
GEMINI_API_KEY=AIza... # From Google AI Studio (free API key)

# docker-compose.yml uses env_file, not hardcoded values
# Production: use Docker Secrets or environment variable injection from CI/CD
```

## Audit Logging for All State Changes

The `AuditMiddleware` intercepts all mutating requests (POST, PUT, DELETE) and logs:
- User identity (from JWT)
- Action name
- Resource type and ID
- Request IP address
- Before-state and after-state JSON snapshots
- Success/failure flag and error message

The `audit_logs` table has INSERT-only grants in production. No application code (and no user, including admins) can UPDATE or DELETE audit log records.

## Data Retention Policies

| Data Type | Default Retention | Justification |
|---|---|---|
| Raw security events | 90 days | Storage cost management |
| Detection results | 90 days | Linked to events |
| Alerts | 365 days | Needed for trend analysis |
| Incident records | 3 years | Regulatory and forensic requirements |
| Audit logs | 3 years (immutable) | Compliance |
| ML model artifacts | Indefinite | Model versioning and rollback |

## LLM Prompt Injection Protection

1. **System prompt hardening:** The system prompt is prepended unconditionally and cannot be overridden by user input
2. **Context sanitization:** Retrieved context is JSON-encoded before injection, preventing nested prompt injection via malicious log content
3. **Input length limit:** User questions capped at 2000 characters
4. **Output filtering:** LLM responses are scanned for shell command patterns (regex: `rm -rf`, `eval(`, `exec(`, `os.system`) before being returned to the analyst
5. **No tool use:** The LLM API is called in text-completion mode only — no function calling, no tool access

## LLM Access Restrictions

- SENTINEL-AI has NO ability to execute system commands, scripts, or shell operations
- SENTINEL-AI has NO direct database write access — it only reads context retrieved by `assistant_service.py`
- SENTINEL-AI has NO access to external URLs or APIs — all context is retrieved internally
- All LLM recommendations are advisory — they populate a "Recommendations" UI panel but cannot trigger any system action without an analyst clicking and approving

## Dataset and Model Integrity Checks

```python
# On ML service startup
def verify_model_integrity():
    for model_name, expected_hash in MODEL_SHA256_HASHES.items():
        actual_hash = sha256_file(f"models/{model_name}.joblib")
        if actual_hash != expected_hash:
            raise RuntimeError(f"Model integrity check failed: {model_name}")
```

SHA-256 hashes of all model artifacts are stored at training time and verified at every startup.

## Human-in-the-Loop for All Response Actions

No response action (block IP, isolate host, reset credentials) is ever executed automatically. Every action must:
1. Be **requested** by an analyst (creates `response_actions` record with `status=pending`)
2. Be **approved** by a second analyst or admin (requires a different user than requester)
3. Be **executed manually** by the approving analyst (or via an automation stub they confirm)
4. Be **audit-logged** with both requester and approver identities

This two-person rule is enforced at the API level: `requested_by` and `approved_by` must be different user IDs.

## Safe Testing Using Synthetic Logs Only

The development and testing environments use synthetic log datasets (NSL-KDD, CICIDS2017, and locally generated fake logs via `scripts/generate_synthetic_logs.py`). No real production logs, real customer data, or live network captures are used in development. All test datasets are stored in `tests/data/synthetic/` and explicitly excluded from production Docker images.

---