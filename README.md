# SETU — AI-Enabled Labour Market Intelligence & Skill Forecasting System
> **Smart India Hackathon 2026 | Problem Statement 26246 (MSDE)**  
> Decision-support system for evidence-based skilling, labour demand-supply gap analysis, predictive forecasting, reskilling pathways, and ITI training centre alignment.

---

## ⚡ Quick Start: Running from an Unzipped Folder

If you received this project as a ZIP archive, follow either **Option 1 (Local Python & Node.js)** or **Option 2 (Docker Compose)**.

### Prerequisites
- **Python**: 3.10 or higher (tested on 3.10, 3.11, 3.12, 3.14)
- **Node.js**: 18.x or higher & npm
- *(Optional)* **Docker & Docker Compose**

---

### Option 1: Local Setup (Recommended for Development)

#### 1. Backend Setup (FastAPI + SQLite + ML Engine)
Open a terminal in the project root:

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a virtual environment
# macOS / Linux:
python3 -m venv venv
source venv/bin/activate

# Windows (PowerShell):
python -m venv venv
.\venv\Scripts\Activate.ps1

# Windows (Command Prompt):
python -m venv venv
.\venv\Scripts\activate.bat

# 3. Install backend dependencies
pip install -r requirements.txt

# 4. Initialize database and precompute XGBoost forecasts
python build_db.py
# Output should confirm: Built .../backend/data/lmis.db

# 5. Start the FastAPI backend server
uvicorn app.main:app --reload --port 8000
```

The backend API will be live at:
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Root Health / Meta Endpoint**: [http://localhost:8000/api/meta](http://localhost:8000/api/meta)

---

#### 2. Frontend Setup (React 18 + Vite + Tailwind CSS)
In a **new terminal window**, navigate to the project root:

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Start the Vite development server (proxies /api to http://localhost:8000)
npm run dev
```

