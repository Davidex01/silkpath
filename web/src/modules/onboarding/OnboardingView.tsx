// src/modules/onboarding/OnboardingView.tsx
import React, { useRef, useState } from 'react';
import { Icon } from '../../components/common/Icon';

interface OnboardingViewProps {
  onComplete: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const [phone, setPhone] = useState('');
  const [inn, setInn] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyLookedUp, setCompanyLookedUp] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleSendSms() {
    if (!phone || phone.length < 10) return;
    setSmsSent(true);
  }

  function handleLookupCompany() {
    if (!inn || inn.length < 10) return;
    setTimeout(() => {
      setCompanyName('ООО "ТрейдЛогистик"');
      setCompanyLookedUp(true);
    }, 300);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
  }

  function handleContinue() {
    onComplete();
  }

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
                <div className="text-white/60 text-sm">Reduce fraud risk with pre-screened factories</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center">
                <Icon name="check" className="w-4 h-4" />
              </div>
              <div>
                <div className="text-white font-semibold">Protected escrow payments</div>
                <div className="text-white/60 text-sm">Funds release only after delivery confirmation</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center">
                <Icon name="check" className="w-4 h-4" />
              </div>
              <div>
                <div className="text-white font-semibold">RU ↔ CN auto-translation</div>
                <div className="text-white/60 text-sm">Negotiate in Russian, suppliers see Chinese</div>
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

      {/* Right: форма регистрации */}
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

          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Create your account</h2>
            <p className="mt-2 text-sm text-slate-600">
              Get started with SilkFlow in minutes. We'll verify your business for secure trading.
            </p>
          </div>

          <div className="mt-8 space-y-5">
            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-slate-700">Phone number</label>
              <div className="mt-1.5 flex gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                  <span>🇷🇺</span>
                  <span>+7</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="(900) 123-45-67"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 sf-number"
                />
                <button
                  onClick={handleSendSms}
                  disabled={phone.length < 10}
                  className={
                    'rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition ' +
                    (phone.length >= 10
                      ? 'bg-[var(--sf-blue-900)] text-white hover:bg-[var(--sf-blue-800)]'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed')
                  }
                >
                  {smsSent ? 'Resend' : 'Send SMS'}
                </button>
              </div>
              {smsSent && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit code"
                      className="w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 sf-number"
                    />
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <Icon name="check" className="w-4 h-4" />
                      Code sent (demo)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* INN */}
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                INN (Company Tax ID)
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="text"
                  value={inn}
                  onChange={(e) => {
                    setInn(e.target.value.replace(/\D/g, '').slice(0, 12));
                    setCompanyLookedUp(false);
                    setCompanyName('');
                  }}
                  placeholder="7712345678"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 sf-number"
                />
                <button
                  onClick={handleLookupCompany}
                  disabled={inn.length < 10}
                  className={
                    'rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition ' +
                    (inn.length >= 10
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-100')
                  }
                >
                  Lookup
                </button>
              </div>
              {companyLookedUp ? (
                <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-start gap-2">
                    <Icon name="check" className="w-4 h-4 text-emerald-600 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-emerald-900">Company found</div>
                      <div className="mt-0.5 text-sm text-emerald-800">{companyName}</div>
                      <div className="mt-1 text-xs text-emerald-700">
                        INN: {inn} • Active status
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-1.5 text-xs text-slate-500">
                  Enter your company's INN to auto-fill registration details
                </div>
              )}
            </div>

            {/* Company name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700">Company name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="ООО «Ваша Компания»"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
              />
            </div>

            {/* KYC upload */}
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Director ID / Passport (KYC)
              </label>
              <div className="mt-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-center hover:bg-slate-100 hover:border-slate-300 transition"
                >
                  {fileName ? (
                    <div className="flex items-center justify-center gap-2">
                      <Icon name="check" className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-semibold text-slate-900">{fileName}</span>
                      <span className="text-xs text-slate-500">(click to change)</span>
                    </div>
                  ) : (
                    <div>
                      <div className="mx-auto w-10 h-10 rounded-xl bg-slate-200 text-slate-500 grid place-items-center mb-2">
                        <Icon name="paperclip" />
                      </div>
                      <div className="text-sm font-semibold text-slate-700">Upload document</div>
                      <div className="text-xs text-slate-500 mt-1">PDF, JPG or PNG up to 10MB</div>
                    </div>
                  )}
                </button>
              </div>
              <div className="mt-1.5 text-xs text-slate-500">
                Required for KYC verification. Your data is encrypted and stored securely.
              </div>
            </div>

            {/* Info box */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-start gap-2">
                <Icon name="shield" className="w-4 h-4 text-blue-700 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-blue-900">
                    Why we verify your business
                  </div>
                  <div className="mt-0.5 text-xs text-blue-800">
                    KYB verification protects you and your trading partners. Verified accounts
                    get access to escrow, lower fees, and priority supplier matching.
                  </div>
                </div>
              </div>
            </div>

            {/* Continue */}
            <button
              onClick={handleContinue}
              className="w-full rounded-xl bg-[var(--sf-blue-900)] text-white px-4 py-3 text-sm font-extrabold hover:bg-[var(--sf-blue-800)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
            >
              Continue to Control Center (demo)
            </button>

            <div className="text-center">
              <span className="text-xs text-slate-500">
                By continuing, you agree to our{' '}
                <button className="text-blue-700 hover:underline">Terms of Service</button>{' '}
                and{' '}
                <button className="text-blue-700 hover:underline">Privacy Policy</button>
              </span>
            </div>
          </div>

          {/* Already have account */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <span className="text-sm text-slate-600">
              Already have an account?{' '}
              <button onClick={handleContinue} className="text-blue-700 font-semibold hover:underline">
                Sign in (demo)
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};