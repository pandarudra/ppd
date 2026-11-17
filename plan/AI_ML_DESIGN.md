# SENTINEL: AI/ML Technical Design & Methodology Document

> **Document Version:** 1.0  
> **Status:** Implementation-Ready  
> **Scope:** AI/ML Detection Engine, Dataset Strategy, Algorithm Evaluations & Streaming Pipeline Integration  
> **Primary References:** IEEE Access (Khayat et al., 2025), UNSW-NB15, CICIDS2017

---

# PART 4: AI/ML TECHNICAL DESIGN

---

## Section 4.1: Algorithm Evaluation

---

### Algorithm 1: Random Forest

| Dimension | Detail |
|---|---|
| **Problem It Solves** | Multi-class threat classification; binary intrusion detection. Predicts which category an event belongs to (Brute Force, Port Scan, DDoS, Normal, etc.) |
| **Input Features** | Numerical features extracted from network flow records: duration, packet counts, byte counts, flow rate, protocol type, port numbers, flag counts, inter-arrival times |
| **Output** | Class label (threat type) + class probability vector |
| **Training Requirements** | Labeled dataset (events with known ground-truth attack labels). Requires feature engineering. Training time: minutes on CICIDS2017 with 8GB RAM. Hyperparameters: n_estimators (50–300), max_depth, min_samples_split |
| **Advantages** | Handles mixed feature types well. Robust to outliers and missing values. Naturally provides feature importance. Minimal hyperparameter sensitivity. Interpretable via feature importance. Fast inference. |
| **Limitations** | Requires labeled training data. Can overfit on imbalanced datasets. Feature importance is not the same as SHAP (marginal). Large forests can be memory-intensive. Less effective on temporal sequence patterns. |
| **MVP Suitability** | ⭐⭐⭐⭐⭐ Excellent. Scikit-learn implementation, robust, well-understood, works well on tabular network flow data. **Recommended primary classifier.** |

---

### Algorithm 2: XGBoost

| Dimension | Detail |
|---|---|
| **Problem It Solves** | High-performance threat classification; often achieves state-of-the-art results on tabular cybersecurity datasets |
| **Input Features** | Same numerical feature vectors as Random Forest; XGBoost handles sparse features efficiently |
| **Output** | Class probabilities + class label |
| **Training Requirements** | Labeled dataset. Requires feature engineering. Training time: slightly faster than large Random Forests on same data. Key hyperparameters: n_estimators, learning_rate, max_depth, subsample, colsample_bytree |
| **Advantages** | Often the top performer on tabular datasets (Kaggle/real-world benchmarks). Built-in regularization (L1/L2) reduces overfitting. Handles class imbalance with scale_pos_weight. Native support for missing values. |
| **Limitations** | More hyperparameters than Random Forest — requires more careful tuning. Slightly more complex to explain (SHAP is still available). Can overfit if learning rate is too high and trees are too many. |
| **MVP Suitability** | ⭐⭐⭐⭐⭐ Excellent. `xgboost` Python library is straightforward. **Recommended as primary classifier or strong alternative to Random Forest.** Use cross-validation to compare both. |

---

### Algorithm 3: Isolation Forest

| Dimension | Detail |
|---|---|
| **Problem It Solves** | Unsupervised anomaly detection. Identifies network events that are statistically unusual relative to the training distribution, without requiring attack labels. |
| **Input Features** | Numerical feature vectors from network events. Works best with continuous numerical features. Sensitive to irrelevant/noisy features. |
| **Output** | Anomaly score (continuous, −1 to 1 internally; normalized to 0–1 for display). Binary label: anomaly / normal at a threshold. |
| **Training Requirements** | Unlabeled or mixed (labels not used). Train on "normal" baseline data (or full training set — model learns to isolate rare instances). Training time: fast (minutes on typical dataset sizes). Key hyperparameters: n_estimators, contamination (expected anomaly fraction) |
| **Advantages** | No labels required — usable even without ground-truth attack data. Linear time complexity. Scales well. Naturally handles high-dimensional data. Good performance on imbalanced datasets (most events are normal). |
| **Limitations** | Anomaly scores are not naturally interpretable. SHAP integration requires extra work (TreeSHAP). Contamination parameter requires tuning. Performance degrades with many irrelevant features. Can miss anomalies that are "normal" in clusters (masking effect). |
| **MVP Suitability** | ⭐⭐⭐⭐⭐ Excellent for MVP. The ideal primary anomaly detection model — does not require labeled attack data, robust, fast. **Recommended primary anomaly detector.** |

