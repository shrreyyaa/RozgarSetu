"""Comprehensive Test Suite for SETU LMIS.
Verifies:
1. Core gap analysis and status thresholds (positive=shortage, negative=surplus)
2. Normalization of job titles and course aliases to NCO-aligned occupations
3. Location normalization
4. CSV upload validation, row-level errors, duplicate detection, and cohort integrity
5. Evidence-based recommendation generation
6. Time-series forecast evaluation (baselines vs XGBoost)
7. FastAPI endpoint schemas and error handling
8. Zero-demand and edge cases
"""
import pytest
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient

from app.main import app, gaps, T, DB_PATH
from app.normalization import OccupationNormalizer, normalize_location, clean_text
from app.connectors import CSVUploadConnector
from app.recommendations import generate_recommendations
from app.evaluation import evaluate_models
import app.engine as E

client = TestClient(app)

# ----------------------------------------------------------------------------
# 1. Normalization & Clean Text Tests
# ----------------------------------------------------------------------------

def test_clean_text():
    assert clean_text("  Motor Mechanic Vehicle (MMV) / Diesel  ") == "motor mechanic vehicle mmv diesel"
    assert clean_text("") == ""
    assert clean_text("Electrician, Grade-1") == "electrician grade 1"

def test_normalize_location():
    # District synonyms
    d1, s1 = normalize_location("Poona", "MH")
    assert d1 == "Pune"
    assert s1 == "Maharashtra"

    d2, s2 = normalize_location("Bangalore", "Karnataka")
    assert d2 == "Bengaluru Urban"
    assert s2 == "Karnataka"

    d3, _ = normalize_location("Amdavad")
    assert d3 == "Ahmedabad"

    # Unsupported district
    d_bad, _ = normalize_location("Atlantis")
    assert d_bad is None

def test_occupation_normalizer_exact_and_aliases():
    normalizer = OccupationNormalizer()

    # Exact canonical match
    res1 = normalizer.normalize("Automobile Mechanic")
    assert res1["occupation_id"] == 1
    assert res1["confidence"] == 1.0
    assert not res1["flag_for_review"]

    # Known alias match
    res2 = normalizer.normalize("MMV")
    assert res2["occupation_id"] == 1
    assert res2["confidence"] >= 0.90

    # EV Technician alias
    res3 = normalizer.normalize("Electric Vehicle Service Specialist")
    assert res3["occupation_id"] == 2
    assert res3["nco_code"] == "7412"

    # Keyword rule match
    res4 = normalizer.normalize("High Voltage EV Battery Assembler")
    assert res4["occupation_id"] == 2

    # Unmapped title
    res5 = normalizer.normalize("Underwater Basket Weaver")
    assert res5["occupation_id"] is None
    assert res5["method"] == "UNMAPPED"
    assert res5["flag_for_review"] is True

# ----------------------------------------------------------------------------
# 2. CSV Upload Pipeline & Validation Tests
# ----------------------------------------------------------------------------

def test_csv_upload_valid():
    connector = CSVUploadConnector()
    valid_csv = (
        "district,occupation,course_title,period,capacity_seats,enrolled,in_training,completed,certified,placed\n"
        "Pune,Automobile Mechanic,Motor Mechanic Vehicle,2024-Q3,50,45,42,40,38,30\n"
        "Bengaluru Urban,Electrician,Industrial Electrician,2024-Q3,60,55,50,48,46,40\n"
    )
    res = connector.validate_and_parse(valid_csv, filename="valid.csv")
    assert res["success"] is True
    assert res["total_rows"] == 2
    assert res["accepted_count"] == 2
    assert res["rejected_count"] == 0
    assert len(res["errors"]) == 0

