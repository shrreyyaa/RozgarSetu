import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  Tooltip, ReferenceLine
} from 'recharts';
import {
  RecommendationsData, RecommendationItem, ActionLogItem, User
} from '../types';
import {
  fetchPlaceRecommendations, fetchSentActions,
  executeContactIndustries, executeAlertCentres, downloadReport
} from '../api';

interface RecommendationsProps {
  geoId: string;
  user: User | null;
  onOpenLogin: (prompt?: string) => void;
}

export default function Recommendations({ geoId, user, onOpenLogin }: RecommendationsProps) {
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [sentActions, setSentActions] = useState<ActionLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stepper state
  const [guideAction, setGuideAction] = useState<RecommendationItem | null>(null);
  const [step, setStep] = useState<number>(1);
  const [showAllActions, setShowAllActions] = useState<boolean>(false);
  const [showActivityDrawer, setShowActivityDrawer] = useState<boolean>(false);

  // Step 3 (Industries) state
  const [selectedIndustryIds, setSelectedIndustryIds] = useState<number[]>([]);
  const [industryMsg, setIndustryMsg] = useState('');
  const [industrySubmitting, setIndustrySubmitting] = useState(false);
  const [industrySent, setIndustrySent] = useState(false);

  // Step 5 (Centres) state
  const [selectedCentreIds, setSelectedCentreIds] = useState<number[]>([]);
  const [centreDirective, setCentreDirective] = useState('');
  const [centreSubmitting, setCentreSubmitting] = useState(false);
  const [centreSent, setCentreSent] = useState(false);

  const reloadData = () => {
    fetchPlaceRecommendations(geoId)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    fetchSentActions(geoId).then(setSentActions);
  };

  useEffect(() => {
    reloadData();
  }, [geoId]);

  // Stepper opener
  const handleStartGuide = (action: RecommendationItem) => {
    setGuideAction(action);
    setStep(1);
    setIndustrySent(false);
    setCentreSent(false);

    // Initialize Step 3 data
    const indIds = (action.matched_industries || []).map((i) => i.id);
    setSelectedIndustryIds(indIds);
    setIndustryMsg(
      action.prefilled_message ||
      `MSDE Partnership Alert: Projected 12-month skilled worker deficit of ${action.priority_gap} in ${action.trade} across ${data?.name || 'this district'}. We invite partnership to co-design customized batch intake and guarantee apprenticeship / placement pipelines.`
    );

    // Initialize Step 5 data
    const cIds = (action.affected_centres || []).map((c) => c.id);
    setSelectedCentreIds(cIds);
    setCentreDirective(
      action.prefilled_directive ||
      `MSDE Capacity Directive: Seat adjustment directive for ${action.trade} in ${data?.name || 'this district'}. Prioritize filling vacant infrastructure capacity ahead of upcoming admissions.`
    );
  };

  const handleCloseGuide = () => {
    setGuideAction(null);
    setStep(1);
  };

  // Dispatch Industry Notices
  const handleSendIndustries = async () => {
    if (!user) {
      onOpenLogin('Sign in as a National or State Planner to dispatch notices to industry employers');
      return;
    }
    if (!guideAction) return;

    setIndustrySubmitting(true);
    try {
      await executeContactIndustries({
        geo_id: geoId,
        trade: guideAction.trade,
        industry_ids: selectedIndustryIds,
        custom_message: industryMsg
      });
      setIndustrySent(true);
      fetchSentActions(geoId).then(setSentActions);
    } catch (err: any) {
      alert(`Notice dispatch failed: ${err.message}`);
    } finally {
      setIndustrySubmitting(false);
    }
  };

  // Dispatch Centre Directives
  const handleSendCentres = async () => {
    if (!user) {
      onOpenLogin('Sign in as a National or State Planner to dispatch capacity directives to training centres');
      return;
    }
    if (!guideAction) return;

    setCentreSubmitting(true);
    try {
      await executeAlertCentres({
        geo_id: geoId,
        trade: guideAction.trade,
        centre_ids: selectedCentreIds,
        directive: centreDirective
      });
      setCentreSent(true);
      fetchSentActions(geoId).then(setSentActions);
      setStep(6); // Advance to completion step
    } catch (err: any) {
      alert(`Directive dispatch failed: ${err.message}`);
    } finally {
      setCentreSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent mb-3" />
        <p className="text-slate-600 font-mono text-sm">Evaluating forecast gaps and policy interventions…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm">
          Failed to load recommendations: {error || 'Place data not available'}
        </div>
      </div>
    );
  }

  const topActions = data.top_actions || data.recommendations.slice(0, 3);
  const remainingActions = (data.all_actions || data.recommendations).slice(3);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ── Breadcrumb & Top Bar ────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
        <a href="#/" className="hover:text-slate-900 underline underline-offset-2">Overview</a>
        <span>/</span>
        <a href={`#/place/${geoId}`} className="hover:text-slate-900 underline underline-offset-2 capitalize">
          {data.type}: {data.name}
        </a>
        <span>/</span>
        <span className="text-slate-800 font-medium">Guided Recommendations</span>
      </nav>

      {/* ── Page Header with Story First ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-rule">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Policy Recommendations</h1>
          <p className="text-sm text-slate-700 mt-1 max-w-2xl">
            Targeted capacity and intake interventions for <span className="font-semibold">{data.name}</span>, derived from rolling-origin backtested forecasting models and local training capacity.
          </p>
        </div>

        {/* Global Download & Activity Actions */}
        <div className="flex items-center gap-2 self-start flex-wrap">
          <button
            type="button"
            onClick={() => downloadReport(geoId, 'pdf')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 rounded-lg shadow-sm transition-all cursor-pointer"
            title="Download comprehensive PDF intelligence report"
          >
            <svg className="w-3.5 h-3.5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download report
          </button>

          <button
            type="button"
            onClick={() => downloadReport(geoId, 'csv')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 rounded-lg shadow-sm transition-all cursor-pointer"
            title="Export tidy tabular CSV of trade forecast and gap statistics"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => setShowActivityDrawer(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-all cursor-pointer"
            title="Open dispatched action audit trail"
          >
            <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Activity
            {sentActions.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-orange-600 text-white rounded-full text-[10px] font-mono">
                {sentActions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── TOP 3 ACTIONS VIEW ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-600" />
            Top 3 High-Priority Actions
          </h2>
          <span className="text-xs text-slate-500 font-mono">Ranked by projected gap</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topActions.map((action, idx) => (
            <ActionCard
              key={action.id || idx}
              action={action}
              rank={idx + 1}
              onStartGuide={() => handleStartGuide(action)}
            />
          ))}
        </div>

        {/* See all actions link */}
        {remainingActions.length > 0 && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setShowAllActions(!showAllActions)}
              className="text-xs font-bold text-orange-700 hover:text-orange-900 underline underline-offset-4 cursor-pointer inline-flex items-center gap-1"
            >
              {showAllActions ? '▲ Hide additional actions' : `▼ See all ${data.count} actions for ${data.name}`}
            </button>
          </div>
        )}

        {/* Expanded All Actions Grid */}
        {showAllActions && (
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-dashed border-rule">
            {remainingActions.map((action, idx) => (
              <ActionCard
                key={action.id || idx}
                action={action}
                rank={idx + 4}
                onStartGuide={() => handleStartGuide(action)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── STEP-BY-STEP GUIDED PANEL (MODAL) ─────────────────────────── */}
      {guideAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full my-6 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-orange-600 text-white uppercase tracking-wider">
                    {guideAction.urgency || 'Action Guide'}
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    Step {step} of 5 · {guideAction.trade}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  {step === 1 && 'Step 1: What is Happening'}
                  {step === 2 && 'Step 2: What to Change'}
                  {step === 3 && 'Step 3: Industry Partners to Contact'}
                  {step === 4 && 'Step 4: Budget & Cost Impact'}
                  {step === 5 && 'Step 5: Alert Training Centres'}
                  {step === 6 && 'Action Completed'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseGuide}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-lg font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="w-full bg-slate-100 h-1.5">
              <div
                className="bg-orange-600 h-1.5 transition-all duration-300"
                style={{ width: `${(Math.min(step, 5) / 5) * 100}%` }}
              />
            </div>

            {/* Step Body */}
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-5">
              {/* ── STEP 1: What is happening ─────────────────────────── */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                    <p className="text-base font-bold text-orange-950">
                      {guideAction.headline_sentence || guideAction.action}
                    </p>
                    <p className="text-xs text-orange-800 mt-1">
                      Priority gap: <span className="font-mono font-bold">{guideAction.gap_formatted}</span> workers · Status: {guideAction.status} · Statistical confidence: {guideAction.confidence}
                    </p>
                  </div>

                  {/* 24-Month Demand vs Supply Chart */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3 text-xs">
                      <span className="font-bold text-slate-800">Monthly Trajectory: Demand vs Baseline Supply</span>
                      <div className="flex items-center gap-3 text-[11px] font-mono">
                        <span className="flex items-center gap-1 text-sky-700">
                          <span className="w-2.5 h-2.5 rounded-full bg-sky-600" /> Demand
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700">
                          <span className="w-2.5 h-0.5 bg-emerald-600" /> Supply
                        </span>
                      </div>
                    </div>

                    <div className="h-56 w-full">
                      {guideAction.step1_chart && guideAction.step1_chart.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={guideAction.step1_chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 10, fill: '#64748B' }}
                              tickLine={false}
                              interval={3}
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: '#64748B' }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const pt = payload[0].payload;
                                return (
                                  <div className="bg-slate-900 text-white text-xs p-2 rounded shadow-lg font-mono">
                                    <div className="font-bold">{pt.date} ({pt.is_forecast ? 'Forecast' : 'Past'})</div>
                                    <div className="text-sky-300">Demand: {pt.demand?.toLocaleString()}</div>
                                    <div className="text-emerald-300">Supply: {pt.supply?.toLocaleString()}</div>
                                  </div>
                                );
                              }}
                            />
                            <ReferenceLine x={guideAction.step1_chart[Math.floor(guideAction.step1_chart.length / 2)]?.date} stroke="#EA580C" strokeDasharray="3 3" label={{ value: 'Today', fill: '#EA580C', fontSize: 10, position: 'top' }} />
                            <Area
                              type="monotone"
                              dataKey="demand"
                              stroke="#0284C7"
                              strokeWidth={2}
                              fill="#E0F2FE"
                            />
                            <Line
                              type="monotone"
                              dataKey="supply"
                              stroke="#16A34A"
                              strokeWidth={2}
                              dot={false}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                          Chart data series not available for this series.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2: What to change ───────────────────────────── */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Recommended Seat Delta</div>
                      <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                        {guideAction.change_plan?.seats_change_formatted || guideAction.action}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        Targeting 100% absorption of certified graduates
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Implementation Timeline</div>
                      <div className="text-base font-bold text-slate-900 mt-1">
                        {guideAction.change_plan?.timeline || 'Q1 FY 2027 Admissions'}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        Expected outcome: <span className="font-semibold">{guideAction.change_plan?.expected_gap_after_change}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Target Facilities</h4>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {guideAction.change_plan?.target_centres || guideAction.details}
                    </p>
                    <p className="text-xs text-slate-500">
                      Recommendation prioritizes filling underutilized workshops with fill rate &lt; 70% before sanctioning greenfield equipment batches.
                    </p>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Which industries to contact ─────────────── */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                      Matching Employers Ranked by Hiring Volume
                    </h4>
                    <p className="text-xs text-slate-600 mb-3">
                      Select target partner employers to receive the apprenticeship and placement co-design notice.
                    </p>

                    <div className="space-y-2">
                      {(guideAction.matched_industries || []).map((ind) => {
                        const checked = selectedIndustryIds.includes(ind.id);
                        return (
                          <label
                            key={ind.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                              checked ? 'bg-orange-50/50 border-orange-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIndustryIds([...selectedIndustryIds, ind.id]);
                                } else {
                                  setSelectedIndustryIds(selectedIndustryIds.filter((id) => id !== ind.id));
                                }
                              }}
                              className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-900">{ind.name}</span>
                                <span className="text-xs font-mono font-bold text-orange-800 bg-orange-100 px-2 py-0.5 rounded">
                                  {ind.active_vacancies} active vacancies
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {ind.sector} · {ind.city_name} · Contact: {ind.contact_person} ({ind.email})
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                      Pre-filled Employer Message
                    </label>
                    <textarea
                      rows={3}
                      value={industryMsg}
                      onChange={(e) => setIndustryMsg(e.target.value)}
                      className="w-full text-xs font-mono p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>

                  {industrySent ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
                      <span className="text-base">✓</span>
                      Employer partnership alerts successfully dispatched and logged to audit trail!
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendIndustries}
                      disabled={industrySubmitting || selectedIndustryIds.length === 0}
                      className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      {industrySubmitting ? 'Dispatching notices…' : `Send to ${selectedIndustryIds.length} Selected Employers`}
                    </button>
                  )}
                </div>
              )}

              {/* ── STEP 4: Budget impact ────────────────────────────── */}
              {step === 4 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-md">
                      <div className="text-xs text-slate-400 font-mono font-semibold uppercase tracking-wider">
                        {guideAction.status === 'Shortage' ? 'Estimated Total Outlay' : 'Annual Cost Rationalization'}
                      </div>
                      <div className="text-3xl font-extrabold font-mono text-orange-400 mt-2">
                        {guideAction.budget?.total_investment_formatted || 'Budget neutral'}
                      </div>
                      <div className="text-xs text-slate-300 mt-2 leading-relaxed">
                        {guideAction.status === 'Shortage'
                          ? 'Setup equipment + first-year operational running cost'
                          : 'Operational savings from consolidated surplus batch intake'}
                      </div>
                    </div>

                    <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-md">
                      <div className="text-xs text-slate-400 font-mono font-semibold uppercase tracking-wider">
                        {guideAction.status === 'Shortage' ? 'Cost Per Placed Worker' : 'Trainees Transitioned'}
                      </div>
                      <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-2">
                        {guideAction.budget?.cost_per_placement_formatted || `${guideAction.priority_gap} seats`}
                      </div>
                      <div className="text-xs text-slate-300 mt-2 leading-relaxed">
                        {guideAction.status === 'Shortage'
                          ? 'Calibrated with 80% pass rate & 70% placement efficiency'
                          : 'Redirected to high-growth trades in the same industrial sector'}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Financial Norms & Assumption</h4>
                    <p className="text-xs text-slate-600 italic">
                      “{guideAction.budget?.assumption_note || 'Assuming 80% pass rate, 70% placement rate per DGT norms'}”
                    </p>
                    <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                      Standard unit costs: ₹80,000 setup + ₹40,000 running/seat for EV Technician; ₹25,000 setup + ₹15,000 running/seat for Welder.
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 5: Alert training centres ───────────────────── */}
              {step === 5 && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                      Affected Regional Training Centres
                    </h4>
                    <p className="text-xs text-slate-600 mb-3">
                      Review capacity and fill rate statistics before issuing seat directives.
                    </p>

                    <div className="space-y-2">
                      {(guideAction.affected_centres || []).map((cen) => {
                        const checked = selectedCentreIds.includes(cen.id);
                        return (
                          <label
                            key={cen.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                              checked ? 'bg-orange-50/50 border-orange-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCentreIds([...selectedCentreIds, cen.id]);
                                } else {
                                  setSelectedCentreIds(selectedCentreIds.filter((id) => id !== cen.id));
                                }
                              }}
                              className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-900">{cen.name}</span>
                                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                  {cen.seats} seats
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                <span>{cen.city}</span>
                                <span>· Fill rate: <b className="text-slate-800 font-mono">{cen.fill_rate_pct}%</b></span>
                                <span>· Placement: <b className="text-slate-800 font-mono">{cen.placement_rate_pct}%</b></span>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                      Pre-filled Capacity Directive
                    </label>
                    <textarea
                      rows={3}
                      value={centreDirective}
                      onChange={(e) => setCentreDirective(e.target.value)}
                      className="w-full text-xs font-mono p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>

                  {centreSent ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
                      <span className="text-base">✓</span>
                      Directives issued and recorded in official audit trail!
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendCentres}
                      disabled={centreSubmitting || selectedCentreIds.length === 0}
                      className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      {centreSubmitting ? 'Issuing directives…' : `Dispatch Alerts to ${selectedCentreIds.length} Centres`}
                    </button>
                  )}
                </div>
              )}

              {/* ── FINAL STEP: Action summary & confirmation ────────── */}
              {step === 6 && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                    ✓
                  </div>
                  <h4 className="text-xl font-bold text-slate-900">
                    Intervention Guide Complete
                  </h4>
                  <p className="text-sm text-slate-600 max-w-md mx-auto">
                    All partner outreach and institutional capacity directives for <span className="font-semibold">{guideAction.trade}</span> have been registered.
                  </p>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => downloadReport(geoId, 'pdf', guideAction.master_id)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Action Report (PDF)
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseGuide}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Finish & Return
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Stepper Footer (Back / Next) */}
            {step < 6 && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(Math.max(1, step - 1))}
                  disabled={step === 1}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                >
                  ← Back
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm"
                  >
                    {step === 5 ? 'Review Confirmation →' : 'Next Step →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ACTIVITY DRAWER (OFF-CANVAS AUDIT LOG) ───────────────────── */}
      {showActivityDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
            <div className="px-5 py-4 border-b border-rule flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-bold text-sm">Dispatched Activity Log</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowActivityDrawer(false)}
                className="text-slate-400 hover:text-white text-sm font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {sentActions.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No alerts or directives dispatched for this region yet.
                </div>
              ) : (
                sentActions.map((act) => (
                  <div key={act.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{act.trade}</span>
                      <span className="text-[10px] font-mono text-slate-400 font-medium">
                        {act.created_at.slice(0, 16).replace('T', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-orange-700 font-medium">{act.target_name}</div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 italic font-mono">
                      "{act.message}"
                    </p>
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                      Dispatched by: <span className="font-semibold text-slate-600">{act.user}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Action Card Component ──────────────────────────────────────────────
function ActionCard({
  action,
  rank,
  onStartGuide,
}: {
  action: RecommendationItem;
  rank: number;
  onStartGuide: () => void;
}) {
  const urgencyTag = action.urgency || (action.priority_gap > 300 ? 'Act now' : 'Plan this quarter');
  const tagColor =
    urgencyTag === 'Act now'
      ? 'bg-rose-100 text-rose-900 border-rose-300'
      : urgencyTag === 'Plan this quarter'
      ? 'bg-amber-100 text-amber-900 border-amber-300'
      : 'bg-slate-100 text-slate-800 border-slate-300';

  return (
    <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        {/* Top Tag & Rank */}
        <div className="flex items-center justify-between">
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${tagColor}`}>
            {urgencyTag}
          </span>
          <span className="text-xs font-mono text-slate-400 font-semibold">#{rank}</span>
        </div>

        {/* Plain Sentence Headline */}
        <h3 className="text-base font-bold text-slate-900 leading-snug">
          {action.headline_sentence || action.action}
        </h3>

        {/* Compact Details */}
        <p className="text-xs text-slate-600 line-clamp-2">
          {action.details}
        </p>
      </div>

      <div className="pt-3 border-t border-slate-100 space-y-3">
        {/* Budget Callout */}
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-500">
            {action.status === 'Shortage' ? 'Est. Outlay:' : 'Rationalization:'}
          </span>
          <span className="font-bold text-slate-900">
            {action.budget?.total_investment_formatted || 'Budget neutral'}
          </span>
        </div>

        {/* Start Guide Button */}
        <button
          type="button"
          onClick={onStartGuide}
          className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>Start guide</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
