# CitySync: Event Deployment Command

> **Traffic incidents do not create gridlock. Response delays do.**

CitySync is a three-layer ML system that forecasts traffic incident clearance timelines, classifies disruption severity, and computes composite urgency scores — enabling command centers to deploy the right response before the network breaks down.

Built for **Flipkart Gridlock 2.0 — Round 2**, trained on real Bengaluru traffic incident telemetry (Nov 2023 – Apr 2024).

---

## The Problem

Modern traffic command centers operate reactively. When a vehicle breakdown, waterlogging event, or road closure occurs, operators rely on static camera feeds and intuition. A localized incident at Silk Board Junction can cascade across HSR Layout, Dairy Circle, and Agara Flyover within 9–18 minutes — entirely undetected until gridlock has already formed.

**94% of severe congestion events are entirely unplanned.** CitySync closes the gap between detection and deployment.

---

## ML Architecture

The entire pipeline is contained in `final-ml-model.ipynb` and exported as `citysync_v7.pkl`. Three layers run sequentially; each layer's output feeds the next.

```
Incident Input
(type · corridor · location · time · closure flag · weather)
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│  Layer 1 — LightGBM Quantile Regression              │
│  Quantiles: q=0.10 / q=0.50 / q=0.90                 │
│  Loss: Pinball loss per quantile                     │
│  Tuning: Optuna (60 trials, 4-fold TimeSeriesCV)     │
│  Output: P10 – P50 – P90 clearance band (hours)      │
└──────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│  Layer 2 — Soft Severity Classifier                  │
│  Band-aware, asymmetric, 3-tier confidence           │
│  Buckets: Short (0–1h) · Medium (1–6h) ·             │
│           Long (6–24h) · Extended (24–72h)           │
│                                                      │
│  Confidence logic (p50-upward focus):                │
│  High     : p10, p50, p90 all same bucket            │
│  Moderate : p50 and p90 same bucket                  │
│  Low      : p50 and p90 in different buckets         │
│                                                      │
│  Output: Severity label + confidence tier + span     │
└──────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│  Layer 3 — Composite Urgency Score (0–100)           │
│  Inputs: severity weight · peak multiplier ·         │
│          cascade risk · corridor load index          │
│  Tiers: CRITICAL (≥80) · HIGH (≥55) ·                │
│         MODERATE (≥30) · LOW (<30)                   │
│  Output: Single ranked 0–100 score + tier label      │
└──────────────────────────────────────────────────────┘
                        │
                        ▼
Cascade Propagation Model → Operator Playbook → Dashboard
```

### Feature Engineering

**33 total features — 11 categorical, 22 numerical**

Key engineered features:
- `events_1h / events_3h / events_6h` — leakage-free rolling corridor incident counts (uses only `start_datetime`, never `end_time`)
- `micro_zone` — 25 K-Means spatial clusters fit on training data only
- `corridor_risk` — log-median duration per corridor (train-only)
- `cause_risk` — log-median duration per event cause (train-only)
- `corridor_density` — normalized incident frequency per corridor
- `vb_junc_risk` — junction-level risk for vehicle breakdown events (49 junctions)
- `is_night` / `is_predawn` — data-grounded peak hours (top incident hours: 21, 20, 5, 6, 4 — not conventional commuter hours)

### Model Configuration

```python
BUCKET_BOUNDS   = [0, 1, 6, 24, 72]       # hours
BUCKET_LABELS   = ['Short', 'Medium', 'Long', 'Extended']
URGENCY_TIERS   = {'CRITICAL': 80, 'HIGH': 55, 'MODERATE': 30, 'LOW': 0}
N_SPATIAL_ZONES = 25
OPTUNA_TRIALS   = 60
CV_SPLITS       = 4  # TimeSeriesSplit
TRAIN_RATIO     = 0.80  # chronological split
```

### Evaluation Results (V7 — unseen future data)

| Metric | CitySync V7 | Naive Baseline |
|---|---|---|
| MAE (hours) | **4.161** | 4.787 |
| SMAPE | 85.64% | 88.7% |
| Coverage (P10–P90 interval) | **75.0%** | — |
| Bucket Accuracy | 51.54% | 50.0% |
| Macro F1 | **36.2%** | 35.8% |
| Weighted F1 | 50.56% | — |

**Confidence breakdown on test set:**
- Moderate confidence: 56.0% of predictions (63.6% bucket accuracy)
- Low confidence: 44.0% of predictions (36.2% bucket accuracy)
- High confidence: 0.0% (reflects genuine uncertainty in the dataset)

**Best performing cause: `accident` — 72.7% bucket accuracy, 90.9% coverage**

**Per-cause urgency note:** `pot_holes` and `construction` consistently score highest urgency (avg 98.5 and 78.8 respectively) — these are chronic infrastructure events with long clearance tails.

---

## Dataset

- **Source:** Bengaluru traffic incident telemetry (`theme2.csv`)
- **Records after filtering:** 2,917
- **Date range:** 2023-11-09 → 2024-04-08
- **Target variable:** `duration_hours` — resolved from priority chain: `end_datetime → resolved_datetime → closed_datetime`
- **Duration cap:** 72 hours (excludes chronic infrastructure events like potholes with ~9 day median — not dispatchable traffic incidents)
- **Median duration:** 0.88 hrs (~53 min)
- **Train/Test split:** Chronological 80/20 (no shuffle — respects temporal ordering)

---

## File Structure

```
citysync/
├── final-ml-model.ipynb     # Complete ML pipeline — single notebook
├── citysync_v7.pkl          # Serialized model bundle (3 quantile models + K-Means + 5 risk maps)
├── app.py                   # Flask backend
├── index.html               # Landing page + overview
├── index.css                # Styles
├── index.js                 # Landing page logic
├── simulation.html          # Dashboard / command interface
├── simulation.js            # Dashboard logic + pipeline rendering
├── theme2.csv               # Bengaluru incident dataset
└── requirements.txt         # Python dependencies
```

---

## Running Locally

### Prerequisites

```bash
python >= 3.9
```

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/dhruvvvgg/citysync.git
cd citysync

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start the Flask backend
python app.py

# 4. Open the dashboard
# Visit http://localhost:5000 in your browser
```

> The notebook (`final-ml-model.ipynb`) can be run independently on Kaggle or locally with the `theme2.csv` dataset. It will regenerate `citysync_v7.pkl`.

---

## Live Demo

🔗 **[Launch CitySync Dashboard →](citysync-command.onrender.com)**

Recommended walkthrough:
1. Land on the **Overview** page
2. Click **Dashboard** in the navigation
3. Select the **Silk Board Eve** preset (Vehicle Breakdown @ 18:00)
4. Click **Generate Intelligence**
5. Scroll through all 8 sections
6. Return and try **ORR Monsoon** to see how outputs shift for a waterlogging event

---

## Dashboard Sections

| Section | Content |
|---|---|
| Incident Intelligence | Event type, corridor, location, priority, timestamp |
| Forecast Engine | P10/P50/P90 window, severity class, urgency score, confidence drivers |
| Decision Drivers | Primary contributors influencing the forecast |
| Cascade Intelligence | Propagation graph, spread window, vulnerable junctions, cascade risk score |
| Operational Risk Radar | Corridor / cascade / delay / diversion risk gauges |
| Recommendation Evidence | Historical matches, P50 benchmark, risk profile, affected nodes |
| Continuous Learning | Preparedness recommendations, resilience opportunities, historical context |

