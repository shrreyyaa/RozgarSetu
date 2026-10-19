import React from 'react';

export const fmt = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined || Number.isNaN(n)
    ? 'Data unavailable'
    : n.toLocaleString('en-IN', { maximumFractionDigits: digits });

const BADGE: Record<string, string> = {
  'Sample data': 'bg-amber-50 text-amber-800 border-amber-300',
  'Forecast (sample data)': 'bg-sky-50 text-sky-800 border-sky-300',
  Forecast: 'bg-sky-50 text-sky-800 border-sky-300',
  Estimate: 'bg-violet-50 text-violet-800 border-violet-300',
  Assumption: 'bg-violet-50 text-violet-800 border-violet-300 border-dashed',
  'Observed data': 'bg-green-50 text-green-800 border-green-300',
  'Verified upload': 'bg-green-50 text-green-800 border-green-300',
  'Data unavailable': 'bg-slate-100 text-slate-500 border-slate-300',
};

export const Badge: React.FC<{ label?: string | null; title?: string }> = ({ label, title }) => (
  <span
    title={title}
    className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap ${
      BADGE[label || ''] || 'bg-slate-100 text-slate-600 border-slate-300'
    }`}
  >
    {label || 'Unknown'}
  </span>
);

export const Card: React.FC<{ title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  title,
  right,
  children,
  className = '',
}) => (
  <section className={`bg-white border border-slate-200 rounded-xl ${className}`}>
    {(title || right) && (
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100">
        <h3 className="font-bold text-slate-900">{title}</h3>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    )}
    <div className="p-5">{children}</div>
  </section>
);

export const Loading: React.FC<{ text?: string }> = ({ text = 'Loading…' }) => (
  <div className="py-16 text-center text-slate-600" role="status">
    <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-blue-900 mb-3" />
    <p>{text}</p>
  </div>
);

export const ErrorBox: React.FC<{ title: string; detail?: string }> = ({ title, detail }) => (
  <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl p-4" role="alert">
    <p className="font-semibold">{title}</p>
    {detail && <p className="text-sm mt-1">{detail}</p>}
  </div>
);

export const Empty: React.FC<{ title: string; detail?: string }> = ({ title, detail }) => (
  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-600">
    <p className="font-semibold text-slate-800">{title}</p>
    {detail && <p className="text-sm mt-1">{detail}</p>}
  </div>
);

export const Th: React.FC<{ children?: React.ReactNode; right?: boolean }> = ({ children, right }) => (
  <th className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 ${right ? 'text-right' : 'text-left'}`}>{children}</th>
);
export const Td: React.FC<{ children?: React.ReactNode; right?: boolean; className?: string }> = ({ children, right, className = '' }) => (
  <td className={`px-3 py-2 text-sm border-t border-slate-100 ${right ? 'text-right tabular-nums' : ''} ${className}`}>{children}</td>
);

export const Unavailable = () => <span className="text-slate-500 italic text-sm">Data unavailable</span>;
