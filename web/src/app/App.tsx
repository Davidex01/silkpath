import React, { useEffect, useMemo, useState } from 'react';
import { Sidebar, type ActiveView } from '../components/layout/Sidebar';
import { TopHeader } from '../components/layout/TopHeader';
import { createInitialDeal } from '../state/createInitialDeal';
import type { DealState } from '../state/dealTypes';
import {
  DiscoveryView,
  type DiscoveryFilters,
  type DiscoverySupplier,
} from '../modules/discovery/DiscoveryView';
import { ToastStack, type Toast } from '../components/common/ToastStack';
import { DealWorkspaceView } from '../modules/deal/DealWorkspaceView';
import { LogisticsView } from '../modules/logistics/LogisticsView';
import { WalletView } from '../modules/wallet/WalletView';
import { DocumentsView } from '../modules/documents/DocumentsView';
import { SupplierProfileDrawer } from '../modules/suppliers/SupplierProfileDrawer';
import { clamp } from '../components/lib/clamp';
import { OnboardingLanding } from '../modules/onboarding/OnboardingLanding';
import { RegisterView } from '../modules/auth/RegisterView';
import { LoginView } from '../modules/auth/LoginView';
import { saveAuthEncrypted, loadAuthEncrypted, clearAuth } from '../state/secureSession';
import type { AuthState, BackendOrg } from '../state/authTypes';
import { api } from '../api/client';

type AuthMode = 'onboarding' | 'register' | 'login' | 'app';

// Пока ещё используем демо‑поставщиков (на следующих этапах заменим на /orgs/suppliers)
const SUPPLIERS: DiscoverySupplier[] = [
  {
    id: 'shenzhen-electronics',
    name: 'Shenzhen Electronics Ltd',
    city: 'Shenzhen, CN',
    category: 'Consumer Electronics',
    rating: 4.9,
    kyb: true,
    exportLicense: true,
    lowMOQ: true,
    responseMins: 9,
    tags: ['ISO 9001', 'On-site audit', 'Alibaba gold'],
    items: ['Wireless Headphones', 'Bluetooth Speakers', 'Chargers'],
  },
  {
    id: 'ningbo-packaging',
    name: 'Ningbo Packaging Co.',
    city: 'Ningbo, CN',
    category: 'Packaging',
    rating: 4.7,
    kyb: true,
    exportLicense: true,
    lowMOQ: false,
    responseMins: 18,
    tags: ['Food-grade', 'Export to EU'],
    items: ['Cartons', 'Poly mailers', 'Foam inserts'],
  },
  {
    id: 'guangzhou-textiles',
    name: 'Guangzhou Textiles Factory',
    city: 'Guangzhou, CN',
    category: 'Apparel & Textiles',
    rating: 4.8,
    kyb: true,
    exportLicense: false,
    lowMOQ: true,
    responseMins: 12,
    tags: ['OEKO-TEX', 'Custom labels'],
    items: ['Hoodies', 'T-Shirts', 'Workwear'],
  },
];

