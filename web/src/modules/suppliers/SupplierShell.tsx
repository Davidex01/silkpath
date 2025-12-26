// web/src/modules/suppliers/SupplierShell.tsx
import React, { useState } from 'react';
import type { AuthState } from '../../state/authTypes';
import type { Toast } from '../../components/common/ToastStack';
import { SupplierConsoleView } from './SupplierConsoleView';
import { SupplierDealsChatView } from './SupplierDealsChatView';
import { SupplierWalletView } from './SupplierWalletView';
import { Icon } from '../../components/common/Icon';
import { NotificationBell } from '../../components/common/NotificationBell';

type SupplierTab = 'rfqs' | 'deals' | 'wallet';

interface SupplierShellProps {
  auth: AuthState;
  addToast: (t: Omit<Toast, 'id'>) => void;
}

const HelpTip: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block ml-1">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="w-4 h-4 rounded-full bg-white/20 hover:bg-white/30 text-white/80 hover:text-white grid place-items-center text-[10px] font-bold transition"
      >
        ?
      </button>
      {open && (
        <div className="absolute z-50 right-0 top-6 w-80 rounded-xl border border-slate-200 bg-white shadow-xl p-3 sf-fade-in text-left">
          <div className="text-xs font-bold text-slate-900 mb-1">{title}</div>
          <div className="text-xs text-slate-600 leading-relaxed">{children}</div>
        </div>
      )}
    </div>
  );
};

export const SupplierShell: React.FC<SupplierShellProps> = ({
  auth,
  addToast,
}) => {
  const [tab, setTab] = useState<SupplierTab>('rfqs');
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-[var(--sf-blue-950)] to-[var(--sf-blue-900)] text-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 ring-1 ring-white/20 grid place-items-center">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-blue-400" />
                </div>
              <div>
                <div className="text-xl font-extrabold tracking-tight">
                  SilkFlow
                </div>
                <div className="text-sm text-white/70">
                  Кабинет поставщика
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <div className="text-sm font-semibold">
                {auth.org.name}
              </div>
              <span className="text-xs text-white/60">
                {auth.org.country === 'CN' ? 'China • Supplier' : 'Russia • Supplier'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell auth={auth} />
            <button
              onClick={() => setHelpOpen(true)}
              className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 text-xs md:text-sm font-semibold flex items-center gap-2 transition"
            >
              <Icon name="spark" className="w-4 h-4" />
              Как это работает?
            </button>
            <HelpTip title="Режим поставщика">
              Здесь вы получаете RFQ от покупателей, отправляете коммерческие
              предложения и отслеживаете оплату через эскроу.
            </HelpTip>
          </div>
        </div>

        {/* TABS */}
        <div className="mt-6 flex items-center gap-2">
          <button
            onClick={() => setTab('rfqs')}
            className={
              'rounded-xl px-4 py-2.5 text-xs md:text-sm font-semibold flex items-center gap-2 ' +
              (tab === 'rfqs'
                ? 'bg-white text-slate-900 shadow-lg'
                : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white')
            }
          >
            <Icon name="docs" className="w-4 h-4" />
            Входящие RFQ
          </button>
          <button
            onClick={() => setTab('deals')}
            className={
              'rounded-xl px-4 py-2.5 text-xs md:text-sm font-semibold flex items-center gap-2 ' +
              (tab === 'deals'
                ? 'bg-white text-slate-900 shadow-lg'
                : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white')
            }
          >
            <Icon name="deals" className="w-4 h-4" />
            Сделки и чат
          </button>
          <button
            onClick={() => setTab('wallet')}
            className={
              'rounded-xl px-4 py-2.5 text-xs md:text-sm font-semibold flex items-center gap-2 ' +
              (tab === 'wallet'
                ? 'bg-white text-slate-900 shadow-lg'
                : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white')
            }
          >
            <Icon name="wallet" className="w-4 h-4" />
            Финансы
          </button>
        </div>
      </div>
    </div>

    {/* CONTENT */}
    <div className="max-w-7xl mx-auto">
      {tab === 'rfqs' && (
        <SupplierConsoleView auth={auth} addToast={addToast} />
      )}
      {tab === 'deals' && (
        <SupplierDealsChatView auth={auth} addToast={addToast} />
      )}
      {tab === 'wallet' && (
        <SupplierWalletView auth={auth} addToast={addToast} />
      )}
    </div>

    {/* HELP MODAL */}
    {helpOpen && (
      <div
        className="fixed inset-0 z-50 bg-slate-900/50 grid place-items-center p-4"
        onClick={() => setHelpOpen(false)}
      >
        <div
          className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 sf-card overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <div className="text-base font-bold text-slate-900">
                Как работать в режиме поставщика?
              </div>
              <div className="text-xs text-slate-600">
                Пошаговое руководство
              </div>
            </div>
            <button
              onClick={() => setHelpOpen(false)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            >
              <Icon name="x" />
            </button>
          </div>
          <div className="p-5 space-y-3 text-xs text-slate-700">
            <p>
              1. Получайте RFQ от покупателей во вкладке <strong>«Входящие RFQ»</strong>.
            </p>
            <p>
              2. Отправляйте коммерческие предложения (Offer) с ценой и условиями.
            </p>
            <p>
              3. После принятия Offer покупателем сделка появится во вкладке{' '}
              <strong>«Сделки и чат»</strong>. Обсуждайте детали в чате.
            </p>
            <p>
              4. Покупатель оплачивает в эскроу. Выплаты по сделкам вы увидите
              во вкладке <strong>«Финансы»</strong>.
            </p>
          </div>
          <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
            <button
              onClick={() => setHelpOpen(false)}
              className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
            >
              Понятно
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
};