---

### Algorithm 4: One-Class SVM

| Dimension | Detail |
|---|---|
| **Problem It Solves** | Anomaly detection trained only on normal data. Learns the boundary of the normal data manifold; anything outside is flagged as anomalous. |
| **Input Features** | Numerical feature vectors; benefits from standardization (zero mean, unit variance). Works best with clean, low-noise normal training data. |
| **Output** | +1 (normal) or −1 (anomaly) binary prediction; decision function score |
| **Training Requirements** | Trained on normal (non-attack) data only — requires pre-filtered clean baseline. Training time: scales poorly with large datasets (O(n²)–O(n³) for exact SVM). Hyperparameters: kernel (rbf recommended), nu (expected anomaly fraction), gamma |
| **Advantages** | Useful when only normal data is available for training. Well-understood statistical foundation. Can capture complex non-linear decision boundaries with RBF kernel. |
| **Limitations** | Very slow on large datasets — impractical for 100K+ events without subsampling. Sensitive to kernel/hyperparameter choice. Requires clean normal training data (contamination degrades performance). Not easily interpretable. |
| **MVP Suitability** | ⭐⭐ Limited. Too slow for large-scale use. **[REC] Use Isolation Forest instead for MVP. One-Class SVM can be evaluated as a comparison baseline in the ML evaluation section.** |

---

### Algorithm 5: Logistic Regression

| Dimension | Detail |
|---|---|
| **Problem It Solves** | Binary or multi-class classification (normal vs. attack; or threat type classification). Provides probabilistic class predictions. |
| **Input Features** | Numerical feature vectors; requires feature scaling (StandardScaler). Works best with linearly separable classes. |
| **Output** | Class label + probability |
| **Training Requirements** | Labeled dataset. Fast training (closed-form or L-BFGS solver). Minimal hyperparameter tuning (regularization strength C, solver, multi_class strategy) |
| **Advantages** | Extremely fast training and inference. Naturally probabilistic output. Very interpretable — coefficients directly show feature influence. Excellent as a baseline. No overfitting risk with regularization. |
| **Limitations** | Assumes linear decision boundaries — cannot capture complex non-linear attack patterns. Performance inferior to tree-based methods on cybersecurity datasets. Features must be manually engineered. |
| **MVP Suitability** | ⭐⭐⭐ Moderate. **[REC] Use as a baseline model in model evaluation/comparison. Not recommended as the primary production classifier — use Random Forest or XGBoost instead.** |

---

### Algorithm 6: K-Means Clustering

| Dimension | Detail |
|---|---|
| **Problem It Solves** | Unsupervised grouping of security events or alerts into clusters. Applications: alert deduplication/grouping, behavioral baseline segmentation, identifying attack campaign structure. |
| **Input Features** | Numerical feature vectors; requires feature scaling. Works on event features or alert features (embedding vectors). |
| **Output** | Cluster assignment (integer label) for each data point; cluster centroids |
| **Training Requirements** | Unlabeled data. Fast. Hyperparameters: k (number of clusters — requires domain knowledge or elbow method). |
| **Advantages** | Simple, fast, well-understood. Good for alert grouping where natural clusters exist. Easy to implement and explain. |
| **Limitations** | Requires specifying k in advance. Assumes spherical, equal-size clusters. Sensitive to initialization (use k-means++ initialization). Cannot handle non-convex cluster shapes. Not suitable for sequential/temporal data. |
| **MVP Suitability** | ⭐⭐⭐⭐ Good for alert clustering (Module E, ALT-003). **[REC] Use K-Means for grouping related alerts by feature similarity. Not suitable as primary threat detector.** |

