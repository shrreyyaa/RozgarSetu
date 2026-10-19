"""SETU analytics layer - Phase 2: real ML forecasting engine.

UNITS / PROXY (read this before using the numbers)
--------------------------------------------------
* DEMAND  = forecast job POSTINGS per month, then aggregated to quarters.
            Postings are only a PROXY for openings.
* SUPPLY  = cohort pipeline: seats x fill_rate -> course_duration -> pass_rate
            -> placement_adjustment = workers available per month.
* Both sides cover the SAME periods: the 12 forecast months.
* Gap is computed per month, then aggregated to quarters.
* Source label = least-trustworthy input (Sample > Estimated > Real).

CANDIDATE MODELS (per series, per backtest fold):
    seasonal_naive   -- repeat last 12-month cycle (baseline)
    holt_winters     -- ExponentialSmoothing, additive damped trend, no seasonality
    sarima           -- SARIMA(1,1,0)(1,0,0,12) or ARIMA(1,1,0) fallback
    xgb_regressor    -- XGBoost with lag-1..3, month-of-year, trend features

MODEL SELECTION: rolling-origin backtest (3 folds, 6-month horizon).
    Metric: MAPE primary, MAE secondary (when y has zeros).

PREDICTION INTERVAL: 80% via residual-based bootstrap (200 iterations).
"""
import warnings
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

import config

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
LABEL_RANK = {"Real": 0, "Estimated": 1, "Sample": 2}
MODELS = ["seasonal_naive", "holt_winters", "sarima", "xgb_regressor"]
_PI_ALPHA = 0.80
_MIN_TRAIN = 6
_MIN_SN_TRAIN = 12
_RNG = np.random.default_rng(42)


# ---------------------------------------------------------------------------
# Model implementations
# ---------------------------------------------------------------------------

def _seasonal_naive(train: np.ndarray, h: int) -> np.ndarray:
    season = 12
    fc = np.array([train[-season + (i % season)] for i in range(h)], dtype=float)
    return np.clip(fc, 0, None)


def _holt_winters(train: np.ndarray, h: int) -> np.ndarray:
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    fit = ExponentialSmoothing(
        train, trend="add", damped_trend=True, seasonal=None,
        initialization_method="estimated"
    ).fit(optimized=True)
    return np.clip(np.asarray(fit.forecast(h), dtype=float), 0, None)


def _sarima(train: np.ndarray, h: int) -> np.ndarray:
    from statsmodels.tsa.statespace.sarimax import SARIMAX
    try:
        if len(train) >= 24:
            fit = SARIMAX(train, order=(1, 1, 0), seasonal_order=(1, 0, 0, 12),
                          enforce_stationarity=False, enforce_invertibility=False).fit(disp=False)
        else:
            fit = SARIMAX(train, order=(1, 1, 0)).fit(disp=False)
        return np.clip(np.asarray(fit.forecast(h), dtype=float), 0, None)
    except Exception:
        from statsmodels.tsa.arima.model import ARIMA as _ARIMA
        fit2 = _ARIMA(train, order=(1, 1, 0)).fit()
        return np.clip(np.asarray(fit2.forecast(h), dtype=float), 0, None)


def _xgb_regressor(train: np.ndarray, h: int, n_lags: int = 3) -> np.ndarray:
    import xgboost as xgb
    if len(train) < n_lags + 2:
        return _holt_winters(train, h)
    n = len(train)
    rows_X, rows_y = [], []
    for i in range(n_lags, n):
        lags = train[i - n_lags: i][::-1]
        month = ((i - 1) % 12) + 1
        rows_X.append([*lags, np.sin(2 * np.pi * month / 12), np.cos(2 * np.pi * month / 12), i])
        rows_y.append(train[i])
    model = xgb.XGBRegressor(
        n_estimators=200, max_depth=3, learning_rate=0.1,
        subsample=0.8, colsample_bytree=0.8, random_state=42, verbosity=0, n_jobs=1
    )
    model.fit(np.array(rows_X, dtype=float), np.array(rows_y, dtype=float))
    history = list(train)
    preds = []
    for step in range(h):
        i = n + step
        lags = np.array(history[-n_lags:][::-1], dtype=float)
        month = ((i - 1) % 12) + 1
        x = np.array([[*lags, np.sin(2 * np.pi * month / 12), np.cos(2 * np.pi * month / 12), i]])
        yhat = max(0.0, float(model.predict(x)[0]))
        preds.append(yhat)
        history.append(yhat)
    return np.array(preds, dtype=float)


