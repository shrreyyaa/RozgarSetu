import React from 'react';
import { Label, Status, Warning } from '../types';

// Same colour logic on every screen: red = shortage, orange = oversupply, green = balanced.
export const STATUS_STYLE: Record<Status, { chip: string; bar: string; row: string; dot: string }> = {
  Shortage:   { chip: 'bg-red-50 text-red-800 border-red-300',       bar: '#DC2626', row: 'border-l-red-600',    dot: 'bg-red-600' },
  Oversupply: { chip: 'bg-orange-50 text-orange-800 border-orange-300', bar: '#EA580C', row: 'border-l-orange-500', dot: 'bg-orange-500' },
  Balanced:   { chip: 'bg-green-50 text-green-800 border-green-300', bar: '#16A34A', row: 'border-l-green-600',  dot: 'bg-green-600' },
};
export const StatusChip: React.FC<{ status: Status }> = ({ status }) => (
  <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLE[status].chip}`}>{status}</span>
);

const WARN: Record<Warning, string> = {
  Red: 'bg-red-600 text-white', Amber: 'bg-amber-500 text-white', Green: 'bg-green-600 text-white',
};
export const WarningChip: React.FC<{ level: Warning }> = ({ level }) => (
  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${WARN[level]}`}>
    <span className="w-1.5 h-1.5 rounded-full bg-white/90" />{level}
  </span>
);

const LABEL: Record<Label, string> = {
  Real: 'bg-green-50 text-green-800 border-green-300',
  Estimated: 'bg-violet-50 text-violet-800 border-violet-300',
  Sample: 'bg-amber-50 text-amber-800 border-amber-300',
};
const LABEL_TIP: Record<Label, string> = {
  Real: 'Real: from a government file or API',
  Estimated: 'Estimated: Real state-level figure split to districts',
  Sample: 'Sample: generated for the prototype, NOT real data',
};
export const SrcBadge: React.FC<{ label: Label }> = ({ label }) => (
  <span title={LABEL_TIP[label]} className={`inline-block text-[10px] font-semibold px-1.5 py-px rounded border align-middle whitespace-nowrap ${LABEL[label]}`}>{label}</span>
);

/** A number together with its source badge. */
export const Num: React.FC<{ v: number; label: Label; digits?: number; sign?: boolean; className?: string }> = ({ v, label, digits = 0, sign, className = '' }) => (
  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}>
    <span className="tabular-nums">{sign && v > 0 ? '+' : ''}{v.toLocaleString('en-IN', { maximumFractionDigits: digits })}</span>
    <SrcBadge label={label} />
  </span>
);

export const worstStatus = (c: Partial<Record<Status, number>>): Status =>
  (c.Shortage ?? 0) > 0 ? 'Shortage' : (c.Oversupply ?? 0) > 0 ? 'Oversupply' : 'Balanced';

export const severitySort = <T extends { status: Status; gap_pct: number }>(rows: T[]) =>
  [...rows].sort((a, b) => {
    const na = a.status === 'Balanced' ? 1 : 0, nb = b.status === 'Balanced' ? 1 : 0;
    return na - nb || Math.abs(b.gap_pct) - Math.abs(a.gap_pct);
  });