---

### Algorithm 7: Autoencoders

| Dimension | Detail |
|---|---|
| **Problem It Solves** | Unsupervised anomaly detection via reconstruction error. The autoencoder is trained to reconstruct normal events; attack events (novel patterns) produce high reconstruction error, flagging them as anomalous. |
| **Input Features** | Numerical feature vectors; requires normalization. Architecture: Input → Encoder (compress to latent space) → Decoder (reconstruct) |
| **Output** | Reconstruction error (mean squared error) per event; threshold determines anomaly/normal boundary |
| **Training Requirements** | Primarily unlabeled normal data. Requires neural network training (PyTorch or TensorFlow/Keras). Training time: minutes to hours depending on network size and dataset size. Hyperparameters: latent dimension, layer sizes, learning rate, epochs, batch size |
| **Advantages** | Can capture complex, non-linear patterns in data. The latent space provides a natural compressed representation. Scales to high-dimensional inputs. Can detect subtle deviations. |
| **Limitations** | Requires neural network expertise; more complex than scikit-learn models. Training instability risk. Harder to integrate SHAP explanations. Requires PyTorch or TensorFlow dependency. Overkill if Isolation Forest performs adequately. |
| **MVP Suitability** | ⭐⭐⭐ Moderate. **[REC] Include as V2 or as an experimental comparison model evaluated alongside Isolation Forest. For MVP, prefer Isolation Forest for simplicity and reliability.** |

---

### Algorithm 8: NLP / Large Language Models

| Dimension | Detail |
|---|---|
| **Problem It Solves** | (a) Parsing unstructured threat intelligence text to extract IoCs, TTPs, and threat actor profiles. (b) Conversational AI assistant for analyst queries. (c) Alert explanation generation in natural language. (d) Log anomaly detection via sequence modeling. |
| **Input Features** | (a,b,c) Natural language text (threat reports, analyst questions, alert fields). (d) Log sequences as text tokens. |
| **Output** | (a) Structured JSON (IoC list, TTP mapping). (b) Natural language answer. (c) Plain-language explanation paragraph. (d) Anomaly flag. |
| **Training Requirements** | For API-based LLMs (GPT-4, Gemini, Claude): no training required — accessed via REST API. For local LLMs (Llama, Mistral): significant GPU compute required. For fine-tuned NLP (BERT NER): moderate training on labeled cybersecurity text. |
| **Advantages** | LLM APIs require no training or GPU. Extremely capable at natural language tasks. Dramatically lowers the analyst expertise barrier. Can explain any threat type from training knowledge. |
| **Limitations** | API cost (per-token pricing). Knowledge cutoff (outdated on recent threats). Hallucination risk — LLMs can generate plausible but incorrect threat intelligence. Latency (1–10 seconds per request). Requires internet connectivity for API access. |
| **MVP Suitability** | ⭐⭐⭐⭐ Good for AI assistant (AI-001) and alert explanation (AI-002). **[REC] Use Free LLM API Endpoints (e.g., NVIDIA NIM free credits or Google Gemini API Key free tier) for the AI assistant. Add hallucination disclaimers in UI. Use prompt engineering with alert context injection.** |

---

## Section 4.2: Recommended Algorithm Combination for MVP

