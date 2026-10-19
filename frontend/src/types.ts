// SETU LMIS Frontend Type Definitions (SIH PS 26246)

export interface User {
  id: number;
  username: string;
  role: 'national' | 'state';
  state: string | null;
  full_name: string;
  email: string;
  token?: string;
}

export interface SummaryBar {
  scope: string;
  forecast_period: string;
  forecast_demand: number;
  forecast_supply: number;
  net_gap: number;
  gap_pct: number;
  status: 'Shortage' | 'Surplus' | 'Balanced';
  demand_formatted: string;
  supply_formatted: string;
  gap_formatted: string;
}

export interface HeadlineFigure {
  value: number;
  display: string;
  source_benchmark: string;
  yoy_change_pct: number;
}

export interface NeedsAttentionCard {
  trade: string;
  place: string;
  geo_id: string;
  value: string;
  label: string;
  badge: string;
}

export interface OverviewData {
  headline_sentence?: string;
  summary_bar: SummaryBar;
  headline_figures: {
    registered_workers: HeadlineFigure;
    active_vacancies: HeadlineFigure;
    training_seats: HeadlineFigure;
    certified_last_year: HeadlineFigure;
    placement_rate: HeadlineFigure;
  };
  needs_attention?: {
    biggest_shortage: NeedsAttentionCard;
    biggest_surplus: NeedsAttentionCard;
    fastest_growing: NeedsAttentionCard;
  };
  districts: Array<{
    geo_id: string;
    district_id: number;
    name: string;
    type: string;
    trades: number;
    forecast_demand: number;
    forecast_supply: number;
    gap: number;
    gap_formatted: string;
    worst_warning: 'Red' | 'Amber' | 'Green';
    status_counts: Record<string, number>;
  }>;
  status_distribution: Record<string, number>;
  warning_distribution: Record<string, number>;
  models_distribution: Record<string, number>;
  footer_disclaimer: string;
}

export interface GeoItem {
  geo_id: string;
  name: string;
  type: 'state' | 'district' | 'city';
  parent_id?: string | null;
  district_id?: number;
}

export interface StatMetric {
  raw: number;
  display: string;
  yoy_pct: number;
}

export interface PlaceStats {
  geo_id: string;
  name: string;
  type: string;
  as_on: string;
  workforce_registrations: {
    total_registered_workers: StatMetric;
    unorganised_eshram: StatMetric;
    female_registrations_pct: StatMetric;
  };
  active_vacancies: {
    active_vacancies: StatMetric;
    monthly_additions: StatMetric;
    active_employers: StatMetric;
  };
  training_capacity: {
    centres: StatMetric;
    seats: StatMetric;
    enrolled: StatMetric;
    certified: StatMetric;
    placed: StatMetric;
    fill_rate_pct: StatMetric;
    placement_rate_pct: StatMetric;
  };
  top5_trades_by_demand: Array<{
    master_id: number;
    trade: string;
    district: string;
    demand: number;
    demand_formatted: string;
    supply: number;
    supply_formatted: string;
    gap: number;
    gap_formatted: string;
    status: string;
    early_warning: string;
    yoy_change_pct: number;
  }>;
  demand_vs_supply_by_trade: Array<{
    master_id: number;
    trade: string;
    district: string;
    demand: number;
    demand_formatted: string;
    supply: number;
    supply_formatted: string;
    gap: number;
    gap_formatted: string;
    status: string;
    early_warning: string;
    model: string;
    yoy_change_pct: number;
    source_label: string;
  }>;
}

export interface ChartPoint {
  date: string;          // ISO YYYY-MM
  demand: number;
  is_forecast: boolean;
  lo_80?: number;
  hi_80?: number;
  supply?: number;
  compare_yoy?: number;
  compare_prev?: number;
  // Legacy (old backend compat)
  month?: string;
  month_index?: number;
  prev_year_2?: number;
  prev_year_1?: number;
  current_year?: number;
  forecast?: number;
}

export interface ComparisonRow {
  period: string;
  demand: number;
  demand_formatted: string;
  growth_pct: number | null;
  benchmark_note: string;
}