_FUNCS = {
    "seasonal_naive": _seasonal_naive,
    "holt_winters": _holt_winters,
    "sarima": _sarima,
    "xgb_regressor": _xgb_regressor,
}


def _safe_call(name: str, train: np.ndarray, h: int) -> Optional[np.ndarray]:
    if name == "seasonal_naive" and len(train) < _MIN_SN_TRAIN:
        return None
    if len(train) < _MIN_TRAIN:
        return None
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            fc = np.asarray(_FUNCS[name](train, h), dtype=float)
        if fc is None or len(fc) == 0 or not np.all(np.isfinite(fc)):
            return None
        return np.clip(fc, 0, None)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Rolling-origin backtest
# ---------------------------------------------------------------------------

@dataclass
class FoldResult:
    model: str
    fold: int
    mape: Optional[float]
    mae: float


@dataclass
class BacktestResult:
    model: str
    avg_mape: Optional[float]
    avg_mae: float
    folds: List[FoldResult] = field(default_factory=list)


def _mape(actual: np.ndarray, pred: np.ndarray) -> Optional[float]:
    if np.any(actual == 0):
        return None
    return float(np.mean(np.abs((actual - pred) / actual)))


def _mae(actual: np.ndarray, pred: np.ndarray) -> float:
    return float(np.mean(np.abs(actual - pred)))


def _rolling_origin_backtest(y: np.ndarray, n_folds: int = 3, horizon: int = 6) -> Dict[str, BacktestResult]:
    results: Dict[str, List[FoldResult]] = {m: [] for m in MODELS}
    n = len(y)
    for fold in range(n_folds):
        test_end = n - horizon * (n_folds - fold - 1)
        test_start = test_end - horizon
        if test_start < _MIN_TRAIN:
            continue
        train_fold = y[:test_start]
        test_fold = y[test_start:test_end]
        if len(test_fold) < horizon:
            continue
        for m in MODELS:
            fc = _safe_call(m, train_fold, horizon)
            if fc is None:
                continue
            results[m].append(FoldResult(
                model=m, fold=fold, mape=_mape(test_fold, fc), mae=_mae(test_fold, fc)
            ))
    agg: Dict[str, BacktestResult] = {}
    for m, folds in results.items():
        if not folds:
            agg[m] = BacktestResult(model=m, avg_mape=None, avg_mae=float("inf"), folds=[])
            continue
        maes = [f.mae for f in folds]
        mapes = [f.mape for f in folds if f.mape is not None]
        avg_mape = float(np.mean(mapes)) if mapes and len(mapes) == len(folds) else None
        agg[m] = BacktestResult(model=m, avg_mape=avg_mape, avg_mae=float(np.mean(maes)), folds=folds)
    return agg


def _pick_winner(bt: Dict[str, BacktestResult]) -> str:
    if all(r.avg_mape is not None for r in bt.values() if r.avg_mae < float("inf")):
        valid = {m: r for m, r in bt.items() if r.avg_mae < float("inf") and r.avg_mape is not None}
        if valid:
            return min(valid, key=lambda m: (valid[m].avg_mape, MODELS.index(m)))
    valid = {m: r for m, r in bt.items() if r.avg_mae < float("inf")}
    if not valid:
        return "holt_winters"
    return min(valid, key=lambda m: (valid[m].avg_mae, MODELS.index(m)))


# ---------------------------------------------------------------------------
# Prediction interval via residual bootstrap
# ---------------------------------------------------------------------------