Open your browser at:
👉 **[http://localhost:5173](http://localhost:5173)**

---

### Option 2: Docker Compose (Zero-Install Setup)

If you have Docker installed, you can build and run both backend and frontend with a single command:

```bash
docker compose up --build
```

- **Frontend Application**: [http://localhost:8080](http://localhost:8080)
- **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

To stop the containers:
```bash
docker compose down
```

---

## 🧪 Running the Automated Test Suite

A comprehensive test suite of 17 tests validates:
1. Normalization of occupations, aliases, and locations (NCO-2015 alignment)
2. CSV upload validation, row-level error reporting, and duplicate rejection
3. Demand-supply gap computation and threshold categorization
4. Multi-level aggregation (`group_by=state`, `group_by=district`, `group_by=occupation`)
5. Evidence-based recommendation engine
6. Time-series holdout evaluation metrics (XGBoost vs Naive and 6-Month Moving Average baselines)
7. Core API endpoint schemas and data contracts

To run tests:
```bash
# From project root with venv activated:
pytest

# Or directly with verbose output:
pytest -v
```

---

## 📦 How to Create a Clean ZIP Archive

To send this project to an evaluator or collaborator without bundling bulky OS-specific caches or node modules:

```bash
# Run this from the project root:
zip -r setu_lmis.zip . \
  -x "venv/*" \
  -x ".venv/*" \
  -x "node_modules/*" \
  -x "frontend/node_modules/*" \
  -x "frontend/dist/*" \
  -x "*/__pycache__/*" \
  -x "*.pyc" \
  -x ".pytest_cache/*" \
  -x ".DS_Store" \
  -x "*/.DS_Store"
```

The resulting zip will be lightweight (~1 MB) and will contain all source code, tests, seed scripts, and the prebuilt database.

---

## 🌟 Key Application Features

### 1. Role-Based Decision Support
- **State & National Planner**:
  - **Overview Dashboard**: High-level KPI indicators (vacancies, trained output, job seekers), shortage/surplus occupation count, and priority alerts.
  - **National Map & Gap Analysis**: Interactive district bubble map colour-coded by urgency (Red = Critical Shortage, Orange = Shortage, Green = Balanced, Amber = Surplus).
  - **Job Demand Intelligence**: 24-month raw vs deduplicated posting trends, top demanded trades, skill frequency graphs, salary benchmarks, and XGBoost out-of-time evaluation metrics.
  - **Training Supply Intelligence**: Supply pipeline funnel (Seats → Enrolled → In Training → Completed → Certified → Placed), conversion rates, and expected new worker projections for 3, 6, and 12 months.
  - **Evidence-Based Recommendations**: Prioritized policy interventions with complete mathematical traceability, local centre counts, and underlying assumptions.
  - **Early Warning Panel**: High-severity trade shortages and displacement risks across all districts.
  - **Data Quality & Source Register**: Auditable records showing raw vs accepted counts, unmapped rate, and validation status per source.
- **ITI & Training Centre Administrator**:
  - **My Centre View**: Inspect current institute capacity, enrolments, certifications, and placements against local district labour demand.
  - **Course Misalignment Alerts**: Automatic flags for courses training for surplus trades or missing high-demand trades in the district.
  - **Standardized CSV Upload**: Pre-validate and commit training cohort data with row-level error feedback and downloadable CSV template.

### 2. Dual-Language Support (English & Hindi)
Full bilingual interface toggle across all cards, badges, chart labels, and table headers.

---

## 📐 Analytics & Machine Learning Methodology

### 1. Demand Forecasting
- **Models**: Independent XGBoost regressors for 1-month, 3-month, and 6-month horizons.
- **Features**: Lag-1, lag-12, 3-month MA, 6-month MA ratios, target calendar month, district unemployment rate, and sector embeddings.
- **Prediction Intervals**: 80% confidence intervals derived from empirical standard deviation of residuals over held-out chronological test windows.
- **Deduplication**: Ingestion connector simulates ~22% job board duplicates to isolate genuine hiring demand from reposted vacancies.

### 2. Gap Categorization Logic
The supply-demand gap is defined as `Forecast Demand - Monthly Trained Output`:
- **Critical Shortage**: Gap > +25% of demand (urgent training capacity required)
- **Moderate Shortage**: Gap between +10% and +25% of demand
- **Balanced**: Gap between -10% and +10%
- **Mild Surplus**: Gap between -10% and -25%
- **Surplus Risk**: Supply exceeds demand by > 25% (over-training / displacement risk)

### 3. Siting Optimizer (New Training Centres)
Multi-factor weighted scoring model (0–100):
- **30%**: Projected Trade Shortage
- **20%**: District Training Capacity Deficit
- **15%**: Total Industrial Employment Demand
- **15%**: Available Job Seekers (Candidate Pool)
- **20%**: Distance from Nearest Existing Relevant Centre

---

## 📂 Project Structure

```
lmis/
├── backend/
│   ├── app/
│   │   ├── connectors.py         # CSV & API data connectors with row validation
│   │   ├── engine.py             # ML forecasting, gap scoring, transitions
│   │   ├── evaluation.py         # Out-of-time holdout model evaluation metrics
│   │   ├── main.py               # FastAPI routes and business logic
│   │   ├── normalization.py      # NCO title normalization & fuzzy alias matching
│   │   ├── recommendations.py   # Policy recommendations generation engine
│   │   └── seed.py               # Database seeder (NCO trades, centres, history)
│   ├── data/
│   │   └── lmis.db               # SQLite database
│   ├── tests/
│   │   └── test_lmis.py          # Pytest automated test suite (17 tests)
│   ├── build_db.py               # Script to rebuild database & train models
│   ├── Dockerfile                # Backend container definition
│   └── requirements.txt          # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/           # UI components (Views for all tabs & roles)
│   │   ├── api.ts                # API client helpers & number formatting
│   │   ├── App.tsx               # Root component with state management & routing
│   │   ├── index.css             # Tailwind styling and custom scrollbars
│   │   ├── translations.ts       # English / Hindi localization dictionaries
│   │   └── types.ts              # TypeScript domain interfaces
│   ├── Dockerfile                # Frontend container definition
│   ├── nginx.conf                # Nginx reverse proxy configuration
│   └── package.json              # Frontend dependencies
├── docker-compose.yml            # Multi-container orchestration
├── pytest.ini                    # Pytest configuration
├── .env.example                  # Environment configuration template
├── .gitignore                    # Git and zip file exclusions
└── README.md                     # This documentation
```

---

## 📋 API Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/overview` | Planning dashboard summary metrics & priority alerts |
| `GET` | `/api/demand-intelligence` | Job demand trends, skill frequencies, salary benchmarks, ML evaluations |
| `GET` | `/api/supply-intelligence` | Training funnel, conversion rates, and projected future worker output |
| `GET` | `/api/recommendations` | Evidence-backed actionable policy interventions |
| `GET` | `/api/skill-gaps` | Labour supply-demand gaps (`group_by=state`, `district`, or `occupation`) |
| `GET` | `/api/my-centre` | ITI administrator centre profile and trade alignment |
| `GET` | `/api/supply-upload/template` | Download standardized CSV upload template |
| `POST`| `/api/supply-upload` | Validate and commit training centre CSV submissions |
| `POST`| `/api/normalize-title` | Map job titles or trade descriptions to standard NCO codes |
| `GET` | `/api/data-quality` | Data source audit register, ingestion runs, and validation logs |
| `GET` | `/api/export` | Download CSV extracts of skill gaps and forecasts |

---

## 🔒 Demo Data Notice
All data shipped with this prototype is **simulated for demonstration and hackathon evaluation purposes**. Every dataset is marked with `is_demo = true` in the `data_sources` register. To connect live administrative datasets (NCS, PLFS, PMKVY, Skill India Digital Hub), replace the simulated ingestion connectors in `backend/app/connectors.py` and point `DATABASE_URL` to your production database.
# RozgarSetu
