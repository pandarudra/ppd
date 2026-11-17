# SENTINEL: REST & WebSocket API Specification

> **Document Version:** 1.0  
> **Format:** RESTful JSON (/api/v1/) + Full WebSocket Push Gateway  
> **Coverage:** 39 Endpoints + 9 Real-Time WebSocket Events with Sample Payloads

---

# PART 8: API DESIGN

## 8.1 API Design Principles

| Principle | Implementation |
|---|---|
| **RESTful conventions** | Nouns in URLs, HTTP verbs for actions (GET=read, POST=create, PUT=update, DELETE=remove) |
| **Versioning** | All routes under `/api/v1/` prefix — allows `/api/v2/` to coexist |
| **Authentication** | `Authorization: Bearer <access_token>` header required on all protected endpoints |
| **Pagination** | `?page=1&per_page=25` query params; response includes `total`, `page`, `per_page`, `pages` |
| **Filtering** | `?severity=HIGH&status=open&from=2024-01-01` for list endpoints |
| **Error format** | Consistent JSON: `{"error": "...", "detail": "...", "code": 422}` |
| **HTTP status codes** | 200 OK, 201 Created, 202 Accepted, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Validation Error, 429 Rate Limited, 500 Server Error |
| **CORS** | Restricted to frontend origin in production |

---

## 8.2 Complete API Specification

### Authentication Endpoints

#### `POST /api/v1/auth/login`
**Purpose:** Authenticate user and return JWT tokens

