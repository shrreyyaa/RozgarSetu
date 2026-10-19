"""SETU Labour Market Intelligence System — Complete MVP Database Seeding Script
MSDE / SIH Problem Statement 26246
Seeds Maharashtra MVP:
- 3 Districts: Pune, Nashik, Mumbai
- 9 Cities: Pune City, Pimpri-Chinchwad, Baramati, Nashik City, Malegaon, Sinnar, Mumbai City, Mumbai Suburban, Navi Mumbai
- 10 Master Occupations (NCO-2015 & NSQF aligned) + 40 Aliases
- 36 Months Demand Series (2023-10 to 2026-09 = 3 full years: Year-2, Year-1, Current Year)
- Quarterly Supply Snapshots with expected_available_workers
- Training Centres with fill_rates and placement_rates (including <70% to trigger recommendations)
- Partner Industries per sector with active vacancies
- Planners: National Planner (all states) and State Planner (Maharashtra only), hashed passwords
- Alert log table for action recording
"""
import os
import sys
import hashlib
from pathlib import Path
import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

DEFAULT_DB_URL = f"sqlite:///{DATA_DIR / 'setu.db'}"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DB_URL)

engine = create_engine(DATABASE_URL)

PASSWORD_SALT = "setu_salt_2026"

def hash_password(password: str) -> str:
    """Computes salted SHA-256 hash."""
    return hashlib.sha256((password + PASSWORD_SALT).encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plain password against hash or matches standard fallbacks."""
    if hash_password(plain_password) == hashed_password:
        return True
    if hashlib.sha256(plain_password.encode("utf-8")).hexdigest() == hashed_password:
        return True
    return False

DISTRICTS = [
    {"state": "Maharashtra", "name": "Pune"},
    {"state": "Maharashtra", "name": "Nashik"},
    {"state": "Maharashtra", "name": "Mumbai"},
]

CITIES = [
    # Pune
    {"district_name": "Pune", "name": "Pune City", "code": "city-pune"},
    {"district_name": "Pune", "name": "Pimpri-Chinchwad", "code": "city-pimpri"},
    {"district_name": "Pune", "name": "Baramati", "code": "city-baramati"},
    # Nashik
    {"district_name": "Nashik", "name": "Nashik City", "code": "city-nashik"},
    {"district_name": "Nashik", "name": "Malegaon", "code": "city-malegaon"},
    {"district_name": "Nashik", "name": "Sinnar", "code": "city-sinnar"},
    # Mumbai
    {"district_name": "Mumbai", "name": "Mumbai City", "code": "city-mumbai"},
    {"district_name": "Mumbai", "name": "Mumbai Suburban", "code": "city-suburban"},
    {"district_name": "Mumbai", "name": "Navi Mumbai", "code": "city-navimumbai"},
]

TRADES = [
    {
        "name": "Electrician",
        "nco_code": "7411.0100",
        "nsqf_ref": "Level 4",
        "sector": "Electrical & Power",
        "aliases": [
            "Industrial Electrician",
            "Maintenance Electrician",
            "Wireman",
            "Electrical Technician",
        ],
    },
    {
        "name": "Fitter",
        "nco_code": "7233.0100",
        "nsqf_ref": "Level 4",
        "sector": "Capital Goods & Manufacturing",
        "aliases": [
            "Mechanical Fitter",
            "Bench Fitter",
            "Assembly Fitter",
            "Maintenance Fitter",
        ],
    },
    {
        "name": "COPA",
        "nco_code": "3514.0100",
        "nsqf_ref": "Level 3",
        "sector": "IT-ITeS",
        "aliases": [
            "Computer Operator",
            "Programming Assistant",
            "EDP Assistant",
            "Data Processing Operator",
        ],
    },
    {
        "name": "Solar PV Technician",
        "nco_code": "7421.0301",
        "nsqf_ref": "Level 4",
        "sector": "Green Jobs & Renewable Energy",
        "aliases": [
            "Rooftop Solar Technician",
            "Solar Panel Installer",
            "Solar PV Project Associate",
            "Solar Plant Maintenance Technician",
        ],
    },
    {
        "name": "EV Service Technician",
        "nco_code": "7412.0202",
        "nsqf_ref": "Level 4",
        "sector": "Automotive",
        "aliases": [
            "Electric Vehicle Technician",
            "EV Maintenance Specialist",
            "EV Battery Technician",
            "E-Mobility Service Technician",
        ],
    },
    {
        "name": "Welder",
        "nco_code": "7212.0100",
        "nsqf_ref": "Level 3",
        "sector": "Fabrication & Manufacturing",
        "aliases": [
            "Arc Welder",
            "MIG/TIG Welder",
            "Gas Welder",
            "Structural Welder",
        ],
    },
    {
        "name": "CNC Operator",
        "nco_code": "7223.0101",
        "nsqf_ref": "Level 4",
        "sector": "Capital Goods & Manufacturing",
        "aliases": [
            "CNC Machinist",
            "CNC Milling Operator",
            "VMC Operator",
            "CNC Lathe Machine Operator",
        ],
    },
    {
        "name": "Plumber",
        "nco_code": "7126.0101",
        "nsqf_ref": "Level 3",
        "sector": "Construction & Plumbing",
        "aliases": [
            "General Plumber",
            "Pipe Fitter (Plumbing)",
            "Plumbing Maintenance Technician",
            "Sanitary Hardware Installer",
        ],
    },
    {
        "name": "Healthcare Assistant",
        "nco_code": "5321.0100",
        "nsqf_ref": "Level 4",
        "sector": "Healthcare",
        "aliases": [
            "General Duty Assistant (GDA)",
            "Patient Care Assistant",
            "Nursing Assistant",
            "Hospital Ward Attendant",
        ],
    },
    {
        "name": "Data Entry Operator",
        "nco_code": "4132.0101",
        "nsqf_ref": "Level 3",
        "sector": "IT-ITeS & Office Operations",
        "aliases": [
            "DEO",
            "Backend Office Executive",
            "Documentation Clerk",
            "MIS Data Entry Operator",
        ],
    },
]

DEMAND_BASELINES = {
    ("Pune", "Electrician"): 180,
    ("Pune", "Fitter"): 220,
    ("Pune", "COPA"): 310,
    ("Pune", "Solar PV Technician"): 95,
    ("Pune", "EV Service Technician"): 140,
    ("Pune", "Welder"): 160,
    ("Pune", "CNC Operator"): 240,
    ("Pune", "Plumber"): 85,
    ("Pune", "Healthcare Assistant"): 130,
    ("Pune", "Data Entry Operator"): 290,
    ("Nashik", "Electrician"): 110,
    ("Nashik", "Fitter"): 150,
    ("Nashik", "COPA"): 140,
    ("Nashik", "Solar PV Technician"): 70,
    ("Nashik", "EV Service Technician"): 65,
    ("Nashik", "Welder"): 120,
    ("Nashik", "CNC Operator"): 160,
    ("Nashik", "Plumber"): 60,
    ("Nashik", "Healthcare Assistant"): 90,
    ("Nashik", "Data Entry Operator"): 135,
    ("Mumbai", "Electrician"): 250,
    ("Mumbai", "Fitter"): 170,
    ("Mumbai", "COPA"): 460,
    ("Mumbai", "Solar PV Technician"): 110,
    ("Mumbai", "EV Service Technician"): 190,
    ("Mumbai", "Welder"): 140,
    ("Mumbai", "CNC Operator"): 195,
    ("Mumbai", "Plumber"): 160,
    ("Mumbai", "Healthcare Assistant"): 280,
    ("Mumbai", "Data Entry Operator"): 510,
}

SUPPLY_BASELINES = {
    ("Pune", "Electrician"): 120,
    ("Pune", "Fitter"): 150,
    ("Pune", "COPA"): 200,
    ("Pune", "Solar PV Technician"): 60,
    ("Pune", "EV Service Technician"): 60,
    ("Pune", "Welder"): 120,
    ("Pune", "CNC Operator"): 140,
    ("Pune", "Plumber"): 80,
    ("Pune", "Healthcare Assistant"): 90,
    ("Pune", "Data Entry Operator"): 220,
    ("Nashik", "Electrician"): 90,
    ("Nashik", "Fitter"): 120,
    ("Nashik", "COPA"): 100,
    ("Nashik", "Solar PV Technician"): 50,
    ("Nashik", "EV Service Technician"): 40,
    ("Nashik", "Welder"): 100,
    ("Nashik", "CNC Operator"): 110,
    ("Nashik", "Plumber"): 60,
    ("Nashik", "Healthcare Assistant"): 70,
    ("Nashik", "Data Entry Operator"): 110,
    ("Mumbai", "Electrician"): 180,
    ("Mumbai", "Fitter"): 110,
    ("Mumbai", "COPA"): 320,
    ("Mumbai", "Solar PV Technician"): 70,
    ("Mumbai", "EV Service Technician"): 80,
    ("Mumbai", "Welder"): 90,
    ("Mumbai", "CNC Operator"): 120,
    ("Mumbai", "Plumber"): 130,
    ("Mumbai", "Healthcare Assistant"): 190,
    ("Mumbai", "Data Entry Operator"): 350,
}

# 36 historical months (3 years): 2023-10 to 2026-09
# Year -2: 2023-10 to 2024-09
# Year -1: 2024-10 to 2025-09
# Current Year: 2025-10 to 2026-09
MONTHS_36 = [str(p) for p in pd.period_range("2023-10", "2026-09", freq="M")]
PERIODS_SUPPLY = ["2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4", "2026-Q1", "2026-Q2", "2026-Q3"]

# Specific growth drift per trade to give realistic shortage/surplus emergence
TRADE_GROWTH = {
    "EV Service Technician": 0.022,
    "Solar PV Technician": 0.018,
    "Healthcare Assistant": 0.012,
    "Electrician": 0.008,
    "CNC Operator": 0.006,
    "Fitter": 0.004,
    "Plumber": 0.002,
    "Welder": -0.003,
    "COPA": -0.008,
    "Data Entry Operator": -0.012,
}

def init_schema():
    """Initializes tables from schema.sql."""
    schema_file = BASE_DIR / "schema.sql"
    with open(schema_file, "r") as f:
        ddl = f.read()

    is_sqlite = engine.dialect.name == "sqlite"
    if is_sqlite:
        ddl = ddl.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")

    statements = [stmt.strip() for stmt in ddl.split(";") if stmt.strip()]
    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
    print("[1/6] Schema initialized successfully.")

def seed_data():
    """Seeds districts, cities, trades, users, centres, industries, demand, supply."""
    with engine.begin() as conn:
        # Clear existing tables for idempotent seed
        for t in ["forecast_cache", "alert_log", "industry", "training_centre", "users",
                  "city", "supply_snapshot", "demand_monthly", "occupation_alias",
                  "occupation_master", "district"]:
            try:
                conn.execute(text(f"DELETE FROM {t}"))
            except Exception:
                pass

        if engine.dialect.name == "sqlite":
            try:
                conn.execute(text("DELETE FROM sqlite_sequence WHERE name IN ('district', 'occupation_master', 'city', 'users', 'training_centre', 'industry')"))
            except Exception:
                pass

        # 1. Seed Districts
        district_id_map = {}
        for d in DISTRICTS:
            conn.execute(
                text("INSERT INTO district (state, name) VALUES (:state, :name)"),
                {"state": d["state"], "name": d["name"]}
            )
            d_id = conn.execute(
                text("SELECT id FROM district WHERE state = :state AND name = :name"),
                {"state": d["state"], "name": d["name"]}
            ).scalar()
            district_id_map[d["name"]] = int(d_id)
        print(f"[2/6] Seeded {len(district_id_map)} districts: {list(district_id_map.keys())}")

        # 2. Seed Cities
        for c in CITIES:
            d_id = district_id_map[c["district_name"]]
            conn.execute(
                text("INSERT INTO city (district_id, name, code) VALUES (:district_id, :name, :code)"),
                {"district_id": d_id, "name": c["name"], "code": c["code"]}
            )
        print(f"[3/6] Seeded {len(CITIES)} cities under districts.")

        # 3. Seed Occupation Master & Aliases
        occupation_id_map = {}
        total_aliases = 0
        for trade in TRADES:
            conn.execute(
                text(
                    """
                    INSERT INTO occupation_master (name, nco_code, nsqf_ref, sector)
                    VALUES (:name, :nco_code, :nsqf_ref, :sector)
                    """
                ),
                {
                    "name": trade["name"],
                    "nco_code": trade["nco_code"],
                    "nsqf_ref": trade["nsqf_ref"],
                    "sector": trade["sector"],
                }
            )
            master_id = conn.execute(
                text("SELECT master_id FROM occupation_master WHERE name = :name"),
                {"name": trade["name"]}
            ).scalar()
            occupation_id_map[trade["name"]] = int(master_id)

            for alias in trade["aliases"]:
                conn.execute(
                    text(
                        """
                        INSERT INTO occupation_alias (alias_text, master_id)
                        VALUES (:alias_text, :master_id)
                        """
                    ),
                    {"alias_text": alias, "master_id": int(master_id)}
                )
                total_aliases += 1
        print(f"[4/6] Seeded {len(occupation_id_map)} trades and {total_aliases} aliases.")

        # 4. Seed Users (National Planner + State Planner)
        users = [
            {
                "username": "national_planner",
                "password_hash": hash_password("admin123"),
                "role": "national",
                "state": None,
                "full_name": "Dr. Rajesh Sharma (National Skill Mission)",
                "email": "national.planner@msde.gov.in"
            },
            {
                "username": "state_planner",
                "password_hash": hash_password("maha123"),
                "role": "state",
                "state": "Maharashtra",
                "full_name": "Smt. Sunita Patil (Maharashtra Skill Dev. Society)",
                "email": "state.planner@mahakaushalya.gov.in"
            }
        ]
        for u in users:
            conn.execute(
                text(
                    """
                    INSERT INTO users (username, password_hash, role, state, full_name, email)
                    VALUES (:username, :password_hash, :role, :state, :full_name, :email)
                    """
                ),
                u
            )
        print(f"      Seeded {len(users)} planners: national_planner (all states), state_planner (Maharashtra).")

        # 5. Seed Training Centres (Include some with fill_rate < 70% to trigger recommendations)
        centres_data = [
            # Pune City
            {"dist": "Pune", "city": "Pune City", "name": "Govt ITI Aundh", "code": "ITI-MH-PUN-01", "type": "Govt ITI", "trade": "Electrician", "seats": 160, "enrolled": 150, "certified": 130, "placed": 115, "fill_rate": 0.94, "placement_rate": 0.88, "contact": "Principal R. K. Shinde", "email": "iti.aundh@dvet.gov.in"},
            {"dist": "Pune", "city": "Pune City", "name": "Govt ITI Aundh (Welder Wing)", "code": "ITI-MH-PUN-02", "type": "Govt ITI", "trade": "Welder", "seats": 120, "enrolled": 78, "certified": 65, "placed": 50, "fill_rate": 0.65, "placement_rate": 0.77, "contact": "Vice Principal A. S. More", "email": "iti.aundh.welder@dvet.gov.in"},
            {"dist": "Pune", "city": "Pune City", "name": "PMKVY Skill Hub Shivajinagar", "code": "PMKVY-PUN-01", "type": "PMKVY Kendra", "trade": "COPA", "seats": 220, "enrolled": 140, "certified": 125, "placed": 85, "fill_rate": 0.64, "placement_rate": 0.68, "contact": "Director M. G. Joshi", "email": "pmkvy.shivajinagar@nsdcindia.org"},
            # Pimpri-Chinchwad
            {"dist": "Pune", "city": "Pimpri-Chinchwad", "name": "Govt ITI Pimpri-Chinchwad", "code": "ITI-MH-PUN-03", "type": "Govt ITI", "trade": "CNC Operator", "seats": 180, "enrolled": 172, "certified": 158, "placed": 145, "fill_rate": 0.95, "placement_rate": 0.92, "contact": "Principal D. N. Patil", "email": "iti.pimpri@dvet.gov.in"},
            {"dist": "Pune", "city": "Pimpri-Chinchwad", "name": "Auto Cluster EV Training Centre", "code": "AC-PUN-01", "type": "PMKVY Kendra", "trade": "EV Service Technician", "seats": 80, "enrolled": 75, "certified": 70, "placed": 65, "fill_rate": 0.94, "placement_rate": 0.93, "contact": "Program Head K. V. Rao", "email": "ev.autocluster@punepune.org"},
            # Baramati
            {"dist": "Pune", "city": "Baramati", "name": "Baramati Vocational Training Institute", "code": "ITI-MH-PUN-04", "type": "Private ITI", "trade": "Solar PV Technician", "seats": 100, "enrolled": 68, "certified": 60, "placed": 48, "fill_rate": 0.68, "placement_rate": 0.80, "contact": "Director S. B. Pawar", "email": "bvti.baramati@vidyapratishthan.com"},
            {"dist": "Pune", "city": "Baramati", "name": "Baramati Rural ITI (Plumbing)", "code": "ITI-MH-PUN-05", "type": "Govt ITI", "trade": "Plumber", "seats": 90, "enrolled": 58, "certified": 50, "placed": 40, "fill_rate": 0.64, "placement_rate": 0.80, "contact": "Headmaster P. R. Jagtap", "email": "iti.baramati@dvet.gov.in"},

            # Nashik City
            {"dist": "Nashik", "city": "Nashik City", "name": "Govt ITI Satpur Nashik", "code": "ITI-MH-NSK-01", "type": "Govt ITI", "trade": "Electrician", "seats": 140, "enrolled": 132, "certified": 120, "placed": 100, "fill_rate": 0.94, "placement_rate": 0.83, "contact": "Principal V. T. Sonawane", "email": "iti.satpur@dvet.gov.in"},
            {"dist": "Nashik", "city": "Nashik City", "name": "Govt ITI Satpur (Fitter Wing)", "code": "ITI-MH-NSK-02", "type": "Govt ITI", "trade": "Fitter", "seats": 150, "enrolled": 98, "certified": 85, "placed": 70, "fill_rate": 0.65, "placement_rate": 0.82, "contact": "Vice Principal S. K. Bhamre", "email": "iti.satpur.fitter@dvet.gov.in"},
            # Malegaon
            {"dist": "Nashik", "city": "Malegaon", "name": "Govt ITI Malegaon", "code": "ITI-MH-NSK-03", "type": "Govt ITI", "trade": "Data Entry Operator", "seats": 130, "enrolled": 82, "certified": 74, "placed": 48, "fill_rate": 0.63, "placement_rate": 0.65, "contact": "Principal A. Q. Ansari", "email": "iti.malegaon@dvet.gov.in"},
            {"dist": "Nashik", "city": "Malegaon", "name": "Malegaon Health Vocational Centre", "code": "PMKVY-NSK-01", "type": "PMKVY Kendra", "trade": "Healthcare Assistant", "seats": 90, "enrolled": 84, "certified": 78, "placed": 66, "fill_rate": 0.93, "placement_rate": 0.85, "contact": "Dr. F. M. Khan", "email": "health.malegaon@nsdcindia.org"},
            # Sinnar
            {"dist": "Nashik", "city": "Sinnar", "name": "Sinnar Industrial Training Hub", "code": "ITI-MH-NSK-04", "type": "Private ITI", "trade": "CNC Operator", "seats": 120, "enrolled": 115, "certified": 102, "placed": 92, "fill_rate": 0.96, "placement_rate": 0.90, "contact": "Director B. R. Gite", "email": "sinnar.iti@midcindustries.com"},
            {"dist": "Nashik", "city": "Sinnar", "name": "Sinnar Green Energy Academy", "code": "PMKVY-NSK-02", "type": "PMKVY Kendra", "trade": "Solar PV Technician", "seats": 70, "enrolled": 46, "certified": 40, "placed": 32, "fill_rate": 0.66, "placement_rate": 0.80, "contact": "Manager R. S. Jadhav", "email": "solar.sinnar@nsdcindia.org"},

            # Mumbai City
            {"dist": "Mumbai", "city": "Mumbai City", "name": "Govt ITI Mumbai (Kurla)", "code": "ITI-MH-MUM-01", "type": "Govt ITI", "trade": "Electrician", "seats": 200, "enrolled": 195, "certified": 175, "placed": 155, "fill_rate": 0.98, "placement_rate": 0.89, "contact": "Principal H. N. Kadam", "email": "iti.kurla@dvet.gov.in"},
            {"dist": "Mumbai", "city": "Mumbai City", "name": "Govt ITI Kurla (Welder Wing)", "code": "ITI-MH-MUM-02", "type": "Govt ITI", "trade": "Welder", "seats": 110, "enrolled": 72, "certified": 60, "placed": 48, "fill_rate": 0.65, "placement_rate": 0.80, "contact": "Vice Principal M. C. Deshmukh", "email": "iti.kurla.welder@dvet.gov.in"},
            {"dist": "Mumbai", "city": "Mumbai City", "name": "BPT Healthcare Training Centre", "code": "PMKVY-MUM-01", "type": "PMKVY Kendra", "trade": "Healthcare Assistant", "seats": 220, "enrolled": 210, "certified": 190, "placed": 165, "fill_rate": 0.95, "placement_rate": 0.87, "contact": "Dean Dr. R. Merchant", "email": "health.bpt@mumbaiport.gov.in"},
            # Mumbai Suburban
            {"dist": "Mumbai", "city": "Mumbai Suburban", "name": "Govt ITI Andheri", "code": "ITI-MH-MUM-03", "type": "Govt ITI", "trade": "EV Service Technician", "seats": 100, "enrolled": 96, "certified": 88, "placed": 80, "fill_rate": 0.96, "placement_rate": 0.91, "contact": "Principal S. S. Salvi", "email": "iti.andheri@dvet.gov.in"},
            {"dist": "Mumbai", "city": "Mumbai Suburban", "name": "Andheri IT Skill Centre", "code": "PMKVY-MUM-02", "type": "PMKVY Kendra", "trade": "COPA", "seats": 350, "enrolled": 235, "certified": 210, "placed": 140, "fill_rate": 0.67, "placement_rate": 0.67, "contact": "Director P. L. Mehta", "email": "copa.andheri@nsdcindia.org"},
            # Navi Mumbai
            {"dist": "Mumbai", "city": "Navi Mumbai", "name": "Navi Mumbai Green Tech Kendra", "code": "PMKVY-MUM-03", "type": "PMKVY Kendra", "trade": "Solar PV Technician", "seats": 110, "enrolled": 105, "certified": 94, "placed": 82, "fill_rate": 0.95, "placement_rate": 0.87, "contact": "Program Head V. K. Nair", "email": "greentech.navimumbai@nsdcindia.org"},
            {"dist": "Mumbai", "city": "Navi Mumbai", "name": "TTC Industrial Training Institute", "code": "ITI-MH-MUM-04", "type": "Private ITI", "trade": "Fitter", "seats": 130, "enrolled": 85, "certified": 74, "placed": 60, "fill_rate": 0.65, "placement_rate": 0.81, "contact": "Principal G. M. Fernandes", "email": "ttc.iti@midcindustries.com"},
        ]
        for c in centres_data:
            conn.execute(
                text(
                    """
                    INSERT INTO training_centre (district_id, city_name, name, code, type, trade_id, seats, enrolled, certified, placed, fill_rate, placement_rate, contact_person, email)
                    VALUES (:district_id, :city_name, :name, :code, :type, :trade_id, :seats, :enrolled, :certified, :placed, :fill_rate, :placement_rate, :contact_person, :email)
                    """
                ),
                {
                    "district_id": district_id_map[c["dist"]],
                    "city_name": c["city"],
                    "name": c["name"],
                    "code": c["code"],
                    "type": c["type"],
                    "trade_id": occupation_id_map[c["trade"]],
                    "seats": c["seats"],
                    "enrolled": c["enrolled"],
                    "certified": c["certified"],
                    "placed": c["placed"],
                    "fill_rate": c["fill_rate"],
                    "placement_rate": c["placement_rate"],
                    "contact_person": c["contact"],
                    "email": c["email"],
                }
            )
        print(f"      Seeded {len(centres_data)} training centres with realistic fill & placement rates.")

        # 6. Seed Partner Industries
        industries_data = [
            # Pune
            {"dist": "Pune", "city": "Pimpri-Chinchwad", "name": "Tata Motors EV Division", "sector": "Automotive", "contact": "HR Head Rajesh Nair", "email": "recruitment.ev@tatamotors.com", "vacancies": 320, "trades": "EV Service Technician, Welder, Electrician"},
            {"dist": "Pune", "city": "Pune City", "name": "Bharat Forge Ltd", "sector": "Capital Goods & Manufacturing", "contact": "VP HR Anil Deshpande", "email": "talent@bharatforge.com", "vacancies": 260, "trades": "CNC Operator, Fitter, Welder"},
            {"dist": "Pune", "city": "Pimpri-Chinchwad", "name": "Bajaj Auto Ltd (Chakan)", "sector": "Automotive", "contact": "Talent Acq. Sneha Kulkarni", "email": "careers@bajajauto.co.in", "vacancies": 190, "trades": "EV Service Technician, Electrician, Fitter"},
            {"dist": "Pune", "city": "Pune City", "name": "Suzlon Energy Ltd", "sector": "Green Jobs & Renewable Energy", "contact": "Talent Head Prashant Patil", "email": "careers@suzlon.com", "vacancies": 140, "trades": "Solar PV Technician, Electrician"},
            {"dist": "Pune", "city": "Baramati", "name": "Praj Industries Ltd", "sector": "Capital Goods & Manufacturing", "contact": "HR Manager Sagar More", "email": "hr@praj.net", "vacancies": 85, "trades": "Welder, Fitter, Plumber"},

            # Nashik
            {"dist": "Nashik", "city": "Nashik City", "name": "Mahindra & Mahindra Ltd (Satpur)", "sector": "Automotive", "contact": "Plant HR Head Nitin Khairnar", "email": "hr.nsk@mahindra.com", "vacancies": 210, "trades": "EV Service Technician, Fitter, CNC Operator"},
            {"dist": "Nashik", "city": "Nashik City", "name": "Bosch Limited (Ambad Plant)", "sector": "Capital Goods & Manufacturing", "contact": "DGM HR Sanjay Bagul", "email": "campus.nsk@in.bosch.com", "vacancies": 175, "trades": "CNC Operator, Electrician, Fitter"},
            {"dist": "Nashik", "city": "Sinnar", "name": "Jindal Saw Ltd", "sector": "Fabrication & Manufacturing", "contact": "HR Manager Vinod Shinde", "email": "careers.sinnar@jindalsaw.com", "vacancies": 110, "trades": "Welder, Fitter"},
            {"dist": "Nashik", "city": "Malegaon", "name": "Apollo Clinic & MedCare", "sector": "Healthcare", "contact": "Admin Officer Dr. T. Ansari", "email": "admin@apollomalegaon.com", "vacancies": 95, "trades": "Healthcare Assistant"},

            # Mumbai
            {"dist": "Mumbai", "city": "Mumbai City", "name": "Larsen & Toubro Heavy Engg (Powai)", "sector": "Green Jobs & Renewable Energy", "contact": "HR VP Arvind Kulkarni", "email": "talent@larsentoubro.com", "vacancies": 280, "trades": "Solar PV Technician, Electrician, Welder"},
            {"dist": "Mumbai", "city": "Mumbai City", "name": "Godrej & Boyce Mfg Co Ltd", "sector": "Electrical & Power", "contact": "Talent Acq. Shalini Sen", "email": "hr@godrej.com", "vacancies": 230, "trades": "Electrician, Fitter, CNC Operator"},
            {"dist": "Mumbai", "city": "Mumbai Suburban", "name": "Kokilaben Dhirubhai Ambani Hospital", "sector": "Healthcare", "contact": "HR Director Meera Iyer", "email": "nursing.hr@kdah.com", "vacancies": 310, "trades": "Healthcare Assistant"},
            {"dist": "Mumbai", "city": "Navi Mumbai", "name": "Reliance Life Sciences", "sector": "Healthcare", "contact": "Sr. Manager HR Vijay Sawant", "email": "careers@relbio.com", "vacancies": 220, "trades": "Healthcare Assistant, COPA"},
            {"dist": "Mumbai", "city": "Navi Mumbai", "name": "Schneider Electric India", "sector": "Electrical & Power", "contact": "HR Business Partner Priya Nair", "email": "jobs@se.com", "vacancies": 180, "trades": "Electrician, Solar PV Technician"},
        ]
        for ind in industries_data:
            conn.execute(
                text(
                    """
                    INSERT INTO industry (district_id, city_name, name, sector, contact_person, email, active_vacancies, trades_needed)
                    VALUES (:district_id, :city_name, :name, :sector, :contact_person, :email, :active_vacancies, :trades_needed)
                    """
                ),
                {
                    "district_id": district_id_map[ind["dist"]],
                    "city_name": ind["city"],
                    "name": ind["name"],
                    "sector": ind["sector"],
                    "contact_person": ind["contact"],
                    "email": ind["email"],
                    "active_vacancies": ind["vacancies"],
                    "trades_needed": ind["trades"],
                }
            )
        print(f"      Seeded {len(industries_data)} partner industries across sectors.")

        # 7. Seed 36 Months Monthly Demand (2023-10 to 2026-09)
        # 3 districts x 10 trades x 36 months = 1080 rows
        demand_count = 0
        rng = np.random.default_rng(42)
        for d_name, d_id in district_id_map.items():
            for t_name, m_id in occupation_id_map.items():
                base_demand = DEMAND_BASELINES.get((d_name, t_name), 100)
                g_rate = TRADE_GROWTH.get(t_name, 0.005)
                for month_idx, month_str in enumerate(MONTHS_36):
                    # Realistic seasonal cycle + trend + small variance
                    month_num = int(month_str.split("-")[1])
                    season = 1.0 + 0.12 * np.sin(2 * np.pi * (month_num - 1) / 12) + (0.08 if month_num in [10, 11] else 0.0)
                    trend = (1.0 + g_rate) ** month_idx
                    noise = rng.uniform(0.96, 1.04)
                    postings = max(15, int(round(base_demand * season * trend * noise)))
                    conn.execute(
                        text(
                            """
                            INSERT INTO demand_monthly (district_id, master_id, month, postings, source_label)
                            VALUES (:district_id, :master_id, :month, :postings, :source_label)
                            """
                        ),
                        {
                            "district_id": d_id,
                            "master_id": m_id,
                            "month": month_str,
                            "postings": postings,
                            "source_label": "Sample",
                        }
                    )
                    demand_count += 1
        print(f"[5/6] Seeded {demand_count} monthly demand records across 36 months (2023-10 to 2026-09).")

        # 8. Seed Supply Snapshots (Quarterly for 2025-26)
        supply_count = 0
        for d_name, d_id in district_id_map.items():
            for t_name, m_id in occupation_id_map.items():
                base_seats = SUPPLY_BASELINES.get((d_name, t_name), 80)
                for q_idx, period_str in enumerate(PERIODS_SUPPLY):
                    # Slight capacity growth in newer quarters
                    seats = int(round(base_seats * (1.0 + q_idx * 0.02)))
                    enrolled = int(round(seats * 0.88))
                    certified = int(round(enrolled * 0.82))
                    expected_workers = round(certified * 0.70, 1)
                    conn.execute(
                        text(
                            """
                            INSERT INTO supply_snapshot (district_id, master_id, period, seats, enrolled, certified, expected_available_workers, source_label)
                            VALUES (:district_id, :master_id, :period, :seats, :enrolled, :certified, :expected_available_workers, :source_label)
                            """
                        ),
                        {
                            "district_id": d_id,
                            "master_id": m_id,
                            "period": period_str,
                            "seats": seats,
                            "enrolled": enrolled,
                            "certified": certified,
                            "expected_available_workers": expected_workers,
                            "source_label": "Sample",
                        }
                    )
                    supply_count += 1
        print(f"[6/6] Seeded {supply_count} supply snapshot records with expected_available_workers.")

def verify_counts():
    """Queries and displays exact SELECT COUNT(*) from each table with sample records."""
    tables = [
        "district",
        "city",
        "occupation_master",
        "occupation_alias",
        "users",
        "training_centre",
        "industry",
        "demand_monthly",
        "supply_snapshot",
        "alert_log",
    ]
    print("\n" + "=" * 65)
    print("RAW PROOF: TABLE ROW COUNTS (SELECT COUNT(*))")
    print("=" * 65)
    with engine.connect() as conn:
        for tbl in tables:
            count = conn.execute(text(f"SELECT COUNT(*) FROM {tbl}")).scalar()
            print(f"Table: {tbl:<20} | Row Count: {count}")

        print("\n" + "=" * 65)
        print("SAMPLE USERS (Passwords hashed)")
        print("=" * 65)
        rows = conn.execute(text("SELECT id, username, role, state, full_name, email FROM users")).fetchall()
        for r in rows:
            print(dict(r._mapping))

        print("\n" + "=" * 65)
        print("SAMPLE CITIES UNDER DISTRICTS")
        print("=" * 65)
        rows = conn.execute(text("SELECT c.name AS city, c.code, d.name AS district FROM city c JOIN district d ON c.district_id = d.id LIMIT 6")).fetchall()
        for r in rows:
            print(dict(r._mapping))

        print("\n" + "=" * 65)
        print("SAMPLE TRAINING CENTRES (Showing fill_rate and placement_rate)")
        print("=" * 65)
        rows = conn.execute(text("SELECT tc.name, tc.city_name, m.name AS trade, tc.seats, tc.fill_rate, tc.placement_rate FROM training_centre tc JOIN occupation_master m ON tc.trade_id = m.master_id LIMIT 5")).fetchall()
        for r in rows:
            print(dict(r._mapping))

        print("\n" + "=" * 65)
        print("MONTH RANGE IN demand_monthly")
        print("=" * 65)
        row = conn.execute(text("SELECT MIN(month) as min_m, MAX(month) as max_m, COUNT(DISTINCT month) as n_months FROM demand_monthly")).fetchone()
        print(dict(row._mapping))

if __name__ == "__main__":
    init_schema()
    seed_data()
    verify_counts()
