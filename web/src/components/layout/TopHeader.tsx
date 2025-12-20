import React from 'react';
import { Badge } from '../common/Badge';
import { Icon } from '../common/Icon';
import type { ActiveView } from './Sidebar';
import type { DealState } from '../../state/dealTypes';

interface TopHeaderProps {
  active: ActiveView;
  deal: DealState;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ active, deal }) => {
  const activeName =
    active === 'discovery'
      ? 'Discovery'
      : active === 'deal'
      ? 'Deal Workspace'
      : active === 'logistics'
      ? 'Logistics'
      : active === 'wallet'
      ? 'Wallet'
      : 'Documents';

  return (
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="px-6 py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm text-slate-500">Control Center</div>
          <div className="text-lg font-extrabold text-slate-900 truncate">
            {activeName}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Badge tone="green" icon={<Icon name="shield" className="w-4 h-4" />}>
            KYB Verified Supplier
          </Badge>
          <Badge tone={deal.fx.locked ? 'green' : 'blue'}>
            {deal.fx.locked ? 'FX Locked' : 'FX Live'}
          </Badge>
          <Badge
            tone={
              deal.payment.status === 'Waiting for Deposit'
                ? 'orange'
                : deal.payment.status === 'Escrow Funded'
                ? 'green'
                : 'gray'
            }
          >
            Escrow: {deal.payment.status}
          </Badge>
          <div className="hidden md:flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <div className="text-xs font-semibold text-slate-700">All systems normal</div>
          </div>
        </div>
      </div>
    </div>
  );
};