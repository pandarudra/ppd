# SENTINEL: Technology Stack Justification & Development Setup

> **Document Version:** 1.0  
> **Focus:** Framework Selections, Trade-Off Analysis, and Local Dev Environment Setup

---

# PART 6: TECHNOLOGY STACK

## 6.1 Complete Stack Justification

### Frontend

#### React.js + Vite vs. Alternatives

| Technology | Verdict | Reason |
|---|---|---|
| **React.js + Vite** ✅ | **Chosen** | Vite gives sub-second HMR. React's ecosystem (Recharts, Zustand, TanStack Query) is unmatched. Component reusability across 12 pages. Largest community for student learning. |
| Next.js | Rejected | SSR/SSG complexity is unnecessary for a JWT-auth SPA. File-based routing adds overhead for a team new to React. |
| Vue.js | Rejected | Smaller ecosystem, fewer SOC-specific UI component examples, less job-market demand for student portfolios. |
| Angular | Rejected | Steep learning curve (decorators, DI, RxJS) inappropriate for a student team on a 20-week schedule. |

#### Tailwind CSS vs. Alternatives

| Technology | Verdict | Reason |
|---|---|---|
| **Tailwind CSS** ✅ | **Chosen** | Utility-first enables rapid custom dark-theme SOC UI without fighting component library defaults. No CSS file bloat. PurgeCSS keeps bundle small. |
| Material-UI (MUI) | Rejected | Strong Material Design opinions clash with custom SOC dark aesthetic. Customization requires deep theme overrides. |
| Ant Design | Rejected | Chinese-first design system, light theme default, complex dark mode setup. |
| Chakra UI | Rejected | Good choice but less community content for security dashboards than Tailwind. |

#### Recharts vs. Alternatives

| Technology | Verdict | Reason |
|---|---|---|
| **Recharts** ✅ | **Chosen** | Built on React components. Declarative API — a chart is just JSX. Easy to combine with Tailwind colors. Sufficient for line, bar, pie, area charts needed in SENTINEL. |
| D3.js | Rejected | Imperative DOM manipulation conflicts with React's reconciliation. Extreme learning curve for students. |
| Chart.js | Rejected | Requires canvas manipulation outside React's render cycle. No native React integration. |
| Visx | Rejected | Powerful but very low-level for student team on deadline. |

#### Zustand vs. Alternatives

| Technology | Verdict | Reason |
|---|---|---|
| **Zustand** ✅ | **Chosen** | Minimal boilerplate (3 lines to create a store). No Context wrapper needed. Selective subscription prevents unnecessary re-renders. Perfect for alert/incident real-time state. |
| Redux Toolkit | Rejected | Much more boilerplate (actions, reducers, selectors). Overkill for SENTINEL's state complexity. |
| React Context | Rejected | Re-renders every consumer on any state change. Performs poorly with high-frequency WebSocket updates. |
| Jotai/Recoil | Rejected | Atom model less intuitive for team new to state management. |

#### TanStack Query (React Query) vs. Alternatives

| Technology | Verdict | Reason |
|---|---|---|
| **TanStack Query** ✅ | **Chosen** | Built-in caching, background refetch, loading/error states, pagination, and infinite scroll. Eliminates 80% of data-fetching boilerplate. |
| SWR | Acceptable alternative but less feature-rich |
| Plain useEffect + fetch | Rejected | Each developer reinvents caching, error handling, and loading states inconsistently. |

### Backend

#### Python + FastAPI vs. Alternatives

| Technology | Verdict | Reason |
|---|---|---|
| **Python + FastAPI** ✅ | **Chosen** | Native integration with scikit-learn, pandas, numpy — no data marshaling between services. FastAPI's async support, automatic OpenAPI docs, and Pydantic validation are production-grade. Python is team's primary language. |
| Django (DRF) | Rejected | Synchronous ORM (async support is bolted on). Too opinionated for custom auth and ML integration. Heavier than needed. |
| Flask | Rejected | No built-in async, no data validation, no auto-docs. Requires assembling many extensions. |
| Node.js + Express | Rejected | JavaScript ML ecosystem is immature. Would require a separate Python ML service plus complex cross-language serialization. |
| Go + Gin | Rejected | ML library support is poor. Team not proficient in Go. |

#### SQLAlchemy ORM

Chosen over raw SQL for:
- Database-agnostic queries (easy to swap PostgreSQL for SQLite in testing)
- Python-native model definitions with type hints
- Relationship traversal (`event.alerts`, `incident.investigation_history`)
- Migration management via Alembic

#### Alembic Migrations

Version-controlled, incremental schema changes. Every schema modification is a numbered migration file, ensuring all team members and all environments stay in sync.

#### Pydantic Validation

All API inputs are Pydantic models. This provides:
- Automatic type coercion and validation
- Clear error messages with field-level detail
- OpenAPI schema generation for free

### AI/ML

#### Scikit-learn vs. TensorFlow/PyTorch for MVP

| Technology | Verdict | Reason |
|---|---|---|
| **Scikit-learn** ✅ | **Chosen** | Isolation Forest is natively implemented. Random Forest training is fast (minutes, not hours). No GPU required. Models serialize with joblib in one line. Perfect for tabular network log data. |
| TensorFlow | Rejected for MVP | Requires GPU for meaningful training speed. LSTM/CNN for sequence data adds weeks of model design. Overkill for structured tabular data. |
| PyTorch | Rejected for MVP | Same reasons as TensorFlow. Better for future deep-learning extension. |

#### XGBoost

Gradient-boosted trees that consistently win Kaggle competitions on tabular data. Excellent for the structured network flow features in NSL-KDD and CICIDS2017 datasets. Integrates with scikit-learn pipeline API.