**[REC]** The following combination is recommended for SENTINEL MVP, based on complementary strengths, feasibility, and alignment with the reference architecture:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SENTINEL MVP ML STACK                            │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 1 — ANOMALY DETECTION                                        │
│  Primary:   Isolation Forest (scikit-learn)                         │
│  Purpose:   Score every event 0–1 for anomalousness                │
│  Rationale: No labels needed; fast; well-suited to network data     │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 2 — THREAT CLASSIFICATION                                    │
│  Primary:   XGBoost (or Random Forest — benchmark both)             │
│  Purpose:   Classify anomalous events by threat type                │
│  Rationale: State-of-the-art on tabular data; SHAP compatible       │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 3 — EXPLAINABILITY                                           │
│  Tool:      SHAP (shap library — TreeSHAP for tree models)          │
│  Purpose:   Generate per-alert feature importance for analysts      │
│  Rationale: Directly addresses research gap; built for tree models  │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 4 — ALERT CLUSTERING                                         │
│  Tool:      K-Means (scikit-learn)                                  │
│  Purpose:   Group related alerts by feature similarity              │
│  Rationale: Simple, effective for reducing alert noise              │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 5 — ANALYST ASSISTANCE                                       │
│  Tool:      Free LLM API (NVIDIA NIM Endpoints / Google Gemini API)                    │
│  Purpose:   Conversational assistant + alert explanation generation  │
│  Rationale: No training required; high capability; feasible for MVP │
└─────────────────────────────────────────────────────────────────────┘
```

**Why this combination works:**

- **Isolation Forest** catches unknown threats without requiring attack labels — it only needs to learn what "normal" looks like.
- **XGBoost** provides precise threat type classification for events that the anomaly detector flags — it leverages the labeled portion of training data.
- **SHAP (TreeSHAP)** integrates natively with both models (Isolation Forest and XGBoost are tree-based), enabling efficient per-prediction explanations without additional model training.
- **K-Means** handles alert deduplication at the alert layer, reducing analyst workload without touching the detection layer.
- **LLM API** provides high-quality natural language capability without GPU infrastructure, closing the analyst assistance gap.

**Evaluation Strategy:** Train both Random Forest and XGBoost on the same labeled split; select the one with higher macro-F1 on the validation set for production. Document both results.

---

## Section 4.3: Dataset Strategy

---

### Dataset 1: CICIDS2017

| Dimension | Detail |
|---|---|
| **Full Name** | Canadian Institute for Cybersecurity Intrusion Detection Evaluation Dataset 2017 |
| **Contents** | Network flow records (5-tuple + 80 statistical features) generated over 5 days. Includes benign traffic and attacks: Brute Force, DoS/DDoS, Web Attacks (SQLi, XSS, Brute Force), Infiltration, Botnet, Port Scan |
| **Detection Tasks Supported** | Binary IDS (normal vs. attack), multi-class threat classification, anomaly detection baseline building |
| **Limitations** | Known label noise (some flows mislabeled). Imbalanced classes (some attack types have very few samples). Generated in a controlled lab environment — distribution differs from real enterprise traffic. Some features have infinity/NaN values requiring cleaning. |
| **Suitability for SENTINEL** | ⭐⭐⭐⭐⭐ Excellent. Well-documented, widely used in literature, good class diversity, includes the attack types SENTINEL aims to detect. **Recommended primary training dataset.** |

---

### Dataset 2: CSE-CIC-IDS2018

| Dimension | Detail |
|---|---|
| **Full Name** | Canadian Institute for Cybersecurity Intrusion Detection Evaluation Dataset 2018 |
| **Contents** | Extension of CICIDS2017 with additional attack categories: Infiltration, Botnet, SQL Injection, DoS attacks with updated tools, Brute Force FTP/SSH |
| **Detection Tasks Supported** | Same as CICIDS2017 with additional attack type coverage |
| **Limitations** | Very large dataset (dozens of GB in full form); requires significant preprocessing. Some label quality issues similar to CICIDS2017. |
| **Suitability for SENTINEL** | ⭐⭐⭐⭐ Good. **[REC] Use a sample/subset for model robustness evaluation or to extend the training set. Too large for primary use in a student project without filtering.** |

---

### Dataset 3: UNSW-NB15

| Dimension | Detail |
|---|---|
| **Full Name** | UNSW Network Benchmark Dataset 2015 |
| **Contents** | Network packet captures with 49 features (mix of raw packet stats and high-level flow features). 9 attack categories: Fuzzers, Analysis, Backdoors, DoS, Exploits, Generic, Reconnaissance, Shellcode, Worms |
| **Detection Tasks Supported** | Binary classification, multi-class attack category detection, anomaly detection |
| **Limitations** | Older dataset (2015); some attack categories may not reflect current threat landscape. Feature extraction methodology differs from CICIDS. |
| **Suitability for SENTINEL** | ⭐⭐⭐⭐ Good. **[REC] Use as the secondary dataset for cross-dataset generalization testing — train on CICIDS2017, evaluate on UNSW-NB15 to test model robustness.** |

---

### Dataset 4: NSL-KDD

| Dimension | Detail |
|---|---|
| **Full Name** | NSL-KDD — improved version of the KDD Cup 1999 dataset |
| **Contents** | 41 features; 4 attack categories: DoS, Probe, R2L (Remote to Local), U2R (User to Root) |
| **Detection Tasks Supported** | Binary IDS, multi-class attack detection |
| **Limitations** | Very dated (derived from 1999 data). Attack taxonomy does not match modern threats. Modern ML models achieve near-perfect accuracy — dataset is too "easy" to be a meaningful challenge. Primarily useful for historical comparison. |
| **Suitability for SENTINEL** | ⭐⭐ Limited. **[REC] Include only for historical baseline comparison (to show how SENTINEL compares to older literature benchmarks). Do not use as primary training data.** |

---

### Dataset Strategy Summary

```
Training:          CICIDS2017 (primary) — 70/15/15 train/val/test split
Validation:        CICIDS2017 15% validation split + UNSW-NB15 generalization test
Testing:           CICIDS2017 15% held-out test set (never seen during training)
Supplementary:     CSE-CIC-IDS2018 subset for model robustness
Comparison:        NSL-KDD for historical literature comparison only

