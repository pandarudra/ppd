# SENTINEL: UI/UX Design System & Application Wireframes

> **Document Version:** 1.0  
> **Design Theme:** Dark Cybersecurity Palette (Slate-900 / Slate-800) with Severity Color-Coding  
> **Workspaces:** 12 Core Operational SOC Views

---

# PART 9: UI/UX DESIGN

## 9.1 Design System

### Color Palette (Dark Theme)

| Token | Tailwind Class | Hex | Use |
|---|---|---|---|
| Background | `bg-slate-900` | #0F172A | Page background |
| Surface | `bg-slate-800` | #1E293B | Cards, panels |
| Surface Elevated | `bg-slate-700` | #334155 | Modals, drawers |
| Border | `border-slate-600` | #475569 | Card borders |
| Text Primary | `text-slate-100` | #F1F5F9 | Headings |
| Text Secondary | `text-slate-400` | #94A3B8 | Subtitles, labels |
| Text Muted | `text-slate-500` | #64748B | Timestamps, metadata |
| Accent Blue | `text-blue-400` | #60A5FA | Links, active states |
| CRITICAL | `bg-red-600` | #DC2626 | Critical severity |
| HIGH | `bg-orange-500` | #F97316 | High severity |
| MEDIUM | `bg-yellow-500` | #EAB308 | Medium severity |
| LOW | `bg-green-500` | #22C55E | Low severity |
| INFO | `bg-blue-500` | #3B82F6 | Informational |
| Resolved | `bg-slate-500` | #64748B | Closed/resolved |

### Typography

```
Headings:    font-sans font-bold   (Inter or system-ui)
Body:        font-sans font-normal text-sm
Code/Logs:   font-mono text-xs    (JetBrains Mono or Fira Code)
Alert titles: font-semibold text-base
```

### Core Component Patterns

- **SeverityBadge** — Pill badge with severity color and uppercase label
- **StatusBadge** — Outline pill with status text
- **AlertCard** — Compact card with severity stripe, title, source IP, timestamp, assignment
- **DataTable** — Full-width table with sortable columns, row click to open detail drawer
- **DetailDrawer** — Slide-in right panel (480px wide) for detail views without navigation
- **ConfirmModal** — Two-step confirmation modal for destructive or high-risk actions
- **MetricCard** — KPI card with large number, label, trend indicator, icon
- **TimelineFeed** — Vertical timeline with colored dot, action label, user avatar, timestamp

---

## 9.2 Application Pages

### Page 1: Login Page

**Layout:** Centered card on a full-screen `bg-slate-900` background with subtle grid pattern.

**Components:**
- SENTINEL logo + tagline ("AI-Powered Security Operations Center")
- Email input with envelope icon
- Password input with eye toggle (show/hide)
- Login button (full-width, blue gradient)
- Error toast for invalid credentials

**Interactions:**
- Form validation on submit (required fields, email format)
- Failed attempts counter — after 5 failures, show 15-minute lockout message
- Loading spinner while `POST /api/v1/auth/login` is in flight
- On success: store token in Zustand authStore, redirect to `/dashboard`

---

### Page 2: SOC Overview Dashboard

**Layout:** 4-column grid. Sidebar (collapsed on mobile).

**Sections:**
- **KPI Bar (top):** 4 MetricCards — Total Events (24h), Open Alerts, Critical Alerts, Open Incidents — each with colored trend arrow
- **Alert Severity Chart:** Recharts BarChart — alert count by severity for last 7 days
- **Event Volume Chart:** Recharts AreaChart — events per hour for last 24 hours
- **Live Alert Feed:** Scrollable list of last 20 alerts with severity badge, title, source IP, time-ago. New alerts prepended via WebSocket `new_alert` event with a brief highlight animation
- **Model Performance Gauges:** 3 circular progress indicators — IF accuracy, RF accuracy, XGB accuracy
- **System Health:** Small status pills (green/red) — Backend, ML Service, Database, Redis

**Real-Time:** WebSocket `new_alert` → Zustand alertStore → React re-render of Live Alert Feed. `system_health_update` → Health pills.

---

### Page 3: Security Events Explorer