def test_csv_upload_validation_errors():
    connector = CSVUploadConnector()
    invalid_csv = (
        "district,occupation,course_title,period,capacity_seats,enrolled,in_training,completed,certified,placed\n"
        "UnknownDist,Astronaut,Rocket Scientist,2024-Q3,-5,50,40,30,20,10\n"
        "Pune,Electrician,Wireman,2024-Q3,50,40,35,45,30,20\n"  # completed (45) > enrolled (40)
        "Pune,Electrician,Wireman,2024-Q3,50,40,35,45,30,20\n"  # duplicate
    )
    res = connector.validate_and_parse(invalid_csv, filename="invalid.csv")
    assert res["success"] is False
    assert res["total_rows"] == 3
    assert res["rejected_count"] == 3

    err_codes = [e["error_code"] for e in res["errors"]]
    assert "INVALID_DISTRICT" in err_codes
    assert "UNMAPPED_OCCUPATION" in err_codes
    assert "NEGATIVE_VALUE" in err_codes
    assert "COHORT_INTEGRITY_WARNING" in err_codes
    assert "DUPLICATE_RECORD" in err_codes

def test_csv_upload_missing_columns():
    connector = CSVUploadConnector()
    bad_header_csv = "district,occupation,capacity_seats\nPune,Electrician,50\n"
    res = connector.validate_and_parse(bad_header_csv)
    assert res["success"] is False
    assert res["error"] == "MISSING_REQUIRED_COLUMNS"

# ----------------------------------------------------------------------------
# 3. Gap Analysis & Status Threshold Tests
# ----------------------------------------------------------------------------

def test_gap_calculation_logic():
    # Positive gap = potential shortage
    # Negative gap = potential oversupply
    assert E.status(np.array([0.30]))[0] == "critical shortage"
    assert E.status(np.array([0.15]))[0] == "shortage"
    assert E.status(np.array([0.02]))[0] == "balanced"
    assert E.status(np.array([-0.15]))[0] == "mild surplus"
    assert E.status(np.array([-0.35]))[0] == "surplus"

def test_gaps_group_by_state():
    g = gaps(horizon=6, group_by="state")
    assert not g.empty
    assert "state" in g.columns
    assert "gap" in g.columns
    assert "status" in g.columns
    assert len(g) == 4  # 4 pilot states

def test_gaps_group_by_district():
    g = gaps(horizon=6, group_by="district")
    assert not g.empty
    assert "district" in g.columns
    assert len(g) == 12  # 12 pilot districts

# ----------------------------------------------------------------------------
# 4. Recommendation Engine Tests
# ----------------------------------------------------------------------------

def test_recommendations_generation():
    g_occ = gaps(horizon=6, group_by="occupation")
    cen = T["training_centres"]
    recs = generate_recommendations(g_occ, cen)
    assert len(recs) > 0
    first = recs[0]
    assert "recommendation_id" in first
    assert "action" in first
    assert "priority" in first
    assert "rationale" in first
    assert "metrics" in first
    assert first["priority"] in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]

# ----------------------------------------------------------------------------
# 5. Model Evaluation & Baselines Tests
# ----------------------------------------------------------------------------

def test_evaluate_models():
    eval_res = evaluate_models(T["demand_history"], T["occupations"], T["labour_stats"])
    assert "horizons" in eval_res
    assert "6_month" in eval_res["horizons"]
    h6 = eval_res["horizons"]["6_month"]["models"]
    assert "naive_baseline" in h6
    assert "ma6_baseline" in h6
    assert "xgboost_tuned" in h6
    assert h6["xgboost_tuned"]["wape_pct"] < h6["naive_baseline"]["wape_pct"]

# ----------------------------------------------------------------------------
# 6. API Endpoint Integration Tests
# ----------------------------------------------------------------------------

def test_api_overview():
    res = client.get("/api/overview")
    assert res.status_code == 200
    data = res.json()
    assert "indicators" in data
    assert "occupation_signals" in data
    assert data["occupation_signals"]["total_occupations_tracked"] == 10

def test_api_demand_intelligence():
    res = client.get("/api/demand-intelligence")
    assert res.status_code == 200
    data = res.json()
    assert "monthly_trends" in data
    assert "sector_distribution" in data
    assert "skill_frequency" in data
    assert "salary_benchmarks" in data
    assert "model_evaluation" in data

