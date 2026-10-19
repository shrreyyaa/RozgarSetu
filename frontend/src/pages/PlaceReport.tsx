/**
 * PlaceReport — Phase 3 & 3B implementation (SIH PS 26246)
 * Principle: story first, numbers second. One chart per view.
 * 4 plain collapsible sections + 5-row trade table with "Show all".
 * Stock-style chart controls:
 * - Range chips: 6M | 1Y | 3Y | 5Y | Max | Custom (month picker)
 * - Forecast horizon chips: +3M | +6M | +12M | +24M (no retraining)
 * - Compare toggle: Off | vs Last Year | vs Prev Period
 * - Today line, dashed forecast line, 80% PI band, flat supply line, crosshair tooltip, brush slider
 * - Summary row above chart from server
 * - CSV & PDF downloads respecting range & horizon
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine, Brush
} from 'recharts';
import { PlaceStats, PredictData, User } from '../types';
import { fetchPlaceStats, fetchPlacePredict, downloadReport } from '../api';

interface PlaceReportProps {
  geoId: string;
  user?: User | null;
  onOpenLogin?: (prompt?: string) => void;
}

// ── Colors: Orange = Needs more training, Blue = Over-trained, Green = Balanced
const STATUS_COLORS: Record<string, string> = {
  Shortage: 'bg-orange-50 text-orange-800 border-orange-200',
  Surplus: 'bg-blue-50 text-blue-800 border-blue-200',
  Balanced: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
        active
          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
          : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500 hover:text-slate-900'
      }`}
    >
      {label}
    </button>
  );
}

function YoYArrow({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function Section({
  title,
  subtitle,
  badge,
  children,
  defaultOpen = true,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-rule rounded-xl shadow-sm overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50/60 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">{title}</span>
            {badge && <span className="text-[10px] font-mono text-slate-400">{badge}</span>}
          </div>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-5 pb-5 pt-1 border-t border-slate-100">{children}</div>}
    </div>
  );
}

// ── Hover Tooltip with crosshair, YoY change, and 80% bounds ────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const isForecast = payload.some((p: any) => p.payload?.is_forecast);
  const val = payload.find((p: any) => p.dataKey === 'demand')?.value;
  const yoy = payload.find((p: any) => p.dataKey === 'compare_yoy')?.value;
  const lo = payload[0]?.payload?.lo_80;
  const hi = payload[0]?.payload?.hi_80;

  return (
    <div className="bg-slate-900 text-white rounded-lg p-3 text-xs shadow-xl border border-slate-700 min-w-[170px] space-y-1">
      <div className="font-bold text-slate-200 border-b border-slate-700 pb-1 flex justify-between">
        <span>{formatDateTick(label)}</span>
        <span className="text-[10px] font-normal text-slate-400 font-mono">
          {isForecast ? 'Forecast' : 'Historical'}
        </span>
      </div>

      <div className="flex justify-between items-center pt-0.5">
        <span className="text-slate-300">Demand:</span>
        <span className="font-mono font-bold text-orange-400">
          {typeof val === 'number' ? val.toLocaleString('en-IN') : val}
        </span>
      </div>

      {yoy !== undefined && val !== undefined && (
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-400">vs Last Year:</span>
          <span className={`font-mono ${val >= yoy ? 'text-emerald-400' : 'text-rose-400'}`}>
            {val >= yoy ? '▲' : '▼'} {(((val - yoy) / (yoy || 1)) * 100).toFixed(1)}%
          </span>
        </div>
      )}

      {isForecast && lo !== undefined && hi !== undefined && (
        <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800">
          80% PI: {lo?.toLocaleString('en-IN')} – {hi?.toLocaleString('en-IN')}
        </div>
      )}
    </div>
  );
}

function formatDateTick(iso: string): string {
  if (!iso || !iso.includes('-')) return iso;
  const [y, m] = iso.split('-');
  const mName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m) - 1];
  return `${mName} '${y.slice(2)}`;
}

export default function PlaceReport({ geoId, user, onOpenLogin }: PlaceReportProps) {
  const [stats, setStats] = useState<PlaceStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Table expand/collapse
  const [showAllTrades, setShowAllTrades] = useState(false);

  // Predict state
  const [showPredict, setShowPredict] = useState(false);
  const [predictData, setPredictData] = useState<PredictData | null>(null);
  const [predictLoading, setPredictLoading] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<number>(0);
  const predictRef = useRef<HTMLDivElement>(null);

  // Phase 3B controls (remembered across pages for session)
  const [horizon, setHorizon] = useState<number>(() => {
    const s = sessionStorage.getItem('setu_horizon');
    return s ? parseInt(s) : 12;
  });
  const [timeRange, setTimeRange] = useState<string>(() => {
    return sessionStorage.getItem('setu_range') || '1Y';
  });
  const [compare, setCompare] = useState<string>('none');
  const [customFrom, setCustomFrom] = useState<string>('2024-01');
  const [customTo, setCustomTo] = useState<string>('2027-12');
  const [showCustomPicker, setShowCustomPicker] = useState<boolean>(false);
  const [showCalc, setShowCalc] = useState(false);

  // Save session choices
  useEffect(() => {
    sessionStorage.setItem('setu_horizon', String(horizon));
  }, [horizon]);
  useEffect(() => {
    sessionStorage.setItem('setu_range', timeRange);
  }, [timeRange]);

  // Load stats
  useEffect(() => {
    let mounted = true;
    setStatsLoading(true);
    setShowPredict(false);
    setPredictData(null);
    setSelectedTrade(0);

    fetchPlaceStats(geoId)
      .then((res) => { if (mounted) { setStats(res); setStatsLoading(false); } })
      .catch((err) => { if (mounted) { setStatsError(err.message); setStatsLoading(false); } });

    return () => { mounted = false; };
  }, [geoId]);

  // Resolve active dates from timeRange
  const resolveDates = useCallback((rangeKey: string) => {
    if (rangeKey === '6M') return { from: '2026-04', to: undefined };
    if (rangeKey === '1Y') return { from: '2025-10', to: undefined };
    if (rangeKey === '3Y') return { from: '2023-10', to: undefined };
    if (rangeKey === '5Y' || rangeKey === 'Max') return { from: undefined, to: undefined };
    if (rangeKey === 'Custom') return { from: customFrom, to: customTo };
    return { from: '2025-10', to: undefined };
  }, [customFrom, customTo]);

  // Load prediction
  const loadPrediction = useCallback((
    masterId = selectedTrade,
    h = horizon,
    cmp = compare,
    rangeKey = timeRange
  ) => {
    setPredictLoading(true);
    const { from, to } = resolveDates(rangeKey);
    fetchPlacePredict(geoId, masterId, h, cmp, from, to)
      .then((res) => {
        setPredictData(res);
        setPredictLoading(false);
        if (!showPredict) {
          setShowPredict(true);
          setTimeout(() => predictRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      })
      .catch((err) => {
        alert(`Prediction failed: ${err.message}`);
        setPredictLoading(false);
      });
  }, [geoId, selectedTrade, horizon, compare, timeRange, resolveDates, showPredict]);

  const handlePredictClick = () => {
    if (!showPredict) loadPrediction(selectedTrade, horizon, compare, timeRange);
    else predictRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleHorizonChange = (h: number) => {
    setHorizon(h);
    if (showPredict) loadPrediction(selectedTrade, h, compare, timeRange);
  };

  const handleRangeChange = (r: string) => {
    setTimeRange(r);
    if (r === 'Custom') {
      setShowCustomPicker(true);
      return;
    }
    setShowCustomPicker(false);
    if (showPredict) loadPrediction(selectedTrade, horizon, compare, r);
  };

  const handleApplyCustom = () => {
    if (showPredict) loadPrediction(selectedTrade, horizon, compare, 'Custom');
  };

  const handleCompareChange = (cmp: string) => {
    setCompare(cmp);
    if (showPredict) loadPrediction(selectedTrade, horizon, cmp, timeRange);
  };

  const handleTradeChange = (mid: number) => {
    setSelectedTrade(mid);
    if (showPredict) loadPrediction(mid, horizon, compare, timeRange);
  };

  const handleResetZoom = () => {
    setTimeRange('1Y');
    setShowCustomPicker(false);
    setHorizon(12);
    setCompare('none');
    if (showPredict) loadPrediction(selectedTrade, 12, 'none', '1Y');
  };

  // Download handlers
  const handleDownload = (format: 'csv' | 'pdf') => {
    if (!user) {
      onOpenLogin?.('Sign in to download reports');
      return;
    }
    const { from, to } = resolveDates(timeRange);
    const params = new URLSearchParams({
      horizon: String(horizon),
      compare,
    });
    if (selectedTrade) params.set('master_id', String(selectedTrade));
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    window.open(`/api/place/${encodeURIComponent(geoId)}/export.${format}?${params}`, '_blank');
  };

  if (statsLoading) {
    return (
      <div className="py-32 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-900 border-t-transparent" />
        <div className="mt-3 text-xs text-slate-500 font-mono">Loading place report…</div>
      </div>
    );
  }

  if (statsError || !stats) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 my-8">
        Failed to load place report: {statsError || 'Data not found'}
      </div>
    );
  }

  const worstTrades = stats.worst_trades || [];
  const topShortage = worstTrades[0];
  const shortageCount = worstTrades.filter(t => t.status === 'Shortage').length;
  const surplusCount = worstTrades.filter(t => t.status === 'Surplus').length;

  let leadSentence = `${stats.name} has ${shortageCount} trade${shortageCount !== 1 ? 's' : ''} in shortage`;
  if (surplusCount > 0) leadSentence += ` and ${surplusCount} over-trained`;
  if (topShortage) leadSentence += ` — ${topShortage.trade} has the largest gap at ${topShortage.gap_formatted} workers.`;

  // Filtered rows for 5-row view
  const visibleTrades = showAllTrades ? worstTrades : worstTrades.slice(0, 5);

  // Supply flat reference line value
  const chartPoints = predictData?.chart_data || [];
  const fcPoints = chartPoints.filter((p: any) => p.is_forecast);
  const supplyRefVal = fcPoints.length > 0
    ? Math.round(fcPoints.reduce((s: number, p: any) => s + (p.supply ?? 0), 0) / fcPoints.length)
    : null;

  const summary = predictData?.summary_row;

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">

      {/* ── Breadcrumb Navigation (Overview > Place) ───────────────────── */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
        <a href="#/" className="hover:text-slate-900 underline underline-offset-2">Overview</a>
        <span>/</span>
        <span className="text-slate-800 font-medium capitalize">{stats.type}: {stats.name}</span>
      </nav>

      {/* ── Header with Story First ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-3 border-b border-rule">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{stats.name}</h1>
          <p className="text-sm text-slate-700 mt-1 max-w-xl">{leadSentence}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">As on {stats.as_on} · Estimated</p>
        </div>
        <div className="flex items-center gap-2 self-start flex-wrap">
          <button
            type="button"
            onClick={() => downloadReport(geoId, 'pdf')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 rounded-lg shadow-sm transition-all cursor-pointer"
            title="Download official MSDE PDF report for this region"
          >
            <svg className="w-3.5 h-3.5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download report
          </button>
          <button
            type="button"
            onClick={handlePredictClick}
            disabled={predictLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer"
          >
            {predictLoading ? (
              <><span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" /> Running Forecast…</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> View Forecast</>
            )}
          </button>
        </div>
      </div>

      {/* ── SECTION 1: Workforce ──────────────────────────────────────── */}
      <Section
        title="Workforce"
        subtitle="e-Shram registrations track active unorganised workers across trade clusters."
        badge="e-Shram · Estimated"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
          {[
            { label: 'Registered Workers', val: stats.workforce_registrations?.total_registered_workers?.display, yoy: stats.workforce_registrations?.total_registered_workers?.yoy_pct },
            { label: 'Unorganised e-Shram', val: stats.workforce_registrations?.unorganised_eshram?.display, yoy: stats.workforce_registrations?.unorganised_eshram?.yoy_pct },
            { label: 'Female Registrations', val: stats.workforce_registrations?.female_registrations_pct?.display, yoy: stats.workforce_registrations?.female_registrations_pct?.yoy_pct },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-[11px] text-slate-500">{item.label}</div>
              <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">{item.val ?? '—'}</div>
              {item.yoy != null && (
                <div className="mt-0.5"><YoYArrow pct={item.yoy} /></div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ── SECTION 2: Jobs Available ─────────────────────────────────── */}
      <Section
        title="Jobs Available"
        subtitle="National Career Service postings show current hiring activity and active employers."
        badge="NCS Portal · Estimated"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
          {[
            { label: 'Active Vacancies', val: stats.active_vacancies?.active_vacancies?.display, yoy: stats.active_vacancies?.active_vacancies?.yoy_pct },
            { label: 'Monthly Additions', val: stats.active_vacancies?.monthly_additions?.display, yoy: stats.active_vacancies?.monthly_additions?.yoy_pct },
            { label: 'Active Employers', val: stats.active_vacancies?.active_employers?.display, yoy: stats.active_vacancies?.active_employers?.yoy_pct },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-[11px] text-slate-500">{item.label}</div>
              <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">{item.val ?? '—'}</div>
              {item.yoy != null && <div className="mt-0.5"><YoYArrow pct={item.yoy} /></div>}
            </div>
          ))}
        </div>
      </Section>

      {/* ── SECTION 3: Training Capacity ──────────────────────────────── */}
      <Section
        title="Training Capacity"
        subtitle="Vocational centres and ITIs produce annual certified cohorts across trade specializations."
        badge="NCVT MIS · PMKVY · Estimated"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          {[
            { label: 'Training Centres', val: stats.training_capacity?.centres?.display, yoy: null },
            { label: 'Annual Seats', val: stats.training_capacity?.seats?.display, yoy: null },
            { label: 'Certified Last Year', val: stats.training_capacity?.certified?.display, yoy: null },
            { label: 'Placement Rate', val: stats.training_capacity?.placement_rate_pct?.display, yoy: null },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-[11px] text-slate-500">{item.label}</div>
              <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">{item.val ?? '—'}</div>
              {item.yoy != null && <div className="mt-0.5"><YoYArrow pct={item.yoy} /></div>}
            </div>
          ))}
        </div>
      </Section>

      {/* ── SECTION 4: Demand vs Supply by Trade ──────────────────────── */}
      <Section
        title="Demand vs Supply by Trade"
        subtitle="Quarterly balance comparing demand postings against available certified graduates."
        badge="Quarterly Baseline · ML Forecast · Estimated"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs mt-1">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] text-slate-500">
                <th className="text-left py-2 font-medium">Trade</th>
                <th className="text-right py-2 font-medium">Demand</th>
                <th className="text-right py-2 font-medium">Supply</th>
                <th className="text-right py-2 font-medium">Gap</th>
                <th className="text-center py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleTrades.map((t) => (
                <tr key={t.master_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 font-medium text-slate-900">{t.trade}</td>
                  <td className="text-right font-mono text-slate-700">{t.demand_formatted}</td>
                  <td className="text-right font-mono text-slate-500">{t.supply_formatted}</td>
                  <td className={`text-right font-mono font-bold ${
                    t.gap > 0 ? 'text-orange-700' : t.gap < 0 ? 'text-blue-700' : 'text-emerald-700'
                  }`}>
                    {t.gap > 0 ? `+${t.gap_formatted}` : t.gap_formatted}
                  </td>
                  <td className="text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold border ${STATUS_COLORS[t.status] ?? ''}`}>
                      {t.status === 'Shortage' ? 'Needs more training' : t.status === 'Surplus' ? 'Over-trained' : 'Balanced'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {worstTrades.length > 5 && (
          <div className="mt-3 text-center border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowAllTrades(!showAllTrades)}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline cursor-pointer"
            >
              {showAllTrades ? 'Show top 5 only' : `Show all (${worstTrades.length} trades)`}
            </button>
          </div>
        )}

        <p className="mt-3 text-[10px] text-slate-400 font-mono">
          Orange = needs more training &nbsp;·&nbsp; Blue = over-trained &nbsp;·&nbsp; Green = balanced
        </p>
      </Section>

      {/* ── PREDICTION VIEW (Revealed upon clicking "View Forecast") ───── */}
      {showPredict && (
        <div ref={predictRef} className="space-y-6 pt-4 border-t-2 border-orange-200">

          {/* Title row with "As of <latest data month>" stamp */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
              <h2 className="text-base font-bold text-slate-900">ML Forecast &amp; Predictive Intelligence</h2>
            </div>
            {predictData && (
              <span className="text-xs text-slate-500 font-mono">
                As of {predictData.as_of} · Estimated
              </span>
            )}
          </div>

          {/* ── 3 Short Sentences from written analytics ─────────────────── */}
          {predictData?.written_analytics && (
            <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-orange-950 leading-relaxed">
                {predictData.written_analytics.sentence1}
              </p>
              <p className="text-xs text-orange-900 leading-relaxed">
                {predictData.written_analytics.sentence2}
              </p>
              <p className="text-xs text-orange-850 leading-relaxed">
                {predictData.written_analytics.sentence3}
              </p>
            </div>
          )}

          {/* ── Stock-Site Time Controls & Filter Row ───────────────────── */}
          <div className="bg-white border border-rule rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex flex-wrap gap-5 items-start justify-between">

              {/* Trade dropdown */}
              {predictData && (
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Trade</label>
                  <select
                    value={selectedTrade}
                    onChange={(e) => handleTradeChange(Number(e.target.value))}
                    className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    {predictData.trades.map((tr: any) => (
                      <option key={tr.master_id} value={tr.master_id}>{tr.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Range chips (6M | 1Y | 3Y | 5Y | Max | Custom) */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Range</div>
                <div className="flex gap-1 flex-wrap">
                  {['6M', '1Y', '3Y', '5Y', 'Max', 'Custom'].map((r) => (
                    <Chip key={r} label={r} active={timeRange === r} onClick={() => handleRangeChange(r)} />
                  ))}
                </div>
              </div>

              {/* Forecast Horizon chips (+3M | +6M | +12M | +24M) */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Forecast Horizon</div>
                <div className="flex gap-1 flex-wrap">
                  {[3, 6, 12, 24].map((h) => (
                    <Chip key={h} label={`+${h}M`} active={horizon === h} onClick={() => handleHorizonChange(h)} />
                  ))}
                </div>
              </div>

              {/* Compare toggle (Off | vs Last Year | vs Prev Period) */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Compare</div>
                <div className="flex gap-1 flex-wrap">
                  {[
                    ['none', 'Off'],
                    ['yoy', 'vs Last Year'],
                    ['prev', 'vs Prev Period'],
                  ].map(([val, lbl]) => (
                    <Chip key={val} label={lbl} active={compare === val} onClick={() => handleCompareChange(val)} />
                  ))}
                </div>
              </div>

              {/* Reset zoom */}
              <div className="self-end">
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 rounded border border-slate-200 hover:bg-slate-50 font-mono transition-colors"
                >
                  Reset Zoom
                </button>
              </div>
            </div>

            {/* Custom Date Pickers */}
            {showCustomPicker && (
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100 flex-wrap text-xs">
                <span className="text-[11px] font-semibold text-slate-500">Custom Window:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">From:</span>
                  <input
                    type="month"
                    value={customFrom}
                    min="2023-10"
                    max="2028-09"
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1 text-xs"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">To:</span>
                  <input
                    type="month"
                    value={customTo}
                    min="2023-10"
                    max="2028-09"
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1 text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyCustom}
                  className="px-3 py-1 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-700"
                >
                  Apply Range
                </button>
              </div>
            )}

            {/* ── Summary row above the chart, recalculated for selected range ── */}
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-slate-100 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Start ({summary.start_date})</span>
                  <span className="font-bold text-slate-900">{summary.start_val_formatted}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">End ({summary.end_date})</span>
                  <span className="font-bold text-slate-900">{summary.end_val_formatted}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Net Change</span>
                  <span className={`font-bold ${summary.change_pct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {summary.change_pct >= 0 ? '+' : ''}{summary.change_pct}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Peak ({summary.highest?.date})</span>
                  <span className="font-bold text-slate-900">{summary.highest?.val_formatted}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Trough ({summary.lowest?.date})</span>
                  <span className="font-bold text-slate-900">{summary.lowest?.val_formatted}</span>
                </div>
              </div>
            )}
          </div>

          {/* ── The Single Graph ───────────────────────────────────────── */}
          {predictData && chartPoints.length > 0 && (
            <div className="bg-white border border-rule rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Solid = History · Dashed = Forecast · Shaded = 80% PI band</span>
                <span>Supply = flat pipeline reference (~{supplyRefVal?.toLocaleString('en-IN')})</span>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartPoints} margin={{ top: 12, right: 20, left: 10, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateTick}
                      tick={{ fontSize: 10, fill: '#64748B' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#64748B' }}
                      tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                    />
                    <Tooltip content={<ChartTooltip />} />

                    {/* 80% PI Shaded Region for forecast points */}
                    <Area
                      type="monotone"
                      dataKey="hi_80"
                      stroke="none"
                      fill="#FED7AA"
                      fillOpacity={0.4}
                      name="Upper 80%"
                      legendType="none"
                    />
                    <Area
                      type="monotone"
                      dataKey="lo_80"
                      stroke="none"
                      fill="#FFFFFF"
                      fillOpacity={1}
                      name="Lower 80%"
                      legendType="none"
                    />

                    {/* Today line */}
                    <ReferenceLine
                      x="2026-10"
                      stroke="#EA580C"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      label={{ value: 'Today', position: 'top', fill: '#EA580C', fontSize: 10, fontWeight: 700 }}
                    />

                    {/* Supply flat reference line */}
                    {supplyRefVal !== null && (
                      <ReferenceLine
                        y={supplyRefVal}
                        stroke="#059669"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        label={{ value: `Supply ~${supplyRefVal.toLocaleString('en-IN')}`, position: 'insideTopRight', fontSize: 10, fill: '#059669' }}
                      />
                    )}

                    {/* Solid demand curve for history */}
                    <Line
                      type="monotone"
                      dataKey={(p: any) => (!p.is_forecast ? p.demand : undefined)}
                      stroke="#1E3A8A"
                      strokeWidth={2}
                      dot={false}
                      name="Demand"
                      connectNulls={false}
                    />

                    {/* Dashed demand curve for forecast */}
                    <Line
                      type="monotone"
                      dataKey={(p: any) => (p.is_forecast ? p.demand : undefined)}
                      stroke="#EA580C"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 2.5, fill: '#EA580C' }}
                      name="Forecast"
                      connectNulls={false}
                    />

                    {/* Compare overlay line */}
                    {compare === 'yoy' && (
                      <Line
                        type="monotone"
                        dataKey="compare_yoy"
                        stroke="#94A3B8"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        dot={false}
                        name="Last Year"
                      />
                    )}
                    {compare === 'prev' && (
                      <Line
                        type="monotone"
                        dataKey="compare_prev"
                        stroke="#94A3B8"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        dot={false}
                        name="Prev Period"
                      />
                    )}

                    {/* Brush range slider */}
                    <Brush
                      dataKey="date"
                      height={20}
                      stroke="#CBD5E1"
                      fill="#F8FAFC"
                      tickFormatter={formatDateTick}
                      travellerWidth={6}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Shortage and Surplus Chart (Top 5 each side with plain labels) ── */}
          {predictData?.diverging_shortage_surplus && (
            <div className="bg-white border border-rule rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Priority Trade Balance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                {/* Left: Needs More Training */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-orange-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-orange-200">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    Needs More Training (Shortages)
                  </div>
                  <div className="space-y-1.5">
                    {predictData.diverging_shortage_surplus
                      .filter((item: any) => item.status === 'Shortage')
                      .slice(0, 5)
                      .map((item: any) => (
                        <div key={item.trade} className="flex justify-between items-center text-xs p-2 rounded bg-orange-50/60 border border-orange-100">
                          <span className="font-medium text-slate-800">{item.trade}</span>
                          <span className="font-mono font-bold text-orange-700">{item.gap_formatted}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Right: Over-Trained */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-blue-200">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Over-Trained (Surpluses)
                  </div>
                  <div className="space-y-1.5">
                    {predictData.diverging_shortage_surplus
                      .filter((item: any) => item.status === 'Surplus')
                      .slice(0, 5)
                      .map((item: any) => (
                        <div key={item.trade} className="flex justify-between items-center text-xs p-2 rounded bg-blue-50/60 border border-blue-100">
                          <span className="font-medium text-slate-800">{item.trade}</span>
                          <span className="font-mono font-bold text-blue-700">{item.gap_formatted}</span>
                        </div>
                      ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ── 3-row Comparison Table ─────────────────────────────────── */}
          {predictData?.comparison_table && (
            <div className="bg-white border border-rule rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Period-over-Period Benchmark</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] text-slate-500">
                      <th className="text-left py-2">Period</th>
                      <th className="text-right py-2">Demand</th>
                      <th className="text-right py-2">Change</th>
                      <th className="text-left py-2 pl-4">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {predictData.comparison_table.map((row: any) => (
                      <tr key={row.period}>
                        <td className="py-2.5 font-medium text-slate-900">{row.period}</td>
                        <td className="text-right font-mono text-slate-700">{row.demand_formatted}</td>
                        <td className="text-right font-mono">
                          {row.growth_pct != null ? (
                            <span className={row.growth_pct >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                              {row.growth_pct >= 0 ? '+' : ''}{row.growth_pct}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="text-left pl-4 text-slate-500">{row.benchmark_note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── "How this was calculated" expander ─────────────────────── */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-5 py-3 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              onClick={() => setShowCalc(!showCalc)}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>How this was calculated</span>
              </div>
              <svg className={`w-4 h-4 text-slate-400 transition-transform ${showCalc ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showCalc && (
              <div className="px-5 pb-5 text-xs text-slate-600 space-y-2 leading-relaxed border-t border-slate-200/60 pt-3">
                <p>
                  <strong>Demand</strong>: Forecast job postings per quarter, modelled via rolling-origin backtest across 3 folds (6M horizon) selecting the lowest MAPE among Seasonal Naive, Holt-Winters, SARIMA, and Gradient Boosting.
                </p>
                <p>
                  <strong>Supply</strong>: Cohort pipeline model where enrolled seats pass through duration lag, pass rate, and placement adjustment to yield monthly available workers.
                </p>
                <p>
                  <strong>Gap &amp; Status</strong>: Gap = Forecast Demand − Forecast Supply. Shortage if Gap &gt; +15% of Demand; Surplus if Gap &lt; −15%; else Balanced.
                </p>
                <p>
                  <strong>Active Engine</strong>: {predictData?.written_analytics?.model_and_accuracy}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Sources: e-Shram Portal, National Career Service, NCVT MIS, PMKVY, MSDE/DGT. All figures estimated demo data.
                </p>
              </div>
            )}
          </div>

          {/* ── Bottom Actions (Download CSV / PDF & View Recommendations) ── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownload('csv')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV ({timeRange}, +{horizon}M)
              </button>
              <button
                type="button"
                onClick={() => handleDownload('pdf')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Download Report ({timeRange})
              </button>
            </div>

            <a
              href={`#/place/${geoId}/recommendations`}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-sm transition-all"
            >
              View Recommendations
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>

        </div>
      )}

    </div>
  );
}