Preprocessing steps (all datasets):
  1. Remove NaN/Infinity values (replace with column median)
  2. Remove duplicate rows
  3. Standardize feature scaling (StandardScaler or MinMaxScaler)
  4. Address class imbalance (SMOTE or class_weight='balanced')
  5. Select top N features by importance (reduce noise)
```

---

## Section 4.4: ML Pipeline — Complete Lifecycle

---

### Stage 1: Data Collection

**Goal:** Obtain training data that represents both normal and attack traffic.

**Steps:**
1. Download CICIDS2017 dataset from the official CIC website (or Kaggle mirror)
2. Download UNSW-NB15 for validation
3. Verify file integrity (checksum)
4. Store raw files in `data/raw/` directory
5. Document: source URL, download date, file sizes, record counts

**Student Team Note:** CICIDS2017 is available as pre-processed CSV files (network flow features already extracted). You do not need to process raw PCAP files. Use the CSV files directly.

---

### Stage 2: Data Preprocessing

**Goal:** Clean the raw data and make it suitable for ML model training.

**Steps:**
1. **Load:** Read CSVs with pandas; check columns match expected schema
2. **Inspect:** `df.info()`, `df.describe()`, check for nulls and infinities
3. **Clean:**
   - Replace `np.inf` and `-np.inf` with `np.nan`
   - Fill or drop NaN values (fill with column median for continuous features)
   - Remove exact duplicate rows
   - Strip whitespace from string columns (CICIDS2017 has space-padded label column)
4. **Label Processing:**
   - Map attack labels to simplified categories (consolidate variants)
   - Create binary label: 0 = BENIGN, 1 = ATTACK
   - Preserve multi-class labels for classification model
5. **Class Imbalance:** Inspect class distribution with `value_counts()`. Apply SMOTE from `imbalanced-learn` or use `class_weight='balanced'` in model training.

---

### Stage 3: Feature Engineering

**Goal:** Transform raw event fields into the most informative features for ML models.

**Steps:**
1. **Feature Selection:**
   - Drop non-informative columns (e.g., pure IDs, constant columns)
   - Remove columns with >30% missing values
   - Compute correlation matrix; remove highly correlated pairs (r > 0.95) to reduce multicollinearity
2. **Feature Transformation:**
   - Apply `StandardScaler` to normalize all numerical features to mean=0, std=1
   - Log-transform highly skewed features (e.g., packet lengths often follow power-law distributions)
3. **Feature Importance (Initial):**
   - Train a quick Random Forest on all features; extract `.feature_importances_`
   - Select top K features (e.g., top 20–30) for the production model
4. **Train/Validation/Test Split:**
   - `sklearn.model_selection.train_test_split` with `stratify=y`
   - Split: 70% train, 15% validation, 15% test
   - Save train/val/test indices to ensure reproducibility (`random_state=42`)
5. **Save Preprocessor:**
   - Fit `StandardScaler` on training data only; save as `scaler.pkl`
   - Apply saved scaler to validation and test data (never fit on val/test)

---

### Stage 4: Model Training

**Goal:** Train the anomaly detection model and the threat classifier.

**Anomaly Detector (Isolation Forest):**
```python
from sklearn.ensemble import IsolationForest

