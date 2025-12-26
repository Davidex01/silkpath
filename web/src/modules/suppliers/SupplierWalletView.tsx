// web/src/modules/suppliers/SupplierWalletView.tsx
import React, { useEffect, useMemo, useState } from 'react';
import type { AuthState } from '../../state/authTypes';
import type { Toast } from '../../components/common/ToastStack';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icon';
import { fmt } from '../../components/lib/format';
import { listWallets, type Wallet } from '../../api/wallets';
import {
  listPaymentsForOrg,
  type Payment,
} from '../../api/payments';

interface SupplierWalletViewProps {
  auth: AuthState;
  addToast: (t: Omit<Toast, 'id'>) => void;
}

// Входящие платежи по сделкам: поставщик = payeeOrgId
export const SupplierWalletView: React.FC<SupplierWalletViewProps> = ({
  auth,
  addToast,
}) => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [walletsError, setWalletsError] = useState<string | null>(null);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  // Загрузка кошельков
  useEffect(() => {
    const load = async () => {
      try {
        setWalletsLoading(true);
        setWalletsError(null);
        const data = await listWallets(auth);
        setWallets(data);
      } catch (e) {
        console.error('Failed to load supplier wallets', e);
        setWalletsError('Не удалось загрузить кошельки поставщика.');
      } finally {
        setWalletsLoading(false);
      }
    };
    void load();
  }, [auth]);

  // Загрузка всех платежей организации (payer + payee)
  useEffect(() => {
    const load = async () => {
      try {
        setPaymentsLoading(true);
        setPaymentsError(null);
        const data = await listPaymentsForOrg(auth);
        setPayments(data);
      } catch (e) {
        console.error('Failed to load supplier payments', e);
        setPaymentsError('Не удалось загрузить платежи.');
      } finally {
        setPaymentsLoading(false);
      }
    };
    void load();
  }, [auth]);

  // Входящие платежи (где текущая org — получатель)
  const incomingPayments = useMemo(
    () => payments.filter((p) => p.payeeOrgId === auth.org.id),
    [payments, auth.org.id],
  );

  const completedIncoming = useMemo(
    () => incomingPayments.filter((p) => p.status === 'completed'),
    [incomingPayments],
  );

  const pendingIncoming = useMemo(
    () => incomingPayments.filter((p) => p.status === 'pending'),
    [incomingPayments],
  );

  // Суммы по валютам
  const totalCompletedByCurrency = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const p of completedIncoming) {
      acc[p.currency] = (acc[p.currency] || 0) + p.amount;
    }
    return acc;
  }, [completedIncoming]);

  const totalPendingByCurrency = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const p of pendingIncoming) {
      acc[p.currency] = (acc[p.currency] || 0) + p.amount;
    }
    return acc;
  }, [pendingIncoming]);

  // Последние 5 входящих платежей
  const recentIncoming = useMemo(
    () =>
      incomingPayments
        .slice()
        .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
        .slice(0, 5),
    [incomingPayments],
  );

  // Удобная функция форматирования для разных валют
  const formatAmount = (amount: number, currency: Payment['currency']) => {
    if (currency === 'RUB') return fmt.rub(amount);
    if (currency === 'CNY') return fmt.cny(amount);
    // на всякий случай
    return `${fmt.num(amount, 2)} ${currency}`;
  };

  const rubWallet = wallets.find((w) => w.currency === 'RUB');
  const cnyWallet = wallets.find((w) => w.currency === 'CNY');

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-slate-900 text-xl font-bold">
            Финансы поставщика
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Поступления по сделкам и текущие балансы в SilkFlow.
          </div>
          {walletsLoading && (
            <div className="mt-1 text-xs text-blue-600">
              Загрузка кошельков…
            </div>
          )}
          {walletsError && (
            <div className="mt-1 text-xs text-orange-700">{walletsError}</div>
          )}
          {paymentsLoading && (
            <div className="mt-1 text-xs text-blue-600">
              Загрузка платежей…
            </div>
          )}
          {paymentsError && (
            <div className="mt-1 text-xs text-orange-700">{paymentsError}</div>
          )}
        </div>
        <Badge tone="green" icon={<Icon name="shield" className="w-4 h-4" />}>
          Escrow payouts
        </Badge>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Всего получено */}
        <div className="sf-card rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white grid place-items-center">
              <Icon name="wallet" className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-emerald-800 font-semibold">
                Всего получено (completed)
              </div>
              <div className="mt-1 text-lg font-extrabold text-emerald-900 sf-number">
                {Object.keys(totalCompletedByCurrency).length === 0
                  ? '0'
                  : Object.entries(totalCompletedByCurrency)
                      .map(([cur, sum]) => `${fmt.num(sum, 0)} ${cur}`)
                      .join(' • ')}
              </div>
            </div>
          </div>
        </div>

        {/* В ожидании из эскроу */}
        <div className="sf-card rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white grid place-items-center">
              <Icon name="shield" className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-blue-800 font-semibold">
                Ожидает выплаты (pending)
              </div>
              <div className="mt-1 text-lg font-extrabold text-blue-900 sf-number">
                {Object.keys(totalPendingByCurrency).length === 0
                  ? '0'
                  : Object.entries(totalPendingByCurrency)
                      .map(([cur, sum]) => `${fmt.num(sum, 0)} ${cur}`)
                      .join(' • ')}
              </div>
            </div>
          </div>
        </div>

        {/* Сделки с выплатами */}
        <div className="sf-card rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 grid place-items-center">
              <Icon name="deals" className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold">
                Сделки с выплатами
              </div>
              <div className="mt-1 text-lg font-extrabold text-slate-900 sf-number">
                {
                  new Set(
                    completedIncoming.map((p) => p.dealId),
                  ).size
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BALANCES */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-bold text-slate-900">Балансы</div>
          <div className="text-xs text-slate-500">
            Кошельки в разных валютах
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* RUB */}
          <div className="sf-card rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 grid place-items-center text-lg font-extrabold">
                  ₽
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    RUB (Рубли)
                  </div>
                  <div className="text-xs text-slate-500">
                    Баланс для выплат в России
                  </div>
                </div>
              </div>
              <Badge tone="green">Вкл.</Badge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="text-[11px] text-slate-500">
                  Доступно
                </div>
                <div className="mt-1 text-sm font-extrabold text-slate-900 sf-number">
                  {fmt.rub(rubWallet?.balance ?? 0)}
                </div>
              </div>
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-2">
                <div className="text-[11px] text-orange-700">
                  Заблокировано
                </div>
                <div className="mt-1 text-sm font-extrabold text-orange-900 sf-number">
                  {fmt.rub(rubWallet?.blockedAmount ?? 0)}
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-2">
                <div className="text-[11px] text-blue-700">
                  Всего
                </div>
                <div className="mt-1 text-sm font-extrabold text-blue-900 sf-number">
                  {fmt.rub(
                    (rubWallet?.balance ?? 0) +
                      (rubWallet?.blockedAmount ?? 0),
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CNY */}
          <div className="sf-card rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 grid place-items-center text-lg font-extrabold">
                  ¥
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    CNY (Юани)
                  </div>
                  <div className="text-xs text-slate-500">
                    Баланс для входящих платежей
                  </div>
                </div>
              </div>
              <Badge tone="green">Вкл.</Badge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="text-[11px] text-slate-500">
                  Доступно
                </div>
                <div className="mt-1 text-sm font-extrabold text-slate-900 sf-number">
                  {fmt.cny(cnyWallet?.balance ?? 0)}
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2">
                <div className="text-[11px] text-emerald-700">
                  Заблокировано
                </div>
                <div className="mt-1 text-sm font-extrabold text-emerald-900 sf-number">
                  {fmt.cny(cnyWallet?.blockedAmount ?? 0)}
                </div>
              </div>
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-2">
                <div className="text-[11px] text-teal-700">
                  Всего
                </div>
                <div className="mt-1 text-sm font-extrabold text-teal-900 sf-number">
                  {fmt.cny(
                    (cnyWallet?.balance ?? 0) +
                      (cnyWallet?.blockedAmount ?? 0),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT PAYMENTS */}
      <div className="sf-card rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-sm font-bold text-slate-900">
            Последние поступления
          </div>
          <div className="text-xs text-slate-500">
            Показано {recentIncoming.length} из {incomingPayments.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                  Дата
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                  Сумма
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                  Валюта
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                  Сделка
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                  Статус
                </th>
              </tr>
            </thead>
            <tbody>
              {recentIncoming.map((p, i) => (
                <tr
                  key={p.id}
                  className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                >
                  <td className="px-4 py-3 text-xs text-slate-600 sf-number">
                    {p.createdAt.slice(0, 10)}{' '}
                    {p.createdAt.slice(11, 16)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900 sf-number">
                    {formatAmount(p.amount, p.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ' +
                        (p.currency === 'RUB'
                          ? 'bg-blue-50 text-blue-800'
                          : 'bg-teal-50 text-teal-800')
                      }
                    >
                      {p.currency}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 sf-number">
                    {p.dealId.slice(0, 12)}…
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        p.status === 'completed'
                          ? 'green'
                          : p.status === 'pending'
                          ? 'blue'
                          : 'orange'
                      }
                      icon={
                        p.status === 'completed' ? (
                          <Icon name="check" className="w-4 h-4" />
                        ) : p.status === 'pending' ? (
                          <Icon name="clock" className="w-4 h-4" />
                        ) : undefined
                      }
                    >
                      {p.status === 'completed'
                        ? 'Выплачено'
                        : p.status === 'pending'
                        ? 'В ожидании'
                        : 'Ошибка'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {recentIncoming.length === 0 && !paymentsLoading && (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            Пока нет поступлений по сделкам.
          </div>
        )}

        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-500">
            Платежи формируются автоматически при выплате эскроу. Полная история
            будет доступна в разделе отчётов.
          </div>
        </div>
      </div>
    </div>
  );
};