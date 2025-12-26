// web/src/modules/supplier/SupplierShell.tsx
import React, { useState } from 'react';
import type { AuthState } from '../../state/authTypes';
import type { Toast } from '../../components/common/ToastStack';
import { SupplierConsoleView } from './SupplierConsoleView';
import { SupplierDealsChatView } from './SupplierDealsChatView';

type SupplierTab = 'rfqs' | 'deals';

interface SupplierShellProps {
  auth: AuthState;
  addToast: (t: Omit<Toast, 'id'>) => void;
}

export const SupplierShell: React.FC<SupplierShellProps> = ({
  auth,
  addToast,
}) => {
  const [tab, setTab] = useState<SupplierTab>('rfqs');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Верхняя панель с табами */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">Supplier Mode</div>
            <div className="text-lg font-extrabold text-slate-900">
              {tab === 'rfqs' ? 'Incoming RFQs' : 'Deals & Chat'}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Org:{' '}
              <span className="font-semibold text-slate-900">
                {auth.org.name}
              </span>{' '}
              ({auth.org.country}, role: {auth.org.role})
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('rfqs')}
              className={
                'rounded-xl px-3 py-2 text-xs font-semibold ring-1 ring-inset ' +
                (tab === 'rfqs'
                  ? 'bg-blue-50 text-blue-900 ring-blue-200'
                  : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')
              }
            >
              RFQs
            </button>
            <button
              onClick={() => setTab('deals')}
              className={
                'rounded-xl px-3 py-2 text-xs font-semibold ring-1 ring-inset ' +
                (tab === 'deals'
                  ? 'bg-blue-50 text-blue-900 ring-blue-200'
                  : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')
              }
            >
              Deals & Chat
            </button>
          </div>
        </div>
      </div>

      {/* Контент вкладок */}
      {tab === 'rfqs' ? (
        <SupplierConsoleView auth={auth} addToast={addToast} />
      ) : (
        <SupplierDealsChatView auth={auth} addToast={addToast} />
      )}
    </div>
  );
};