model = IsolationForest(
    n_estimators=200,
    contamination=0.05,  # Tune based on expected anomaly rate
    random_state=42,
    n_jobs=-1
)
# Train on all training data (or normal-only subset for purer baseline)
model.fit(X_train_scaled)
```

**Threat Classifier (XGBoost):**
```python
import xgboost as xgb
from sklearn.utils.class_weight import compute_sample_weight

sample_weights = compute_sample_weight('balanced', y_train)
model = xgb.XGBClassifier(
    n_estimators=200,
    learning_rate=0.05,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    n_jobs=-1
)
model.fit(X_train_scaled, y_train, sample_weight=sample_weights)
```

**Save trained models:**
```python
import joblib
joblib.dump(isolation_forest_model, 'models/anomaly_detector.pkl')
joblib.dump(xgb_classifier_model, 'models/threat_classifier.pkl')
joblib.dump(scaler, 'models/scaler.pkl')
```

---

### Stage 5: Validation

**Goal:** Tune hyperparameters on the validation set without touching the test set.

**Steps:**
1. Apply saved scaler to validation features
2. Run predictions on validation set
3. Compute metrics: precision, recall, F1, AUC-ROC
4. Try alternative hyperparameters (n_estimators, learning_rate, max_depth)
5. Use `sklearn.model_selection.GridSearchCV` or `RandomizedSearchCV` for systematic search
6. Select best model configuration based on macro-F1 on validation set
7. Document: best hyperparameters, validation metrics, training time

---

### Stage 6: Evaluation

**Goal:** Generate final performance metrics on the held-out test set.

**Steps:**
1. Apply saved scaler to test features
2. Generate predictions on test set (never touched during training/validation)
3. Compute and report:
   - `classification_report(y_test, y_pred)` — per-class precision, recall, F1
   - `confusion_matrix(y_test, y_pred)` — visualize with seaborn heatmap
   - `roc_auc_score(y_test, y_prob, multi_class='ovr')`
   - Per-class F1 to check for underperforming classes
4. Document as **Model Card:**
   - Training data: source, size, preprocessing steps
   - Validation metrics (best val set performance)
   - Test metrics (final evaluation)
   - Known limitations and failure modes
   - Intended use and misuse warnings

---

### Stage 7: Deployment

**Goal:** Integrate trained models into the SENTINEL FastAPI backend.

**Steps:**
1. Copy `anomaly_detector.pkl`, `threat_classifier.pkl`, `scaler.pkl` to `api/models/`
2. Create model loading module:
```python
# api/ml/model_loader.py
import joblib

