import React from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { href, useFetch } from '../api';
import { Card, ErrorBox, Loading } from '../ui';
import { TradeForecast } from '../types';
import { Num, SrcBadge, StatusChip, WarningChip } from '../components/Chips';
import { Crumbs, SampleBanner, quarterText } from '../components/Shell';

export default function Trade({ districtId, masterId }: { districtId: number; masterId: number }) {
  const { data, error } = useFetch<TradeForecast>(`/api/trade/${masterId}/forecast?district_id=${districtId}`);
  if (error) return <ErrorBox title="Could not load trade" detail={error} />;
  if (!data) return <Loading />;
  const s = data.districts[0];
  const q = s.quarterly_gap[0];
  // The chart is monthly; supply is quarterly, so the flat reference line is supply / 3 per month.
  const supplyMonthly = q.forecast_supply / 3;
  const last = s.history[s.history.length - 1];
  const chart = [
    ...s.history.map((h, i) => ({ month: h.month, actual: h.postings, forecast: i === s.history.length - 1 ? h.postings : undefined })),
    ...s.forecast.map((f) => ({ month: f.month, forecast: f.postings })),
  ];
  const abs = Math.abs(q.gap).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const dem = q.forecast_demand.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const sup = q.forecast_supply.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const pct = Math.abs(q.gap_pct * 100).toFixed(0);
  const sentence =
    q.status === 'Shortage'
      ? `In ${s.district}, about ${dem} ${s.trade} job postings are expected for ${quarterText(q.quarter)}, but only about ${sup} trained workers are likely to be available: a shortage of about ${abs} (${pct}% of demand).`
      : q.status === 'Oversupply'
      ? `In ${s.district}, only about ${dem} ${s.trade} job postings are expected for ${quarterText(q.quarter)}, while about ${sup} trained workers will be available: about ${abs} more than the jobs need (${pct}% of demand).`
      : `In ${s.district}, demand (about ${dem}) and supply (about ${sup}) for ${s.trade} are close to balanced for ${quarterText(q.quarter)}.`;
  return (
    <>
      <Crumbs items={[{ label: 'Overview', to: href.overview() }, { label: s.district, to: href.district(s.district_id) }, { label: s.trade }]} />
      <SampleBanner label={s.source_label} />
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-slate-700">Gap ({quarterText(q.quarter)})</p>
          <p className="text-4xl font-bold mt-1"><Num v={q.gap} label={q.source_label} sign /></p>
          <p className="text-xs text-slate-500 mt-1">forecast demand − supply, per quarter</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-slate-700">Status</p>
          <p className="mt-2"><StatusChip status={q.status} /></p>
          <p className="text-xs text-slate-500 mt-2">{(q.gap_pct * 100).toFixed(0)}% of demand <SrcBadge label={q.source_label} /></p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-slate-700">Early warning</p>
          <p className="mt-2"><WarningChip level={q.early_warning} /></p>
          <p className="text-xs text-slate-500 mt-2">{q.diverging ? 'Demand and supply trends are diverging.' : 'Trends are not diverging.'} <SrcBadge label={q.source_label} /></p>
        </div>
      </div>
      <Card title={`${s.trade} in ${s.district}`} className="mb-6" right={<span className="text-xs text-slate-500">model: {s.model.replace('_', ' ')}</span>}>
        <p className="text-slate-800 mb-4 leading-relaxed">{sentence} {s.source_label === 'Sample' && <b className="text-amber-800">(Sample data, not real.)</b>}</p>
        <div style={{ width: '100%', height: 340 }}>
          <ResponsiveContainer>
            <LineChart data={chart} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} label={{ value: 'postings / month', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <ReferenceLine x={last.month} stroke="#94A3B8" strokeDasharray="2 2" label={{ value: 'today', fontSize: 11, fill: '#64748B' }} />
              <ReferenceLine y={supplyMonthly} stroke="#64748B" strokeWidth={2} label={{ value: `Supply ≈ ${supplyMonthly.toFixed(0)} / month (flat)`, position: 'insideBottomRight', fontSize: 11, fill: '#334155' }} />
              <Line name="Demand: actual postings" dataKey="actual" stroke="#1E3A8A" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
              <Line name="Demand: forecast" dataKey="forecast" stroke="#1E3A8A" strokeWidth={2.5} strokeDasharray="7 5" dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-500 mt-3 flex flex-wrap items-center gap-2">
          Demand history + forecast <SrcBadge label={s.demand_label} /> · Supply line (quarterly supply ÷ 3, no supply forecast exists) <SrcBadge label={s.supply_label} /> · Demand is postings, a proxy for openings.
        </p>
      </Card>
    </>
  );
}