#### Joblib for Model Serialization

```python
# Save
joblib.dump(model, 'models/random_forest.joblib', compress=3)

# Load
model = joblib.load('models/random_forest.joblib')
```

Simple, fast, and handles numpy arrays natively — unlike pickle (security risk) or ONNX (conversion complexity).

### Database

#### PostgreSQL vs. Alternatives

| Technology | Verdict | Reason |
|---|---|---|
| **PostgreSQL** ✅ | **Chosen** | JSONB for flexible log storage without schema rigidity. Full ACID transactions for event → alert → incident pipeline. Advanced indexing (GIN for JSONB, partial indexes). Battle-tested for security audit logs. |
| MySQL | Rejected | No native JSONB. Less powerful window functions for analytics queries. |
| MongoDB | Rejected | No ACID transactions across collections. Harder to enforce referential integrity for the event → alert → incident chain. |
| SQLite | Development only | No concurrent writes for multi-user platform. |

#### Redis

| Use Case | Why Redis |
|---|---|
| JWT blacklist | O(1) key lookup with TTL auto-expiry |
| Rate limiting | Atomic INCR + EXPIRE for sliding window counts |
| Dashboard cache | Sub-millisecond reads for frequently polled metrics |
| WebSocket pub/sub | Native PUBLISH/SUBSCRIBE for multi-instance scale |

### Infrastructure

#### Docker + Docker Compose

Single `docker-compose up --build` starts:
- `frontend` (Vite dev server or nginx)
- `backend` (FastAPI + uvicorn)
- `ml_service` (FastAPI ML server)
- `postgres` (PostgreSQL 15)
- `redis` (Redis 7)

No environment differences between team members. No "works on my machine."

#### GitHub Actions (Optional CI/CD)

```yaml
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### AI Assistant & LLM Integration

#### Zero-Cost / Free-Tier Provider Strategy: NVIDIA API Free Endpoints vs. Google Gemini API

To keep the platform 100% cost-free, student-friendly, and independent of expensive local GPU hardware while retaining enterprise-grade reasoning, SENTINEL utilizes **free API endpoints from NVIDIA NIM (build.nvidia.com)** or **Google Gemini API Key (Google AI Studio Free Tier)**:

| Factor | NVIDIA NIM Free Endpoints (build.nvidia.com) | Google Gemini API (Google AI Studio Free Tier) |
|---|---|---|
| **Free Access** | Free cloud inference credits upon signup (1,000 free requests/credits) | Generous permanent free tier (15 RPM, 1M TPM, 1,500 RPD) |
| **Available Models** | `meta/llama-3.1-70b-instruct`, `meta/llama-3.1-8b-instruct`, `mistralai/mixtral-8x7b-instruct` | `gemini-1.5-flash`, `gemini-2.0-flash` |
| **Context Window** | 128K tokens (Llama 3.1) | Up to 1M tokens (Gemini 1.5/2.0 Flash) |
| **Client Protocol** | OpenAI-compatible endpoint (`api.nvidia.com/v1`, using standard `openai` python SDK) | Native `google-genai` / REST API |
| **Best Fit** | High-precision open-source cybersecurity reasoning, MITRE ATT&CK alignment | Rapid incident summarization, massive log context window, low latency |

SENTINEL abstracts the LLM call behind an `llm_client.py` provider-agnostic interface supporting both **NVIDIA NIM Free Endpoints** and **Google Gemini API Key** via simple configuration in `.env` (`LLM_PROVIDER=nvidia` or `LLM_PROVIDER=gemini`).

---

## 6.2 Development Environment Setup

### Prerequisites

```bash
# Required software
- Python 3.11+
- Node.js 18+ and npm
- Docker Desktop 4.x
- Git 2.x
- VS Code (recommended) with extensions:
    - Python (ms-python.python)
    - ESLint (dbaeumer.vscode-eslint)
    - Tailwind CSS IntelliSense
    - SQLTools + PostgreSQL driver
```

### Step-by-Step Setup

**1. Clone the repository**
```bash
git clone https://github.com/your-team/sentinel.git
cd sentinel
```

**2. Configure environment variables**
```bash
cp backend/.env.example backend/.env
cp ml_service/.env.example ml_service/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env`:
```
DATABASE_URL=postgresql://sentinel:sentinel@localhost:5432/sentinel_db
REDIS_URL=redis://localhost:6379
SECRET_KEY=change-this-to-a-long-random-string-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
ML_SERVICE_URL=http://localhost:8001
# LLM Provider Configuration (100% Free API Endpoints)
LLM_PROVIDER=nvidia # Options: "nvidia" or "gemini"
NVIDIA_API_KEY=nvapi-your_nvidia_api_key_here # Free from build.nvidia.com
NVIDIA_MODEL=meta/llama-3.1-70b-instruct
GEMINI_API_KEY=your_gemini_api_key_here # Free from aistudio.google.com
GEMINI_MODEL=gemini-1.5-flash
```

**3. Start infrastructure with Docker**
```bash
docker-compose up -d postgres redis
```

**4. Set up backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head           # Run all migrations
python scripts/seed_data.py    # Create admin user + sample data
uvicorn app.main:app --reload --port 8000
```

**5. Set up ML service**
```bash
cd ml_service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python training/train.py       # Train models on sample data
uvicorn main:app --reload --port 8001
```

**6. Set up frontend**
```bash
cd frontend
npm install
npm run dev    # Vite dev server at http://localhost:5173
```

**7. Verify**
- Frontend: http://localhost:5173 (login with admin@sentinel.local / admin123)
- Backend API docs: http://localhost:8000/docs
- ML service docs: http://localhost:8001/docs

---