import React from 'react';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icon';

export interface DiscoverySupplier {
  id: string;
  name: string;
  city: string;
  category: string;
  rating: number;
  kyb: boolean;
  exportLicense: boolean;
  lowMOQ: boolean;
  responseMins: number;
  tags: string[];
  items: string[];
}

export interface DiscoveryFilters {
  verified: boolean;
  exportLicense: boolean;
  lowMOQ: boolean;
}

interface DiscoveryViewProps {
  filters: DiscoveryFilters;
  setFilters: React.Dispatch<React.SetStateAction<DiscoveryFilters>>;
  query: string;
  setQuery: (value: string) => void;
  suppliers: DiscoverySupplier[];
  shortlistSet: Set<string>;
  toggleShortlist: (s: DiscoverySupplier) => void;
  onChatNow: (s: DiscoverySupplier) => void;
  onOpenProfile: (s: DiscoverySupplier) => void;

  // новые пропсы
  loading?: boolean;
  error?: string | null;
}

export const DiscoveryView: React.FC<DiscoveryViewProps> = ({
  filters,
  setFilters,
  query,
  setQuery,
  suppliers,
  shortlistSet,
  toggleShortlist,
  onChatNow,
  onOpenProfile,
  loading,
  error,
}) => {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-slate-900 text-xl font-bold">Search & Suppliers</div>
          <div className="mt-1 text-sm text-slate-600">
            Find verified factories and start negotiation with built-in risk controls.
          </div>

          {/* Индикация загрузки / ошибок */}
          <div className="mt-2 text-xs">
            {loading ? (
              <span className="text-blue-600 font-semibold">
                Loading suppliers from backend…
              </span>
            ) : error ? (
              <span className="text-orange-700">
                {error} — showing demo suppliers.
              </span>
            ) : null}
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Badge tone="green" icon={<Icon name="shield" className="w-4 h-4" />}>
            KYB Coverage
          </Badge>
          <Badge tone="blue">RFQ Templates</Badge>
          <Badge tone="orange" icon={<Icon name="alert" className="w-4 h-4" />}>
            Action-safe workflow
          </Badge>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Левая колонка: поиск + фильтры */}
        <div className="lg:col-span-4">
          <div className="sf-card rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-900">Search</div>
            <div className="mt-2 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon name="search" />
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Wireless Headphones, packaging, OEM..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
              />
            </div>

            <div className="mt-4 text-sm font-semibold text-slate-900">Filters</div>
            <div className="mt-2 space-y-2">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  Verified Factory
                </div>
                <input
                  type="checkbox"
                  checked={filters.verified}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, verified: e.target.checked }))
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  Export License
                </div>
                <input
                  type="checkbox"
                  checked={filters.exportLicense}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, exportLicense: e.target.checked }))
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  Low MOQ
                </div>
                <input
                  type="checkbox"
                  checked={filters.lowMOQ}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, lowMOQ: e.target.checked }))
                  }
                />
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-start gap-2">
                <div className="text-blue-700 mt-0.5">
                  <Icon name="spark" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-blue-900">
                    Trust-first matching
                  </div>
                  <div className="mt-0.5 text-xs text-blue-800">
                    SilkFlow prioritizes suppliers with KYB checks and export history to
                    reduce fraud risk.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-xs font-semibold text-slate-700">Workflow tip</div>
              <div className="mt-1 text-xs text-slate-600">
                Откройте профиль поставщика (карточка справа), посмотрите KYB, историю
                и отзывы, затем стартуйте переговоры из профиля или по кнопке Chat Now.
              </div>
            </div>
          </div>
        </div>

        {/* Правая колонка: список поставщиков */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Showing{' '}
              <span className="font-semibold text-slate-900">
                {suppliers.length}
              </span>{' '}
              suppliers
              {loading ? (
                <span className="text-xs text-blue-600 ml-2">(loading…)</span>
              ) : null}
            </div>
            <div className="text-xs text-slate-500">Sorted by: Trust score</div>
          </div>

          <div className="mt-3 space-y-3">
            {suppliers.map((s) => {
              const shortlisted = shortlistSet.has(s.id);
              return (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenProfile(s)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenProfile(s);
                    }
                  }}
                  className="sf-card rounded-2xl border border-slate-200 bg-white p-4 cursor-pointer hover:border-slate-300 hover:bg-slate-50/40 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-base font-bold text-slate-900 truncate">
                          {s.name}
                        </div>
                        <Badge
                          tone="green"
                          icon={<Icon name="shield" className="w-4 h-4" />}
                        >
                          KYB Verified
                        </Badge>
                        <Badge tone="blue">{s.category}</Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-sm text-slate-600 flex-wrap">
                        <span>{s.city}</span>
                        <span className="text-slate-300">•</span>
                        <span className="sf-number">
                          Rating{' '}
                          <span className="font-semibold text-slate-900">
                            {s.rating.toFixed(1)}/5
                          </span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="sf-number">
                          Avg reply{' '}
                          <span className="font-semibold text-slate-900">
                            {s.responseMins} min
                          </span>
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {s.exportLicense ? (
                          <Badge tone="gray">Export License</Badge>
                        ) : (
                          <Badge
                            tone="orange"
                            icon={<Icon name="alert" className="w-4 h-4" />}
                          >
                            No export license
                          </Badge>
                        )}
                        {s.lowMOQ ? (
                          <Badge tone="gray">Low MOQ</Badge>
                        ) : (
                          <Badge tone="gray">MOQ: standard</Badge>
                        )}
                        {s.tags.slice(0, 3).map((t) => (
                          <Badge key={t} tone="gray">
                            {t}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Common items: {s.items.join(', ')}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleShortlist(s);
                        }}
                        className={
                          'rounded-xl border px-3 py-2 text-sm font-semibold flex items-center gap-2 ' +
                          (shortlisted
                            ? 'border-orange-200 bg-orange-50 text-orange-800'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')
                        }
                        aria-label="Add to shortlist"
                        title={shortlisted ? 'Shortlisted' : 'Add to shortlist'}
                      >
                        <span
                          className={
                            shortlisted ? 'text-orange-600' : 'text-slate-400'
                          }
                        >
                          <Icon
                            name={shortlisted ? 'starFill' : 'star'}
                            className="w-4 h-4"
                          />
                        </span>
                        <span className="hidden sm:inline">Shortlist</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onChatNow(s);
                        }}
                        className="rounded-xl bg-[var(--sf-blue-900)] text-white px-4 py-2 text-sm font-semibold hover:bg-[var(--sf-blue-800)] focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        Chat Now
                      </button>

                      <div className="text-[11px] text-slate-500">
                        Click anywhere to open Supplier Profile
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-700">
                        Risk Controls
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        KYB, bank account match, export history, and blacklist checks.
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-700">
                        Language
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        RU ↔ CN auto-translate in chat + contract templates in Russian.
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-700">
                        Costs
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Transparent landed cost estimate with duty &amp; VAT by HS code.
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* если поставщиков нет */}
            {suppliers.length === 0 && !loading ? (
              <div className="mt-6 text-sm text-slate-500">
                No suppliers found. Try adjusting filters or search query.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};