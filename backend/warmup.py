"""SETU Forecast Warm-up Script.
Precomputes and caches rolling backtest forecasts in SQLite.
Run inside container or after database seed.
"""
import sys
import time
from pathlib import Path
from sqlalchemy import create_engine

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app.main import engine, _an

if __name__ == "__main__":
    t0 = time.time()
    print("SETU Warm-up: Precomputing ML models and caching forecasts...")
    r = _an()
    t1 = time.time()
    print(f"Warm-up complete in {t1-t0:.2f}s.")
    print(f"Precomputed {len(r['series'])} series across {len(r['ranked'])} pairs for headline {r['headline_quarter']}.")
