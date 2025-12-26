// src/modules/suppliers/SupplierShell.tsx
import React, { useState } from 'react';
import type { AuthState } from '../../state/authTypes';
import type { Toast } from '../../components/common/ToastStack';
import { SupplierConsoleView } from './SupplierConsoleView';
import { SupplierDealsChatView } from './SupplierDealsChatView';
import { Icon } from '../../components/common/Icon';
import { Badge } from '../../components/common/Badge';

type SupplierTab = 'rfqs' | 'deals' | 'wallet';

interface SupplierShellProps {
  auth: AuthState;
  addToast: (t: Omit<Toast, 'id'>) => void;
}

// ===== Компонент подсказки =====
const HelpTip: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 text-white/80 hover:text-white grid place-items-center text-xs font-bold transition"
        aria-label="Help"
      >
        ?
      </button>
      {open && (
        <div className="absolute z-50 left-6 top-0 w-72 rounded-xl border border-slate-200 bg-white shadow-lg p-3 sf-fade-in">
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

  const tabs: { id: SupplierTab; label: string; icon: React.ReactNode; description: string }[] = [
    {
      id: 'rfqs',
      label: 'Входящие RFQ',
      icon: <Icon name="docs" className="w-4 h-4" />,
      description: 'Запросы от покупателей',
    },
    {
      id: 'deals',
      label: 'Сделки и чат',
      icon: <Icon name="deals" className="w-4 h-4" />,
      description: 'Активные сделки',
    },
    {
      id: 'wallet',
      label: 'Финансы',
      icon: <Icon name="wallet" className="w-4 h-4" />,
      description: 'Поступления и баланс',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===== HEADER ===== */}
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
                  <div className="text-sm text-white/70">Кабинет поставщика</div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Badge tone="green" icon={<Icon name="shield" className="w-4 h-4" />}>
                  Верифицирован
                </Badge>
                <span className="text-sm text-white/80">
                  {auth.org.name}
                </span>
                <span className="text-white/40">•</span>
                <span className="text-sm text-white/60">
                  {auth.org.country === 'CN' ? '🇨🇳 Китай' : '🇷🇺 Россия'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setHelpOpen(true)}
                className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-semibold flex items-center gap-2 transition"
              >
                <Icon name="spark" className="w-4 h-4" />
                Как это работает?
              </button>
              <HelpTip title="Режим поставщика">
                Здесь вы получаете запросы от покупателей, отправляете
                коммерческие предложения и ведёте сделки до завершения.
              </HelpTip>
            </div>
          </div>

          {/* ===== TABS ===== */}
          <div className="mt-6 flex items-center gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={
                  'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ' +
                  (tab === t.id
                    ? 'bg-white text-slate-900 shadow-lg'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white')
                }
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
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

      {/* ===== HELP MODAL ===== */}
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
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white grid place-items-center text-sm font-bold shrink-0">
                  1
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Получите запрос (RFQ)
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    Покупатели отправляют вам запросы на товары. Они появляются
                    во вкладке «Входящие RFQ».
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white grid place-items-center text-sm font-bold shrink-0">
                  2
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Отправьте предложение (Offer)
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    Укажите цену, количество, условия доставки. Покупатель
                    получит ваше предложение для рассмотрения.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white grid place-items-center text-sm font-bold shrink-0">
                  3
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Дождитесь подтверждения
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    Когда покупатель примет предложение, создастся сделка и
                    откроется чат для уточнения деталей.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white grid place-items-center text-sm font-bold shrink-0">
                  4
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Получите оплату через эскроу
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    Покупатель вносит деньги в эскроу. После доставки и
                    подтверждения — средства переводятся вам.
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-start gap-2">
                  <div className="text-emerald-700 mt-0.5">
                    <Icon name="shield" className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-emerald-800">
                    <strong>Защита поставщика:</strong> Эскроу гарантирует, что
                    покупатель платёжеспособен. Деньги уже заблокированы до
                    отправки товара.
                  </div>
                </div>
              </div>
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

// ===== Заглушка для Wallet поставщика =====
const SupplierWalletView: React.FC<{
  auth: AuthState;
  addToast: (t: Omit<Toast, 'id'>) => void;
}> = ({ addToast }) => {
  return (
    <div className="p-6">
      <div className="sf-card rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 grid place-items-center mb-4">
          <Icon name="wallet" className="w-8 h-8" />
        </div>
        <div className="text-lg font-bold text-slate-900">
          Финансы поставщика
        </div>
        <div className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          Здесь будут отображаться поступления от покупателей, история выплат
          из эскроу и текущий баланс.
        </div>
        <button
          onClick={() =>
            addToast({
              tone: 'info',
              title: 'В разработке',
              message: 'Полноценный Wallet для поставщиков появится в следующей версии.',
            })
          }
          className="mt-4 rounded-xl bg-teal-600 text-white px-4 py-2 text-sm font-semibold hover:bg-teal-700"
        >
          Подробнее
        </button>
      </div>
    </div>
  );
};