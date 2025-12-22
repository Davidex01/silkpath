import React from 'react';
import { Icon } from '../../components/common/Icon';

interface OnboardingLandingProps {
  onSelectMode: (mode: 'register' | 'login') => void;
}

export const OnboardingLanding: React.FC<OnboardingLandingProps> = ({ onSelectMode }) => {
  return (
    <div className="min-h-screen bg-[var(--sf-blue-950)] flex">
      {/* Left: маркетинг */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 sf-grid-bg opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-br from-teal-600/20 via-transparent to-blue-600/20" />

        {/* Лого */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 ring-1 ring-white/20 grid place-items-center">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-blue-400" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-white tracking-tight">SilkFlow</div>
              <div className="text-sm text-white/70">Russia ⇄ China Trade</div>
            </div>
          </div>
        </div>

        {/* Основной текст */}
        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl font-extrabold text-white leading-tight">
            Control your cross-border trade from one place
          </h1>
          <p className="mt-4 text-lg text-white/80 leading-relaxed">
            SilkFlow — Russia ⇄ China trade control center for SME owners.
            Find verified suppliers, negotiate with auto-translate, lock exchange rates,
            and track cargo with full transparency.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center">
                <Icon name="check" className="w-4 h-4" />
              </div>
              <div>
                <div className="text-white font-semibold">KYB-verified suppliers</div>
                <div className="text-white/60 text-sm">
                  Reduce fraud risk with pre-screened factories
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center">
                <Icon name="check" className="w-4 h-4" />
              </div>
              <div>
                <div className="text-white font-semibold">Protected escrow payments</div>
                <div className="text-white/60 text-sm">
                  Funds release only after delivery confirmation
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center">
                <Icon name="check" className="w-4 h-4" />
              </div>
              <div>
                <div className="text-white font-semibold">RU ↔ CN auto-translation</div>
                <div className="text-white/60 text-sm">
                  Negotiate in Russian, suppliers see Chinese
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 rounded-xl bg-white/10 ring-1 ring-white/10 px-3 py-2">
              <Icon name="shield" className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white/90">KYB Protected</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 ring-1 ring-white/10 px-3 py-2">
              <Icon name="wallet" className="w-4 h-4 text-teal-400" />
              <span className="text-sm font-semibold text-white/90">Escrow Secured</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 ring-1 ring-white/10 px-3 py-2">
              <Icon name="truck" className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-white/90">End-to-End Tracking</span>
            </div>
          </div>
          <div className="mt-4 text-xs text-white/50">
            Trusted by 500+ Russian SME importers
          </div>
        </div>
      </div>

      {/* Right: выбор регистрации / логина */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white lg:rounded-l-[40px]">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--sf-blue-950)] grid place-items-center">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-teal-400 to-blue-400" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900">SilkFlow</div>
                <div className="text-xs text-slate-500">Russia ⇄ China Trade</div>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900">
            Welcome to SilkFlow
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Create a secure account to manage your Russia ⇄ China trade, or sign in if
            you already have one.
          </p>

          <div className="mt-8 space-y-3">
            <button
              onClick={() => onSelectMode('register')}
              className="w-full rounded-xl bg-[var(--sf-blue-900)] text-white px-4 py-3 text-sm font-extrabold hover:bg-[var(--sf-blue-800)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
            >
              Create account
            </button>
            <button
              onClick={() => onSelectMode('login')}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
            >
              I already have an account
            </button>
          </div>

          <div className="mt-6 text-xs text-slate-500">
            By continuing, you agree to our{' '}
            <button className="text-blue-700 hover:underline">Terms of Service</button>{' '}
            and{' '}
            <button className="text-blue-700 hover:underline">Privacy Policy</button>.
          </div>
        </div>
      </div>
    </div>
  );
};