**Request:**
```json
{
  "email": "analyst@sentinel.local",
  "password": "SecurePass123!"
}
```
**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": 3,
    "email": "analyst@sentinel.local",
    "full_name": "Jane Smith",
    "role": "analyst"
  }
}
```
**Auth:** None

---

#### `POST /api/v1/auth/logout`
**Purpose:** Blacklist current JWT in Redis

**Request:** Empty body (token read from header)

**Response (200):**
```json
{ "message": "Logged out successfully" }
```
**Auth:** Required

---

#### `POST /api/v1/auth/refresh`
**Purpose:** Obtain a new access_token using refresh_token

**Request:**
```json
{ "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```
**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 900
}
```
**Auth:** None (refresh token validated internally)

---

#### `GET /api/v1/auth/me`
**Purpose:** Return current authenticated user profile

**Response (200):**
```json
{
  "id": 3,
  "user_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "email": "analyst@sentinel.local",
  "full_name": "Jane Smith",
  "role": "analyst",
  "is_active": true,
  "last_login": "2024-11-15T10:30:00Z"
}
```
**Auth:** Required

---

#### `PUT /api/v1/auth/change-password`
**Purpose:** Change current user's password

**Request:**
```json
{
  "current_password": "OldPass123!",
  "new_password": "NewSecurePass456!"
}
```
**Response (200):**
```json
{ "message": "Password changed successfully" }
```
**Auth:** Required

---

### Users Endpoints

#### `GET /api/v1/users`
**Purpose:** List all users (admin only)

**Query params:** `?role=analyst&is_active=true&page=1&per_page=25`

**Response (200):**
```json
{
  "users": [
    { "id": 1, "email": "admin@sentinel.local", "full_name": "Admin User", "role": "admin", "is_active": true, "created_at": "2024-01-01T00:00:00Z" }
  ],
  "total": 1, "page": 1, "per_page": 25, "pages": 1
}
```
**Auth:** Required — Admin only

---

#### `POST /api/v1/users`
**Purpose:** Create a new user

**Request:**
```json
{
  "email": "newanalyst@sentinel.local",
  "password": "TempPass123!",
  "full_name": "Bob Jones",
  "role": "analyst"
}
```
**Response (201):**
```json
{ "id": 5, "user_uuid": "...", "email": "newanalyst@sentinel.local", "role": "analyst", "created_at": "2024-11-15T12:00:00Z" }
```
**Auth:** Required — Admin only

---

#### `GET /api/v1/users/{user_id}`
**Purpose:** Get user details

**Response (200):**
```json
{ "id": 5, "user_uuid": "...", "email": "newanalyst@sentinel.local", "full_name": "Bob Jones", "role": "analyst", "is_active": true, "last_login": null }
```
**Auth:** Required — Admin or own profile

---

#### `PUT /api/v1/users/{user_id}`
**Purpose:** Update user details or status

**Request:**
```json
{ "full_name": "Robert Jones", "role": "viewer", "is_active": false }
```
**Response (200):**
```json
{ "id": 5, "full_name": "Robert Jones", "role": "viewer", "is_active": false, "updated_at": "2024-11-15T13:00:00Z" }
```
**Auth:** Required — Admin only

---

### Event Ingestion Endpoints

#### `POST /api/v1/events/ingest`
**Purpose:** Ingest a single security event

**Request:**
```json
{
  "raw_log": "Nov 15 10:23:45 firewall kernel: DROP IN=eth0 SRC=192.168.1.100 DST=10.0.0.5 PROTO=TCP DPT=22",
  "source_format": "syslog",
  "metadata": { "agent_id": "fw-01", "region": "us-east" }
}
```
**Response (202):**
```json
{
  "status": "accepted",
  "event_id": "550e8400-e29b-41d4-a716-446655440001",
  "message": "Event queued for ML processing"
}
```
**Auth:** Required — api_client, analyst, admin

---

#### `POST /api/v1/events/ingest/batch`
**Purpose:** Ingest multiple events in one call

**Request:**
```json
{
  "events": [
    { "raw_log": "...", "source_format": "json" },
    { "raw_log": "...", "source_format": "syslog" }
  ],
  "batch_id": "batch-20241115-001"
}
```
**Response (202):**
```json
{
  "status": "accepted",
  "batch_id": "batch-20241115-001",
  "accepted_count": 2,
  "rejected_count": 0,
  "event_ids": ["...", "..."]
}
```
**Auth:** Required — api_client, admin

---

#### `GET /api/v1/events/status/{event_id}`
**Purpose:** Check processing status of an ingested event

**Response (200):**
```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "processed",
  "ingested_at": "2024-11-15T10:30:00Z",
  "detection_result": {
    "prediction": "malicious",
    "confidence_score": 0.87,
    "risk_level": "HIGH"
  }
}
```
**Auth:** Required

---

### Security Events Endpoints

#### `GET /api/v1/events`
**Purpose:** List security events with filters and pagination

**Query params:** `?source_ip=192.168.1.100&event_type=ssh_login&status=processed&from=2024-11-14&to=2024-11-15&page=1&per_page=50`

**Response (200):**
```json
{
  "events": [
    {
      "id": 1001,
      "event_id": "550e8400-...",
      "source_ip": "192.168.1.100",
      "dest_ip": "10.0.0.5",
      "dest_port": 22,
      "protocol": "TCP",
      "event_type": "ssh_login_failed",
      "status": "processed",
      "ingested_at": "2024-11-15T10:30:00Z",
      "detection_summary": { "risk_level": "HIGH", "confidence_score": 0.87 }
    }
  ],
  "total": 1, "page": 1, "per_page": 50
}
```
**Auth:** Required

---

#### `GET /api/v1/events/{event_id}`
**Purpose:** Get full event details including raw log and normalized data

**Response (200):**
```json
{
  "id": 1001,
  "event_id": "550e8400-...",
  "source_ip": "192.168.1.100",
  "dest_ip": "10.0.0.5",
  "source_port": 54321,
  "dest_port": 22,
  "protocol": "TCP",
  "event_type": "ssh_login_failed",
  "raw_log": "Nov 15 10:23:45 ...",
  "normalized_data": { "auth_method": "password", "username": "root", "attempt_count": 5 },
  "event_timestamp": "2024-11-15T10:23:45Z",
  "ingested_at": "2024-11-15T10:30:00Z",
  "status": "processed"
}
```
**Auth:** Required

---

#### `GET /api/v1/events/{event_id}/detection`
**Purpose:** Get ML detection results for an event

**Response (200):**
```json
{
  "event_id": "550e8400-...",
  "model_name": "ensemble_v1",
  "prediction_label": "malicious",
  "confidence_score": 0.87,
  "risk_level": "HIGH",
  "anomaly_score": 0.72,
  "model_scores": {
    "isolation_forest": 0.72,
    "random_forest": 0.91,
    "xgboost": 0.88
  },
  "feature_values": { "failed_auth_ratio": 0.9, "port_entropy": 0.1, "connection_duration": 2.3 },
  "processed_at": "2024-11-15T10:30:05Z"
}
```
**Auth:** Required

---

#### `DELETE /api/v1/events/{event_id}`
**Purpose:** Delete a security event (admin only, respects retention policy)

**Response (200):**
```json
{ "message": "Event deleted", "event_id": "550e8400-..." }
```
**Auth:** Required — Admin only

---

### Alerts Endpoints

#### `GET /api/v1/alerts`
**Purpose:** List alerts with filters and pagination

**Query params:** `?severity=HIGH&status=open&assigned_to=me&page=1&per_page=25&sort=created_at:desc`

**Response (200):**
```json
{
  "alerts": [
    {
      "id": 201,
      "alert_id": "7f3a1b2c-...",
      "title": "Brute Force SSH Attack Detected",
      "severity": "HIGH",
      "status": "open",
      "confidence_score": 0.87,
      "source_ip": "192.168.1.100",
      "created_at": "2024-11-15T10:30:05Z",
      "assigned_to": null
    }
  ],
  "total": 1, "page": 1, "per_page": 25
}
```
**Auth:** Required

---

#### `GET /api/v1/alerts/{alert_id}`
**Purpose:** Get full alert details

**Response (200):**
```json
{
  "id": 201,
  "alert_id": "7f3a1b2c-...",
  "title": "Brute Force SSH Attack Detected",
  "description": "5 failed SSH login attempts from 192.168.1.100 to 10.0.0.5 within 60 seconds.",
  "severity": "HIGH",
  "status": "open",
  "event": { "event_id": "550e8400-...", "source_ip": "192.168.1.100", "dest_port": 22 },
  "detection": { "confidence_score": 0.87, "risk_level": "HIGH" },
  "assigned_to": null,
  "tags": ["brute-force", "ssh"],
  "created_at": "2024-11-15T10:30:05Z"
}
```
**Auth:** Required

---

#### `PUT /api/v1/alerts/{alert_id}/status`
**Purpose:** Update alert status

**Request:**
```json
{ "status": "acknowledged", "note": "Investigating source IP" }
```
**Response (200):**
```json
{ "alert_id": "7f3a1b2c-...", "status": "acknowledged", "updated_at": "2024-11-15T10:35:00Z" }
```
**Auth:** Required — Analyst, Admin

---

#### `PUT /api/v1/alerts/{alert_id}/assign`
**Purpose:** Assign alert to an analyst

**Request:**
```json
{ "assign_to_user_id": 3 }
```
**Response (200):**
```json
{ "alert_id": "7f3a1b2c-...", "assigned_to": { "id": 3, "full_name": "Jane Smith" }, "updated_at": "..." }
```
**Auth:** Required — Analyst, Admin

---

#### `POST /api/v1/alerts/{alert_id}/comment`
**Purpose:** Add an investigation comment to an alert

**Request:**
```json
{ "comment": "Source IP has 3 prior HIGH alerts in last 24h. Escalating to incident." }
```
**Response (201):**
```json
{ "comment_id": 55, "alert_id": "7f3a1b2c-...", "author": "Jane Smith", "comment": "...", "created_at": "..." }
```
**Auth:** Required

---

#### `POST /api/v1/alerts/correlate`
**Purpose:** Trigger manual alert correlation grouping

**Request:**
```json
{ "alert_ids": ["7f3a1b2c-...", "8d4b2e3f-..."], "correlation_key": "192.168.1.100" }
```
**Response (201):**
```json
{ "group_id": "9e5c3f4g-...", "title": "Alert Group: 192.168.1.100", "alert_count": 2, "severity": "HIGH" }
```
**Auth:** Required — Analyst, Admin

---

### Incidents Endpoints

#### `GET /api/v1/incidents`
**Purpose:** List incidents

**Query params:** `?status=investigating&severity=HIGH&assigned_to=me&page=1&per_page=25`

**Response (200):**
```json
{
  "incidents": [
    { "id": 15, "incident_id": "abc123-...", "title": "SSH Brute Force Campaign", "status": "investigating", "severity": "HIGH", "assigned_to": "Jane Smith", "alert_count": 3, "created_at": "..." }
  ],
  "total": 1, "page": 1, "per_page": 25
}
```
**Auth:** Required

---

#### `POST /api/v1/incidents`
**Purpose:** Create a new incident

**Request:**
```json
{
  "title": "SSH Brute Force Campaign - Internal Network",
  "description": "Multiple failed SSH logins detected from internal IP 192.168.1.100",
  "severity": "HIGH",
  "alert_ids": ["7f3a1b2c-...", "8d4b2e3f-..."]
}
```
**Response (201):**
```json
{ "incident_id": "abc123-...", "title": "SSH Brute Force Campaign - Internal Network", "status": "open", "severity": "HIGH", "created_at": "..." }
```
**Auth:** Required — Analyst, Admin

---

#### `GET /api/v1/incidents/{incident_id}`
**Purpose:** Get full incident details

**Response (200):**
```json
{
  "incident_id": "abc123-...",
  "title": "SSH Brute Force Campaign - Internal Network",
  "description": "...",
  "status": "investigating",
  "severity": "HIGH",
  "created_by": { "full_name": "Jane Smith" },
  "assigned_to": { "full_name": "Jane Smith" },
  "linked_alerts": [ { "alert_id": "7f3a1b2c-...", "title": "...", "severity": "HIGH" } ],
  "created_at": "...",
  "updated_at": "..."
}
```
**Auth:** Required

---

#### `PUT /api/v1/incidents/{incident_id}`
**Purpose:** Update incident details, status, severity, or assignment

**Request:**
```json
{ "status": "contained", "mitigation_notes": "Source host isolated from network at 11:00 UTC." }
```
**Response (200):**
```json
{ "incident_id": "abc123-...", "status": "contained", "updated_at": "..." }
```
**Auth:** Required — Analyst, Admin

---

#### `POST /api/v1/incidents/{incident_id}/alerts`
**Purpose:** Link additional alerts to an incident

**Request:**
```json
{ "alert_ids": ["9e5c7a8b-..."] }
```
**Response (200):**
```json
{ "incident_id": "abc123-...", "newly_linked": 1, "total_alerts": 3 }
```
**Auth:** Required — Analyst, Admin

---

#### `GET /api/v1/incidents/{incident_id}/timeline`
**Purpose:** Get the full investigation timeline

**Response (200):**
```json
{
  "incident_id": "abc123-...",
  "timeline": [
    { "id": 1, "action_type": "note_added", "description": "Incident created from 2 related alerts", "user": "Jane Smith", "created_at": "2024-11-15T10:35:00Z" },
    { "id": 2, "action_type": "ai_analysis", "description": "AI identified brute-force pattern. Confidence: HIGH", "user": "SENTINEL-AI", "created_at": "2024-11-15T10:36:00Z" }
  ]
}
```
**Auth:** Required

---

### AI Assistant Endpoints

#### `POST /api/v1/assistant/analyze`
**Purpose:** Ask the AI assistant a free-form security question with context

**Request:**
```json
{
  "question": "Is the activity from 192.168.1.100 indicative of a compromised insider or an external attacker?",
  "context_event_ids": ["550e8400-..."],
  "context_alert_ids": ["7f3a1b2c-..."]
}
```
**Response (200):**
```json
{
  "analysis": "Based on the evidence, this activity is most consistent with...",
  "threat_assessment": "HIGH confidence malicious actor",
  "key_indicators": ["5 failed SSH attempts in 60s", "Source IP flagged in AbuseIPDB (confidence 90)"],
  "investigation_steps": ["1. Check 192.168.1.100 endpoint logs", "2. Review Active Directory for account lockouts"],
  "recommended_actions": [{ "action": "Isolate 192.168.1.100", "safety": "NEEDS-APPROVAL" }],
  "confidence_level": "HIGH",
  "model_used": "gemini-1.5-flash"
}
```
**Auth:** Required

---

#### `POST /api/v1/assistant/explain/{alert_id}`
**Purpose:** Generate an AI explanation of a specific alert

**Request:** Empty body (alert context retrieved automatically)

**Response (200):**
```json
{
  "alert_id": "7f3a1b2c-...",
  "explanation": "This alert was triggered by repeated failed SSH authentication attempts from an internal host...",
  "severity_reasoning": "HIGH severity because: 5 attempts in 60 seconds exceeds brute-force threshold, source is an internal IP (lateral movement indicator), destination is a production server.",
  "false_positive_likelihood": "LOW (12%)",
  "next_steps": ["Check if 192.168.1.100 is a monitoring or pentest host", "Review SSH config on target"]
}
```
**Auth:** Required

---

#### `POST /api/v1/assistant/recommend/{incident_id}`
**Purpose:** Get AI-generated response recommendations for an incident

**Response (200):**
```json
{
  "incident_id": "abc123-...",
  "recommendations": [
    { "priority": 1, "action": "Network isolate 192.168.1.100", "rationale": "Active brute force source", "safety": "NEEDS-APPROVAL" },
    { "priority": 2, "action": "Reset credentials for targeted accounts", "rationale": "Possible credential compromise", "safety": "NEEDS-APPROVAL" },
    { "priority": 3, "action": "Review auth logs on 10.0.0.5 for last 48h", "rationale": "Determine if any attempt succeeded", "safety": "SAFE" }
  ],
  "containment_assessment": "Threat not yet contained. Immediate isolation recommended."
}
```
**Auth:** Required

---

### Threat Intelligence Endpoints

#### `GET /api/v1/intelligence/lookup`
**Purpose:** Look up a specific IOC value

**Query params:** `?ioc=192.168.1.100&type=IP`

**Response (200):**
```json
{
  "ioc_value": "192.168.1.100",
  "ioc_type": "IP",
  "found": true,
  "threat_type": "scanner",
  "confidence": 85,
  "source": "AbuseIPDB",
  "last_seen": "2024-11-14T22:00:00Z",
  "is_active": true
}
```
**Auth:** Required

---

#### `POST /api/v1/intelligence/enrich`
**Purpose:** Enrich a security event with threat intelligence data

**Request:**
```json
{ "event_id": "550e8400-..." }
```
**Response (200):**
```json
{
  "event_id": "550e8400-...",
  "enrichments": {
    "source_ip_intel": { "threat_type": "scanner", "confidence": 85 },
    "geo_data": { "country": "RU", "city": "Moscow", "asn": "AS12345" }
  }
}
```
**Auth:** Required

---

#### `GET /api/v1/intelligence/iocs`
**Purpose:** List all IOCs in the threat intelligence database

**Query params:** `?type=IP&is_active=true&confidence_min=70&page=1&per_page=50`

**Response (200):**
```json
{
  "iocs": [
    { "id": 1, "ioc_type": "IP", "ioc_value": "1.2.3.4", "threat_type": "C2", "confidence": 95, "source": "OTX", "last_seen": "..." }
  ],
  "total": 1
}
```
**Auth:** Required

---

#### `POST /api/v1/intelligence/iocs`
**Purpose:** Manually add an IOC to the database

**Request:**
```json
{
  "ioc_type": "IP",
  "ioc_value": "10.20.30.40",
  "threat_type": "C2",
  "confidence": 90,
  "source": "manual",
  "metadata": { "added_reason": "Identified in incident abc123" }
}
```
**Response (201):**
```json
{ "id": 55, "ioc_type": "IP", "ioc_value": "10.20.30.40", "created_at": "..." }
```
**Auth:** Required — Analyst, Admin

---

### Analytics Endpoints

#### `GET /api/v1/analytics/dashboard`
**Purpose:** Get summary KPIs for the main dashboard

**Response (200):**
```json
{
  "period": "last_24h",
  "total_events": 15420,
  "total_alerts": 47,
  "open_alerts": 23,
  "critical_alerts": 3,
  "open_incidents": 5,
  "events_per_hour": [{"hour": "10:00", "count": 1240}, ...],
  "alerts_by_severity": {"CRITICAL": 3, "HIGH": 12, "MEDIUM": 25, "LOW": 7},
  "top_source_ips": [{"ip": "192.168.1.100", "alert_count": 8}],
  "detection_accuracy": 0.94
}
```
**Auth:** Required

---

#### `GET /api/v1/analytics/trends`
**Purpose:** Get trend data over a time period

**Query params:** `?period=7d&metric=alert_volume`

**Response (200):**
```json
{
  "period": "7d",
  "metric": "alert_volume",
  "data_points": [
    {"date": "2024-11-09", "value": 12},
    {"date": "2024-11-10", "value": 8},
    {"date": "2024-11-15", "value": 47}
  ],
  "trend": "increasing",
  "change_percent": 291.7
}
```
**Auth:** Required

---

#### `GET /api/v1/analytics/model-performance`
**Purpose:** Get ML model performance metrics

**Response (200):**
```json
{
  "models": [
    {
      "model_name": "isolation_forest",
      "model_version": "1.0",
      "accuracy": 0.887,
      "precision": 0.902,
      "recall": 0.871,
      "f1_score": 0.886,
      "auc_roc": 0.941,
      "deployed_at": "2024-11-01T00:00:00Z"
    },
    {
      "model_name": "random_forest",
      "accuracy": 0.962,
      "precision": 0.971,
      "recall": 0.954,
      "f1_score": 0.962,
      "auc_roc": 0.991
    }
  ]
}
```
**Auth:** Required

---

#### `GET /api/v1/analytics/reports/generate`
**Purpose:** Generate a downloadable incident/threat summary report

**Query params:** `?type=weekly_summary&format=pdf&from=2024-11-08&to=2024-11-15`

**Response (200):** PDF binary or JSON summary depending on `format` param

**Auth:** Required — Analyst, Admin

---

### ML Models Endpoints

#### `GET /api/v1/models`
**Purpose:** List all registered ML models and their status

**Response (200):**
```json
{
  "models": [
    { "id": 1, "model_name": "isolation_forest", "model_version": "1.0", "is_active": true, "f1_score": 0.886, "deployed_at": "..." },
    { "id": 2, "model_name": "random_forest",    "model_version": "1.0", "is_active": true, "f1_score": 0.962, "deployed_at": "..." },
    { "id": 3, "model_name": "xgboost",          "model_version": "1.0", "is_active": true, "f1_score": 0.971, "deployed_at": "..." }
  ]
}
```
**Auth:** Required

---

#### `GET /api/v1/models/{model_id}/metrics`
**Purpose:** Get detailed performance metrics for a model

**Response (200):**
```json
{
  "model_id": 2,
  "model_name": "random_forest",
  "model_version": "1.0",
  "metrics": {
    "accuracy": 0.962,
    "precision": 0.971,
    "recall": 0.954,
    "f1_score": 0.962,
    "auc_roc": 0.991,
    "confusion_matrix": [[9823, 177], [446, 9554]],
    "feature_importance": [
      {"feature": "failed_auth_ratio", "importance": 0.287},
      {"feature": "port_entropy", "importance": 0.198}
    ]
  },
  "training_dataset": "NSL-KDD",
  "trained_at": "2024-11-01T00:00:00Z"
}
```
**Auth:** Required

---

#### `POST /api/v1/models/{model_id}/predict`
**Purpose:** Direct prediction endpoint (testing only)

**Request:**
```json
{
  "features": {
    "source_port": 54321,
    "dest_port": 22,
    "protocol": "TCP",
    "failed_auth_ratio": 0.9,
    "connection_duration": 2.3,
    "packet_size_avg": 64.0
  }
}
```
**Response (200):**
```json
{
  "model_id": 2,
  "prediction": "malicious",
  "confidence_score": 0.912,
  "risk_level": "HIGH"
}
```
**Auth:** Required — Admin only

---

## 8.3 WebSocket Events

The WebSocket connection is established at `ws://{host}/ws?token={access_token}` after login.

| Event Type | Direction | Payload | Trigger |
|---|---|---|---|
| `new_alert` | Server → Client | `{alert_id, title, severity, source_ip, created_at}` | Alert created by detection pipeline |
| `alert_updated` | Server → Client | `{alert_id, status, assigned_to, updated_at}` | Alert status or assignment changed |
| `new_event_processed` | Server → Client | `{event_id, risk_level, confidence_score}` | ML processing complete for an event |
| `incident_created` | Server → Client | `{incident_id, title, severity, alert_count}` | New incident opened |
| `incident_updated` | Server → Client | `{incident_id, status, updated_at}` | Incident status changed |
| `model_prediction_complete` | Server → Client | `{event_id, prediction, confidence_score}` | ML model finished prediction |
| `system_health_update` | Server → Client | `{backend: "ok", ml_service: "ok", db: "ok", timestamp}` | Periodic 30s health check broadcast |
| `ping` | Client → Server | `{}` | Keepalive |
| `pong` | Server → Client | `{"timestamp": "..."}` | Keepalive response |

---