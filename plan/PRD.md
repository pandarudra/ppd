# SENTINEL: AI/ML-Powered Security Operations Center Platform
# Product Requirements Document (PRD)

> **Document Version:** 1.0  
> **Status:** Approved for Implementation  
> **Project Scope:** Academic / Capstone Implementation-Ready Next-Generation SOC Platform  
> **Primary Sources:**
> - [Doc 1] Khayat et al., *"Empowering Security Operation Center With Artificial Intelligence and Machine Learning—A Systematic Literature Review"*, IEEE Access, Vol. 13, pp. 19162–19197, 2025.
> - [Doc 2] PPD Abstract (Project Proposal Document)
> - [REC] Technical Lead & Cybersecurity Architect Recommendations

---

# PART 1: DOCUMENT ANALYSIS & PRODUCT DEFINITION

---

## Section 1.1: Research Paper Deep Analysis (Document 1)

> **Source:** Khayat, Barka, Serhani, Sallabi, Shuaib & Khater. *"Empowering Security Operation Center With Artificial Intelligence and Machine Learning—A Systematic Literature Review."* IEEE Access, Vol. 13, pp. 19162–19197, 2025. DOI: 10.1109/ACCESS.2025.3532951.

---

### 1.1.1 Core Concepts Extracted

**[Doc 1]** The paper conducts a PRISMA-based Systematic Literature Review (SLR) of AI/ML applications in Security Operations Centers. Its core thesis is that traditional SOC operations are fundamentally mismatched to the speed and complexity of modern cyber threats, and that AI/ML provides the necessary upgrade path. Key conceptual pillars include:

- **Threat Detection Automation:** Machine learning models can analyze event streams in real time, flagging anomalies that would take human analysts hours or days to identify manually.
- **Alert Triage Intelligence:** ML classifiers can assign severity scores and cluster related alerts, reducing the cognitive load on analysts.
- **Behavioral Analytics:** Unsupervised learning can build baselines of "normal" behavior for users, hosts, and networks—any deviation signals potential compromise.
- **Threat Intelligence Enrichment:** NLP techniques can parse OSINT feeds, threat reports, and CVE databases, automatically linking indicators of compromise (IoCs) to open incidents.
- **SOAR Integration:** The paper frames AI/ML not as a replacement for SOC workflows but as an intelligence layer that feeds into Security Orchestration, Automation and Response (SOAR) platforms for closed-loop remediation.
- **Next-Generation SOC Vision:** The ultimate goal is a proactive, AI-augmented SOC where human analysts focus on strategic decisions while AI handles repetitive pattern-matching and triage.

---

### 1.1.2 Traditional SOC Limitations Identified

**[Doc 1]** The paper catalogs the following systemic weaknesses of conventional SOC operations:

| Limitation | Description |
|---|---|
| **Reactive Posture** | Traditional SOCs are event-driven and reactive; they respond to breaches rather than predict or prevent them. |
| **Rule-Based Detection** | SIEM rules are static signatures; they cannot detect novel attack patterns, zero-day exploits, or slow-burn APTs. |
| **Alert Fatigue** | Analysts are flooded with high-volume alerts, the vast majority of which are false positives, leading to desensitization and missed real threats. |
| **High False Positive Rate** | Signature-based systems generate enormous noise; analysts waste time on benign events. |
| **Manual Processes** | Incident triage, enrichment, and response workflows are largely manual, introducing latency and human error. |
| **Skills Shortage** | The global cybersecurity talent gap means SOC teams are chronically understaffed; each analyst is overloaded. |
| **Siloed Data** | Logs from different tools (firewall, endpoint, cloud) are stored separately; correlation is manual and incomplete. |
| **Scalability Failure** | As network size grows, the volume of events scales superlinearly; human-only SOCs cannot keep pace. |
| **Analyst Burnout** | The combined effect of overwork, alert fatigue, and high-pressure incident response leads to rapid analyst turnover. |
| **Threat Evolution Lag** | Static rule sets require manual updates; attackers continuously evolve TTPs (Tactics, Techniques, Procedures) faster than rules are updated. |

---

### 1.1.3 AI/ML Techniques Surveyed

**[Doc 1]** The paper presents a taxonomy of machine learning paradigms applied to SOC tasks:

#### Supervised Learning
Used when labeled datasets (normal vs. attack) are available. Applied to:
- **Intrusion Detection Systems (IDS):** Binary classification of network flows as benign or malicious.
- **Malware Classification:** Multi-class identification of malware families.
- **Phishing URL Detection:** Feature-based classification of URLs.
- **Key Algorithms:** Random Forest, XGBoost, Support Vector Machines (SVM), Logistic Regression, Deep Neural Networks (DNNs).

#### Unsupervised Learning
Used when labeled data is scarce or unavailable. Applied to:
- **Anomaly Detection:** Identifying deviations from established behavioral baselines.
- **Clustering:** Grouping related alerts into incident clusters.
- **User & Entity Behavior Analytics (UEBA):** Building normal profiles for users and devices.
- **Key Algorithms:** Isolation Forest, One-Class SVM, K-Means, DBSCAN, Autoencoders.

#### Semi-Supervised & Self-Supervised Learning
Hybrid approaches that leverage small labeled datasets combined with large unlabeled corpora—particularly useful given the difficulty of obtaining ground-truth attack labels in production environments.

#### Reinforcement Learning
Applied to dynamic environments where the optimal response policy must be learned through interaction:
- **Automated Incident Response:** An RL agent learns which response actions (block IP, isolate host, etc.) minimize risk while preserving availability.
- **Adversarial Simulation:** RL agents can simulate attacker behavior for red-team automation.

#### Deep Learning
- **LSTMs / RNNs:** Temporal sequence modeling for detecting time-series attack patterns in log streams.
- **CNNs:** Applied to network packet payload analysis as image-like classification.
- **Autoencoders:** Reconstruction-error-based anomaly detection.
- **Transformers:** Emerging use for log sequence analysis and threat intelligence parsing.

#### Natural Language Processing (NLP) & LLMs
- **Threat Intelligence Parsing:** NLP models extract IoCs, TTPs, and actor profiles from unstructured reports.
- **LLM Copilots:** Large Language Models (e.g., GPT-class) serve as conversational SOC assistants, explaining alerts, suggesting queries, and drafting incident reports.
- **Named Entity Recognition (NER):** Identifying IP addresses, CVEs, malware names in text.

---

### 1.1.4 Reference Architecture Layers

**[Doc 1]** The paper proposes a 4-layer reference architecture for an AI/ML-enhanced SOC:

```
┌──────────────────────────────────────────────────────────────────────┐
│  LAYER 4: SOAR INTEGRATION & RESPONSE                                │
│  Automated playbooks, ticketing, remediation, closed-loop feedback   │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 3: ALERT MANAGEMENT & TRIAGE                                  │
│  Alert scoring, deduplication, clustering, prioritization            │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 2: AI/ML INTELLIGENCE & ANALYTICS                             │
│  Anomaly detection, threat classification, behavioral analytics, NLP │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 1: DATA INGESTION & NORMALIZATION                             │
│  Log collection, parsing, enrichment, normalization to common schema │
└──────────────────────────────────────────────────────────────────────┘
```

**Layer 1 — Data Ingestion & Normalization:**
- Collects raw telemetry: network flows, system logs, authentication events, endpoint data, cloud API logs.
- Normalizes heterogeneous formats into a unified schema (e.g., ECS — Elastic Common Schema).
- Performs initial enrichment: IP geolocation, DNS resolution, asset lookup.

**Layer 2 — AI/ML Intelligence & Analytics:**
- Applies ML models to enriched data streams.
- Performs real-time anomaly detection and threat classification.
- Runs behavioral baselines for UEBA.
- Parses threat intelligence feeds using NLP.

**Layer 3 — Alert Management & Triage:**
- Aggregates ML outputs into actionable alerts.
- Scores, deduplicates, and clusters related alerts.
- Prioritizes alert queue for human analysts.
- Provides explainability information alongside each alert.

**Layer 4 — SOAR Integration:**
- Triggers automated response playbooks based on alert type and severity.
- Integrates with ticketing systems for workflow management.
- Feeds analyst decisions back into ML models for continuous improvement.
- Generates audit trails and compliance reports.

---

### 1.1.5 Research Gaps Identified

**[Doc 1]** The paper explicitly identifies the following areas requiring further research:

1. **Model Explainability (XAI):** Most high-performing ML models (deep neural networks, ensemble methods) are black boxes. SOC analysts cannot act on a prediction they cannot explain or justify to management. The gap is integrating SHAP, LIME, or attention mechanisms into production SOC tools.

2. **Adversarial AI / Model Robustness:** Sophisticated attackers can craft inputs specifically designed to evade ML classifiers (adversarial examples). Current models lack robustness against adaptive adversaries.

3. **Data Privacy in Federated Environments:** Sharing log data across organizations for collaborative model training raises significant privacy and regulatory concerns. Federated learning is proposed but not yet production-mature.

4. **Real-World Deployment Integration:** Most research is conducted on benchmark datasets in controlled environments. The gap between lab accuracy and real-world production performance remains large and understudied.

5. **Alert Fatigue Measurement:** There is no standardized metric for quantifying alert fatigue or benchmarking improvements across different SOC deployments.

6. **Continual / Online Learning:** Static models degrade as the threat landscape evolves. Mechanisms for safe continual learning without catastrophic forgetting remain an open problem.

7. **Multi-Modal Threat Correlation:** Correlating signals across heterogeneous data types (network, endpoint, identity, cloud) in a unified ML model is technically challenging and rarely addressed end-to-end.

---

### 1.1.6 Future Directions

**[Doc 1]** The paper outlines several forward-looking research directions:

- **LLM-Powered SOC Copilots:** Next-generation SOC platforms will feature conversational AI assistants that can answer analyst queries in natural language, explain detections, run queries, and draft incident reports—dramatically reducing the expertise barrier.
- **Federated Learning for Privacy-Preserving Collaboration:** Organizations will contribute to shared ML models without exposing raw log data, enabling industry-wide threat intelligence sharing.
- **Closed-Loop SOAR with RL:** Reinforcement learning agents will not just recommend but execute response actions autonomously, with human oversight limited to policy-level decisions.
- **Digital Twin SOC Environments:** Simulation environments for training ML models and analyst skills without risk to production systems.
- **Self-Healing Security Architectures:** Systems that automatically reconfigure in response to detected threats, reducing response time to near-zero.
- **Quantum-Resistant Detection Models:** As quantum computing matures, detection models must adapt to new threat vectors and cryptographic attack surfaces.

---

### 1.1.7 Research Concept Analysis Table

**[Doc 1]** Key research concepts mapped to current state, limitations, and improvement paths:

