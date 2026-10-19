import React, { useState } from 'react';
import { User } from '../types';
import { loginUser, logoutUser } from '../api';

interface HeaderProps {
  user: User | null;
  onUserChange: (user: User | null) => void;
  onOpenLogin: (prompt?: string) => void;
}

export function Header({ user, onUserChange, onOpenLogin }: HeaderProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutUser();
      onUserChange(null);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="border-b border-rule bg-white/95 sticky top-0 z-30 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
        <a href="#/" className="flex items-center gap-3 no-underline group">
          <div className="w-9 h-9 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm group-hover:bg-orange-800 transition-colors">
            SE
          </div>
          <div>
            <div className="text-base font-semibold text-slate-900 leading-tight">
              SETU <span className="text-xs font-normal text-slate-500">| Labour Market Intelligence</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono tracking-tight">
              MSDE · SIH PS 26246
            </div>
          </div>
        </a>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 text-xs">
              <div className="text-right hidden sm:block">
                <div className="font-medium text-slate-900">{user.full_name}</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {user.role === 'national' ? 'National Planner' : `State Planner · ${user.state}`}
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
                {user.role === 'national' ? 'All States' : user.state}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-50 transition-colors"
              >
                {loggingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenLogin()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Planner Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

interface FooterProps {
  onReplayTour?: () => void;
}

export function Footer({ onReplayTour }: FooterProps) {
  return (
    <footer className="mt-16 border-t border-rule bg-white py-6">
      <div className="max-w-6xl mx-auto px-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">About this data</p>
          {onReplayTour && (
            <button
              type="button"
              onClick={onReplayTour}
              className="text-xs text-orange-700 hover:text-orange-900 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Replay tour
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[11px] text-slate-500 leading-relaxed">
          <div>
            <span className="font-semibold text-slate-700">Demand (job postings)</span>
            <br />National Career Service (NCS) Portal · 36-month time series + 24-month horizon.
          </div>
          <div>
            <span className="font-semibold text-slate-700">Supply (trained workers)</span>
            <br />NCVT MIS, PMKVY, DGT / MSDE · Cohort pipeline: intake seats → fill rate → pass rate → placement.
          </div>
          <div>
            <span className="font-semibold text-slate-700">Forecasting ML Engine</span>
            <br />Rolling-origin backtest (3 folds, 6M horizon) selecting Seasonal Naive, Holt-Winters, SARIMA, or Gradient Boosting with 80% bootstrap interval.
          </div>
        </div>
        <p className="mt-4 text-[10px] text-slate-400 font-mono">
          All figures are estimated / synthetic demo data modelled on public benchmarks. Not for official policy use without independent verification. · SIH PS 26246 · SETU v2.0
        </p>
      </div>
    </footer>
  );
}

// ── Phase 2: Login Guide with role cards ──────────────────────────────────────
interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  promptMessage?: string | null;
}

const ROLE_CARDS = [
  {
    role: 'national' as const,
    label: 'National Planner',
    sub: 'Full oversight across all states & Union Territories',
    username: 'national_planner',
    password: 'admin123',
  },
  {
    role: 'state' as const,
    label: 'State Planner',
    sub: 'State-level oversight (Maharashtra Skill Mission)',
    username: 'state_planner',
    password: 'maha123',
  },
];

export function LoginModal({ isOpen, onClose, onSuccess, promptMessage }: LoginModalProps) {
  const [selectedRole, setSelectedRole] = useState<'national' | 'state'>('national');
  const [username, setUsername] = useState('national_planner');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUseAccount = (role: 'national' | 'state') => {
    const card = ROLE_CARDS.find(c => c.role === role)!;
    setSelectedRole(role);
    setUsername(card.username);
    setPassword(card.password);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const u = await loginUser(username, password);
      onSuccess(u);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
          <h3 className="text-base font-bold text-slate-900">
            {promptMessage || 'Planner Login'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {promptMessage ? 'Please authenticate to perform this planner action.' : 'Public reports are open. Sign in to access administrative actions.'}
          </p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Role cards */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Select a Demo Planner Role</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLE_CARDS.map((card) => {
                const active = selectedRole === card.role;
                return (
                  <div
                    key={card.role}
                    className={`p-3.5 rounded-xl border-2 transition-all flex flex-col justify-between ${
                      active
                        ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-300'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{card.label}</div>
                      <div className="text-[11px] text-slate-600 mt-1 leading-snug">{card.sub}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUseAccount(card.role)}
                      className={`mt-3 w-full py-1 text-[11px] font-semibold rounded-md border transition-all ${
                        active
                          ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      Use this account
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* What signing in unlocks */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">What signing in unlocks</div>
            <ul className="text-xs text-slate-600 space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Contact industries
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Alert training centres
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Download reports
              </li>
            </ul>
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{error}</div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 focus:outline-none"
                required
              />
            </div>

            <div className="flex justify-between items-center pt-1">
              <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-700 text-white rounded-lg transition-colors shadow-sm"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </form>

          <p className="text-[10px] text-slate-400 text-center font-mono">
            Demo credentials pre-filled · Real deployment integrates MSDE SSO
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Phase 2: First-visit tour of 4 tooltips ──────────────────────────────────
const TOUR_STEPS = [
  {
    step: 1,
    title: 'Pick a Place',
    content: 'Start by choosing any state, district, or city to view granular labour intelligence, workforce registrations, and local vacancies.',
    actionLabel: 'Next: Predict demand →',
  },
  {
    step: 2,
    title: 'Predict Demand',
    content: 'Click "View Forecast" to explore real 24-month ML projections with 80% confidence bands, stock-style range chips, and YoY comparisons.',
    actionLabel: 'Next: View recommendations →',
  },
  {
    step: 3,
    title: 'View Recommendations',
    content: 'Inspect automated, data-backed seat increases, curtailments, and worker reallocations tailored to local industry needs.',
    actionLabel: 'Next: Take action →',
  },
  {
    step: 4,
    title: 'Take Action',
    content: 'Planners can dispatch official directives to training centres and contact local industrial partners directly.',
    actionLabel: 'Get Started',
  },
];

interface TourGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TourGuide({ isOpen, onClose }: TourGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const current = TOUR_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem('setu_tour_completed', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
            Tour · Step {current.step} of 4
          </span>
          <button
            onClick={handleComplete}
            className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
          >
            Skip tour
          </button>
        </div>

        <h3 className="text-base font-bold text-slate-900 mb-2">{current.title}</h3>
        <p className="text-xs text-slate-600 leading-relaxed mb-6">
          {current.content}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex gap-1.5">
            {TOUR_STEPS.map((s, idx) => (
              <span
                key={s.step}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentStep ? 'bg-orange-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow-sm transition-all"
            >
              {current.actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
