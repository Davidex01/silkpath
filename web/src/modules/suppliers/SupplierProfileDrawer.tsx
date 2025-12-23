import React, { useEffect, useState } from 'react';
import type { DiscoverySupplier } from '../discovery/DiscoveryView';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icon';

interface SupplierProfileDrawerProps {
  open: boolean;
  supplier: DiscoverySupplier | null;
  onClose: () => void;
  onStartNegotiation: (supplier: DiscoverySupplier) => void;
  onCreateDeal?: (supplier: DiscoverySupplier) => void; // НОВОЕ
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
  onCreateDeal,            // ← деструктурируем
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
          {/* ... всё содержимое вкладок overview/compliance/history/reviews остаётся как было ... */}
          {/* Я его не перепечатываю, чтобы не раздувать ответ, но у тебя уже есть этот код. */}
          {/* Важно: он не зависит от onCreateDeal, менять его не нужно. */}
        </div>

        {/* Footer CTA */}
        <div className="border-t border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Next step: create a deal or start negotiation with built-in safeguards.
            </div>
            <div className="flex items-center gap-2">
              {/* Новая кнопка Create Deal */}
              <button
                onClick={() => onCreateDeal && onCreateDeal(supplier)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                Create Deal
              </button>

              {/* Старая кнопка Start Negotiation */}
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
    </div>
  );
};