**Layout:** Full-width table with filter bar above.

**Filter Bar:**
- Source IP text input
- Destination Port number input
- Event Type dropdown (from unique event_type values)
- Status multi-select (pending, processed, failed)
- Date range picker (from / to)
- Clear Filters button

**Table Columns:** # | Event ID (truncated UUID) | Source IP | Dest IP | Port | Protocol | Event Type | Status | Risk Level | Ingested At | Actions

**Row Click:** Opens DetailDrawer (right panel) with:
- Full raw log (monospace, scrollable)
- Normalized data as formatted JSON viewer
- ML detection scores panel (confidence bars per model)
- Threat intelligence match indicator

**Pagination:** Page controls at bottom, per-page selector (25, 50, 100)

---

### Page 4: Threat Detection Page

**Layout:** Two-column. Left: event list. Right: detection detail panel.

**Left Panel:** Filtered list of events with risk level HIGH or CRITICAL. Each row shows source IP, event type, risk level, ensemble score.

**Right Panel (on row select):**
- **Model Scores Section:** 3 horizontal progress bars — Isolation Forest, Random Forest, XGBoost — each with score value
- **Ensemble Score:** Large circular gauge (Recharts RadialBarChart)
- **Feature Importance:** Horizontal BarChart of top 10 features with their values
- **Threat Classification:** Text badge — Normal / Anomaly / Malicious
- "Create Alert" button (if no alert exists yet)

---

### Page 5: Alerts Management

**Layout:** Full-width table with filter sidebar (collapsible).

**Filter Sidebar:**
- Severity checkboxes (CRITICAL, HIGH, MEDIUM, LOW, INFO)
- Status checkboxes (open, acknowledged, in_progress, resolved, false_positive)
- Assigned To dropdown (all analysts)
- Date range

**Alert Queue Table Columns:** Severity | Alert Title | Source IP | Confidence | Status | Assigned To | Age | Actions

**Row Actions (dropdown):** Acknowledge, Assign, Mark False Positive, Open in Detail

**Detail View (drawer):**
- Alert metadata and description
- Linked event summary
- ML score summary
- Assignment dropdown
- Status change buttons
- Comment thread
- "Link to Incident" button (opens incident selector modal)
- "Get AI Explanation" button → calls `POST /api/v1/assistant/explain/{alert_id}`

**Grouping Toggle:** Switch between ungrouped and grouped-by-alert_group views.

---

### Page 6: Incident Investigation Workspace

**Layout:** 3-panel layout: Incident List (left sidebar) | Investigation Workspace (center) | Context Panel (right).

**Left Sidebar:** Scrollable list of open incidents grouped by severity. Click to load in center.

**Center Workspace:**
- Incident header: title, severity badge, status badge, assigned analyst, timestamps
- **Linked Alerts Tab:** Table of all linked alerts with individual detail links
- **Timeline Tab:** Vertical timeline feed — all investigation_history entries, chronological
- **Notes Tab:** Rich text note editor (markdown supported). Submit button adds to investigation_history
- **Response Actions Tab:** List of pending/approved/executed response actions. "Request Action" button

**Right Context Panel:**
- Threat Intelligence enrichment for key IOCs from linked alerts
- AI Summary card: auto-generated incident brief from AI assistant
- "Get AI Recommendations" button

---

### Page 7: AI SOC Assistant

**Layout:** Chat interface (similar to a messaging app). Full height.

**Components:**
- **Chat Window:** Message bubbles — user (right, blue) | SENTINEL-AI (left, slate). AI messages include structured sections (Threat Assessment, Evidence, Steps, Actions).
- **Context Selector:** At top, user can pin: an alert, an incident, or a list of events. The assistant automatically uses these as context.
- **Input Bar:** Text input + Send button. Character count indicator.
- **Suggested Prompts:** Quick-action chips below the input — "Explain this alert", "What should I do next?", "Summarize this incident", "Check if this IP is malicious"
- **Conversation History:** Sidebar with past sessions (stored in localStorage)

**Interactions:**
- Typing indicator animation while awaiting LLM response
- Code blocks in AI responses rendered with syntax highlighting
- "Copy" button on AI responses
- "Create Incident from this analysis" action button on AI threat assessment messages