_anomaly_model = None
_classifier_model = None
_scaler = None

def load_models():
    global _anomaly_model, _classifier_model, _scaler
    _anomaly_model = joblib.load('models/anomaly_detector.pkl')
    _classifier_model = joblib.load('models/threat_classifier.pkl')
    _scaler = joblib.load('models/scaler.pkl')

def get_models():
    return _anomaly_model, _classifier_model, _scaler
```
3. Load models at application startup (FastAPI `lifespan` event)
4. Expose prediction via internal service (not directly as API endpoint)
5. Add health check: `GET /health` verifies models loaded

---

### Stage 8: Prediction (Runtime Inference)

**Goal:** Score incoming events in near-real-time.

**Flow:**
1. Event stored in DB → queued for ML processing
2. Inference worker fetches unscored events in batches (every 5 seconds)
3. Extract feature vector for each event (same features selected during training)
4. Apply saved `scaler.transform()` — IMPORTANT: use saved scaler, not re-fit
5. Run `anomaly_model.score_samples(X)` → anomaly scores (0–1)
6. For events with score > threshold: run `classifier_model.predict_proba(X)`
7. Compute SHAP values for high-score events
8. Write scores, predictions, and SHAP back to the event record in DB
9. Trigger alert generation for events above the alert threshold

**Code pattern:**
```python
# Batch inference worker
async def process_unscored_events():
    events = await db.get_unscored_events(limit=100)
    if not events:
        return
    
    X = extract_features(events)       # numpy array
    X_scaled = scaler.transform(X)      # apply saved scaler
    
    anomaly_scores = compute_anomaly_scores(X_scaled)  # Isolation Forest
    
    high_score_indices = np.where(anomaly_scores > ALERT_THRESHOLD)[0]
    if len(high_score_indices) > 0:
        X_high = X_scaled[high_score_indices]
        threat_types = classifier.predict(X_high)
        shap_values = compute_shap(X_high)
    
    await db.update_event_scores(events, anomaly_scores, threat_types, shap_values)
    await alert_generator.generate_alerts(events, anomaly_scores, threat_types)
```

---

### Stage 9: Monitoring

**Goal:** Detect model performance degradation and trigger retraining when needed.

**Monitoring Metrics:**

| Signal | How Measured | Alert Threshold |
|---|---|---|
| **Analyst FP Rate** | % of ML alerts closed as False Positive by analysts | > 30% over 7 days |
| **Anomaly Score Distribution Drift** | Compare rolling mean anomaly score vs. training baseline | > 15% shift in mean |
| **Alert Volume Change** | Anomalous spike or drop in daily alert count | > 3x rolling average |
| **Model Latency** | Inference time for batch processing | > 10 seconds per batch |
| **API Error Rate** | ML prediction endpoint errors | > 1% of requests |

**Retraining Triggers:**
- Analyst FP rate exceeds threshold
- Security Engineer manually initiates (via admin panel)
- Scheduled periodic retrain (e.g., monthly with fresh labeled data)

**Retraining Process:**
1. Collect new labeled data (analyst dispositions as ground-truth labels)
2. Combine with original training data
3. Run training pipeline (Stages 1–6)
4. Evaluate new model on held-out test set
5. Compare: new model must beat current model on validation metrics to be promoted
6. Promote: replace model files, reload in API
7. Archive old model files with version timestamp

---

## Section 4.5: Integration with the SOC Alert Pipeline

---

### How ML Predictions Flow Into the Alert System

The following diagram shows the complete data flow from raw event to analyst alert:

```
Raw Security Event Arrives
         │
         ▼
   [SEC-001] Event Ingestion API
         │  POST /api/events
         │
         ▼
   [SEC-003] Normalization Service
         │  Parse → Validate → Normalize → Enrich → Store in DB
         │
         ▼
   [Event Queue] (DB polling or message queue)
         │
         ▼
   [ML-001] Isolation Forest
         │  score_samples(event_features) → anomaly_score ∈ [0, 1]
         │
         ├──── score < 0.6 ──→ Store score; no alert; event archived
         │
         └──── score ≥ 0.6 ──→ [ML-002] XGBoost Classifier
                                      │  predict(event) → threat_type, confidence
                                      │
                                      ▼
                               [ML-003] SHAP Computation
                                      │  Top 5 feature contributions
                                      │
                                      ▼
                               [ALT-001] Alert Generator
                                      │  Severity = f(score, threat_type, asset_weight)
                                      │  Create Alert record in DB
                                      │
                                      ▼
                               [ALT-002] Alert Queue
                                      │  Priority-sorted by severity
                                      │
                                      ▼
                               [Tier 1 Analyst Sees Alert]
                                      │  Alert detail: event data + score + 
                                      │  threat type + SHAP chart + AI summary
                                      │
                             ┌────────┴────────────┐
                             ▼                     ▼
                    [False Positive]        [Escalate → Incident]
                    Logged as FP           [INC-001] Created
                    ML feedback data       [INC-002] Investigated
                                           [RESP-001] Response suggested
                                           [INC-004] Resolved & Reported