export interface DivergingGapItem {
  trade: string;
  gap: number;
  gap_formatted: string;
  status: 'Shortage' | 'Surplus';
  early_warning: string;
}

export interface SummaryRow {
  start_date: string;
  start_val: number;
  start_val_formatted: string;
  end_date: string;
  end_val: number;
  end_val_formatted: string;
  change_pct: number;
  highest: {
    date: string;
    val: number;
    val_formatted: string;
  };
  lowest: {
    date: string;
    val: number;
    val_formatted: string;
  };
}

export interface PredictData {
  geo_id: string;
  name: string;
  type: string;
  selected_master_id: number;
  horizon?: number;
  compare?: string;
  from?: string;
  to?: string;
  as_of?: string;
  summary_row?: SummaryRow;
  trades: Array<{ master_id: number; name: string }>;
  chart_data: ChartPoint[];
  written_analytics: {
    current_vs_last_year_pct: number;
    current_vs_two_years_ago_pct: number;
    forecast_vs_current_pct: number;
    peak_months: string[];
    fastest_growing_trade: { trade: string; growth_pct: number };
    fastest_declining_trade: { trade: string; growth_pct: number };
    model_and_accuracy: string;
    sentence1?: string;
    sentence2?: string;
    sentence3?: string;
    summary_paragraph: string;
  };
  comparison_table: ComparisonRow[];
  diverging_shortage_surplus: DivergingGapItem[];
  prediction_interval: string;
}

export interface RecommendationItem {
  id?: string;
  type: string;
  trade: string;
  master_id?: number;
  district: string;
  status: 'Shortage' | 'Surplus' | 'Reallocation';
  urgency?: 'Act now' | 'Plan this quarter' | 'Monitor';
  headline_sentence?: string;
  priority_gap: number;
  gap_formatted: string;
  confidence: 'High' | 'Medium';
  early_warning: 'Red' | 'Amber' | 'Green';
  action: string;
  details: string;
  step1_chart?: Array<{
    date: string;
    demand: number;
    supply: number;
    is_forecast: boolean;
  }>;
  change_plan?: {
    seats_change: number;
    seats_change_formatted: string;
    target_centres: string;
    timeline: string;
    expected_gap_after_change: string;
  };
  budget?: {
    setup_per_seat?: number;
    running_per_seat?: number;
    total_cost?: number;
    total_investment_formatted?: string;
    workers_placed?: number;
    cost_per_placement?: number;
    cost_per_placement_formatted?: string;
    annual_savings_formatted?: string | null;
    assumption_note?: string;
  };
  matched_industries?: Array<{
    id: number;
    name: string;
    city_name: string;
    sector: string;
    contact_person: string;
    email: string;
    active_vacancies: number;
  }>;
  affected_centres?: Array<{
    id: number;
    name: string;
    city: string;
    seats: number;
    fill_rate_pct: number;
    placement_rate_pct: number;
  }>;
  prefilled_message?: string;
  prefilled_directive?: string;
  fast_track_option?: string;
  expected_gap_after_change?: string;
  matched_centres_count?: number;
}

export interface RecommendationsData {
  geo_id: string;
  name: string;
  type: string;
  count: number;
  top_actions?: RecommendationItem[];
  all_actions?: RecommendationItem[];
  recommendations: RecommendationItem[];
}

export interface ActionLogItem {
  id: number;
  action_type: 'contact_industries' | 'alert_centres';
  geo_id: string;
  place_name: string;
  target_name: string;
  trade: string;
  message: string;
  user: string;
  created_at: string;
}

export interface IndustryPartner {
  id: number;
  name: string;
  city: string;
  sector: string;
  contact_person: string;
  email: string;
  vacancies: number;
  trades_needed: string;
}

export interface CentreDetail {
  id: number;
  name: string;
  city: string;
  type: string;
  trade: string;
  seats: number;
  enrolled: number;
  certified: number;
  placed: number;
  fill_rate_pct: number;
  placement_rate_pct: number;
  contact_person: string;
  email: string;
}
