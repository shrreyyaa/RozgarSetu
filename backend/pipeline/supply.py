"""SETU supply pipeline (MVP) -> supply_snapshot.

Inputs (files in /data/supply/, used if present; otherwise generated and labelled):
  iti_state_trade.csv   columns: state, trade, seats, enrolled [, period]
                        (ITI seats/enrolment by trade and state, e.g. PIB trade-wise table 2021)
  pmkvy_district.csv    columns: district, trade, trained, certified, placed [, period]
                        (PMKVY by district, e.g. data.gov.in district files; needs a trade column)

Per (district, trade): seats, enrolled, certified, expected_available_workers
  = certified x PLACEMENT_ADJUSTMENT (config.py, default 0.7).

Labels (never upgraded):
  Real      every field comes from a district-level government file
  Estimated seats/enrolled are a state-level Real figure split to districts
            (split weight = 1/STATE_DISTRICT_COUNT per district, NOT demand, to avoid circularity)
  Sample    any field was generated  (Sample dominates: Sample > Estimated > Real)
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config  # noqa: E402
from seed import engine, SUPPLY_BASELINES  # noqa: E402
from pipeline.demand import norm_title, build_lookup  # noqa: E402
import difflib  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent.parent
SUPPLY_DIR = ROOT / "data" / "supply"
ITI_FILE = SUPPLY_DIR / "iti_state_trade.csv"
PMKVY_FILE = SUPPLY_DIR / "pmkvy_district.csv"
DEFAULT_PERIOD = "2025-26"
STATE_DISTRICT_COUNT = 36   # Maharashtra has 36 districts; state totals are split 1/36 per district


def _map_trade(name, lookup):
    n = norm_title(name)
    if n in lookup:
        return lookup[n]
    hit = difflib.get_close_matches(n, list(lookup), n=1, cutoff=0.85)
    return lookup[hit[0]] if hit else None


def _sample_row(dist, trade_name, seed=7):
    """Generated district-level figures (annual = quarterly baseline x 4)."""
    rng = np.random.default_rng(sum(map(ord, dist + trade_name)) + seed)
    seats = int(SUPPLY_BASELINES.get((dist, trade_name), 80) * 4)
    enrolled = int(round(seats * rng.uniform(0.80, 0.95)))
    certified = int(round(enrolled * rng.uniform(0.75, 0.88)))
    return seats, enrolled, certified


def build_supply(districts, masters, lookup, iti, pmkvy, adj, period):
    """districts: df[id,state,name]; masters: df[master_id,name]; iti/pmkvy: df or None."""
    if iti is not None:
        iti = iti.copy()
        iti["master_id"] = iti["trade"].map(lambda t: _map_trade(t, lookup))
        iti["state"] = iti["state"].astype(str).str.strip()
    if pmkvy is not None:
        pmkvy = pmkvy.copy()
        pmkvy["master_id"] = pmkvy["trade"].map(lambda t: _map_trade(t, lookup))
        pmkvy["district"] = pmkvy["district"].astype(str).str.strip()
    out = []
    for d in districts.itertuples():
        for m in masters.itertuples():
            s_seats, s_enr, s_cert = _sample_row(d.name, m.name)
            # seats / enrolled
            st = None if iti is None else iti[(iti.state == d.state) & (iti.master_id == m.master_id)]
            if st is not None and len(st):
                seats = int(round(st.iloc[0]["seats"] / STATE_DISTRICT_COUNT))
                enrolled = int(round(st.iloc[0]["enrolled"] / STATE_DISTRICT_COUNT))
                lab_a = "Estimated"
            else:
                seats, enrolled, lab_a = s_seats, s_enr, "Sample"
            # certified
            pm = None if pmkvy is None else pmkvy[(pmkvy.district == d.name) & (pmkvy.master_id == m.master_id)]
            if pm is not None and len(pm):
                certified, lab_b = int(pm["certified"].sum()), "Real"
            else:
                certified, lab_b = s_cert, "Sample"
            labels = {lab_a, lab_b}
            label = "Sample" if "Sample" in labels else ("Estimated" if "Estimated" in labels else "Real")
            out.append(dict(district_id=int(d.id), master_id=int(m.master_id), period=period,
                            seats=seats, enrolled=enrolled, certified=certified,
                            expected_available_workers=round(certified * adj, 2), source_label=label))
    return pd.DataFrame(out)


def run():
    iti = pd.read_csv(ITI_FILE) if ITI_FILE.exists() else None
    pmkvy = pd.read_csv(PMKVY_FILE) if PMKVY_FILE.exists() else None
    print(f"[supply] ITI file   {'FOUND' if iti is not None else 'MISSING -> Sample'}: {ITI_FILE.relative_to(ROOT)}")
    print(f"[supply] PMKVY file {'FOUND' if pmkvy is not None else 'MISSING -> Sample'}: {PMKVY_FILE.relative_to(ROOT)}")
    print(f"[supply] placement_adjustment = {config.PLACEMENT_ADJUSTMENT}")
    with engine.begin() as conn:
        districts = pd.read_sql("SELECT id, state, name FROM district", conn)
        masters = pd.read_sql("SELECT master_id, name FROM occupation_master", conn)
        df = build_supply(districts, masters, build_lookup(conn), iti, pmkvy,
                          config.PLACEMENT_ADJUSTMENT, DEFAULT_PERIOD)
        conn.execute(text("DELETE FROM supply_snapshot"))
        df.to_sql("supply_snapshot", conn, if_exists="append", index=False)
    print(f"[supply] supply_snapshot rows written: {len(df)}")


if __name__ == "__main__":
    run()
