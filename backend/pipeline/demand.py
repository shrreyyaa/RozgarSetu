"""SETU demand pipeline (MVP).

Steps: ingest -> clean (dedupe) -> map to master occupation (alias, then fuzzy)
-> aggregate to demand_monthly -> compute Demand Index.

Ingest priority:
  1. CSV(s) placed in /data/demand/ (any *.csv except our own outputs). Real if
     the file is user-supplied; the label is taken from a `source_label` column
     if present, otherwise defaults to 'Real'.
  2. Otherwise generate 12 months of SAMPLE postings and label them 'Sample'.
(No NCS API credentials / scraped CSV exist in this project; NCS has no open API.)

Expected CSV columns: title, employer, district, date (YYYY-MM-DD) [, source_label]
"""
import difflib
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from seed import engine, DEMAND_BASELINES, TRADES  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent.parent
DEMAND_DIR = ROOT / "data" / "demand"
SAMPLE_CSV = DEMAND_DIR / "sample_postings.csv"      # generated, label=Sample
UNMAPPED_LOG = DEMAND_DIR / "unmapped_titles.csv"
OUTPUT_FILES = {SAMPLE_CSV.name, UNMAPPED_LOG.name}
FUZZY_CUTOFF = 0.85
MONTHS = [str(p) for p in pd.period_range("2025-10", "2026-09", freq="M")]

EMPLOYERS = [f"Employer {i:02d}" for i in range(1, 41)]
JUNK_TITLES = ["Sales Executive", "Delivery Partner", "Accountant", "Security Guard",
               "Graphic Designer", "Telecaller", "Driver", "Business Development Manager"]
# per-trade monthly growth trend (sample assumption, not measured)
TREND = {"EV Service Technician": 0.035, "Solar PV Technician": 0.03, "Healthcare Assistant": 0.015,
         "Data Entry Operator": -0.015, "Welder": -0.005}


def norm_title(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9()/ ]", " ", str(s).lower())).strip()


