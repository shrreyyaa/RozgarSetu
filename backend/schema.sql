-- SETU: AI-Enabled Labour Market Intelligence System (MSDE - SIH PS 26246)
-- PostgreSQL DDL Schema (compatible with PostgreSQL 12+ and SQLite 3.35+)

-- 1. Districts (Maharashtra MVP)
CREATE TABLE IF NOT EXISTS district (
    id SERIAL PRIMARY KEY,
    state VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    CONSTRAINT uq_district_state_name UNIQUE (state, name)
);

-- 2. Master Occupations / Trades (Standard NCO-2015 & NSQF Aligned)
CREATE TABLE IF NOT EXISTS occupation_master (
    master_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    nco_code VARCHAR(20),
    nsqf_ref VARCHAR(50),
    sector VARCHAR(100) NOT NULL
);

-- 3. Occupation Aliases (Source-specific job titles mapped to master occupation)
CREATE TABLE IF NOT EXISTS occupation_alias (
    alias_text VARCHAR(255) PRIMARY KEY,
    master_id INTEGER NOT NULL REFERENCES occupation_master(master_id) ON DELETE CASCADE
);

-- 4. Monthly Labour Demand (Time-series employer vacancies)
CREATE TABLE IF NOT EXISTS demand_monthly (
    district_id INTEGER NOT NULL REFERENCES district(id) ON DELETE CASCADE,
    master_id INTEGER NOT NULL REFERENCES occupation_master(master_id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    postings INTEGER NOT NULL DEFAULT 0,
    source_label VARCHAR(50) NOT NULL CHECK (source_label IN ('Real', 'Sample')),
    PRIMARY KEY (district_id, master_id, month)
);

-- 5. Training Supply Snapshot (Seats, enrolments, certifications)
CREATE TABLE IF NOT EXISTS supply_snapshot (
    district_id INTEGER NOT NULL REFERENCES district(id) ON DELETE CASCADE,
    master_id INTEGER NOT NULL REFERENCES occupation_master(master_id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL, -- e.g. '2024-Q1', '2024-25'
    seats INTEGER NOT NULL DEFAULT 0,
    enrolled INTEGER NOT NULL DEFAULT 0,
    certified INTEGER NOT NULL DEFAULT 0,
    expected_available_workers REAL NOT NULL DEFAULT 0, -- certified x placement_adjustment
    -- Real = district-level govt file, Estimated = state-level Real figure split to districts, Sample = generated
    source_label VARCHAR(50) NOT NULL CHECK (source_label IN ('Real', 'Estimated', 'Sample')),
    PRIMARY KEY (district_id, master_id, period)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_occupation_alias_master ON occupation_alias(master_id);
CREATE INDEX IF NOT EXISTS idx_demand_district_month ON demand_monthly(district_id, month);
CREATE INDEX IF NOT EXISTS idx_demand_master_month ON demand_monthly(master_id, month);
CREATE INDEX IF NOT EXISTS idx_supply_district_period ON supply_snapshot(district_id, period);
CREATE INDEX IF NOT EXISTS idx_supply_master_period ON supply_snapshot(master_id, period);

-- 6. Derived: Demand Index per district x trade (0-1), written by pipeline/demand.py
CREATE TABLE IF NOT EXISTS demand_index (
    district_id INTEGER NOT NULL REFERENCES district(id) ON DELETE CASCADE,
    master_id INTEGER NOT NULL REFERENCES occupation_master(master_id) ON DELETE CASCADE,
    as_of_month VARCHAR(7) NOT NULL,
    postings_3m_avg REAL NOT NULL,
    growth_3m REAL NOT NULL,
    norm_postings REAL NOT NULL,
    norm_growth REAL NOT NULL,
    demand_index REAL NOT NULL,
    source_label VARCHAR(50) NOT NULL CHECK (source_label IN ('Real', 'Sample')),
    PRIMARY KEY (district_id, master_id, as_of_month)
);

-- 7. Cities under Districts (Maharashtra MVP: Pune, Nashik, Mumbai sub-cities)
CREATE TABLE IF NOT EXISTS city (
    id SERIAL PRIMARY KEY,
    district_id INTEGER NOT NULL REFERENCES district(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE
);

-- 8. Users & Planners (Hashed passwords, National vs State scope)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('national', 'state')),
    state VARCHAR(100), -- NULL for national planner, 'Maharashtra' for state planner
    full_name VARCHAR(100),
    email VARCHAR(100)
);

-- 9. Training Centres (ITIs, PMKVY Kendras with fill and placement stats)
CREATE TABLE IF NOT EXISTS training_centre (
    id SERIAL PRIMARY KEY,
    district_id INTEGER NOT NULL REFERENCES district(id) ON DELETE CASCADE,
    city_name VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    type VARCHAR(50) NOT NULL,
    trade_id INTEGER REFERENCES occupation_master(master_id) ON DELETE CASCADE,
    seats INTEGER NOT NULL DEFAULT 0,
    enrolled INTEGER NOT NULL DEFAULT 0,
    certified INTEGER NOT NULL DEFAULT 0,
    placed INTEGER NOT NULL DEFAULT 0,
    fill_rate REAL NOT NULL DEFAULT 0.0,
    placement_rate REAL NOT NULL DEFAULT 0.0,
    contact_person VARCHAR(100),
    email VARCHAR(100)
);

-- 10. Partner Industries & Employers
CREATE TABLE IF NOT EXISTS industry (
    id SERIAL PRIMARY KEY,
    district_id INTEGER NOT NULL REFERENCES district(id) ON DELETE CASCADE,
    city_name VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    active_vacancies INTEGER NOT NULL DEFAULT 0,
    trades_needed VARCHAR(255)
);

-- 11. Alert & Action Log (Auditable trail of planner actions)
CREATE TABLE IF NOT EXISTS alert_log (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    geo_id VARCHAR(50) NOT NULL,
    place_name VARCHAR(100) NOT NULL,
    target_name VARCHAR(255) NOT NULL,
    trade VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    details TEXT,
    user VARCHAR(50) NOT NULL,
    created_at VARCHAR(30) NOT NULL
);

-- 12. SQLite Forecast Cache for fast response & warm-up
CREATE TABLE IF NOT EXISTS forecast_cache (
    key VARCHAR(100) PRIMARY KEY,
    result_json TEXT NOT NULL,
    updated_at VARCHAR(30) NOT NULL
);