---

### Page 8: Threat Intelligence

**Layout:** Tab-based: IOC Lookup | IOC Database | Add IOC.

**IOC Lookup Tab:**
- Large search input with type selector (IP / Domain / Hash / URL)
- Search button → `GET /api/v1/intelligence/lookup`
- Result card: threat type, confidence score (progress bar 0–100), source, first/last seen, is_active indicator
- If not found in local DB: "Query External Source" button (calls enrichment)

**IOC Database Tab:**
- Filterable/sortable table of all threat_intelligence records
- Columns: Type | Value | Threat Type | Confidence | Source | Last Seen | Active | Actions

**Add IOC Tab:**
- Form to manually add a new IOC with all fields

---

### Page 9: Analytics & Reports

**Layout:** Dashboard-style grid with charts.

**Sections:**
- **Volume Trends:** AreaChart — events/alerts over last 7, 30, or 90 days (period selector)
- **Severity Distribution:** PieChart — alerts by severity for selected period
- **Top Attackers:** Horizontal BarChart — top 10 source IPs by alert count
- **Incident MTTR (Mean Time to Resolve):** LineChart — average incident resolution time per week
- **Alert-to-Incident Conversion Rate:** KPI card with trend
- **Report Generator:** Form with type (weekly/monthly/incident summary), format (JSON/CSV/PDF), date range → `GET /api/v1/analytics/reports/generate`

---

### Page 10: ML Model Performance

**Layout:** One card per active model, then comparison section at bottom.

**Per-Model Card:**
- Model name, version, training dataset, deployed date
- Metrics table: Accuracy | Precision | Recall | F1 | AUC-ROC
- **Confusion Matrix Visualization:** 2×2 grid with color-coded TP/FP/TN/FN cells and counts
- **Feature Importance Chart:** Horizontal BarChart of top 10 features (from `feature_importance` in model metrics API)
- Deployment status badge: Active / Inactive

**Comparison Section:**
- Side-by-side bar chart comparing all models by F1 score, accuracy, recall

---

### Page 11: User & Role Management

**Layout:** Two tabs — Users | Roles. Admin-only page.

**Users Tab:**
- DataTable: ID | Name | Email | Role | Status | Last Login | Actions
- "Add User" button → modal with form
- Row actions: Edit, Deactivate/Activate, Reset Password
- Deactivation requires confirmation modal

**Roles Tab:**
- Read-only display of system roles and their permission JSON
- Description of what each role can access

---

### Page 12: System Settings

**Layout:** Tabbed settings panel.

**Tabs:**

**Log Sources:** Configure supported ingestion formats. Table of active log source agents with status indicator and last heartbeat.

**ML Models:** Toggle active/inactive models. Set detection threshold (confidence cutoff for alert generation). Current: 0.50 (default).

**Notifications:** Configure email or webhook notifications for CRITICAL alerts. Toggle per-severity notification levels.

**API Keys:** Manage API client credentials for event ingestion. Generate/revoke keys.

**Data Retention:** Set retention periods — events (90 days default), alerts (1 year), audit logs (3 years immutable).

**LLM Settings:** Select Gemini model variant. Set max tokens per response. Toggle AI assistant on/off globally.

---

## 9.3 Real-Time Dashboard Strategy

```
Backend Event (e.g., alert created)
          │
          ▼
alert_service.create_alert()
          │
          ▼
ws_manager.broadcast_to_role("analyst", {
    "type": "new_alert",
    "payload": { alert data }
})
          │
          ▼
All analyst WebSocket connections receive JSON message
          │
          ▼
Frontend useWebSocket() hook receives message
          │
          ▼
Zustand alertStore.prependAlert(payload)
          │
          ▼
React re-renders only components subscribed to alertStore
(Live Alert Feed, KPI bar unread count)
          │
          ▼
Brief CSS highlight animation (yellow border flash, 1.5s)
on new alert row
```

The strategy ensures O(1) UI update latency (sub-200ms from event to screen), zero polling, and no unnecessary full-page re-renders.

---