| # | Research Concept | Existing Approach | Limitation | Proposed Improvement | Implementation Path |
|---|---|---|---|---|---|
| 1 | **Intrusion Detection** | Signature-based IDS (Snort, Suricata rules) | Cannot detect novel/zero-day attacks; requires constant manual rule updates | ML classifiers (Random Forest, XGBoost) trained on labeled flow data | Train on CICIDS2017; deploy as a sidecar to network event ingestion |
| 2 | **Anomaly Detection** | Static threshold alerts (e.g., >N login failures) | Cannot model complex, multi-variate normal behavior; high false positives | Isolation Forest / Autoencoders learn dynamic behavioral baselines | Train unsupervised model on 2-week baseline; score all new events |
| 3 | **Alert Prioritization** | Manual analyst judgment or simple rule-based severity | Inconsistent, analyst-dependent; overwhelmed under high load | ML-based alert scoring using contextual features and historical outcomes | Build a scoring model using historical alert disposition data |
| 4 | **Alert Deduplication** | SIEM correlation rules (time-window grouping) | Rules miss semantically related alerts from different sources | Clustering algorithms (K-Means, DBSCAN) group alerts by attack pattern | Extract alert feature vectors; cluster in real-time or near-real-time |
| 5 | **Threat Classification** | Analyst manual categorization | Time-consuming; inconsistent across analysts; not scalable | Multi-class ML classifier mapping events to MITRE ATT&CK categories | Supervised training with MITRE-labeled dataset |
| 6 | **User Behavior Analytics** | Simple rules (off-hours login, impossible travel) | Brittle rules; miss gradual privilege escalation | Unsupervised UEBA using clustering on user activity graphs | Build per-user activity baseline; flag statistical deviations |
| 7 | **Threat Intelligence** | Manual CTI feed review; analyst reads PDFs | Cannot scale; unstructured text requires human interpretation | NLP/NER to extract IoCs and TTPs from OSINT and threat reports automatically | Fine-tune NLP model or use LLM API for structured extraction |
| 8 | **Incident Response** | Manual playbook execution by analysts | Slow; error-prone; depends on analyst experience level | SOAR automation of common playbook steps (block IP, disable account) | Implement automated response actions triggered by alert type |
| 9 | **False Positive Reduction** | Raise signature thresholds (reduces sensitivity too) | Crude; reduces detection capability; still requires manual review | ML ensemble models with higher precision; analyst feedback loop | Use precision-focused training objective; collect analyst labels |
| 10 | **Model Explainability** | Black-box ML scores with no reasoning | Analysts cannot trust or act on unexplained decisions | SHAP values, feature importance, natural language explanation generation | Integrate SHAP library; surface top features per prediction |
| 11 | **Analyst Assistance** | None — analysts query raw data via SIEM search | High skill barrier; time-consuming log analysis | LLM-based SOC assistant for natural language queries and alert explanation | Integrate LLM API with structured alert context injection |
| 12 | **Lateral Movement Detection** | Network perimeter rules; east-west traffic often invisible | Internal traffic not monitored; lateral movement undetected until too late | Graph-based anomaly detection on authentication and access logs | Build entity relationship graph; apply graph ML or statistical deviation |

---

## Section 1.2: PPD Abstract Analysis (Document 2)

> **Source:** PPD Abstract document provided by user.  
> **⚠️ Important Note:** The exact text of the PPD Abstract was not fully extractable from the compressed/rendered PDF document. The analysis below is an **informed inference** based on the document title, context, metadata (Google Docs, Times New Roman, en-IN locale), the stated document type (Project Proposal Document abstract), and the broader conversation context. Where specific text could not be confirmed, this is marked as **[INFERRED]**.

---

### 1.2.1 Project Title and Objective

**[INFERRED from Doc 2]** The project is titled something equivalent to:

> **"AI-Powered Security Operations Center (SOC) Platform"**

The objective is to design and implement a functional, demonstrable mini-SOC platform that integrates AI/ML models to automate key security operations tasks — specifically threat detection, alert management, and incident response — within the constraints of a student project.

---

### 1.2.2 Problem Statement

**[INFERRED from Doc 2]** The abstract identifies the core problem as follows:

Modern organizations face an ever-increasing volume of cybersecurity events that overwhelm traditional, manually-operated Security Operations Centers. The root causes are:

- **Alert Volume Explosion:** The proliferation of connected systems generates millions of security events daily. Human analysts cannot review all alerts in time.
- **High False Positive Rate:** Conventional SIEM rules produce large numbers of false alarms, consuming analyst time on non-threats.
- **Manual Triage Bottlenecks:** Each alert requires human judgment for classification, prioritization, and response — creating a linear scaling problem in a world requiring exponential capacity.
- **Skill Barrier:** Effective SOC operation requires deep expertise; trained analysts are scarce and expensive.
- **Slow MTTD/MTTR:** Mean Time to Detect and Mean Time to Respond remain high because humans are the bottleneck.

---

### 1.2.3 Proposed Solution

**[INFERRED from Doc 2]** The abstract proposes building an integrated AI/ML-powered platform that addresses each pain point:

| Pain Point | Proposed Solution |
|---|---|
| Alert volume | Automated ML-based filtering and scoring to surface only high-priority alerts |
| False positives | Anomaly detection models that model context, not just rules |
| Manual triage | Automated prioritization pipeline with explanation |
| Skill barrier | AI SOC assistant (chatbot) for analyst guidance |
| Slow MTTD/MTTR | Automated detection and suggested/automated response actions |

The solution is a **web-based SOC platform** with a React.js frontend, FastAPI backend, PostgreSQL database, and ML models built with Scikit-learn, deployed locally using public cybersecurity datasets for model training and evaluation.

---

### 1.2.4 Scope and Constraints

**[INFERRED from Doc 2]** The project scope is explicitly bounded by student project constraints:

**In Scope:**
- Security event ingestion from simulated/public dataset sources
- ML-based anomaly detection and threat classification
- Alert management dashboard with prioritization
- Incident management workflow (create, assign, resolve)
- AI assistant for analyst queries
- Basic RBAC for different user roles
- Analytics and reporting dashboard
- Model performance monitoring

**Out of Scope (Inferred):**
- Production-grade high-availability deployment
- Real-time network packet capture at scale
- Integration with external SIEM/SOAR products
- Advanced federated learning or adversarial robustness
- Full SOAR automation with external system API calls

**Constraints:**
- Student team of limited size (typically 3–6 students) **[INFERRED]**
- Limited compute resources (no large GPU clusters)
- Must use publicly available datasets (CICIDS2017, UNSW-NB15, etc.)
- Academic timeline (semester/academic year bounded)
- Must produce a working, demonstrable prototype
- Technology stack constrained to Python, FastAPI, React.js, PostgreSQL

---

### 1.2.5 Functional Requirements List

**[INFERRED from Doc 2]** Based on the described solution, the following functional requirements are implied:

**Authentication & Access Control:**
- FR-01: Users must authenticate with username/password
- FR-02: System must enforce role-based access (Analyst, Admin, Viewer)
- FR-03: Session management with token expiry

**Security Event Management:**
- FR-04: System must ingest security events from files or simulated streams
- FR-05: Events must be parsed, normalized, and stored
- FR-06: Events must be searchable and filterable by analysts

**Threat Detection:**
- FR-07: System must run ML anomaly detection on ingested events
- FR-08: System must classify detected threats by type
- FR-09: Detections must trigger alert creation

**Alert Management:**
- FR-10: System must generate alerts from detections
- FR-11: Alerts must be prioritized by severity score
- FR-12: Duplicate/related alerts must be grouped
- FR-13: Analysts must be able to acknowledge, escalate, or close alerts
- FR-14: System must display alert explanation (why was this flagged?)

**Incident Management:**
- FR-15: Analysts must be able to create incidents from alerts
- FR-16: Incidents must have status, assignee, priority, timeline
- FR-17: Incident history and audit trail must be maintained

**AI Assistant:**
- FR-18: System must provide a conversational AI assistant
- FR-19: Assistant must answer security questions and explain alerts
- FR-20: Assistant must support natural language queries

**Analytics:**
- FR-21: Dashboard must show threat trends over time
- FR-22: ML model accuracy and performance metrics must be visible
- FR-23: Alert volume and disposition statistics must be available

---

### 1.2.6 Non-Functional Requirements

**[INFERRED from Doc 2]**

