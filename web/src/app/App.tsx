// src/app/App.tsx
import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { OnboardingView } from '../modules/onboarding/OnboardingView';

type ActiveView = 'discovery' | 'deal' | 'logistics' | 'wallet' | 'documents';

const App: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [active, setActive] = useState<ActiveView>('discovery');

  if (showOnboarding) {
    return <OnboardingView onComplete={() => setShowOnboarding(false)} />;
  }

  const renderContent = (): ReactNode => {
    switch (active) {
      case 'discovery':
        return (
          <>
            <h2 className="text-xl font-bold text-slate-900">Discovery (stub)</h2>
            <p className="mt-1 text-sm text-slate-600">
              Здесь позже будет экран поиска и списка поставщиков.
            </p>
          </>
        );
      case 'deal':
        return <h2 className="text-xl font-bold text-slate-900">Deal Workspace (stub)</h2>;
      case 'logistics':
        return <h2 className="text-xl font-bold text-slate-900">Logistics (stub)</h2>;
      case 'wallet':
        return <h2 className="text-xl font-bold text-slate-900">Wallet (stub)</h2>;
      case 'documents':
        return <h2 className="text-xl font-bold text-slate-900">Documents (stub)</h2>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 py-4 border-b border-slate-200 bg-white">
        <h1 className="text-lg font-extrabold text-slate-900">SilkFlow Control Center</h1>
        <p className="text-sm text-slate-500">
          Sidebar и TopHeader пока отключены — проверяем логику экранов.
        </p>
      </header>

      <div className="px-6 pt-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-2 flex gap-2 flex-wrap">
          {[
            { id: 'discovery', label: '1. Discovery' },
            { id: 'deal', label: '2. Negotiation & Payment' },
            { id: 'logistics', label: '3. Logistics & Execution' },
            { id: 'wallet', label: 'Wallet' },
            { id: 'documents', label: 'Documents' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id as ActiveView)}
              className={
                'rounded-xl px-3 py-2 text-sm font-semibold transition ring-1 ring-inset ' +
                (active === t.id
                  ? 'bg-blue-50 text-blue-900 ring-blue-200'
                  : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 p-6">{renderContent()}</main>

      <footer className="px-6 pb-6 text-xs text-slate-400">
        SilkFlow prototype — React + Vite + Tailwind.
      </footer>
    </div>
  );
};

export default App;