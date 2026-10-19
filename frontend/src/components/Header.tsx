import React from 'react';
import { Language, ViewMode, UserRole } from '../types';
import { t } from '../translations';

const TABS: { view: ViewMode; en: string; hi: string; roles: UserRole[]; alert?: boolean }[] = [
  { view: 'overview', en: 'Overview', hi: 'सारांश', roles: ['planner'] },
  { view: 'national', en: 'Map & Gaps', hi: 'नक्शा और अंतर', roles: ['planner'] },
  { view: 'state', en: 'State', hi: 'राज्य', roles: ['planner'] },
  { view: 'district', en: 'District', hi: 'ज़िला', roles: ['planner', 'iti_admin'] },
  { view: 'demand-intel', en: 'Job Demand', hi: 'नौकरी मांग', roles: ['planner'] },
  { view: 'supply-intel', en: 'Training Supply', hi: 'प्रशिक्षण आपूर्ति', roles: ['planner'] },
  { view: 'recommendations', en: 'Recommended Actions', hi: 'सुझाव', roles: ['planner', 'iti_admin'] },
  { view: 'my-centre', en: 'My Centre', hi: 'मेरा केंद्र', roles: ['iti_admin'] },
  { view: 'early-warning', en: 'Early Warning', hi: 'पूर्व चेतावनी', roles: ['planner'], alert: true },
  { view: 'data-quality', en: 'Data Quality', hi: 'डेटा गुणवत्ता', roles: ['planner', 'iti_admin'] },
  { view: 'advanced', en: 'Export & Tools', hi: 'निर्यात', roles: ['planner'] },
];

interface HeaderProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  horizon: number;
  onSelectHorizon: (h: number) => void;
  lang: Language;
  onToggleLang: () => void;
  isDemo: boolean;
  crumbs: { label: string; onClick?: () => void }[];
  role: UserRole;
  onChangeRole: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSelectView,
  horizon,
  onSelectHorizon,
  lang,
  onToggleLang,
  isDemo,
  crumbs,
  role,
  onChangeRole,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 shadow-xs sticky top-0 z-50">
      {/* Tricolor accent bar */}
      <div className="h-1.5 w-full flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white border-y border-slate-200" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* Demo notification banner */}
      {isDemo && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded text-[11px] uppercase tracking-wider">
              {lang === 'hi' ? 'डेमो डेटा' : 'Prototype Demo'}
            </span>
            <span>{t('demoWarning', lang)}</span>
          </div>
          <span className="hidden sm:inline text-slate-500 text-[11px]">SIH PS 26246</span>
        </div>
      )}

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand Identity */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-blue-900 text-white font-bold text-xl flex items-center justify-center shadow-sm flex-shrink-0">
            {lang === 'hi' ? 'सेतु' : 'SETU'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {t('appTitle', lang)}
              </h1>
              <span className="text-xs bg-blue-50 text-blue-800 font-medium px-2 py-0.5 rounded border border-blue-200">
                MSDE LMIS
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              {t('appSubTitle', lang)}
            </p>
          </div>
        </div>

        {/* Action Controls: Horizon & Language */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Horizon Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-600 font-medium px-2 hidden sm:inline">
              {t('forecastHorizon', lang)}
            </span>
            {[1, 3, 6].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => onSelectHorizon(h)}
                className={`px-3 py-1 rounded text-xs sm:text-sm font-semibold transition-colors ${
                  horizon === h
                    ? 'bg-blue-900 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                {h === 1 ? t('month1', lang) : h === 3 ? t('month3', lang) : t('month6', lang)}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onChangeRole}
            className="px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg"
            title={lang === 'hi' ? 'भूमिका बदलें' : 'Switch role'}
          >
            {role === 'planner' ? (lang === 'hi' ? 'योजनाकार' : 'Planner') : lang === 'hi' ? 'आईटीआई प्रशासक' : 'ITI Admin'} ⇄
          </button>

          {/* Language Toggle */}
          <button
            type="button"
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
            title="Toggle Language / भाषा बदलें"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
              />
            </svg>
            <span>{lang === 'en' ? 'हिन्दी' : 'English'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 overflow-x-auto py-1">
          <nav className="flex space-x-1 sm:space-x-2 text-sm font-medium">
            {TABS.filter((tab) => tab.roles.includes(role)).map((tab) => (
              <button
                key={tab.view}
                onClick={() => onSelectView(tab.view)}
                className={`px-3 py-2 rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentView === tab.view
                    ? 'bg-white text-blue-900 font-bold shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.alert && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                <span>{lang === 'hi' ? tab.hi : tab.en}</span>
              </button>
            ))}
          </nav>

          {/* Breadcrumb Trail */}
          {crumbs && crumbs.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium pr-2">
              {crumbs.map((c, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-slate-400">›</span>}
                  {c.onClick ? (
                    <button
                      onClick={c.onClick}
                      className="hover:text-blue-900 hover:underline cursor-pointer"
                    >
                      {c.label}
                    </button>
                  ) : (
                    <span className="text-slate-800 font-semibold">{c.label}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