def _bootstrap_pi(y: np.ndarray, best_model: str, fc: np.ndarray, h: int, n_boot: int = 200) -> Tuple[np.ndarray, np.ndarray]:
    n = len(y)
    ho = min(h, n // 2)
    if ho < 2:
        return np.clip(fc * 0.90, 0, None), fc * 1.10
    train = y[:-ho]
    test = y[-ho:]
    fc_res = _safe_call(best_model, train, ho)
    if fc_res is None:
        fc_res = np.repeat(np.mean(train[-config.MA_WINDOW:]), ho)
    residuals = test - fc_res[:ho]
    boot_traces = [np.clip(fc + _RNG.choice(residuals, size=h, replace=True), 0, None) for _ in range(n_boot)]
    boot_matrix = np.stack(boot_traces)
    lo_pct = (1.0 - _PI_ALPHA) / 2.0 * 100
    hi_pct = (1.0 + _PI_ALPHA) / 2.0 * 100
    return np.percentile(boot_matrix, lo_pct, axis=0), np.percentile(boot_matrix, hi_pct, axis=0)


# ---------------------------------------------------------------------------
# Supply cohort pipeline
# ---------------------------------------------------------------------------

def _cohort_supply_series(seats: float, period_start, n_months: int) -> np.ndarray:
    """
    Cohort pipeline:
        intake            = seats x COHORT_FILL_RATE
        certified/cohort  = intake x COHORT_PASS_RATE
        available/cohort  = certified x PLACEMENT_ADJUSTMENT
    Cohorts graduate every COHORT_DURATION_MONTHS months.
    Returns array of length n_months with workers available each month.
    """
    fill_rate = config.COHORT_FILL_RATE
    duration = config.COHORT_DURATION_MONTHS
    pass_rate = config.COHORT_PASS_RATE
    placement = config.PLACEMENT_ADJUSTMENT

    available_per_cohort = seats * fill_rate * pass_rate * placement
    supply = np.zeros(n_months, dtype=float)
    for i in range(n_months):
        if (i + 1) % duration == 0:
            supply[i] += available_per_cohort
    return supply


# ---------------------------------------------------------------------------
# Gap / status / warning
# ---------------------------------------------------------------------------

def _status(gap: float, demand: float) -> str:
    if demand <= 0:
        return "Balanced"
    r = gap / demand
    if r > config.GAP_THRESHOLD:
        return "Shortage"
    if r < -config.GAP_THRESHOLD:
        return "Surplus"
    return "Balanced"


def _warning(gap_pct: float, status: str, demand_trend: float, supply_trend: float) -> Tuple[str, bool]:
    d = demand_trend - supply_trend
    diverging = (abs(d) > config.DIVERGENCE_THRESHOLD) and (
        (status == "Shortage" and d > 0)
        or (status == "Surplus" and d < 0)
        or status == "Balanced"
    )
    if abs(gap_pct) > config.RED_GAP_MULTIPLIER * config.GAP_THRESHOLD or (status != "Balanced" and diverging):
        return "Red", bool(diverging)
    if status != "Balanced" or diverging:
        return "Amber", bool(diverging)
    return "Green", bool(diverging)


def _quarter_label(period) -> str:
    return f"{period.year}-Q{period.quarter}"


# ---------------------------------------------------------------------------
# Master compute function
# ---------------------------------------------------------------------------

def compute(engine) -> Dict:
    """Phase-2 analytics. Returns series, gaps, ranked, mae, model_log, headline_quarter."""
    with engine.connect() as c:
        dem = pd.read_sql("SELECT district_id, master_id, month, postings, source_label FROM demand_monthly", c)
        sup = pd.read_sql(
            "SELECT district_id, master_id, period, seats, enrolled, certified, "
            "expected_available_workers AS eaw, source_label FROM supply_snapshot", c
        )
        dist = pd.read_sql("SELECT id AS district_id, name AS district, state FROM district", c)
        occ = pd.read_sql("SELECT master_id, name AS trade, sector FROM occupation_master", c)

    dname = dict(zip(dist.district_id, dist.district))
    tname = dict(zip(occ.master_id, occ.trade))

    sup_latest = (
        sup.sort_values("period")
        .groupby(["district_id", "master_id"])
        .tail(1)
        .set_index(["district_id", "master_id"])
    )

    h = config.FORECAST_MONTHS
    n_folds = config.BACKTEST_FOLDS
    backtest_horizon = config.BACKTEST_HORIZON

    series: Dict = {}
    gaps_rows: List[dict] = []
    model_log: List[dict] = []

    for (d, m), g in dem.groupby(["district_id", "master_id"]):
        g = g.sort_values("month")
        months_idx = pd.PeriodIndex(g["month"], freq="M")
        y = g["postings"].to_numpy(float)

        # backtest & model selection
        bt = _rolling_origin_backtest(y, n_folds=n_folds, horizon=backtest_horizon)
        best_model = _pick_winner(bt)

        # final forecast on full history
        fc = _safe_call(best_model, y, h)
        if fc is None:
            best_model = "holt_winters"
            fc = _safe_call("holt_winters", y, h)
        if fc is None:
            best_model = "seasonal_naive"
            fc = np.repeat(np.mean(y[-config.MA_WINDOW:]), h)

        # 80% prediction interval
        lo_80, hi_80 = _bootstrap_pi(y, best_model, fc, h)

        # supply cohort pipeline
        fmonths = pd.period_range(months_idx[-1] + 1, periods=h, freq="M")
        s_row = sup_latest.loc[(d, m)] if (d, m) in sup_latest.index else None
        if s_row is not None:
            seats = float(s_row.get("seats") or s_row.get("eaw") or 0)
            supply_monthly = _cohort_supply_series(seats, fmonths[0], h)
            supply_label = str(s_row["source_label"])
        else:
            supply_monthly = np.zeros(h)
            supply_label = "Sample"

        demand_label = max(set(g["source_label"]), key=lambda x: LABEL_RANK[x])
        combined_label = max({demand_label, supply_label}, key=lambda x: LABEL_RANK[x])

        # quarterly aggregation
        fdf = pd.DataFrame({
            "month": fmonths, "fc": fc, "lo_80": lo_80, "hi_80": hi_80, "supply": supply_monthly,
        })
        fdf["q"] = [_quarter_label(p) for p in fmonths]
        q_agg = fdf.groupby("q").agg(
            demand_sum=("fc", "sum"), lo_sum=("lo_80", "sum"), hi_sum=("hi_80", "sum"),
            supply_sum=("supply", "sum"), count=("fc", "count"),
        )
        q_complete = q_agg[q_agg["count"] == 3]

        last_q_actual = float(y[-3:].sum()) if len(y) >= 3 else float(y.sum())
        demand_trend = (
            float(q_complete["demand_sum"].iloc[0] / last_q_actual - 1)
            if last_q_actual > 0 and len(q_complete) > 0 else 0.0
        )
        supply_trend = 0.0

        for q_label, row in q_complete.iterrows():
            dq = float(row["demand_sum"])
            sq = float(row["supply_sum"])
            gap = dq - sq
            gap_pct = gap / dq if dq > 0 else 0.0
            st = _status(gap, dq)
            wl, div = _warning(gap_pct, st, demand_trend, supply_trend)
            gaps_rows.append(dict(
                district_id=int(d), district=dname[d], master_id=int(m), trade=tname[m],
                quarter=q_label, forecast_demand=round(dq, 1), forecast_supply=round(sq, 1),
                lo_80=round(float(row["lo_sum"]), 1), hi_80=round(float(row["hi_sum"]), 1),
                gap=round(gap, 1), gap_pct=round(gap_pct, 4), status=st, early_warning=wl,
                diverging=div, demand_trend=round(demand_trend, 4), supply_trend=supply_trend,
                model=best_model, source_label=combined_label,
                demand_label=demand_label, supply_label=supply_label,
            ))

        # model log
        bt_record = {
            m_name: {
                "avg_mape": round(r.avg_mape, 4) if r.avg_mape is not None else None,
                "avg_mae": round(r.avg_mae, 2) if r.avg_mae < float("inf") else None,
                "n_folds": len(r.folds),
            }
            for m_name, r in bt.items()
        }
        model_log.append(dict(
            district_id=int(d), district=dname[d], master_id=int(m), trade=tname[m],
            winner=best_model,
            **{f"{m_name}_mape": bt_record[m_name]["avg_mape"] for m_name in MODELS},
            **{f"{m_name}_mae": bt_record[m_name]["avg_mae"] for m_name in MODELS},
        ))

        series[(int(d), int(m))] = dict(
            district_id=int(d), district=dname[d], master_id=int(m), trade=tname[m],
            model=best_model, backtest=bt_record,
            history=[{"month": str(p), "postings": float(v)} for p, v in zip(months_idx, y)],
            forecast=[{
                "month": str(p), "postings": round(float(fc[i]), 1),
                "lo_80": round(float(lo_80[i]), 1), "hi_80": round(float(hi_80[i]), 1),
                "supply": round(float(supply_monthly[i]), 1),
            } for i, p in enumerate(fmonths)],
            source_label=combined_label, demand_label=demand_label, supply_label=supply_label,
        )

    gaps = pd.DataFrame(gaps_rows)
    if gaps.empty:
        return dict(series=series, gaps=gaps, ranked=gaps, mae=pd.DataFrame(),
                    model_log=model_log, headline_quarter="N/A")

    first_q = sorted(gaps["quarter"].unique())[0]
    head = gaps[gaps["quarter"] == first_q].copy()
    head["abs_gap"] = head["gap"].abs()
    ranked = head.sort_values("abs_gap", ascending=False).reset_index(drop=True)
    ranked.insert(0, "rank", ranked.index + 1)

    mae_rows = []
    for entry in model_log:
        row = {"district": entry["district"], "trade": entry["trade"], "winner": entry["winner"]}
        for m_name in MODELS:
            row[f"{m_name}_mape"] = entry.get(f"{m_name}_mape")
            row[f"{m_name}_mae"] = entry.get(f"{m_name}_mae")
        mae_rows.append(row)

    return dict(
        series=series, gaps=gaps, ranked=ranked,
        mae=pd.DataFrame(mae_rows), model_log=model_log, headline_quarter=first_q,
    )