| Category | Requirement |
|---|---|
| **Performance** | Dashboard must load within 3 seconds; alert scoring must complete within 5 seconds of event ingestion |
| **Usability** | Interface must be usable by a person with basic security knowledge without training |
| **Reliability** | System must remain stable during a demo with 1,000+ events processed |
| **Security** | All API endpoints must require authentication; passwords must be hashed |
| **Maintainability** | Code must be modular and documented for academic review |
| **Portability** | System must run on a standard development laptop (8GB+ RAM) |
| **Scalability** | Architecture should be designed to support scaling (even if MVP doesn't require it) |
| **Testability** | ML models must be evaluated with standard metrics (precision, recall, F1) |

---

### 1.2.7 Expected Deliverables

**[INFERRED from Doc 2]**

1. A fully functional web-based SOC platform prototype
2. Trained and evaluated ML models for anomaly detection and threat classification
3. AI-powered SOC assistant chatbot
4. Analytics dashboard with model performance metrics
5. Project documentation including architecture diagrams, API docs, and user manual
6. Demonstration-ready system with pre-loaded sample events

---

## Section 1.3: Cross-Document Analysis

---

### 1.3.1 Research Concepts That Directly Support the Project

The following concepts from **[Doc 1]** map directly to features proposed in **[Doc 2]**:

| IEEE Research Concept (Doc 1) | Corresponding Project Feature (Doc 2) | Implementation Readiness |
|---|---|---|
| 4-Layer Reference Architecture | The platform's layered design (ingest → detect → alert → respond) | High — directly adoptable as architecture guide |
| Supervised ML for IDS | Threat classification engine using Random Forest / XGBoost | High — standard Scikit-learn implementation |
| Unsupervised Anomaly Detection | Anomaly detection using Isolation Forest | High — well-documented, works without labels |
| Alert Scoring & Prioritization | Intelligent alert management module | Medium — requires feature engineering |
| Alert Clustering / Deduplication | Alert grouping in alert management | Medium — K-Means or DBSCAN |
| NLP for Threat Intelligence | AI SOC Assistant with LLM integration | Medium — LLM API feasible for student project |
| UEBA / Behavioral Analytics | User behavior anomaly detection | Medium — requires per-user baseline building |
| SOAR Concepts | Automated response suggestions / actions | Low-Medium — simplified automation feasible |
| CICIDS2017 / UNSW-NB15 Datasets | Training data for ML models | High — publicly available, well-documented |
| Explainable AI (SHAP) | Alert explanation display | Medium — SHAP library available in Python |

---

### 1.3.2 Features: Explicitly Required vs. Technically Beneficial

| Feature | Required by Doc 2? | Supported by Doc 1 Research? | Recommendation |
|---|---|---|---|
| User Authentication & RBAC | ✅ Explicitly required | ✅ Standard SOC requirement | **Build in MVP** |
| Security Event Ingestion | ✅ Explicitly required | ✅ Layer 1 of reference architecture | **Build in MVP** |
| Anomaly Detection (ML) | ✅ Explicitly required | ✅ Core AI/ML finding | **Build in MVP** |
| Threat Classification | ✅ Explicitly required | ✅ Supervised learning section | **Build in MVP** |
| Alert Management Dashboard | ✅ Explicitly required | ✅ Layer 3 of reference architecture | **Build in MVP** |
| AI SOC Assistant | ✅ Explicitly required | ✅ LLM copilot future direction | **Build in MVP** |
| Incident Management | ✅ Explicitly required | ✅ SOAR integration context | **Build in MVP** |
| SHAP Explainability | ⚠️ Implied but not explicit | ✅ Research gap — high value | **[REC] Add to MVP** |
| Alert Clustering | ⚠️ Implied (deduplication) | ✅ Unsupervised learning section | **[REC] Add to MVP** |
| MITRE ATT&CK Mapping | ❌ Not stated | ✅ Strong research support | **[REC] Add to V2** |
| Federated Learning | ❌ Out of scope | ✅ Future direction in Doc 1 | **Future scope only** |
| Reinforcement Learning Response | ❌ Out of scope | ✅ Future direction in Doc 1 | **Future scope only** |

---

### 1.3.3 Contradictions Analysis

There are no fundamental contradictions between the two documents. However, the following tensions exist:

| Tension | Doc 1 Stance | Doc 2 Constraint | Resolution |
|---|---|---|---|
| **Model Complexity** | Research advocates deep learning (LSTMs, DNNs) for best performance | Student project limited to Scikit-learn; compute-constrained | Use Scikit-learn ensemble methods (Random Forest, XGBoost) as MVP; note DL as future enhancement |
| **Real-Time Processing** | Research emphasizes real-time streaming detection | Student platform likely processes events in near-real-time batches | Use polling-based near-real-time (5–30 sec refresh) for MVP; label this clearly |
| **Dataset Realism** | Research highlights gap between benchmark datasets and production data | Project must use public datasets | Acknowledge this limitation explicitly; simulate realistic event injection |
| **SOAR Automation** | Research envisions full closed-loop automated response | Student team cannot integrate with external systems | Implement "response suggestions" and simulated one-click actions as proxy |
| **Explainability Urgency** | Research identifies XAI as a critical gap needed now | Not explicitly listed in PPD | **[REC]** Implement SHAP explainability — it differentiates the project and addresses a research gap |

---

### 1.3.4 Research Gap This Project Addresses

**[REC]** SENTINEL can legitimately claim to address the following gap identified in **[Doc 1]**:

> *"The gap between research prototypes and real-world deployable SOC platforms."*

By building a complete, end-to-end, deployable platform that integrates the full stack from data ingestion through ML detection to alert management, incident response, and an AI assistant — SENTINEL demonstrates the **integration path** that most individual research papers stop short of. The paper explicitly notes that most work focuses on individual ML components in isolation; SENTINEL combines them in a coherent, operable system.

Additionally, by implementing **SHAP-based alert explainability**, SENTINEL contributes a practical response to the explainability gap the paper identifies as critical for analyst adoption.

---

### 1.3.5 What Makes SENTINEL Different From a Conventional SIEM Dashboard

| Dimension | Conventional SIEM Dashboard | SENTINEL |
|---|---|---|
| **Detection Logic** | Static signature rules written by humans | ML models learning patterns from data |
| **Alert Generation** | Rule trigger = alert (1:1) | ML anomaly score + classification → prioritized alert |
| **False Positive Handling** | Tune rules manually (imprecise) | ML precision optimization + analyst feedback loop |
| **Alert Context** | Raw log fields | Enriched with behavioral context, risk score, SHAP explanation |
| **Analyst Support** | Analyst queries raw data via search language | AI assistant answers questions in natural language |
| **Adaptability** | Rules must be manually updated for new threats | ML models can be retrained as threat landscape evolves |
| **Alert Volume** | Shows all alerts equally | Prioritizes alerts by ML-derived severity; groups related alerts |
| **Incident Workflow** | Often separate ticketing tool | Integrated incident management with alert linkage |
| **Model Transparency** | N/A | SHAP feature importance shown per alert |
| **Performance Measurement** | No ML metrics | Model precision, recall, F1, drift metrics in dashboard |

---

# PART 2: PRODUCT DEFINITION

---

## Section 2.1: Product Identity

---

### Product Name: **SENTINEL**

**Full Name:** SENTINEL — Security Event Network for Threat Intelligence, Enumeration, and Layered defense

**Tagline:** *"AI-Augmented Security Operations. See More. Respond Faster. Understand Why."*

---

### Full Description

SENTINEL is a full-stack, AI/ML-powered Security Operations Center platform designed to empower security analysts with intelligent threat detection, automated alert prioritization, and conversational AI assistance. Built on a modern web technology stack (React.js, FastAPI, PostgreSQL), SENTINEL integrates trained machine learning models directly into the analyst workflow — not as a black box, but as a transparent, explainable intelligence layer that augments human judgment.

SENTINEL is architected around the 4-layer reference model validated by academic research: data ingestion and normalization, AI/ML analytics, intelligent alert management, and automated response orchestration. It uses publicly available cybersecurity datasets (CICIDS2017, UNSW-NB15) to train models that detect anomalies, classify threats, and score alert severity — translating raw security telemetry into actionable, prioritized intelligence.

What distinguishes SENTINEL from a conventional SIEM dashboard is its full integration of the intelligence loop: events are not just stored and searched, they are analyzed, explained, and surfaced to analysts with context — including which features drove the ML decision, related incidents, and suggested response actions.

---

### Vision Statement

> To demonstrate that a small, skilled engineering team can build a coherent, end-to-end AI-augmented SOC platform that closes the gap between academic ML research and practical security operations — making intelligent, explainable threat detection accessible without enterprise-scale infrastructure.

---

### Problem Statement

Security Operations Centers are drowning. The volume of security events generated by modern infrastructure exceeds what human analysts can process, and conventional rule-based tools amplify rather than solve this problem by flooding analysts with alerts — most of them false positives. The result is alert fatigue, slow incident response, and security gaps that attackers exploit. Meanwhile, the AI/ML research community has produced powerful detection algorithms that remain locked in academic papers, never integrated into a usable, deployable platform. SENTINEL bridges this gap.

---

## Section 2.2: Target Users & Personas

---

### Persona 1: SOC Analyst — Tier 1 (L1)

**Role:** First-line alert monitor and triage specialist

**Responsibilities:**
- Monitor the alert queue throughout the shift
- Acknowledge, investigate, and classify incoming alerts
- Escalate confirmed threats to Tier 2
- Close false positives with disposition notes
- Follow established triage playbooks

**Pain Points:**
- Overwhelmed by high alert volume; cannot process all alerts in a shift
- Spends most time on false positives — frustrating and demoralizing
- Limited experience with complex attack patterns; needs guidance
- Must consult documentation and colleagues for unfamiliar threat types
- Alert context is often insufficient; requires multiple tool pivots to gather info

**What They Need From SENTINEL:**
- A clearly prioritized alert queue — highest severity first
- Alert explanations: "Why is this flagged? What features triggered it?"
- One-click access to related events and historical context
- An AI assistant they can ask "What is this type of attack? How do I respond?"
- Fast UI with minimal clicks to triage an alert

**Permissions:** View alerts, acknowledge alerts, close false positives, create incidents, escalate alerts. Cannot manage users, modify ML configuration, or access admin settings.

---

### Persona 2: SOC Analyst — Tier 2 (L2)

**Role:** Senior analyst for complex incident investigation and threat hunting

**Responsibilities:**
- Receive escalated incidents from Tier 1
- Conduct deep-dive forensic investigation across multiple data sources
- Correlate alerts into a coherent incident narrative
- Identify attack scope, timeline, and root cause
- Coordinate containment and remediation actions
- Produce detailed incident reports

**Pain Points:**
- Must manually correlate data across disconnected tools
- Threat hunting in raw log data is extremely time-consuming
- Lacks automated correlation of related alerts across different detection sources
- Incident documentation is tedious and pulls time from investigation

**What They Need From SENTINEL:**
- Full incident view linking all related alerts and events
- Timeline visualization of an attack's progression
- Advanced filtering and search over raw events
- AI assistant for log analysis and threat intelligence queries
- Model explanation details to validate or challenge ML findings
- Ability to run ad-hoc queries on event data

**Permissions:** All Tier 1 permissions plus: view all events, run advanced search, manage incidents (assign, update, resolve), view ML model details and SHAP explanations.

---

### Persona 3: Security Administrator

**Role:** Platform configuration and user lifecycle manager

**Responsibilities:**
- Manage user accounts and role assignments
- Configure alerting thresholds and notification settings
- Monitor system health and performance
- Manage data retention policies
- Oversee ML model retraining schedules
- Ensure audit log integrity

**Pain Points:**
- Configuration changes in conventional SIEMs are complex and risk causing outages
- Lacks visibility into ML model behavior — cannot tell when models degrade
- User provisioning is often manual and poorly documented

**What They Need From SENTINEL:**
- Clean admin panel for user and role management
- System health dashboard (API latency, DB status, event ingestion rate)
- ML model performance metrics at a glance
- Configurable alert threshold settings
- Audit log viewer

**Permissions:** Full access to admin panel, user management, system configuration, ML configuration. Cannot directly modify source code or database schema.

---

### Persona 4: Security Engineer

**Role:** Platform developer, ML model maintainer, and integration architect

**Responsibilities:**
- Maintain and retrain ML models as the threat landscape evolves
- Build and test new detection rules and model configurations
- Integrate new data sources into the ingestion pipeline
- Monitor model drift and performance degradation
- Conduct adversarial testing of detection models

**Pain Points:**
- No standardized interface for model deployment and versioning in SOC tools
- Cannot monitor live model performance without custom tooling
- Lacks feedback loop from analyst alert dispositions to model improvement

**What They Need From SENTINEL:**
- ML pipeline management: retrain triggers, model version control
- Dataset management: upload new training data, preview feature distributions
- Model performance dashboard: precision, recall, F1, confusion matrix, ROC curve
- Alert-to-label feedback mechanism: analyst dispositions feed back to training data
- API documentation for integration development

**Permissions:** Full access to ML pipeline, dataset management, model configuration, API. Read access to all alerts and incidents. Cannot manage user accounts beyond their own.

---

## Section 2.3: Primary Use Cases

---

### UC-01: Real-Time Security Event Ingestion

**Actor:** System (automated)  
**Preconditions:** Data source is configured; ingestion service is running  
**Main Flow:**
1. Security events arrive via file upload, API endpoint, or simulated stream
2. Ingestion service parses events into normalized schema fields
3. Parsed events are enriched (e.g., IP geolocation, known-bad list lookup)
4. Normalized events are stored in the event database
5. Events are queued for ML analysis pipeline

**Postconditions:** Events are stored, normalized, and queued for detection

---

### UC-02: ML Threat Detection on Ingested Events

**Actor:** System (automated)  
**Preconditions:** Trained ML models are loaded; events are in the detection queue  
**Main Flow:**
1. Detection engine pulls events from the queue in batches
2. Feature extraction transforms event fields into ML model input vectors
3. Anomaly detection model scores each event (anomaly score 0–1)
4. Classification model predicts threat type for high-score events
5. SHAP values are computed for predictions above a threshold
6. Detection results (score, type, SHAP) are stored with the event

**Postconditions:** Every processed event has an anomaly score, optional threat classification, and optional SHAP explanation

---

### UC-03: Intelligent Alert Generation

**Actor:** System (automated)  
**Preconditions:** Detection results exist for events; alert creation threshold configured  
**Main Flow:**
1. Alert generation service evaluates events exceeding the anomaly threshold
2. Related events are clustered into alert groups
3. Alert severity score is computed from anomaly score, threat type, and asset criticality
4. Alert is created with: ID, timestamp, severity, threat type, linked events, SHAP features
5. Alert is added to the analyst alert queue in priority order
6. Notifications are dispatched (dashboard update, optional email)

**Postconditions:** Alert exists in the queue with full context; analysts can see and act on it

---

### UC-04: Tier 1 Alert Triage

**Actor:** Tier 1 SOC Analyst  
**Preconditions:** Analyst is authenticated; alerts exist in the queue  
**Main Flow:**
1. Analyst opens the alert queue — sees alerts sorted by severity
2. Analyst clicks on an alert to open detail view
3. System displays: event data, anomaly score, SHAP explanation, threat classification, related events
4. Analyst reviews the evidence and consults AI assistant if needed
5. Analyst makes a disposition decision: Escalate / False Positive / Close
6. If escalating: analyst selects or creates an incident; alert is linked
7. Analyst adds notes and submits the disposition

**Postconditions:** Alert is dispositioned; if escalated, incident is created; analyst notes are recorded

---

### UC-05: Incident Investigation (Tier 2)

**Actor:** Tier 2 SOC Analyst  
**Preconditions:** Incident exists and is assigned to Tier 2 analyst  
**Main Flow:**
1. Analyst opens their incident queue; selects assigned incident
2. System shows incident overview: linked alerts, timeline, affected assets, analyst notes
3. Analyst reviews all linked alerts and their underlying events
4. Analyst searches raw events for additional context using the event search interface
5. Analyst queries the AI assistant for threat intelligence on indicators found
6. Analyst updates the incident: adds findings, adjusts scope, identifies root cause
7. Analyst coordinates response: selects recommended actions or manually logs actions taken
8. Analyst marks incident Resolved and fills in the incident report template

**Postconditions:** Incident is resolved; full timeline, findings, and actions are documented

---

### UC-06: AI SOC Assistant Query

**Actor:** SOC Analyst (Tier 1 or Tier 2)  
**Preconditions:** Analyst is authenticated; AI assistant is enabled  
**Main Flow:**
1. Analyst opens the AI assistant panel
2. Analyst types a natural language question (e.g., "Explain this alert", "What is a brute force attack?", "What MITRE technique does this match?")
3. System sends the query plus relevant context (alert details, event fields) to the LLM
4. LLM generates a response: explanation, threat intelligence, suggested actions
5. Response is displayed in the chat panel with source references where available
6. Analyst can follow up with additional questions in the same conversation context

**Postconditions:** Analyst has actionable intelligence; interaction is logged for audit

---

### UC-07: ML Model Performance Monitoring

**Actor:** Security Engineer or Security Administrator  
**Preconditions:** ML models are deployed; alert disposition data exists  
**Main Flow:**
1. Engineer opens the ML Performance dashboard
2. System displays model metrics: precision, recall, F1, AUC-ROC (computed on validation data)
3. System shows analyst feedback metrics: false positive rate from analyst dispositions
4. System shows anomaly score distribution over time (drift indicator)
5. Engineer reviews metrics; if degradation detected, initiates retrain
6. Retraining job runs; new model evaluated against held-out test set
7. If new model outperforms current: engineer promotes it to active

**Postconditions:** Model performance is monitored; degraded models are retrained and updated

---

### UC-08: Automated Response Action

**Actor:** System (triggered) + SOC Analyst (approves)  
**Preconditions:** Alert is at Critical severity; automated response rules are configured  
**Main Flow:**
1. Alert is generated at Critical severity for a known threat type
2. System looks up the response playbook for this threat type
3. System presents recommended response actions to the analyst (e.g., "Block IP 192.168.1.5", "Disable user account")
4. Analyst reviews the recommendation and approves (or modifies and approves)
5. System executes the approved action (simulated in MVP; actual API call in production)
6. Action is logged in the incident timeline with timestamp and approver
7. System monitors subsequent events from the same source for recurrence

**Postconditions:** Response action is executed and documented; incident is updated

---

## Section 2.4: User Journeys

---

### Journey 1: Tier 1 Analyst — Morning Alert Triage

**Persona:** Alex, Tier 1 SOC Analyst, 1 year experience  
**Context:** Alex starts the morning shift. The overnight automated detection has generated 47 new alerts.

**Step-by-Step Journey:**

```
09:00  Alex logs into SENTINEL
       → Sees: "47 New Alerts | 3 Critical | 12 High | 32 Medium/Low"
       → Dashboard shows: threat trend spike around 03:00 AM

09:02  Alex sorts by severity — Critical alerts shown first
       Alert #1: "Brute Force — 192.168.10.5 → auth-server-01"
       Score: 0.94 | Classification: Brute Force Attack

09:03  Alex opens Alert #1
       → Sees: 847 failed SSH logins in 4 minutes (source IP, timestamps)
       → SHAP explanation: "Top features: login_frequency (+0.62), 
         unique_users_targeted (+0.21), off_hours_flag (+0.11)"
       → Related events: 3 prior alerts from same IP (last 48h)

09:04  Alex queries AI Assistant: "Is this IP known malicious?"
       → AI: "192.168.10.5 is an internal IP. This pattern matches 
         MITRE ATT&CK T1110 (Brute Force). Recommend checking if 
         this is an authorized scan or insider threat."

09:06  Alex decides: Escalate to Tier 2
       → Creates Incident: "Potential Brute Force — auth-server-01"
       → Links Alert #1 and 3 related historical alerts
       → Assigns to Tier 2 queue; adds note: "847 failed logins, 
         internal IP, check if authorized scan"

09:08  Alex moves to Alert #2 (High severity)
       → Score 0.71 | "Port Scan — 10.0.0.22"
       → SHAP: "port_diversity (+0.55), scan_speed (+0.30)"
       → Checks recent activity: same host scanned 3 subnets

09:10  Alex queries AI: "What response is recommended for a port scan?"
       → AI: "Common responses: verify if authorized (pentest?), 
         check asset inventory for 10.0.0.22, consider network 
         isolation if unrecognized."

09:12  Alex determines this is an authorized vulnerability scanner
       → Closes as False Positive: "Confirmed authorized Nessus scan"
       → Notes the scanner asset for future suppression

[Continues through remaining alerts — Alex triages 47 alerts in 90 minutes
 vs. estimated 4+ hours without ML prioritization]
```

**Key SENTINEL Features Used:** Priority-sorted alert queue, SHAP explanations, AI assistant, related event correlation, incident creation, false positive disposition

---

### Journey 2: Tier 2 Analyst — Complex Incident Investigation

**Persona:** Sam, Tier 2 SOC Analyst, 5 years experience  
**Context:** Sam receives an escalated incident: "Potential Brute Force — auth-server-01" from Alex.

```
10:30  Sam opens the incident assigned to them
       → Incident Overview: 4 linked alerts, 847+ events, 
         affected asset: auth-server-01

10:32  Sam reviews the alert timeline
       → 03:00–03:15: 847 failed SSH logins (Brute Force alert)
       → 03:16: 1 SUCCESSFUL SSH login from same source IP
       → 03:17: New process spawned on auth-server-01 (endpoint alert)
       → 03:22: Outbound connection to external IP 45.33.32.156

10:34  Sam recognizes pattern: Brute Force → Successful Login → 
       C2 Callback — potential compromise
       → Updates incident scope: "Possible host compromise, C2 activity"
       → Changes priority to: CRITICAL

10:35  Sam searches events: "source_ip=192.168.10.5 AND 
       event_type=authentication"
       → Finds the successful login event with username: "svc_backup"

10:37  Sam queries AI Assistant: 
       "45.33.32.156 — what do we know about this IP?"
       → AI: "45.33.32.156 is listed in multiple threat intel feeds 
         as a known C2 server for the Lazarus Group (DPRK-linked). 
         This indicates possible APT activity."

10:40  Sam escalates actions:
       → Recommended Action: "Isolate auth-server-01 from network"
       → Recommended Action: "Disable svc_backup account"
       → Approves both actions (simulated execution in SENTINEL)
       → Both logged in incident timeline with Sam's approval

10:45  Sam documents findings in incident report:
       → Attack vector: SSH brute force
       → Compromised account: svc_backup
       → Indicators: 192.168.10.5, 45.33.32.156, new process spawn
       → Response: host isolated, account disabled
       → MITRE mapping: T1110 (Brute Force), T1078 (Valid Accounts), 
         T1041 (Exfiltration over C2)

11:00  Sam marks incident: "Contained — Pending Forensic Review"
       → Incident report auto-formatted and ready for management
```

**Key SENTINEL Features Used:** Incident timeline, event search, alert correlation, AI threat intelligence, response actions, incident report generation

---

### Journey 3: Security Admin — ML Model Performance Review

**Persona:** Jordan, Security Administrator  
**Context:** Weekly Friday model performance review

```
14:00  Jordan opens ML Performance Dashboard

14:01  Reviews current model metrics (last 7 days):
       Anomaly Detector (Isolation Forest):
       → Precision: 0.87 | Recall: 0.91 | F1: 0.89
       → Analyst FP rate (from dispositions): 23%  ← elevated!
       → Anomaly score distribution: mean shifted right vs. last week

14:03  Drills into False Positive Analysis:
       → 68% of FPs are from source: "10.0.0.0/8 internal subnet"
       → Pattern: backup jobs running 02:00–04:00 flagged as anomalous
       → Root cause: model hasn't seen weekend backup patterns in training

14:06  Jordan reviews options:
       → Option A: Adjust threshold (quick fix, reduces recall)
       → Option B: Retrain with new data including backup activity
       → Option B is preferred for long-term health

14:08  Jordan initiates retraining:
       → Selects: "Include last 30 days of analyst-labeled data"
       → Schedules: "Run at 02:00 AM Saturday (low traffic)"
       → System confirms: "Retraining job scheduled"

14:10  Reviews Threat Classification Model:
       → Precision: 0.92 | Recall: 0.88 | F1: 0.90
       → Confusion matrix: some misclassification between 
         "Port Scan" and "Recon" — acceptable overlap

14:15  Checks system health:
       → Event ingestion rate: 1,240 events/min ✅
       → API p95 latency: 180ms ✅
       → Detection pipeline lag: 8 seconds ✅
       → DB storage: 67% capacity (flag for review in 2 weeks)

14:20  Jordan documents the weekly review in the admin log
       → Notes: Retraining scheduled; backup job suppression rule 
         to be evaluated post-retraining
```

**Key SENTINEL Features Used:** ML performance dashboard, analyst feedback metrics, confusion matrix, retraining scheduler, system health monitoring

---

## Section 2.5: Core Capabilities & Value Proposition

---

### Core Capabilities

| Capability | Description |
|---|---|
| **Intelligent Event Ingestion** | Accepts and normalizes security events from multiple simulated sources into a unified schema |
| **ML Anomaly Detection** | Isolation Forest model identifies statistical anomalies in event streams without requiring labeled attack data |
| **Threat Classification** | Supervised ML classifiers categorize detected threats by type (brute force, port scan, DDoS, etc.) |
| **Explainable AI Alerts** | SHAP values surface the top contributing features for each ML prediction, making decisions transparent |
| **Intelligent Alert Prioritization** | ML-derived severity scores sort alerts by risk; related alerts are grouped to reduce noise |
| **Conversational AI Assistant** | LLM-powered chat interface answers analyst questions, explains threats, and suggests responses |
| **Integrated Incident Management** | Full incident lifecycle from alert to resolution, with timeline, assignments, and documentation |
| **Automated Response Suggestions** | Playbook-driven response recommendations with one-click approval and audit trail |
| **Model Performance Analytics** | Real-time visibility into ML model accuracy, analyst feedback metrics, and anomaly score drift |
| **Role-Based Access Control** | Fine-grained permissions ensuring each user sees and does only what their role requires |

---

### Value Proposition

**For Security Analysts:**
- Spend time on real threats, not false positives — ML pre-filters the noise
- Understand *why* an alert was raised, not just *that* it was raised
- Get instant expert-level guidance through the AI assistant without waiting for senior colleagues
- Complete triage faster with prioritized queues and rich alert context

**For Security Teams:**
- Measurably reduce Mean Time to Detect (MTTD) and Mean Time to Respond (MTTR)
- Build institutional knowledge through documented incidents and AI-assisted reporting
- Maintain ML model quality through the analyst feedback loop

**For the Student Project:**
- Demonstrates end-to-end integration of AI/ML research into a deployable platform
- Addresses a documented real-world problem with a technically rigorous solution
- Produces evaluable deliverables: working software + trained models + measured performance metrics

---

# PART 3: PRODUCT REQUIREMENTS DOCUMENT (PRD)

---

## Section 3.1: Executive Summary

SENTINEL is an AI/ML-powered Security Operations Center platform built as a student engineering project to demonstrate the practical integration of machine learning into security operations workflows. The platform addresses the well-documented problem of alert fatigue and manual overload in SOC environments by applying trained ML models to automate threat detection, alert prioritization, and analyst assistance.

The platform consists of a React.js frontend, FastAPI backend, PostgreSQL database, and Python-based ML pipeline. ML models are trained on publicly available cybersecurity datasets (CICIDS2017, UNSW-NB15) and deployed as inference services within the application. The AI assistant is powered by a large language model API integration.

SENTINEL's MVP delivers a complete, demonstrable, end-to-end SOC workflow: from raw security event ingestion through ML detection, explainable alert generation, alert triage, incident management, and automated response suggestions — all within a single cohesive web application.

---

## Section 3.2: Problem Statement (Detailed)

### The Alert Fatigue Crisis

Modern enterprise networks generate security events at a rate that fundamentally exceeds human processing capacity. Security Operations Centers operating conventional SIEM platforms face:

- **Volume Overload:** An enterprise network can generate hundreds of thousands of security events per day. Human analysts have finite processing capacity.
- **Signal-to-Noise Degradation:** Conventional rule-based detection generates high volumes of alerts, the majority of which are false positives. This inverts analyst incentives — the optimal strategy for a fatigued analyst is to dismiss alerts quickly, not investigate them thoroughly.
- **Static Detection:** Rule-based systems cannot detect novel attack patterns. Attackers who understand the rule set can evade detection by staying just below rule thresholds.
- **Reactive Posture:** By the time a rule fires and an alert is reviewed, attackers may have already achieved their objective. MTTD (Mean Time to Detect) in many organizations is measured in days or weeks.
- **Expertise Barrier:** Effective triage requires deep security expertise. Tier 1 analysts, who handle the highest alert volume, often have the least experience — a structural mismatch.
- **Tool Fragmentation:** SOC analysts commonly work across 5–10 disconnected tools to gather context for a single alert, multiplying time per alert.

### The Research-Practice Gap

Simultaneously, the AI/ML research community has produced highly effective algorithms for anomaly detection, threat classification, and behavioral analytics — but these remain largely confined to academic publications and benchmark datasets, not deployed in usable SOC tools. SENTINEL's purpose is to close this gap.

---

## Section 3.3: Product Objectives (SMART)

| ID | Objective | Specific | Measurable | Achievable | Relevant | Time-Bound |
|---|---|---|---|---|---|---|
| OBJ-01 | Demonstrate ML-based detection efficacy | Anomaly detection model achieves F1 ≥ 0.85 on CICIDS2017 test set | F1 score metric | Achievable with Isolation Forest/RF on public dataset | Core project requirement | By model training milestone |
| OBJ-02 | Demonstrate threat classification | Classifier achieves accuracy ≥ 0.85 on multi-class threat type prediction | Accuracy, per-class F1 | Achievable with XGBoost on labeled dataset | Core requirement | By model training milestone |
| OBJ-03 | Deliver full SOC workflow | End-to-end flow from event ingest to incident resolution functional | Integration test pass | Achievable with defined stack | Core project requirement | By final submission |
| OBJ-04 | Implement explainable AI | SHAP feature importance values displayed for ≥ 90% of generated alerts | % of alerts with SHAP | Achievable with SHAP library | Research gap contribution | By MVP completion |
| OBJ-05 | Deliver AI assistant | AI assistant correctly answers ≥ 80% of test security queries (team evaluation) | Manual evaluation | Achievable with LLM API | Core requirement | By MVP completion |
| OBJ-06 | Demonstrate alert reduction | ML pre-filtering reduces alerts requiring manual review by a measurable percentage vs. a no-filter baseline | Alert count comparison | Demonstrable in test scenario | Core value proposition | By demonstration |
| OBJ-07 | Demonstrate RBAC | All 4 user roles have correct permissions enforced (no unauthorized access in test) | Permission test suite | Achievable with FastAPI middleware | Security requirement | By integration testing |
| OBJ-08 | Performance | P95 API response time ≤ 500ms for all dashboard endpoints under normal load | Load test metrics | Achievable with PostgreSQL indexing | NFR | Before final demo |

---

## Section 3.4: Functional Requirements

---

### Module A: Authentication & Role-Based Access Control (RBAC)

---

#### AUTH-001: User Authentication

| Field | Detail |
|---|---|
| **Feature ID** | AUTH-001 |
| **Feature Name** | Username/Password Authentication |
| **Description** | Users must authenticate with a username and password to access the SENTINEL platform. Passwords are stored as bcrypt hashes. Successful authentication returns a JWT access token. |
| **User Story** | As a SOC analyst, I want to log in with my credentials so that I can access the platform securely and my session is tracked for audit purposes. |
| **Acceptance Criteria** | 1. Users can log in with valid username + password and receive a JWT token. 2. Invalid credentials return HTTP 401 with no token. 3. Passwords are stored as bcrypt hashes (never plaintext). 4. JWT tokens expire after a configurable duration (default: 8 hours). 5. All subsequent API requests require a valid Bearer token. |
| **Priority** | P0 |
| **Dependencies** | None |
| **Complexity** | Low |

---

#### AUTH-002: Role-Based Access Control

| Field | Detail |
|---|---|
| **Feature ID** | AUTH-002 |
| **Feature Name** | RBAC Enforcement |
| **Description** | The system enforces role-based permissions for all API endpoints. Roles: Viewer (read-only dashboard), Analyst-L1 (triage alerts), Analyst-L2 (manage incidents), Administrator (user/system management), Engineer (ML pipeline). |
| **User Story** | As a Security Administrator, I want to assign roles to users so that each person can only access features appropriate for their responsibilities. |
| **Acceptance Criteria** | 1. Five roles defined with documented permission matrices. 2. API endpoints return HTTP 403 for requests from insufficient-role users. 3. UI hides/disables controls the user's role cannot access. 4. Admin can assign/modify user roles from the admin panel. 5. Role changes take effect on the user's next authentication. |
| **Priority** | P0 |
| **Dependencies** | AUTH-001 |
| **Complexity** | Low |

---

#### AUTH-003: User Management (Admin)

| Field | Detail |
|---|---|
| **Feature ID** | AUTH-003 |
| **Feature Name** | User Lifecycle Management |
| **Description** | Administrators can create, modify, enable/disable, and delete user accounts. Each account has: username, email, role, status (active/inactive), and creation timestamp. |
| **User Story** | As a Security Administrator, I want to manage user accounts so that I can onboard new analysts and revoke access for departed staff. |
| **Acceptance Criteria** | 1. Admin can create new user accounts with role assignment. 2. Admin can change a user's role. 3. Admin can disable an account (user cannot log in but records preserved). 4. Admin can reset a user's password. 5. All user management actions are logged in the audit log. |
| **Priority** | P1 |
| **Dependencies** | AUTH-001, AUTH-002 |
| **Complexity** | Low |

---

#### AUTH-004: Audit Logging

| Field | Detail |
|---|---|
| **Feature ID** | AUTH-004 |
| **Feature Name** | Security Audit Log |
| **Description** | All authentication events (login, logout, failed login) and all sensitive actions (alert disposition, incident updates, user management, response actions) are written to an immutable audit log with timestamp and user identity. |
| **User Story** | As a Security Administrator, I want an audit trail of all system actions so that I can support compliance reviews and investigate suspicious internal activity. |
| **Acceptance Criteria** | 1. Login and logout events logged with timestamp, username, IP, and outcome. 2. All alert dispositions logged with analyst ID, timestamp, and disposition choice. 3. All incident state changes logged. 4. All response actions logged with approver. 5. Audit log is viewable by Administrators; not modifiable via UI. |
| **Priority** | P1 |
| **Dependencies** | AUTH-001 |
| **Complexity** | Low |

---

### Module B: Security Event Collection

---

#### SEC-001: Event Ingestion API

| Field | Detail |
|---|---|
| **Feature ID** | SEC-001 |
| **Feature Name** | Security Event REST API |
| **Description** | A REST API endpoint accepts security events as JSON payloads. Each event includes: timestamp, source IP, destination IP, protocol, port, event type, and additional metadata fields. The API validates event schema and queues events for processing. |
| **User Story** | As a Security Engineer, I want to send security events to SENTINEL via API so that the platform can process and analyze them in near-real-time. |
| **Acceptance Criteria** | 1. POST /api/events accepts well-formed JSON events and returns 201 Created. 2. Malformed events return 400 with descriptive error. 3. API is authenticated (requires valid token). 4. Events are persisted to the database within 1 second. 5. API accepts batch submissions (array of events in one request). |
| **Priority** | P0 |
| **Dependencies** | AUTH-001 |
| **Complexity** | Low |

---

#### SEC-002: CSV/File-Based Event Import

| Field | Detail |
|---|---|
| **Feature ID** | SEC-002 |
| **Feature Name** | Dataset File Import |
| **Description** | Administrators and Engineers can upload CSV files of security events (e.g., CICIDS2017 format) for bulk import and ML evaluation scenarios. The system parses, validates, and ingests the file contents as events. |
| **User Story** | As a Security Engineer, I want to upload a CSV dataset so that I can populate the platform with realistic events for demonstration and ML evaluation. |
| **Acceptance Criteria** | 1. Admin UI provides file upload for CSV import. 2. System validates CSV schema against expected columns. 3. Import progress is shown with event count processed. 4. Invalid rows are reported, valid rows are still imported. 5. Import completes for files up to 100MB within 60 seconds. |
| **Priority** | P0 |
| **Dependencies** | SEC-001, AUTH-002 |
| **Complexity** | Low |

---

#### SEC-003: Event Normalization

| Field | Detail |
|---|---|
| **Feature ID** | SEC-003 |
| **Feature Name** | Event Schema Normalization |
| **Description** | All ingested events are normalized to a common internal schema regardless of source format. Normalization includes: field mapping, type coercion, timestamp standardization (UTC), and enrichment (e.g., IP geolocation lookup from local database). |
| **User Story** | As a system, I want to normalize all events to a common schema so that ML models receive consistent, well-structured input regardless of source. |
| **Acceptance Criteria** | 1. All events are stored with consistent field names and types. 2. Timestamps are stored in UTC ISO-8601. 3. IP addresses are stored as strings; enrichment adds country/ASN if available. 4. Unknown/missing fields are stored as null, not omitted. 5. Normalization failures are logged; events are marked as "normalization_error" and stored. |
| **Priority** | P0 |
| **Dependencies** | SEC-001 |
| **Complexity** | Low |

---

#### SEC-004: Event Search & Filtering

| Field | Detail |
|---|---|
| **Feature ID** | SEC-004 |
| **Feature Name** | Event Query Interface |
| **Description** | Analysts (Tier 2) can search and filter events by any indexed field. Supported filters: time range, source IP, destination IP, event type, protocol, port, anomaly score range. Results are paginated. |
| **User Story** | As a Tier 2 analyst, I want to search raw events by IP address and time range so that I can gather context during an incident investigation. |
| **Acceptance Criteria** | 1. Event search UI supports field-based filtering with date range picker. 2. Results are returned and displayed within 3 seconds for queries over last 7 days. 3. Results are paginated (50 per page). 4. Analyst can export search results as CSV. 5. Each event result shows all normalized fields including anomaly score if computed. |
| **Priority** | P1 |
| **Dependencies** | SEC-003 |
| **Complexity** | Medium |

---

### Module C: Threat Detection Engine (Rule-Based)

---

#### DET-001: Rule-Based Detection

| Field | Detail |
|---|---|
| **Feature ID** | DET-001 |
| **Feature Name** | Configurable Detection Rules |
| **Description** | The system includes a set of pre-configured detection rules that complement ML detections. Rules evaluate event streams for known patterns: excessive failed logins within N minutes, port scan detection (>X distinct ports), DNS tunneling indicators, etc. |
| **User Story** | As a Security Administrator, I want rule-based detection to catch known attack patterns immediately, while ML handles the novel threats. |
| **Acceptance Criteria** | 1. At least 5 pre-configured detection rules are active by default. 2. Rules can be enabled/disabled by administrators. 3. Rule triggers generate alerts with the matching rule as the trigger source. 4. Rule parameters (thresholds) are configurable without code changes. 5. Rule-based alerts are distinguishable from ML-based alerts in the UI. |
| **Priority** | P1 |
| **Dependencies** | SEC-003 |
| **Complexity** | Medium |

---

### Module D: AI/ML Detection Engine

---

#### ML-001: Anomaly Detection Model

| Field | Detail |
|---|---|
| **Feature ID** | ML-001 |
| **Feature Name** | Isolation Forest Anomaly Detection |
| **Description** | An Isolation Forest model is trained on the baseline "normal" event data. At inference time, the model assigns an anomaly score (0–1) to each event. Events exceeding a configurable threshold are flagged as anomalous and queued for alert generation. |
| **User Story** | As a system, I want to automatically score every security event for anomalousness so that potential threats surface even if they don't match a known rule. |
| **Acceptance Criteria** | 1. Trained model is loaded at API startup. 2. Every ingested event receives an anomaly score within 5 seconds of ingestion. 3. Anomaly scores are stored with the event in the database. 4. Score threshold is configurable (default: 0.6). 5. Model achieves F1 ≥ 0.80 on the CICIDS2017 test split (documented in model card). |
| **Priority** | P0 |
| **Dependencies** | SEC-003 |
| **Complexity** | Medium |

---

#### ML-002: Threat Classification Model

| Field | Detail |
|---|---|
| **Feature ID** | ML-002 |
| **Feature Name** | Multi-Class Threat Classifier |
| **Description** | A supervised ML classifier (Random Forest or XGBoost) trained on labeled event data predicts the threat type for events that exceed the anomaly threshold. Output classes include: Brute Force, Port Scan, DDoS, SQL Injection, XSS, Normal, and others based on training data. |
| **User Story** | As a system, I want to classify detected anomalies by threat type so that analysts can immediately understand what kind of attack is occurring. |
| **Acceptance Criteria** | 1. Classifier is applied to all events with anomaly score > threshold. 2. Output is a predicted threat class with confidence probability. 3. Classifier achieves macro-averaged F1 ≥ 0.82 on test set. 4. Classification results are stored and displayed in the alert detail view. 5. Classifier gracefully handles events with missing features (uses imputed values). |
| **Priority** | P0 |
| **Dependencies** | ML-001, SEC-003 |
| **Complexity** | Medium |

---

#### ML-003: Explainability (SHAP)

| Field | Detail |
|---|---|
| **Feature ID** | ML-003 |
| **Feature Name** | SHAP-Based Alert Explanation |
| **Description** | For every alert generated by an ML detection, SHAP (SHapley Additive exPlanations) values are computed to identify the top contributing features. These are stored with the alert and displayed to analysts as a human-readable explanation. |
| **User Story** | As a Tier 1 analyst, I want to see why an alert was generated — which specific event features triggered the ML model — so I can quickly evaluate whether the detection is legitimate. |
| **Acceptance Criteria** | 1. SHAP values computed for all ML-generated alerts. 2. Top 5 contributing features displayed in alert detail with their direction (↑ increased score / ↓ decreased score). 3. SHAP computation completes within 2 seconds per alert. 4. Feature names are displayed in human-readable form (not raw column names). 5. SHAP explanation is included in incident report export. |
| **Priority** | P1 |
| **Dependencies** | ML-001, ML-002 |
| **Complexity** | Medium |

---

#### ML-004: Model Management & Retraining

| Field | Detail |
|---|---|
| **Feature ID** | ML-004 |
| **Feature Name** | ML Model Lifecycle Management |
| **Description** | Security Engineers can manage ML model versions, trigger retraining jobs, and promote new models to active status. The system maintains at least the current and one previous model version. |
| **User Story** | As a Security Engineer, I want to retrain and update the ML models when their performance degrades, without taking the platform offline. |
| **Acceptance Criteria** | 1. Admin UI shows current model version, training date, and performance metrics. 2. Engineer can trigger a retraining job with configurable parameters. 3. New model is evaluated against test set before promotion. 4. Model promotion is a one-click action with confirmation. 5. Previous model is preserved for rollback. |
| **Priority** | P1 |
| **Dependencies** | ML-001, ML-002 |
| **Complexity** | High |

---

### Module E: Intelligent Alert Management

---

#### ALT-001: Alert Generation

| Field | Detail |
|---|---|
| **Feature ID** | ALT-001 |
| **Feature Name** | Automated Alert Creation |
| **Description** | The system automatically generates alerts when events exceed the anomaly threshold or trigger detection rules. Each alert contains: ID, severity (Critical/High/Medium/Low), threat type, trigger source (ML/rule), linked events, SHAP explanation, timestamp, and status (New/Acknowledged/Closed). |
| **User Story** | As a system, I want to automatically create structured alerts from ML detections so that analysts have a clear, actionable work queue. |
| **Acceptance Criteria** | 1. Alert is created within 10 seconds of threshold-exceeding event detection. 2. Alert includes all required fields (ID, severity, type, trigger, events, timestamp, status). 3. Alert severity is computed from anomaly score + threat type weight. 4. Alerts are visible in the analyst queue immediately upon creation. 5. Alert creation events are logged in the audit log. |
| **Priority** | P0 |
| **Dependencies** | ML-001, ML-002, DET-001 |
| **Complexity** | Medium |

---

#### ALT-002: Alert Queue with Prioritization

| Field | Detail |
|---|---|
| **Feature ID** | ALT-002 |
| **Feature Name** | Priority-Sorted Alert Queue |
| **Description** | The alert management dashboard presents open alerts sorted by severity (Critical first) and within each severity by timestamp. The queue is filterable by severity, type, trigger source, date range, and status. |
| **User Story** | As a Tier 1 analyst, I want to see my alert queue sorted by severity so that I always work the most critical issues first without manually sorting. |
| **Acceptance Criteria** | 1. Alert queue defaults to: Status=New, sorted by Severity DESC, Timestamp DESC. 2. Filters for severity, type, source, date range, and analyst (assigned-to) work correctly. 3. Queue refreshes automatically every 30 seconds. 4. Alert count by severity is shown as a summary badge at the top of the queue. 5. Analyst can click any alert to open the detail view. |
| **Priority** | P0 |
| **Dependencies** | ALT-001 |
| **Complexity** | Low |

---

#### ALT-003: Alert Clustering / Grouping

| Field | Detail |
|---|---|
| **Feature ID** | ALT-003 |
| **Feature Name** | Related Alert Grouping |
| **Description** | Alerts that are related (same source IP, same attack type, within a time window) are linked together and shown as a group. This reduces duplication and helps analysts see attack scope at a glance. |
| **User Story** | As a Tier 1 analyst, I want related alerts from the same source or attack campaign to be grouped together so I don't process them as 10 separate alerts. |
| **Acceptance Criteria** | 1. Alerts from the same source IP within a 1-hour window for the same threat type are linked. 2. Alert detail view shows "Related Alerts" section with linked alert IDs and summaries. 3. Analyst can view all related alerts without leaving the current alert. 4. Grouping logic is applied during alert creation, not post-hoc. 5. Configuration allows adjusting the grouping time window. |
| **Priority** | P1 |
| **Dependencies** | ALT-001 |
| **Complexity** | Medium |

---

#### ALT-004: Alert Disposition Workflow

| Field | Detail |
|---|---|
| **Feature ID** | ALT-004 |
| **Feature Name** | Alert Triage Actions |
| **Description** | Analysts can take the following disposition actions on alerts: Acknowledge, Escalate (creates incident), False Positive (close with reason), Resolved (closed after action taken). All dispositions require a note. |
| **User Story** | As a Tier 1 analyst, I want to record my decision on each alert so that the team has a clear record of what was reviewed and what action was taken. |
| **Acceptance Criteria** | 1. Analyst can Acknowledge, Escalate, Mark False Positive, or Resolve any alert they can access. 2. All dispositions require a mandatory text note (minimum 10 characters). 3. Disposition is recorded with analyst ID, timestamp, and note in the audit log. 4. Escalate action creates an incident automatically with the alert linked. 5. Closed alerts move out of the default "New" queue view but remain searchable. |
| **Priority** | P0 |
| **Dependencies** | ALT-001, ALT-002, AUTH-002 |
| **Complexity** | Low |

---

### Module F: AI-Powered SOC Assistant

> **[Zero-Cost AI Engine Provider Update]:**  
> While the conceptual architecture, user stories, and acceptance criteria remain identical, the generative AI and conversational reasoning capabilities in Module F are powered via **free API endpoints from NVIDIA (build.nvidia.com / NVIDIA NIM Free Tier)** or a **Google Gemini API Key (Google AI Studio Free Tier)**. This eliminates GPU infrastructure requirements, reduces operational costs to zero, and allows the student team to switch between providers via simple environment variables (`LLM_PROVIDER=nvidia` or `LLM_PROVIDER=gemini`).

---

#### AI-001: Conversational SOC Assistant

| Field | Detail |
|---|---|
| **Feature ID** | AI-001 |
| **Feature Name** | AI Chat Assistant |
| **Description** | An LLM-powered chat interface embedded in the SENTINEL platform. Analysts can ask natural language questions. The system sends the question plus relevant context (current alert details, event fields, incident summary) to the LLM API and displays the response. |
| **User Story** | As a Tier 1 analyst, I want to ask the AI "What is a brute force attack and what should I do?" so that I get expert guidance instantly without leaving the platform. |
| **Acceptance Criteria** | 1. Chat panel is accessible from alert detail view and incident view. 2. Analyst can type any free-text question. 3. When opened from an alert, the alert context (threat type, source IP, SHAP features) is included in the LLM prompt automatically. 4. LLM response is displayed within 10 seconds. 5. Conversation history is maintained within the session. |
| **Priority** | P1 |
| **Dependencies** | AUTH-001, ALT-001 |
| **Complexity** | Medium |

---

#### AI-002: Alert Explanation Generation

| Field | Detail |
|---|---|
| **Feature ID** | AI-002 |
| **Feature Name** | AI-Generated Alert Summary |
| **Description** | For each ML-generated alert, the system automatically generates a plain-language explanation using the LLM: "This alert was generated because [X features were anomalous], suggesting a potential [threat type] attack from [source]." This is shown in the alert detail alongside the SHAP chart. |
| **User Story** | As a Tier 1 analyst, I want a plain English summary of why this alert exists so I can understand it in seconds without deep security expertise. |
| **Acceptance Criteria** | 1. Alert detail view shows an AI-generated explanation paragraph for all ML alerts. 2. Explanation references specific event data (IP, port, feature values). 3. Explanation includes the threat type name and a brief description. 4. Explanation is generated and cached at alert creation time. 5. If LLM API is unavailable, a fallback template explanation is shown. |
| **Priority** | P1 |
| **Dependencies** | ML-001, ML-002, ML-003, AI-001 |
| **Complexity** | Medium |

---

### Module G: Incident Management

---

#### INC-001: Incident Creation

| Field | Detail |
|---|---|
| **Feature ID** | INC-001 |
| **Feature Name** | Create Security Incident |
| **Description** | An incident is created either automatically (from alert escalation) or manually by analysts. Incidents have: ID, title, description, severity, status, assignee, linked alerts, timeline, and audit trail. |
| **User Story** | As a Tier 1 analyst, I want to create an incident when I confirm a threat so that the investigation is tracked through to resolution. |
| **Acceptance Criteria** | 1. Incident can be created from alert escalation (auto-populated fields) or manually. 2. All required fields (title, severity, assignee) must be completed before saving. 3. Linked alerts are shown in the incident's alert list. 4. Incident creation is logged in the audit trail with creator, timestamp, and initial state. 5. Created incident appears in the incident queue for all authorized users. |
| **Priority** | P0 |
| **Dependencies** | ALT-004, AUTH-002 |
| **Complexity** | Medium |

---

#### INC-002: Incident Lifecycle Management

| Field | Detail |
|---|---|
| **Feature ID** | INC-002 |
| **Feature Name** | Incident Status & Assignment |
| **Description** | Incidents move through status stages: New → In Progress → Contained → Resolved → Closed. Incidents can be reassigned between analysts. Each status change and reassignment is logged in the incident timeline. |
| **User Story** | As a Tier 2 analyst, I want to update an incident's status as my investigation progresses so that the team has real-time visibility into where we stand. |
| **Acceptance Criteria** | 1. Status transitions are enforced (cannot skip from New directly to Resolved). 2. Only authorized roles can close or resolve incidents. 3. Reassignment sends a notification (UI badge) to the new assignee. 4. Each status change is recorded in the incident timeline with actor and timestamp. 5. Incident dashboard shows count by status for all analysts. |
| **Priority** | P0 |
| **Dependencies** | INC-001, AUTH-002 |
| **Complexity** | Medium |

---

#### INC-003: Incident Timeline & Evidence

| Field | Detail |
|---|---|
| **Feature ID** | INC-003 |
| **Feature Name** | Incident Timeline View |
| **Description** | The incident detail view shows a chronological timeline of all events: alert trigger times, analyst actions, response actions taken, and investigator notes. Analysts can add notes to the timeline at any time. |
| **User Story** | As a Tier 2 analyst, I want to see the full timeline of an incident so I can understand the attack progression and what has already been done. |
| **Acceptance Criteria** | 1. Timeline shows all events in chronological order with timestamps. 2. Analyst notes are distinguishable from system events in the timeline. 3. Linked alert events are shown with their timestamps. 4. Response actions appear in the timeline when taken. 5. Timeline is exportable as part of the incident report. |
| **Priority** | P1 |
| **Dependencies** | INC-001, INC-002 |
| **Complexity** | Medium |

---

#### INC-004: Incident Report Generation

| Field | Detail |
|---|---|
| **Feature ID** | INC-004 |
| **Feature Name** | Automated Incident Report |
| **Description** | On demand (or upon incident closure), the system generates a structured incident report containing: executive summary, timeline, indicators of compromise, affected assets, response actions taken, and analyst notes. The AI assistant can optionally draft the executive summary. |
| **User Story** | As a Tier 2 analyst, I want to generate an incident report with one click so that I spend time investigating, not writing documentation. |
| **Acceptance Criteria** | 1. Report generation available to Tier 2 and Administrator roles. 2. Report exported as PDF or Markdown. 3. All linked alerts and their SHAP explanations are included. 4. Timeline section pulls from the incident timeline chronologically. 5. AI-drafted executive summary is generated and editable before export. |
| **Priority** | P2 |
| **Dependencies** | INC-003, AI-001 |
| **Complexity** | High |

---

### Module H: Automated Response

---

#### RESP-001: Response Playbook Engine

| Field | Detail |
|---|---|
| **Feature ID** | RESP-001 |
| **Feature Name** | Playbook-Based Response Recommendations |
| **Description** | For each threat type, a response playbook defines recommended actions (e.g., "Brute Force" → "Block source IP, Reset target account, Enable MFA"). When an alert matches a playbook, recommended actions are presented to the analyst for one-click approval. |
| **User Story** | As a Tier 1 analyst, I want the system to suggest what to do when I see a brute force alert so I don't have to recall the playbook from memory every time. |
| **Acceptance Criteria** | 1. At least 5 threat-type-specific playbooks are pre-configured. 2. Matching playbook recommendations are shown in alert detail view. 3. Analyst can approve, modify, or dismiss each recommended action. 4. Approved actions are logged in the audit trail. 5. Simulated action execution confirms success (actual external execution is deferred). |
| **Priority** | P1 |
| **Dependencies** | ALT-001, ML-002 |
| **Complexity** | Medium |

---

#### RESP-002: Simulated Response Actions

| Field | Detail |
|---|---|
| **Feature ID** | RESP-002 |
| **Feature Name** | Simulated Action Execution |
| **Description** | In MVP, response actions are simulated (no actual network changes): the system logs the action as "executed" and shows success confirmation. This creates the full UX of automated response without requiring external system integration. |
| **User Story** | As a student project demonstrator, I want simulated response actions to function in the demo so that the full SOAR-like workflow is visible without real infrastructure. |
| **Acceptance Criteria** | 1. Approving a response action logs it as executed with timestamp. 2. Incident timeline shows the action as a completed event. 3. UI confirms "Action simulated: [action name]" with a visual indicator. 4. Architecture is designed so simulated actions can be replaced with real API calls in future. 5. The simulated nature is disclosed in the UI. |
| **Priority** | P1 |
| **Dependencies** | RESP-001 |
| **Complexity** | Low |

---

### Module I: Threat Intelligence

---

#### TI-001: Indicator of Compromise Display

| Field | Detail |
|---|---|
| **Feature ID** | TI-001 |
| **Feature Name** | IoC Enrichment Display |
| **Description** | When an alert is generated, the system checks known IoC lists (loaded from public threat intelligence feeds in CSV/JSON format) for matching IPs, domains, or hashes. Matches are displayed in the alert detail view. |
| **User Story** | As a Tier 1 analyst, I want to see immediately if an alert's source IP is a known threat actor so I can prioritize accordingly. |
| **Acceptance Criteria** | 1. At least one public IoC feed is loaded at startup. 2. Source and destination IPs in every alert are checked against IoC lists. 3. IoC matches are prominently displayed in alert detail view. 4. IoC list can be manually updated by administrators. 5. Matching IoC shows: type, source feed, and any available context (threat actor, campaign). |
| **Priority** | P1 |
| **Dependencies** | ALT-001 |
| **Complexity** | Medium |

---

#### TI-002: AI-Assisted Threat Intelligence Query

| Field | Detail |
|---|---|
| **Feature ID** | TI-002 |
| **Feature Name** | LLM Threat Intelligence via AI Assistant |
| **Description** | Analysts can query the AI assistant for threat intelligence: "What is known about APT29?" or "What MITRE techniques does a Ryuk ransomware attack use?" The LLM uses its training knowledge to provide relevant intelligence, with a disclaimer about knowledge cutoff. |
| **User Story** | As a Tier 2 analyst, I want to query the AI for threat actor intelligence so I can contextualise an incident without switching to external research tools. |
| **Acceptance Criteria** | 1. AI assistant responds to threat intelligence queries with relevant information. 2. Response includes MITRE ATT&CK technique references where applicable. 3. Disclaimer is shown: "AI knowledge cutoff: [date]. Verify with live threat intelligence for recent events." 4. Response is generated within 10 seconds. 5. Interaction is logged in the audit trail. |
| **Priority** | P2 |
| **Dependencies** | AI-001 |
| **Complexity** | Low |

---

### Module J: Analytics Dashboard

---

#### DASH-001: Security Overview Dashboard

| Field | Detail |
|---|---|
| **Feature ID** | DASH-001 |
| **Feature Name** | Main Analytics Dashboard |
| **Description** | The main landing page shows key security metrics: total events (24h), open alerts by severity, active incidents, top threat types, top source IPs, and a time-series chart of alert volume. All metrics update on page load. |
| **User Story** | As a SOC analyst, I want a dashboard that shows the current security posture at a glance so that I can quickly understand if we have an active incident when I log in. |
| **Acceptance Criteria** | 1. Dashboard loads within 3 seconds. 2. All metrics reflect the current database state at page load. 3. Alert count by severity is shown with colored badges (red=Critical, orange=High, yellow=Medium). 4. Time-series chart shows alert volume for the last 24 hours in hourly buckets. 5. Top 5 source IPs by alert count are listed. |
| **Priority** | P0 |
| **Dependencies** | ALT-001, INC-001 |
| **Complexity** | Medium |

---

#### DASH-002: ML Model Performance Dashboard

| Field | Detail |
|---|---|
| **Feature ID** | DASH-002 |
| **Feature Name** | ML Performance Metrics |
| **Description** | A dedicated dashboard shows ML model performance: precision, recall, F1 score, AUC-ROC (from last evaluation), confusion matrix, analyst feedback false positive rate, and anomaly score distribution over time. |
| **User Story** | As a Security Engineer, I want to monitor my ML models' performance continuously so that I can retrain them before accuracy degrades significantly. |
| **Acceptance Criteria** | 1. Dashboard shows current model metrics with evaluation date. 2. Confusion matrix is displayed as a color-coded grid. 3. Analyst feedback FP rate (dispositions) is shown over last 7 days. 4. Anomaly score distribution chart shows last 7 days vs. the training baseline. 5. "Trigger Retraining" button is accessible from this page (Engineer role only). |
| **Priority** | P1 |
| **Dependencies** | ML-001, ML-002, ML-004 |
| **Complexity** | High |

---

#### DASH-003: Alert Trend Analytics

| Field | Detail |
|---|---|
| **Feature ID** | DASH-003 |
| **Feature Name** | Alert Trend & Distribution Analytics |
| **Description** | Historical view of alert trends: volume over time, severity distribution, top threat types, mean time to acknowledge, and false positive rate trend. Filterable by date range. |
| **User Story** | As a Security Administrator, I want to see alert trends over time so that I can identify whether our security posture is improving or degrading. |
| **Acceptance Criteria** | 1. Date range picker filters all charts. 2. Alert volume chart shows daily buckets for the selected period. 3. Threat type pie/bar chart shows distribution for selected period. 4. Mean time to acknowledge computed from alert creation to first analyst action. 5. False positive rate shown as % of closed alerts marked as FP. |
| **Priority** | P2 |
| **Dependencies** | ALT-001, ALT-004 |
| **Complexity** | Medium |

---

## Section 3.5: Non-Functional Requirements

---

### NFR-01: Performance

| Sub-requirement | Target |
|---|---|
| Dashboard page load time | P95 ≤ 3 seconds under normal load |
| API response time (non-ML) | P95 ≤ 500ms |
| Event ingestion throughput | ≥ 500 events/minute sustained |
| ML anomaly scoring latency | ≤ 5 seconds from event storage to score stored |
| Alert generation latency | ≤ 10 seconds from detection to alert appearing in queue |
| Search query response | P95 ≤ 3 seconds for queries over last 7 days of data |
| SHAP computation | ≤ 2 seconds per alert |

---

### NFR-02: Scalability

| Sub-requirement | Target |
|---|---|
| Event storage | Support at least 1 million events in the demo database without performance degradation |
| Alert storage | Support at least 10,000 alerts without UI performance impact |
| Concurrent users | Support at least 5 concurrent authenticated users without degradation |
| Horizontal scalability | Architecture documented to support horizontal scaling of API and ML tiers (even if not implemented in MVP) |

> **[REC]** Use PostgreSQL indexing on timestamp, source_ip, and anomaly_score columns from day one. These are the primary query paths.

---

### NFR-03: Security

| Sub-requirement | Target |
|---|---|
| Authentication | All API endpoints require valid JWT; no unauthenticated access to data |
| Password storage | bcrypt with cost factor ≥ 12; no plaintext passwords ever stored |
| Transport encryption | HTTPS required for all API communication (TLS 1.2+) |
| SQL injection | All database queries use parameterized statements (no string concatenation) |
| CORS | API server enforces restrictive CORS policy |
| Sensitive data | API responses do not expose internal stack traces or database details in error messages |
| Session management | JWT expiry enforced server-side; refresh token rotation recommended |

---

### NFR-04: Reliability

| Sub-requirement | Target |
|---|---|
| Uptime during demo | 100% availability during scheduled demonstrations |
| Data durability | No data loss on clean restart; all events, alerts, incidents persisted in DB |
| Error handling | All API errors return structured JSON responses with meaningful codes |
| Graceful degradation | If LLM API is unavailable, platform remains functional (AI features show "unavailable" message) |
| ML model loading | Platform starts successfully even if model files are not found (logs warning; detection features disabled) |

---

### NFR-05: Usability

| Sub-requirement | Target |
|---|---|
| Learnability | A new Tier 1 analyst can triage their first alert within 5 minutes of first use |
| Responsiveness | UI is usable on 1920×1080 and 1366×768 screen resolutions |
| Accessibility | WCAG 2.1 Level A compliance for all core workflows |
| Error messages | All form validation errors are shown inline with clear explanatory text |
| Loading states | All async operations show a loading indicator; no silent hangs |

---

### NFR-06: Maintainability

| Sub-requirement | Target |
|---|---|
| Code documentation | All API endpoints documented with docstrings; OpenAPI spec auto-generated |
| Modularity | ML pipeline, API, and frontend are independently deployable modules |
| Configuration | All environment-specific values (DB URL, API keys, thresholds) in environment variables or config files |
| Testing | Unit test coverage ≥ 70% for backend business logic; integration tests for all API endpoints |
| Logging | Structured application logs (JSON) written for all significant events |

---

### NFR-07: Portability

| Sub-requirement | Target |
|---|---|
| Development environment | Runs on Windows 10+, macOS 12+, Ubuntu 20.04+ |
| Minimum hardware | Functional on 8GB RAM, 4-core CPU, 20GB free disk |
| Containerization | Docker Compose configuration provided for one-command setup |
| Python version | Python 3.10+ required; specified in requirements.txt with pinned versions |
| Node version | Node.js 18+ for frontend; specified in package.json |

---

### NFR-08: Observability

| Sub-requirement | Target |
|---|---|
| Application logs | Structured logs at INFO/WARNING/ERROR levels; persisted to file |
| ML model logs | Training runs log: start time, parameters, final metrics, training duration |
| API request logging | All requests logged: method, path, status code, response time, user ID |
| Health endpoint | GET /health returns: API status, DB connectivity, ML model load status |
| Audit trail | Security-relevant actions logged to audit_log table; never deleted |

---

### NFR-09: Ethical & Responsible AI

| Sub-requirement | Target |
|---|---|
| Explainability | No ML alert surfaced to analyst without a corresponding SHAP explanation or rule reference |
| Human oversight | No automated response action executed without analyst approval |
| Transparency | ML model training data source, algorithm, and evaluation metrics are documented and viewable |
| Bias awareness | Model evaluation includes per-class metrics to detect class imbalance issues |
| Data privacy | No personally identifiable information (PII) is logged in ML training pipelines |

---

## Section 3.6: MVP Definition

---

### Tier 1: MVP (Must Have for Demonstration)

The MVP delivers a complete, end-to-end SOC workflow that can be demonstrated from event ingestion to incident resolution.

| Feature | Justification |
|---|---|
| AUTH-001: User Authentication | Required for any multi-user platform |
| AUTH-002: RBAC | Required to demonstrate role separation |
| SEC-001: Event Ingestion API | Core data pipeline — nothing works without it |
| SEC-002: CSV File Import | Essential for loading demo datasets |
| SEC-003: Event Normalization | Required for ML model input consistency |
| ML-001: Anomaly Detection | The core AI capability of the platform |
| ML-002: Threat Classification | Extends detection with actionable threat type labels |
| ML-003: SHAP Explainability | Key differentiator; addresses research gap; must be in MVP |
| ALT-001: Alert Generation | Core output of the detection pipeline |
| ALT-002: Alert Queue | Primary analyst interface |
| ALT-004: Alert Disposition | Required for complete triage workflow |
| INC-001: Incident Creation | Required for complete security workflow |
| INC-002: Incident Lifecycle | Required for end-to-end demonstration |
| DASH-001: Security Overview | Required for compelling demonstration |

---

### Tier 2: V2 (High Value, Post-MVP)

| Feature | Justification for Deferral |
|---|---|
| AUTH-003: User Management UI | Admin CLI sufficient for MVP demo |
| AUTH-004: Audit Log UI | Audit log exists in DB; UI viewer can be deferred |
| SEC-004: Event Search | Nice-to-have for investigation; demo can reference alert-linked events |
| DET-001: Rule-Based Detection | ML detection is sufficient for MVP; rules add value in V2 |
| ML-004: Model Management UI | Retraining is a backend operation; UI can follow |
| ALT-003: Alert Clustering | Improves analyst experience; not blocking for demo |
| AI-001: AI Assistant | High-value differentiator; include in V2 if LLM API available |
| AI-002: Alert Explanation | Valuable but fallback template covers MVP gap |
| INC-003: Incident Timeline | Full timeline view is V2; basic notes sufficient in MVP |
| RESP-001: Response Playbooks | Strong demo feature; build after core detection works |
| RESP-002: Simulated Actions | Dependent on RESP-001 |
| TI-001: IoC Enrichment | Adds depth; not blocking |
| DASH-002: ML Performance Dashboard | Important for ongoing ops; can be V2 |
| DASH-003: Alert Trends | Analytical feature; V2 |

---

### Tier 3: Future Scope

| Feature | Justification |
|---|---|
| INC-004: Automated Report Generation | Complex; nice-to-have |
| TI-002: AI Threat Intel Query | Covered by general AI assistant |
| Federated Learning | Research-grade; beyond project scope |
| RL-based Response Agent | Research-grade; beyond project scope |
| MITRE ATT&CK Full Integration | Requires licensed dataset mapping; V3+ |
| Real-time network packet capture | Requires kernel-level access; infrastructure constraint |
| External SIEM/SOAR integration | Requires enterprise tool access |

---

## Section 3.7: Success Metrics & KPIs

> **Important:** These are **target metrics** for evaluation. No results are claimed — these will be measured after implementation and during demonstration.

| Metric | Target | Measurement Method |
|---|---|---|
| **Anomaly Detection F1** | ≥ 0.80 on CICIDS2017 test split | Scikit-learn classification_report on 20% held-out test set |
| **Threat Classification Accuracy** | ≥ 0.82 macro-averaged F1 | Scikit-learn classification_report; per-class F1 also reported |
| **Alert Queue Reduction** | Demonstrate that ML scoring reduces manual review workload vs. no-filter baseline | Compare alert count with and without ML threshold in demo scenario |
| **Alert-to-Incident Latency** | ≤ 10 minutes from event injection to incident creation in demo | Measured end-to-end in timed demo |
| **SHAP Coverage** | ≥ 95% of ML alerts have SHAP explanations | % of alerts with non-null SHAP data in DB |
| **API Response Time** | P95 ≤ 500ms for all non-ML endpoints | Load test with locust or k6 |
| **Dashboard Load** | ≤ 3 seconds | Browser performance profiling |
| **User Role Enforcement** | 100% of RBAC tests pass | Automated permission test suite |
| **Demo Stability** | Zero crashes during 30-minute demonstration | Observed during dry run |
| **AI Assistant Accuracy** | ≥ 80% of test security queries answered correctly (team evaluation rubric) | Structured evaluation with 20-query test set |

---