```

---

### Offline Evaluation vs. Real-Time Detection

This distinction is critical and often confused in student projects:

| Dimension | Offline Evaluation | Real-Time Detection |
|---|---|---|
| **Purpose** | Measure model accuracy using known ground-truth labels | Score live events as they arrive (no labels available) |
| **Data** | Labeled dataset with attack labels | Unlabeled event stream |
| **Ground Truth** | Known attack labels from dataset | Not available; analyst disposition is the proxy |
| **Metrics** | Precision, Recall, F1, AUC-ROC | Analyst FP rate, anomaly score drift, alert volume |
| **When Done** | Before deployment, during model evaluation stage | Continuously during platform operation |
| **Tools** | `sklearn.metrics`, `classification_report`, confusion matrix | Dashboard monitoring, analyst feedback loop |
| **Purpose in SENTINEL** | Demonstrate that models are good enough to deploy; justify choices in documentation | Provide ongoing threat detection value to users |
| **Important Caveat** | Offline metrics measure performance on the specific dataset used. Real-world performance on live traffic will differ — this is the deployment gap identified by Doc 1. | Analyst FP rate is the primary practical quality signal in production |

**[REC]** Document both clearly in your project. Show offline evaluation metrics in the Model Card. Show real-time monitoring metrics in the DASH-002 dashboard. Never claim that offline metrics equal real-world performance.

---

### Threshold Configuration

The anomaly score threshold is the most important operational parameter:

| Threshold Value | Effect |
|---|---|
| **Too Low (< 0.4)** | Many false positives; analysts overwhelmed; alert fatigue |
| **Recommended (0.5–0.7)** | Balanced sensitivity; tune based on analyst FP rate |
| **Too High (> 0.8)** | Misses real threats; false sense of security |

**[REC]** Start with `contamination=0.05` in Isolation Forest (expects 5% of events to be anomalous). Monitor analyst FP rate after 1 week of demo use. Adjust threshold to bring FP rate below 25%.

---

*End of Part 1 — SENTINEL Engineering Blueprint*

---

> **Document Footer**  
> **Document:** SENTINEL Engineering Blueprint — Part 1  
> **Sections Covered:** Parts 1–4  
> **Next Document:** Part 2 — Technical Architecture, Database Design, API Specification, Frontend Design, Security Architecture, Deployment Guide, Testing Strategy  
> **Sources:** [Doc 1] IEEE Access, Khayat et al. 2025 | [Doc 2] PPD Abstract (inferred) | [REC] Author Recommendations