# SENTINEL: Engineering Blueprint Documentation Index

Welcome to the engineering and product documentation for **SENTINEL: AI/ML-Powered Security Operations Center Platform**.

This directory contains the complete specifications, product requirements, system architecture, database design, API schemas, and implementation roadmap developed from the systematic literature review (*Khayat et al., IEEE Access 2025*) and project proposal requirements.

---

## Document Navigation Map

| Document | Focus & Description | Key Sections |
|---|---|---|
| 📋 [**PRD.md**](./PRD.md) | **Product Requirements Document** | Research Analysis, Product Vision, 4 User Personas, 8 Primary Use Cases, 40+ Functional Requirements (Modules A–J), Non-Functional Requirements, MVP vs. V2 Scope, Evaluation KPIs. |
| 🏛️ [**ARCHITECTURE.md**](./ARCHITECTURE.md) | **Software Architecture Document** | Modular Monolith Rationale, Frontend/Backend/DB/Ingestion/ML/LLM Subsystems, Complete 13-Step Event Processing Flow, 5 Mermaid Architecture Diagrams. |
| 🧠 [**AI_ML_DESIGN.md**](./AI_ML_DESIGN.md) | **AI/ML Technical Methodology** | Evaluation of 8 Candidate Algorithms, Hybrid Dual-Engine Strategy (Isolation Forest + XGBoost), Dataset Evaluation (UNSW-NB15 & CICIDS2017), 9-Stage ML Lifecycle, Alert Pipeline Integration. |
| 💾 [**DATABASE_SCHEMA.md**](./DATABASE_SCHEMA.md) | **Database & Storage Architecture** | Schema Design Principles, 13 Relational Tables with Full PostgreSQL DDL (types, constraints, indexes), Mermaid ER Diagram, Entity Relationship Lifecycles. |
| 🔌 [**API_SPECIFICATION.md**](./API_SPECIFICATION.md) | **REST & WebSocket API Specs** | RESTful Guidelines, 39 Fully Documented Endpoints across 10 Router Groups with Sample JSON Requests and Responses, 9 Real-Time WebSocket Events. |
| 🛠️ [**TECH_STACK.md**](./TECH_STACK.md) | **Technology Stack Justification** | Comprehensive Technology Comparison (React/Vite vs Next.js, FastAPI vs Django, PostgreSQL vs MongoDB), Local Development Setup with Docker Compose. |
| 🎨 [**DESIGN.md**](./DESIGN.md) | **Design system** | Dark canvas + surface ladder, green/blue two-signal accents, Inter 600/800, component specs. Severity colors are data colors layered on top. |
| 🛡️ [**SECURITY_CONTROLS.md**](./SECURITY_CONTROLS.md) | **Security, Safety & Guardrails** | Cryptographic JWT Token Lifecycle, Bcrypt Hashing, RBAC Enforcement, Prompt Injection Mitigation, Model Integrity Checks, Two-Person Human-in-the-Loop SOAR Controls. |
| 🗺️ [**ROADMAP.md**](./ROADMAP.md) | **Roadmap, Testing & Evaluation** | 10 Implementation Phases across 20 Weeks with Completion Criteria, Multi-Tier Testing Strategy, 10 Technical Risks & Mitigations, Academic Gap Mapping to Khayat et al. (2025). |

---

## Architectural Summary

- **Frontend:** React 18, Vite, Tailwind CSS, Recharts, Lucide React.
- **Backend:** Python 3.11, FastAPI (Modular Monolith with async I/O and Pydantic schemas).
- **ML Engine:** Python 3.11, Scikit-Learn, XGBoost (Dual-Engine: Unsupervised Anomaly Detection + Supervised Multi-Class Threat Classification).
- **Persistence:** PostgreSQL 16 (ACID Relational + JSONB Extensibility) and Redis 7 (Token Blacklist, Rate Limiting, WebSocket Pub/Sub).
- **AI Copilot:** Context-Injected RAG Assistant leveraging zero-cost free API endpoints from NVIDIA (build.nvidia.com / NVIDIA NIM) or Google Gemini API Key (Google AI Studio free tier) via strict security prompt templates.
- **Automated SOAR:** Controlled Webhook Dispatcher requiring mandatory Tier 2 human cryptographic authorization for active containment.