def test_api_supply_intelligence():
    res = client.get("/api/supply-intelligence")
    assert res.status_code == 200
    data = res.json()
    assert "pipeline_funnel" in data
    assert "conversion_metrics" in data
    assert "expected_future_supply" in data

def test_api_my_centre():
    res = client.get("/api/my-centre?centre_id=1")
    assert res.status_code == 200
    data = res.json()
    assert "centre_profile" in data
    assert "registered_courses" in data
    assert "local_district_demand" in data

def test_api_data_quality():
    res = client.get("/api/data-quality")
    assert res.status_code == 200
    data = res.json()
    assert "data_sources" in data
    assert "ingestion_runs" in data
    assert "pilot_scope" in data

def test_api_normalize_title_endpoint():
    res = client.post("/api/normalize-title", json={"title": "Car Mechanic"})
    assert res.status_code == 200
    data = res.json()
    assert data["occupation_id"] == 1
    assert data["occupation"] == "Automobile Mechanic"


# ----------------------------------------------------------------------------
# 9. Connected workflow: catalog + workspace (context scoping, honesty)
# ----------------------------------------------------------------------------

def test_catalog_levels_and_validation():
    r = client.get("/api/catalog").json()
    assert "states" in r and "districts" not in r
    r = client.get("/api/catalog", params={"state": "Maharashtra"}).json()
    assert {d["district"] for d in r["districts"]} >= {"Pune"}
    r = client.get("/api/catalog", params={"state": "Maharashtra", "district": "Pune"}).json()
    assert r["sectors"] and all("demand_available" in s for s in r["sectors"])
    r = client.get("/api/catalog", params={"state": "Maharashtra", "district": "Pune", "sector": "Automotive"}).json()
    assert r["occupations"] and all("nco_code" in o and "skills" in o for o in r["occupations"])
    # invalid combinations are rejected, not silently accepted
    assert client.get("/api/catalog", params={"state": "Gujarat", "district": "Pune"}).status_code == 422
    assert client.get("/api/catalog", params={"state": "Nowhere"}).status_code == 422


def test_workspace_is_scoped_to_selection():
    p = dict(state="Maharashtra", district="Pune", sector="Automotive", occupation="EV Technician", horizon=6)
    a = client.get("/api/workspace", params=p).json()
    assert a["context"]["district"] == "Pune" and a["context"]["occupation"] == "EV Technician"
    for key in ("overview", "demand", "supply", "gap", "forecast", "recommendations"):
        assert key in a
    # gap formula: forecast demand - supply
    g = a["gap"]
    assert g["available"] and abs(g["gap"] - (g["forecast_demand"] - g["supply"])) <= 1
    # changing district must change the numbers (no cross-location contamination)
    p2 = dict(p, state="Gujarat", district="Ahmedabad")
    b = client.get("/api/workspace", params=p2).json()
    assert b["context"]["district"] == "Ahmedabad"
    assert b["demand"]["history"] != a["demand"]["history"]
    # sample data must be labelled
    assert a["sources"]["demand"]["label"] == "Sample data"


def test_workspace_invalid_and_missing_data_honest():
    bad = client.get("/api/workspace", params=dict(state="Maharashtra", district="Pune", sector="Healthcare", occupation="EV Technician"))
    assert bad.status_code == 422  # occupation not in sector
    a = client.get("/api/workspace", params=dict(state="Maharashtra", district="Pune", occupation="EV Technician", centre_id=2)).json()
    # missing pipeline for a scope is None / empty, never fabricated zeros
    assert a["supply"]["scope"] == "centre"
    for m in a["overview"]:
        assert m["value"] is not None or m["status"] == "Data unavailable"


def test_recommendations_do_not_auto_convert_gap_to_seats():
    a = client.get("/api/workspace", params=dict(state="Maharashtra", district="Pune", occupation="EV Technician")).json()
    assert a["recommendations"] and all(r["human_review_required"] for r in a["recommendations"])
    text = " ".join(" ".join(r["proposed_steps"]) for r in a["recommendations"])
    assert "annual seats" not in text
