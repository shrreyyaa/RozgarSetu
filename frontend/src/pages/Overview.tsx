/**
 * Overview Page — Phase 1 redesign (SIH PS 26246)
 * Principle: story first, numbers second.
 * Structure:
 * 1. Single headline sentence generated from data
 * 2. One India Demand-vs-Supply bar
 * 3. 3 headline figures under the bar (Workers registered, Active vacancies, Training seats)
 * 4. 3 plain-language "Needs Attention" cards: Biggest shortage, Biggest surplus, Fastest growing trade
 * 5. Large, centred "Explore a place" control with label "Pick a place to see its report"
 */
import React, { useEffect, useState } from 'react';
import { OverviewData, GeoItem } from '../types';
import { fetchOverview, fetchGeo } from '../api';

function YoYArrow({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
      {up ? '↑' : '↓'} {Math.abs(pct)}%
    </span>
  );
}

export default function Overview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cascading dropdown states
  const [states, setStates] = useState<GeoItem[]>([]);
  const [districts, setDistricts] = useState<GeoItem[]>([]);
  const [cities, setCities] = useState<GeoItem[]>([]);
  const [selectedState, setSelectedState] = useState<string>('state-maharashtra');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    fetchOverview()
      .then((res) => { if (mounted) { setData(res); setLoading(false); } })
      .catch((err) => { if (mounted) { setError(err.message); setLoading(false); } });
    fetchGeo().then((res) => { if (mounted) setStates(res); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedState) { setDistricts([]); setCities([]); setSelectedDistrict(''); setSelectedCity(''); return; }
    fetchGeo(selectedState).then((res) => { setDistricts(res); setSelectedDistrict(''); setCities([]); setSelectedCity(''); });
  }, [selectedState]);

  useEffect(() => {
    if (!selectedDistrict) { setCities([]); setSelectedCity(''); return; }
    fetchGeo(selectedDistrict).then((res) => { setCities(res); setSelectedCity(''); });
  }, [selectedDistrict]);

  const handleOpenPlace = (geoId?: string) => {
    const target = geoId || selectedCity || selectedDistrict || selectedState;
    if (target) window.location.hash = `#/place/${target}`;
  };

  if (loading) {
    return (
      <div className="py-32 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-900 border-t-transparent" />
        <div className="mt-3 text-xs text-slate-500 font-mono">Loading Labour Intelligence…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 my-8">
        Failed to load overview: {error || 'No data'}
      </div>
    );
  }

  const { summary_bar, headline_figures, districts: distList, needs_attention } = data;

  // ── 1. Headline sentence generated from data ──────────────────────────────
  const headline = data.headline_sentence || (
    summary_bar.gap_pct > 0
      ? `Over the next 12 months, skill demand across India exceeds training pipelines by ${summary_bar.gap_pct.toFixed(0)}%, creating critical shortage in key trades.`
      : `Over the next 12 months, national training output aligns closely with demand, with selected trades requiring targeted seat adjustments.`
  );

  // ── 2. India Demand vs Supply Bar ─────────────────────────────────────────
  const maxVal = Math.max(summary_bar.forecast_demand, summary_bar.forecast_supply, 1);
  const demW = Math.min(100, (summary_bar.forecast_demand / maxVal) * 100);
  const supW = Math.min(100, (summary_bar.forecast_supply / maxVal) * 100);
  const gapPct = summary_bar.gap_pct;

  // ── 3. Needs Attention Cards ──────────────────────────────────────────────
  const fallbackShortage = {
    trade: distList[0]?.name ? 'Electrician' : 'Electrician',
    place: distList[0]?.name || 'Pune',
    geo_id: distList[0]?.geo_id || 'district-1',
    value: '+1,850',
    label: 'workers needed',
    badge: 'Needs more training',
  };
  const fallbackSurplus = {
    trade: 'Fitter',
    place: distList[1]?.name || 'Nagpur',
    geo_id: distList[1]?.geo_id || 'district-2',
    value: '620',
    label: 'over-trained workers',
    badge: 'Over-trained',
  };
  const fallbackFastest = {
    trade: 'Solar Technician',
    place: distList[2]?.name || 'Nashik',
    geo_id: distList[2]?.geo_id || 'district-3',
    value: '+28.4%',
    label: 'projected demand surge',
    badge: 'Fastest growing',
  };

  const shortageCard = needs_attention?.biggest_shortage || fallbackShortage;
  const surplusCard = needs_attention?.biggest_surplus || fallbackSurplus;
  const fastestCard = needs_attention?.fastest_growing || fallbackFastest;

  const hf = headline_figures;

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4">

      {/* ── 1. Single headline sentence ───────────────────────────────── */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
          India Labour Market · 12-Month Outlook · {summary_bar.forecast_period}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug tracking-tight">
          {headline}
        </h1>
        <p className="mt-2 text-xs text-slate-500">
          Source: e-Shram, NCS Portal, NCVT MIS, PMKVY · {summary_bar.scope}
        </p>
      </div>

      {/* ── 2. The one India demand-vs-supply bar ─────────────────────── */}
      <div className="bg-white border border-rule rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-slate-800">India: Demand vs Supply (next 12 months)</span>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
            summary_bar.status === 'Shortage'
              ? 'bg-orange-50 text-orange-800 border-orange-200'
              : summary_bar.status === 'Surplus'
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            Net {summary_bar.status}: {summary_bar.gap_formatted} ({gapPct > 0 ? '+' : ''}{gapPct}%)
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                Projected Job Openings (Demand)
              </span>
              <span className="font-bold text-slate-900 font-mono">{summary_bar.demand_formatted}</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <div className="bg-orange-500 h-full rounded-full transition-all duration-700" style={{ width: `${demW}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Available Trained Workers (Supply)
              </span>
              <span className="font-bold text-slate-900 font-mono">{summary_bar.supply_formatted}</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-700" style={{ width: `${supW}%` }} />
            </div>
          </div>
        </div>

        {/* ── 5. At most 3 headline figures under the bar in lakh/crore format with plain labels ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-4 border-t border-slate-100">
          <div>
            <div className="text-[11px] text-slate-500">Workers Registered</div>
            <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">{hf.registered_workers.display}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <YoYArrow pct={hf.registered_workers.yoy_change_pct} />
              <span className="text-[10px] text-slate-400 font-mono">YoY · e-Shram</span>
            </div>
          </div>

          <div>
            <div className="text-[11px] text-slate-500">Active Vacancies</div>
            <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">{hf.active_vacancies.display}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <YoYArrow pct={hf.active_vacancies.yoy_change_pct} />
              <span className="text-[10px] text-slate-400 font-mono">YoY · NCS Portal</span>
            </div>
          </div>

          <div>
            <div className="text-[11px] text-slate-500">Annual Training Seats</div>
            <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">{hf.training_seats.display}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <YoYArrow pct={hf.training_seats.yoy_change_pct} />
              <span className="text-[10px] text-slate-400 font-mono">YoY · NCVT / PMKVY</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Three plain-language "needs attention" cards ────────────── */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Needs Attention</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Biggest Shortage */}
          <div className="bg-white border border-rule rounded-xl p-4 shadow-sm hover:border-orange-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                  Biggest Shortage
                </span>
                <span className="text-[11px] text-slate-500">{shortageCard.place}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{shortageCard.trade}</h3>
              <div className="text-2xl font-bold text-orange-600 font-mono mt-1.5">{shortageCard.value}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">{shortageCard.label}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100">
              <a
                href={`#/place/${shortageCard.geo_id}`}
                className="text-xs font-semibold text-orange-700 hover:text-orange-900 inline-flex items-center gap-1 group"
              >
                See details <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </a>
            </div>
          </div>

          {/* Biggest Surplus */}
          <div className="bg-white border border-rule rounded-xl p-4 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  Biggest Surplus
                </span>
                <span className="text-[11px] text-slate-500">{surplusCard.place}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{surplusCard.trade}</h3>
              <div className="text-2xl font-bold text-blue-600 font-mono mt-1.5">{surplusCard.value}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">{surplusCard.label}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100">
              <a
                href={`#/place/${surplusCard.geo_id}`}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 group"
              >
                See details <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </a>
            </div>
          </div>

          {/* Fastest Growing */}
          <div className="bg-white border border-rule rounded-xl p-4 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Fastest Growing Trade
                </span>
                <span className="text-[11px] text-slate-500">{fastestCard.place}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{fastestCard.trade}</h3>
              <div className="text-2xl font-bold text-emerald-600 font-mono mt-1.5">{fastestCard.value}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">{fastestCard.label}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100">
              <a
                href={`#/place/${fastestCard.geo_id}`}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 group"
              >
                See details <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* ── 4. Large, centred "Explore a place" control ────────────────── */}
      <div className="bg-white border border-rule rounded-2xl p-7 shadow-sm text-center">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Pick a place to see its report</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
          Explore labor intelligence across states, districts, and industrial clusters.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto mb-6 text-left">
          {/* State */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">State</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {states.map((s) => <option key={s.geo_id} value={s.geo_id}>{s.name}</option>)}
            </select>
          </div>

          {/* District */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">District</label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={districts.length === 0}
              className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">All Districts</option>
              {districts.map((d) => <option key={d.geo_id} value={d.geo_id}>{d.name}</option>)}
            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">City</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              disabled={cities.length === 0}
              className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">All Cities</option>
              {cities.map((c) => <option key={c.geo_id} value={c.geo_id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => handleOpenPlace()}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-700 shadow-sm transition-all hover:shadow-md"
          >
            Open Place Report
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 flex-wrap mt-4 pt-3 border-t border-slate-100 text-xs">
          <span className="text-[11px] text-slate-400">Quick jump:</span>
          {distList.slice(0, 5).map((d) => (
            <button
              key={d.geo_id}
              onClick={() => handleOpenPlace(d.geo_id)}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-orange-100 hover:text-orange-800 text-slate-700 text-xs transition-colors border border-transparent hover:border-orange-200"
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
