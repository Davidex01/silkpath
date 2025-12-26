import React from 'react';
import { Icon, type IconName } from '../common/Icon';
import type { DealState } from '../../state/dealTypes';

export type ActiveView = 'discovery' | 'rfqs' | 'deal' | 'wallet' | 'logistics' | 'documents';

interface SidebarProps {
  active: ActiveView;
  setActive: (v: ActiveView) => void;
  deal: DealState;
  orgName?: string;  // новое
}

export const Sidebar: React.FC<SidebarProps> = ({ active, setActive, deal, orgName }) => {
  const nav: { id: ActiveView; label: string; icon: IconName; badge: string | null }[] = [
    { id: 'discovery', label: 'Search & Suppliers', icon: 'search', badge: null },
    {
      id: 'rfqs',
      label: 'RFQs & Offers',
      icon: 'deals',
      badge: null,
    },
    {
      id: 'deal',
      label: 'My Deals',
      icon: 'deals',
      badge: deal.payment.status === 'Waiting for Deposit' ? '!' : null,
    },
    { id: 'wallet', label: 'Wallet', icon: 'wallet', badge: null },
    {
      id: 'logistics',
      label: 'Logistics',
      icon: 'truck',
      badge: !deal.logistics.delivered ? '•' : null,
    },
    { id: 'documents', label: 'Documents', icon: 'docs', badge: null },
  ];

  return (
    <div className="fixed inset-y-0 left-0 w-72 bg-[var(--sf-blue-950)] text-white border-r border-blue-950/40">
      <div className="p-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 ring-1 ring-white/10 grid place-items-center">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-teal-400 to-blue-400" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-extrabold tracking-tight">SilkFlow</div>
            <div className="text-xs text-white/70">
              Russia ⇄ China Trade Control Center
            </div>
          </div>
        </div>

        {/* Risk posture */}
        <div className="mt-4 rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
          <div className="text-xs font-semibold text-white/80">Risk posture</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/5 p-2">
              <div className="text-[11px] text-white/70">KYB</div>
              <div className="text-sm font-bold text-white">On</div>
            </div>
            <div className="rounded-xl bg-white/5 p-2">
              <div className="text-[11px] text-white/70">Escrow</div>
              <div className="text-sm font-bold text-white">Protected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="px-3">
        <div className="text-xs font-semibold text-white/60 px-3 mb-2">NAVIGATION</div>
        <div className="space-y-1">
          {nav.map((n) => {
            const isActive = n.id === active;
            return (
              <button
                key={n.id}
                onClick={() => setActive(n.id)}
                className={
                  'w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ' +
                  (isActive ? 'bg-white/12 ring-1 ring-white/10' : 'hover:bg-white/8')
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={'text-white/80 ' + (isActive ? 'text-white' : '')}>
                    <Icon name={n.icon} />
                  </div>
                  <div className="min-w-0">
                    <div
                      className={
                        'text-sm font-semibold truncate ' +
                        (isActive ? 'text-white' : 'text-white/85')
                      }
                    >
                      {n.label}
                    </div>
                    {n.id === 'deal' ? (
                      <div className="text-[11px] text-white/60 truncate">
                        {deal.item.name} • {deal.supplier.name}
                      </div>
                    ) : null}
                  </div>
                </div>
                {n.badge ? (
                  <div
                    className={
                      'shrink-0 w-6 h-6 rounded-full grid place-items-center text-xs font-extrabold ' +
                      (n.badge === '!' ? 'bg-orange-500 text-white' : 'bg-teal-500 text-white')
                    }
                  >
                    {n.badge}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* User info */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
          <div className="text-xs text-white/70">Signed in</div>
          <div className="mt-1 text-sm font-semibold">
            {orgName ?? 'ИП Алексей (SME Owner)'}
          </div>
          <div className="mt-2 text-[11px] text-white/60">
            Prefers: simple steps • clear numbers • no paperwork
          </div>
        </div>
      </div>
    </div>
  );
};