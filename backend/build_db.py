"""Builds data/lmis.db (SQLite): seeds demo data and precomputes XGBoost forecasts. Run: python build_db.py"""
from app.main import DB_PATH, load
if DB_PATH.exists(): DB_PATH.unlink()
load(); print("Built", DB_PATH)