const fallbackId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return String(Date.now() + Math.random());
};

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [mode, setMode] = useState<AuthMode>('onboarding');

  // актуальная орг‑инфо ...
  const [org, setOrg] = useState<BackendOrg | null>(null);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);

  const [active, setActive] = useState<ActiveView>('discovery');
  const [deal, setDeal] = useState<DealState>(() => createInitialDeal());

  // Поставщики
  const [suppliers, setSuppliers] = useState<DiscoverySupplier[]>(SUPPLIERS);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [suppliersError, setSuppliersError] = useState<string | null>(null);

  const [filters, setFilters] = useState<DiscoveryFilters>({
    verified: true,
    exportLicense: false,
    lowMOQ: false,
  });

  const [query, setQuery] = useState('Wireless Headphones');
  const [shortlist, setShortlist] = useState<Set<string>>(() => new Set());

  const [toasts, setToasts] = useState<Toast[]>([]);

  // Сайдбарный профиль поставщика
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSupplier, setProfileSupplier] =
    useState<DiscoverySupplier | null>(null);

  // ===== Helpers =====

  const addToast = (input: Omit<Toast, 'id'>) => {
    const id = fallbackId();
    const toast: Toast = { ...input, id };
    setToasts((prev) => [toast, ...prev].slice(0, 4));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadOrgProfile = async (token: string) => {
    try {
      setOrgLoading(true);
      setOrgError(null);
      const data = await api<BackendOrg>('/orgs/me', {}, token);
      setOrg(data);
    } catch (e) {
      console.error('Failed to fetch /orgs/me', e);
      setOrgError('Could not load organization profile');
      addToast({
        tone: 'warn',
        title: 'Backend access error',
        message: 'Could not load organization profile (check API / auth).',
      });
    } finally {
      setOrgLoading(false);
    }
  };

  const loadSuppliers = async (token: string) => {
    try {
      setSuppliersLoading(true);
      setSuppliersError(null);

      // тип можно описать тут локально
      interface OrgFromApi {
        id: string;
        name: string;
        country: string;
        role: 'buyer' | 'supplier' | 'both';
        kybStatus: 'not_started' | 'pending' | 'verified' | 'rejected';
        createdAt: string;
      }

      const orgs = await api<OrgFromApi[]>('/orgs/suppliers', {}, token);

      // Маппим Organization -> DiscoverySupplier (гибридные данные)
      const mapped: DiscoverySupplier[] = orgs.map((o, index) => {
        const isCN = o.country === 'CN';
        const baseCity = isCN ? 'Shenzhen, CN' : 'Moscow, RU';
        const baseCategory =
          o.role === 'supplier' || o.role === 'both'
            ? 'General Goods'
            : 'Services';

        const rating = 4.2 + (index % 4) * 0.2;
        const exportLicense = isCN;
        const lowMOQ = index % 2 === 0;

        return {
          id: o.id,
          name: o.name,
          city: baseCity,
          category: baseCategory,
          rating,
          kyb: o.kybStatus === 'verified',
          exportLicense,
          lowMOQ,
          responseMins: 10 + (index % 5) * 3,
          tags: [o.country === 'CN' ? 'CN Export' : 'RU Import', 'SilkFlow'],
          items: ['Demo Product A', 'Demo Product B'],
        };
      });

      if (mapped.length > 0) {
        setSuppliers(mapped);
      }
    } catch (e) {
      console.error('Failed to load suppliers', e);
      setSuppliersError('Could not load suppliers');
      addToast({
        tone: 'warn',
        title: 'Suppliers load error',
        message: 'Could not load suppliers list. Using demo data.',
      });
    } finally {
      setSuppliersLoading(false);
    }
  };


  const handleAuthSuccess = async (a: AuthState) => {
    setAuth(a);
    setOrg(a.org);
    setMode('app');
    await saveAuthEncrypted(a);
    void loadOrgProfile(a.tokens.accessToken);
    void loadSuppliers(a.tokens.accessToken);      // ← добавили
  };

  const handleLogout = () => {
    clearAuth();
    setAuth(null);
    setOrg(null);
    setMode('onboarding');
  };

  // ===== Effects =====

  // FX‑тикер, как в прототипе
  useEffect(() => {
    const interval = setInterval(() => {
      setDeal((d) => {
        if (d.fx.locked) {
          return { ...d, fx: { ...d.fx, tick: d.fx.tick + 1 } };
        }
        const drift = (Math.random() - 0.5) * 0.1; // ±0.05
        const next = clamp(d.fx.rateLive + drift, 12.6, 14.3);
        return {
          ...d,
          fx: { ...d.fx, rateLive: Number(next.toFixed(2)), tick: d.fx.tick + 1 },
        };
      });
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  // восстановление авторизации из sessionStorage
  useEffect(() => {
    loadAuthEncrypted().then((stored) => {
      if (stored) {
        setAuth(stored);
        setOrg(stored.org);
        setMode('app');
        void loadOrgProfile(stored.tokens.accessToken);
        void loadSuppliers(stored.tokens.accessToken); // ← добавили
      }
    });
  }, []);

  // ===== Derived data =====

  const suppliersFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return suppliers
      .filter((s) => {
        if (filters.verified && !s.kyb) return false;
        if (filters.exportLicense && !s.exportLicense) return false;
        if (filters.lowMOQ && !s.lowMOQ) return false;
        if (!q) return true;
        const haystack = [s.name, s.city, s.category, ...s.items]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => b.rating - a.rating);
  }, [filters, query, suppliers]);

  // ===== Handlers для Discovery/Deal =====

  const toggleShortlist = (supplier: DiscoverySupplier) => {
    setShortlist((prev) => {
      const next = new Set(prev);
      const exists = next.has(supplier.id);
      if (exists) next.delete(supplier.id);
      else next.add(supplier.id);
      addToast({
        tone: 'info',
        title: exists
          ? 'Removed from shortlist (demo)'
          : 'Added to shortlist (demo)',
        message: supplier.name,
      });
      return next;
    });
  };

  const handleChatNow = (supplier: DiscoverySupplier) => {
    setDeal((prev) => ({
      ...prev,
      supplier: {
        id: supplier.id,
        name: supplier.name,
        city: supplier.city,
        category: supplier.category,
        rating: supplier.rating,
      },
    }));
    setActive('deal');
    addToast({
      tone: 'success',
      title: 'Chat started (demo)',
      message: `Connected to ${supplier.name}. Auto-translate is ready.`,
    });
  };

  const handleOpenProfile = (supplier: DiscoverySupplier) => {
    setProfileSupplier(supplier);
    setProfileOpen(true);
  };

  const handleStartNegotiation = (supplier: DiscoverySupplier) => {
    setDeal((prev) => ({
      ...prev,
      supplier: {
        id: supplier.id,
        name: supplier.name,
        city: supplier.city,
        category: supplier.category,
        rating: supplier.rating,
      },
    }));
    setActive('deal');
    setProfileOpen(false);
    addToast({
      tone: 'success',
      title: 'Deal started (demo)',
      message: `Negotiation started with ${supplier.name}.`,
    });
  };

  // ===== Auth-mode screens =====

  if (!auth) {
    if (mode === 'onboarding') {
      return (
        <>
          <OnboardingLanding onSelectMode={(m) => setMode(m)} />
          <ToastStack toasts={toasts} onDismiss={handleDismissToast} />
        </>
      );
    }

    if (mode === 'register') {
      return (
        <>
          <RegisterView
            onSuccess={handleAuthSuccess}
            onBack={() => setMode('onboarding')}
          />
          <ToastStack toasts={toasts} onDismiss={handleDismissToast} />
        </>
      );
    }

    if (mode === 'login') {
      return (
        <>
          <LoginView
            onSuccess={handleAuthSuccess}
            onBack={() => setMode('onboarding')}
          />
          <ToastStack toasts={toasts} onDismiss={handleDismissToast} />
        </>
      );
    }
  }

  // ===== Основной UI (auth есть, mode === 'app') =====

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Левый сайдбар */}
      <Sidebar
        active={active}
        setActive={setActive}
        deal={deal}
        orgName={org?.name}
      />

      {/* Правая часть: шапка + контент */}
      <div className="ml-72 min-h-screen flex flex-col">
        <TopHeader active={active} deal={deal} />

        {/* mini journey tabs */}
        <div className="px-6 pt-4">
          <div className="sf-card rounded-2xl border border-slate-200 bg-white p-2">
            <div className="flex flex-wrap items-center gap-2">
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

              <div className="ml-auto hidden md:flex items-center gap-2 text-xs text-slate-500">
                <span className="sf-number">
                  Supplier:{' '}
                  <span className="font-semibold text-slate-700">
                    {deal.supplier.name}
                  </span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="sf-number">
                  Item:{' '}
                  <span className="font-semibold text-slate-700">
                    {deal.item.name}
                  </span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="sf-number">
                  HS:{' '}
                  <span className="font-semibold text-slate-700">
                    {deal.calc.hs.code}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Контент по вкладкам */}
        <main className="flex-1">
          {active === 'discovery' ? (
            <DiscoveryView
              filters={filters}
              setFilters={setFilters}
              query={query}
              setQuery={setQuery}
              suppliers={suppliersFiltered}
              shortlistSet={shortlist}
              toggleShortlist={toggleShortlist}
              onChatNow={handleChatNow}
              onOpenProfile={handleOpenProfile}
            />
          ) : active === 'deal' ? (
            <DealWorkspaceView
              deal={deal}
              setDeal={setDeal}
              addToast={addToast}
              onGoLogistics={() => setActive('logistics')}
              auth={auth!}
            />
          ) : active === 'logistics' ? (
            <LogisticsView deal={deal} setDeal={setDeal} addToast={addToast} />
          ) : active === 'wallet' ? (
            <WalletView deal={deal} addToast={addToast} />
          ) : active === 'documents' ? (
            <DocumentsView deal={deal} addToast={addToast} />
          ) : null}
        </main>

        <footer className="px-6 pb-6 text-xs text-slate-400">
          SilkFlow prototype — React + Vite + Tailwind. Discovery / Deal Workspace /
          Logistics / Wallet / Documents + Supplier Profile Drawer перенесены из
          high‑fidelity прототипа.
        </footer>
      </div>

      {/* Профиль поставщика (drawer) */}
      <SupplierProfileDrawer
        open={profileOpen}
        supplier={profileSupplier}
        onClose={() => setProfileOpen(false)}
        onStartNegotiation={handleStartNegotiation}
      />

      <ToastStack toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
};

export default App;