# ---------- 1. Ingest ----------
def generate_sample_postings(seed=42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows = []
    for (dist, trade), base in DEMAND_BASELINES.items():
        t = next(x for x in TRADES if x["name"] == trade)
        titles = [trade] + t["aliases"]
        g = TREND.get(trade, 0.0) + rng.normal(0, 0.005)
        for i, m in enumerate(MONTHS):
            n = max(1, int(round(base * (1 + g) ** i * rng.uniform(0.93, 1.07))))
            kind = rng.choice(["exact", "case", "typo", "junk"], size=n, p=[.70, .15, .12, .03])
            for k in kind:
                title = titles[rng.integers(len(titles))]
                if k == "case":
                    title = rng.choice([title.upper(), title.lower(), f"  {title}  "])
                elif k == "typo" and len(title) > 4:
                    j = rng.integers(1, len(title) - 1)
                    title = title[:j] + title[j + 1:]          # drop one char
                elif k == "junk":
                    title = JUNK_TITLES[rng.integers(len(JUNK_TITLES))]
                day = rng.integers(1, 29)
                rows.append((title, EMPLOYERS[rng.integers(len(EMPLOYERS))], dist, f"{m}-{day:02d}"))
    df = pd.DataFrame(rows, columns=["title", "employer", "district", "date"])
    dups = df.sample(frac=0.04, random_state=seed)               # inject exact duplicates
    df = pd.concat([df, dups], ignore_index=True).sample(frac=1, random_state=seed).reset_index(drop=True)
    df["source_label"] = "Sample"
    return df


def ingest() -> pd.DataFrame:
    DEMAND_DIR.mkdir(parents=True, exist_ok=True)
    user_csvs = [p for p in DEMAND_DIR.glob("*.csv") if p.name not in OUTPUT_FILES]
    if user_csvs:
        df = pd.concat([pd.read_csv(p).assign(_file=p.name) for p in user_csvs], ignore_index=True)
        if "source_label" not in df:
            df["source_label"] = "Real"
        print(f"[ingest] using user CSVs: {[p.name for p in user_csvs]}")
    else:
        print("[ingest] NCS API/CSV unavailable and /data/demand/ has no user CSV -> generating SAMPLE postings")
        df = generate_sample_postings()
        df.to_csv(SAMPLE_CSV, index=False)
    print(f"[ingest] raw rows: {len(df)}  labels: {df['source_label'].value_counts().to_dict()}")
    return df


# ---------- 2. Clean ----------
def clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["_key"] = df["title"].map(norm_title) + "|" + df["employer"].astype(str).str.strip().str.lower() \
        + "|" + df["district"].astype(str).str.strip() + "|" + df["date"].astype(str)
    before = len(df)
    df = df.drop_duplicates("_key").drop(columns="_key").reset_index(drop=True)
    print(f"[clean] dropped {before - len(df)} exact duplicates ({before} -> {len(df)})")
    return df


# ---------- 3. Map ----------
def build_lookup(conn):
    rows = conn.execute(text("SELECT alias_text, master_id FROM occupation_alias")).fetchall()
    rows += conn.execute(text("SELECT name, master_id FROM occupation_master")).fetchall()
    return {norm_title(a): int(m) for a, m in rows}


def map_titles(df: pd.DataFrame, lookup: dict) -> pd.DataFrame:
    keys = list(lookup)
    cache = {}
    for raw in df["title"].unique():
        n = norm_title(raw)
        if n in lookup:
            cache[raw] = (lookup[n], "alias")
        else:
            hit = difflib.get_close_matches(n, keys, n=1, cutoff=FUZZY_CUTOFF)
            cache[raw] = (lookup[hit[0]], "fuzzy") if hit else (None, "unmapped")
    df = df.copy()
    df["master_id"] = df["title"].map(lambda t: cache[t][0])
    df["match_method"] = df["title"].map(lambda t: cache[t][1])
    return df


# ---------- 4+5 ----------
def aggregate_and_index(df: pd.DataFrame, conn):
    mapped = df[df["master_id"].notna()].copy()
    dmap = {n: int(i) for i, n in conn.execute(text("SELECT id, name FROM district")).fetchall()}
    mapped["district_id"] = mapped["district"].map(dmap)
    mapped["master_id"] = mapped["master_id"].astype(int)
    mapped["month"] = mapped["date"].astype(str).str[:7]
    lab = mapped.groupby(["district_id", "master_id", "month"])["source_label"] \
        .agg(lambda s: "Sample" if (s == "Sample").any() else "Real")   # any Sample taints -> Sample
    agg = mapped.groupby(["district_id", "master_id", "month"]).size().rename("postings").reset_index()
    agg = agg.merge(lab.rename("source_label").reset_index(), on=["district_id", "master_id", "month"])
    conn.execute(text("DELETE FROM demand_monthly"))
    agg.to_sql("demand_monthly", conn, if_exists="append", index=False)

    # Demand Index: as of latest month
    piv = agg.pivot_table(index=["district_id", "master_id"], columns="month", values="postings", fill_value=0)
    cols = sorted(piv.columns)
    last3, prev3 = piv[cols[-3:]].mean(axis=1), piv[cols[-6:-3]].mean(axis=1)
    growth = (last3 - prev3) / prev3.replace(0, np.nan)
    mm = lambda s: (s - s.min()) / (s.max() - s.min()) if s.max() > s.min() else s * 0
    idx = pd.DataFrame({"postings_3m_avg": last3.round(2), "growth_3m": growth.fillna(0).round(4)})
    idx["norm_postings"] = mm(idx["postings_3m_avg"]).round(4)
    idx["norm_growth"] = mm(idx["growth_3m"]).round(4)
    idx["demand_index"] = (0.6 * idx["norm_postings"] + 0.4 * idx["norm_growth"]).round(4)
    idx["as_of_month"] = cols[-1]
    idx["source_label"] = agg.groupby(["district_id", "master_id"])["source_label"] \
        .agg(lambda s: "Sample" if (s == "Sample").any() else "Real")
    idx = idx.reset_index()
    conn.execute(text("DELETE FROM demand_index"))
    idx.to_sql("demand_index", conn, if_exists="append", index=False)
    return agg, idx


def run():
    raw = ingest()
    cl = clean(raw)
    with engine.begin() as conn:
        mp = map_titles(cl, build_lookup(conn))
        hit = mp["master_id"].notna().mean() * 100
        print(f"[map] methods: {mp['match_method'].value_counts().to_dict()}")
        print(f"[map] MAPPING HIT-RATE: {mp['master_id'].notna().sum()}/{len(mp)} = {hit:.2f}% of postings")
        un = mp[mp["master_id"].isna()].groupby("title").size().sort_values(ascending=False) \
            .rename("postings").reset_index()
        un.to_csv(UNMAPPED_LOG, index=False)
        print(f"[map] unmapped distinct titles logged -> {UNMAPPED_LOG.relative_to(ROOT)} ({len(un)} titles)")
        agg, idx = aggregate_and_index(mp, conn)
        print(f"[aggregate] demand_monthly rows written: {len(agg)}; demand_index rows: {len(idx)}")


if __name__ == "__main__":
    run()
