import React from 'react';
import { href, useFetch } from '../api';
import { Card, ErrorBox, Loading, Td, Th } from '../ui';
import { DistrictTrades } from '../types';
import { Num, STATUS_STYLE, StatusChip, severitySort } from '../components/Chips';
import { Crumbs, SampleBanner, quarterText } from '../components/Shell';

const Bar: React.FC<{ v: number; max: number; color: string }> = ({ v, max, color }) => (
  <div className="h-3 bg-slate-100 rounded-full overflow-hidden w-full min-w-[8rem]" role="img" aria-label={`${Math.round(v)}`}>
    <div className="h-full rounded-full" style={{ width: `${Math.max(1.5, (v / max) * 100)}%`, background: color }} />
  </div>
);

export default function District({ districtId }: { districtId: number }) {
  const { data, error } = useFetch<DistrictTrades>(`/api/district/${districtId}/trades`);
  if (error) return <ErrorBox title="Could not load district" detail={error} />;
  if (!data) return <Loading />;
  const rows = severitySort(data.trades);
  const max = Math.max(...rows.map((r) => Math.max(r.forecast_demand, r.forecast_supply)), 1);
  const worst = rows.some((r) => r.source_label === 'Sample') ? 'Sample' : undefined;
  return (
    <>
      <Crumbs items={[{ label: 'Overview', to: href.overview() }, { label: data.district }]} />
      <SampleBanner label={worst} />
      <Card title={`${data.district}: demand vs supply by trade`} right={<span className="text-xs text-slate-500">per quarter, {quarterText(data.quarter)} · most severe first</span>}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><Th>Trade</Th><Th>Demand vs Supply</Th><Th right>Gap</Th><Th>Status</Th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.master_id} className="hover:bg-slate-50">
                  <Td className="font-medium whitespace-nowrap"><a className="text-blue-900 hover:underline" href={href.trade(r.district_id, r.master_id)}>{r.trade}</a></Td>
                  <Td className="w-[48%]">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3"><span className="w-14 text-xs text-slate-500">Demand</span><Bar v={r.forecast_demand} max={max} color="#1E3A8A" /><Num v={r.forecast_demand} label={r.demand_label} className="text-xs w-32 justify-end" /></div>
                      <div className="flex items-center gap-3"><span className="w-14 text-xs text-slate-500">Supply</span><Bar v={r.forecast_supply} max={max} color="#64748B" /><Num v={r.forecast_supply} label={r.supply_label} className="text-xs w-32 justify-end" /></div>
                    </div>
                  </Td>
                  <Td right><Num v={r.gap} label={r.source_label} sign className="font-semibold" /></Td>
                  <Td><StatusChip status={r.status} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-3 flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${STATUS_STYLE.Shortage.dot}`} /> Shortage
          <span className={`inline-block w-2 h-2 rounded-full ${STATUS_STYLE.Oversupply.dot}`} /> Oversupply
          <span className={`inline-block w-2 h-2 rounded-full ${STATUS_STYLE.Balanced.dot}`} /> Balanced
        </p>
      </Card>
    </>
  );
}
