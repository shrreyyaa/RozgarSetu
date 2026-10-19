"""SETU pipeline configuration — Phase 2. Override via environment variables."""
import os

# ---- Supply cohort pipeline ----
# expected_available_workers = seats x fill_rate x pass_rate x placement_adjustment
PLACEMENT_ADJUSTMENT = float(os.getenv("PLACEMENT_ADJUSTMENT", "0.7"))
COHORT_FILL_RATE = float(os.getenv("COHORT_FILL_RATE", "0.85"))       # fraction of seats filled
COHORT_DURATION_MONTHS = int(os.getenv("COHORT_DURATION_MONTHS", "6")) # course length in months
COHORT_PASS_RATE = float(os.getenv("COHORT_PASS_RATE", "0.80"))        # fraction passing/certified

# ---- Gap / status thresholds ----
# Status: gap > +GAP_THRESHOLD * demand -> Shortage, gap < -GAP_THRESHOLD * demand -> Surplus
GAP_THRESHOLD = float(os.getenv("GAP_THRESHOLD", "0.15"))
# Early warning: |gap%| > RED_GAP_MULTIPLIER x GAP_THRESHOLD -> Red
RED_GAP_MULTIPLIER = float(os.getenv("RED_GAP_MULTIPLIER", "2.0"))
# Trends diverge when growth rates differ by more than this fraction
DIVERGENCE_THRESHOLD = float(os.getenv("DIVERGENCE_THRESHOLD", "0.05"))

# ---- Forecasting ----
FORECAST_MONTHS = int(os.getenv("FORECAST_MONTHS", "24"))
# Rolling-origin backtest: 3 folds, 6-month horizon each
BACKTEST_FOLDS = int(os.getenv("BACKTEST_FOLDS", "3"))
BACKTEST_HORIZON = int(os.getenv("BACKTEST_HORIZON", "6"))
HOLDOUT_MONTHS = int(os.getenv("HOLDOUT_MONTHS", "3"))   # kept for backward compat
MA_WINDOW = int(os.getenv("MA_WINDOW", "3"))
