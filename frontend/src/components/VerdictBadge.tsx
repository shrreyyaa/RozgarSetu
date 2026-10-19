import React from 'react';
import { Language } from '../types';
import { t } from '../translations';

interface VerdictBadgeProps {
  status: string;
  lang: Language;
  showDesc?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const getVerdictColor = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s.includes('critical')) {
    return {
      bg: 'bg-red-100',
      text: 'text-red-900',
      border: 'border-red-400',
      dot: 'bg-red-600',
      fill: '#DC2626',
      badgeClass: 'bg-red-100 text-red-900 border-red-300',
      lightBg: 'bg-red-50',
    };
  }
  if (s.includes('shortage')) {
    return {
      bg: 'bg-amber-100',
      text: 'text-amber-900',
      border: 'border-amber-400',
      dot: 'bg-amber-600',
      fill: '#D97706',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
      lightBg: 'bg-amber-50',
    };
  }
  if (s.includes('surplus')) {
    return {
      bg: 'bg-orange-100',
      text: 'text-orange-950',
      border: 'border-orange-400',
      dot: 'bg-orange-600',
      fill: '#EA580C',
      badgeClass: 'bg-orange-100 text-orange-950 border-orange-300',
      lightBg: 'bg-orange-50',
    };
  }
  if (s.includes('balanced')) {
    return {
      bg: 'bg-emerald-100',
      text: 'text-emerald-900',
      border: 'border-emerald-400',
      dot: 'bg-emerald-600',
      fill: '#16A34A',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      lightBg: 'bg-emerald-50',
    };
  }
  return {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
    dot: 'bg-slate-500',
    fill: '#64748B',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    lightBg: 'bg-slate-50',
  };
};

export const getVerdictLabel = (status: string, lang: Language) => {
  const s = (status || '').toLowerCase();
  if (s.includes('critical')) return t('criticalShortage', lang);
  if (s.includes('shortage')) return t('shortage', lang);
  if (s === 'surplus') return t('surplus', lang);
  if (s.includes('surplus')) return t('mildSurplus', lang);
  if (s.includes('balanced')) return t('balanced', lang);
  return t('noData', lang);
};

export const getVerdictReason = (status: string, lang: Language) => {
  const s = (status || '').toLowerCase();
  if (s.includes('critical')) return t('criticalShortageDesc', lang);
  if (s.includes('shortage')) return t('shortageDesc', lang);
  if (s === 'surplus') return t('surplusDesc', lang);
  if (s.includes('surplus')) return t('mildSurplusDesc', lang);
  if (s.includes('balanced')) return t('balancedDesc', lang);
  return t('noDataDesc', lang);
};

export const VerdictBadge: React.FC<VerdictBadgeProps> = ({
  status,
  lang,
  showDesc = false,
  size = 'md',
}) => {
  const color = getVerdictColor(status);
  const label = getVerdictLabel(status, lang);
  const desc = getVerdictReason(status, lang);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3.5 py-1.5',
  }[size];

  return (
    <div className="inline-flex flex-col">
      <span
        className={`inline-flex items-center gap-1.5 font-semibold rounded-md border ${color.badgeClass} ${sizeClasses}`}
      >
        <span className={`w-2 h-2 rounded-full ${color.dot} flex-shrink-0`} />
        <span>{label}</span>
      </span>
      {showDesc && (
        <span className="text-xs text-slate-600 mt-1 font-normal max-w-xs">{desc}</span>
      )}
    </div>
  );
};
