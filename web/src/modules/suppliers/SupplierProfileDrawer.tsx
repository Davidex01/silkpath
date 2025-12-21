import React, { useEffect, useState } from 'react';
import type { DiscoverySupplier } from '../discovery/DiscoveryView';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icon';

interface SupplierProfileDrawerProps {
  open: boolean;
  supplier: DiscoverySupplier | null;
  onClose: () => void;
  onStartNegotiation: (supplier: DiscoverySupplier) => void;
}

type TabId = 'overview' | 'compliance' | 'history' | 'reviews';

function Stars({ value = 5 }: { value: number }) {
  const full = Math.round(Math.max(0, Math.min(5, value)));
  return (
    <div className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < full ? 'text-orange-500' : 'text-slate-300'}>
          <Icon name={i < full ? 'starFill' : 'star'} className="w-4 h-4" />
        </span>
      ))}
    </div>
  );
}

export const SupplierProfileDrawer: React.FC<SupplierProfileDrawerProps> = ({
  open,
  supplier,
  onClose,
  onStartNegotiation,
}) => {
  const [tab, setTab] = useState<TabId>('overview');

  useEffect(() => {
    if (open) setTab('overview');
  }, [open, supplier?.id]);

  if (!open || !supplier) return null;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'history', label: 'Trade History' },
    { id: 'reviews', label: 'Reviews' },
  ];

  const kybChecks = [
    { label: 'Legal entity registry (CN)', state: 'pass' as const },
    { label: 'Beneficial owner screening', state: 'pass' as const },
    { label: 'Bank account beneficiary match', state: 'pass' as const },
    {
      label: 'Export history cross-check',
      state: supplier.exportLicense ? ('pass' as const) : ('warn' as const),
    },
    { label: 'Sanctions / blacklist screening', state: 'pass' as const },
  ];

  const deals = [
    {
      date: '2025-09-18',
      product: supplier.items?.[0] || 'Consumer goods',
      volume: '$38,400',
      dispute: false,
    },
    {
      date: '2025-07-02',
      product: supplier.items?.[1] || 'Components',
      volume: '$21,900',
      dispute: false,
    },
    {
      date: '2025-05-11',
      product: supplier.items?.[2] || 'Accessories',
      volume: '$12,700',
      dispute: true,
    },
  ];

  const reviews = [
    {
      name: 'ООО “Вектор”',
      rating: 5,
      text: 'Сделка прошла спокойно: документы выдали быстро, видео-осмотр перед отгрузкой помог снять риски.',
    },
    {
      name: 'ИП Марина',
      rating: 4,
      text: 'Хорошая коммуникация и стабильное качество. По срокам один раз задержали на 2 дня, но предупредили заранее.',
    },
    {
      name: 'ООО “Сигма”',
      rating: 5,
      text: 'Счёт/инвойс без ошибок, банк принял с первого раза. Рекомендую для регулярных поставок.',
    },
  ];

  return (
    <div className="fixed inset-0 z-40" aria-modal="true" role="dialog">
      {/* затемнение фона */}
      <div className="absolute inset-0 bg-slate-900/35" onClick={onClose} />

      {/* сам Drawer */}
      <div className="absolute inset-y-0 right-0 w-full max-w-[520px] bg-white border-l border-slate-200 sf-card flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-slate-500">Supplier Profile</div>
              <div className="mt-0.5 text-lg font-extrabold text-slate-900 truncate">
                {supplier.name}
              </div>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <Badge tone="green" icon={<Icon name="shield" className="w-4 h-4" />}>
                  KYB Verified
                </Badge>
                <Badge tone="blue">{supplier.category}</Badge>
                <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <Stars value={supplier.rating} />
                  <span className="sf-number font-semibold text-slate-800">
                    {supplier.rating.toFixed(1)}/5
                  </span>
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Close"
            >
              <Icon name="x" />
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={
                  'rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-inset transition ' +
                  (tab === t.id
                    ? 'bg-blue-50 text-blue-900 ring-blue-200'
                    : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto sf-scrollbar p-5">
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
                <div className="h-36 bg-gradient-to-br from-blue-900/75 via-slate-900/55 to-teal-600/55 relative">
                  <div className="absolute inset-0 sf-grid-bg opacity-25" />
                  <div className="absolute left-4 bottom-4">
                    <div className="text-white text-sm font-bold">Factory Photo</div>
                    <div className="text-white/80 text-xs">
                      Placeholder — add real images in production
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold text-slate-700">Location</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">
                    {supplier.city}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Time zone aligned with China business hours.
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold text-slate-700">
                    Main Category
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-900">
                    {supplier.category}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Supports OEM/ODM (demo).
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold text-slate-700">
                  Main Products
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {supplier.items.map((p) => (
                    <Badge key={p} tone="gray">
                      {p}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3 text-xs text-slate-600">
                  Typical lead time: 12–18 days • Packaging customization available.
                </div>
              </div>
            </div>
          )}

          {tab === 'compliance' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="text-emerald-700 mt-0.5">
                    <Icon name="shield" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-emerald-900">
                      Verified by SilkFlow
                    </div>
                    <div className="mt-1 text-xs text-emerald-800">
                      We run KYB + bank beneficiary matching and keep an audit trail for
                      payments and documents to reduce fraud and compliance risk.
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-bold text-slate-900">KYB checks</div>
                <div className="mt-3 space-y-2">
                  {kybChecks.map((c) => (
                    <div
                      key={c.label}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="text-sm text-slate-700">{c.label}</div>
                      <Badge
                        tone={c.state === 'pass' ? 'green' : 'orange'}
                        icon={
                          c.state === 'pass' ? (
                            <Icon name="check" className="w-4 h-4" />
                          ) : (
                            <Icon name="alert" className="w-4 h-4" />
                          )
                        }
                      >
                        {c.state === 'pass' ? 'Passed' : 'Needs review'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-bold text-slate-900">Certificates</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {supplier.tags.map((t) => (
                    <Badge key={t} tone="gray">
                      {t}
                    </Badge>
                  ))}
                  {supplier.exportLicense ? (
                    <Badge tone="gray">Export License</Badge>
                  ) : (
                    <Badge
                      tone="orange"
                      icon={<Icon name="alert" className="w-4 h-4" />}
                    >
                      No export license
                    </Badge>
                  )}
                </div>
                <div className="mt-3 text-xs text-slate-600">
                  Documents are stored in SilkFlow for easy bank/accountant export
                  (demo).
                </div>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-slate-900">
                    Last 3 deals (demo)
                  </div>
                  <Badge tone="blue">Internal data</Badge>
                </div>

                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">
                          Date
                        </th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">
                          Product
                        </th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">
                          Volume
                        </th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">
                          Dispute
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {deals.map((d, i) => (
                        <tr
                          key={d.date}
                          className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}
                        >
                          <td className="px-3 py-2 text-slate-700 sf-number">
                            {d.date}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{d.product}</td>
                          <td className="px-3 py-2 text-slate-700 sf-number">
                            {d.volume}
                          </td>
                          <td className="px-3 py-2">
                            {d.dispute ? (
                              <Badge
                                tone="orange"
                                icon={<Icon name="alert" className="w-4 h-4" />}
                              >
                                Yes
                              </Badge>
                            ) : (
                              <Badge
                                tone="green"
                                icon={<Icon name="check" className="w-4 h-4" />}
                              >
                                No
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 text-xs text-slate-600">
                  Use trade history to calibrate risk, escrow terms, and inspection
                  requirements.
                </div>
              </div>
            </div>
          )}

          {tab === 'reviews' && (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div
                  key={r.name}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{r.name}</div>
                      <div className="mt-1">
                        <Stars value={r.rating} />
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">Verified buyer</div>
                  </div>
                  <div className="mt-2 text-sm text-slate-700 leading-relaxed">
                    {r.text}
                  </div>
                </div>
              ))}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold text-slate-700">
                  How reviews work
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Only buyers who completed escrow-backed deals can leave a review
                  (demo).
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="border-t border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Next step: start negotiation with built-in safeguards.
            </div>
            <button
              onClick={() => onStartNegotiation(supplier)}
              className="rounded-xl bg-[var(--sf-blue-900)] text-white px-4 py-2.5 text-sm font-extrabold hover:bg-[var(--sf-blue-800)] focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              Start Negotiation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};