import React, { useState } from 'react';
import type { DealState } from '../../state/dealTypes';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icon';
import { fmt } from '../../components/lib/format';
import { clamp } from '../../components/lib/clamp';
import type { Toast } from '../../components/common/ToastStack';
import type { Wallet } from '../../api/wallets';
import type { Payment } from '../../api/payments';


interface WalletViewProps {
  deal: DealState;
  addToast: (t: Omit<Toast, 'id'>) => void;

  wallets: Wallet[];
  walletsLoading?: boolean;
  walletsError?: string | null;

  payments: Payment[];
  paymentsLoading?: boolean;
  paymentsError?: string | null;
}

export const WalletView: React.FC<WalletViewProps> = ({ 
  deal,
  addToast,
  wallets,
  walletsLoading,
  walletsError,
  payments,
  paymentsLoading,
  paymentsError,
}) => {
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(500_000);
  const [convertAmount, setConvertAmount] = useState<number>(100_000);

  const escrowFunded =
    deal.payment.status === 'Escrow Funded' ||
    deal.payment.status === 'Funds Released' ||
    payments.some((p) => p.status === 'pending');

  const escrowAmountRUB =
    deal.payment.escrowAmountRUB ||
    payments
      .filter((p) => p.currency === 'RUB' && p.status !== 'failed')
      .reduce((sum, p) => sum + p.amount, 0);
  const fxRate =
    deal.fx.locked && deal.fx.lockedRate ? deal.fx.lockedRate : deal.fx.rateLive;
  const escrowAmountCNY = escrowFunded
    ? Math.round(escrowAmountRUB / fxRate)
    : 0;

  // Вычисляем реальные кошельки
  const rubWallet = wallets.find((w) => w.currency === 'RUB');
  const cnyWallet = wallets.find((w) => w.currency === 'CNY');

  const rubAvailable = rubWallet?.balance ?? 0;
  const rubReserved = rubWallet?.blockedAmount ?? 0; 
  const rubTotal = rubAvailable + rubReserved;

  const cnyAvailable = cnyWallet?.balance ?? 0;
  const cnyInEscrow = cnyWallet?.blockedAmount ?? escrowAmountCNY;
  const cnyTotal = cnyAvailable + cnyInEscrow;

  const activity = payments
    .slice() // копия
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
    .slice(0, 5)
    .map((p) => ({
      date: p.createdAt.slice(0, 10),
      type: p.status === 'completed' ? 'Escrow release' : 'Escrow funding',
      amount: p.amount,
      currency: p.currency,
      deal: p.dealId,
      status: p.status === 'completed' ? 'Completed' : 'Pending',
    })
  );

  const confirmTopUp = () => {
    setTopUpOpen(false);
    addToast({
      tone: 'success',
      title: 'Balance updated',
      message: `+${fmt.rub(topUpAmount)} added to RUB balance.`,
    });
  };

  const confirmConvert = () => {
    const toCNY = convertAmount / fxRate;
    setConvertOpen(false);
    addToast({
      tone: 'success',
      title: 'Conversion completed',
      message: `${fmt.rub(convertAmount)} → ${fmt.cny(toCNY)} at rate ${fmt.num(
        fxRate,
        2,
      )}`,
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-slate-900 text-xl font-bold">Wallet</div>
          <div className="mt-1 text-sm text-slate-600">
            Manage balances, escrow, and currency conversions in one place.
          </div>
          {walletsLoading ? (
            <div className="mt-1 text-xs text-blue-600">
              Loading wallet balances from backend…
            </div>
          ) : walletsError ? (
            <div className="mt-1 text-xs text-orange-700">
              {walletsError}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTopUpOpen(true)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Top up RUB
          </button>
          <button
            onClick={() => setConvertOpen(true)}
            className="rounded-xl bg-[var(--sf-teal-600)] text-white px-4 py-2 text-sm font-semibold hover:brightness-95"
          >
            Convert RUB→CNY
          </button>
        </div>
      </div>

      {/* Balances */}
      <div className="mt-5">
        <div className="text-sm font-bold text-slate-900 mb-3">Balances</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* RUB */}
          <div className="sf-card rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 grid place-items-center text-lg font-extrabold">
                  ₽
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Russian Ruble (RUB)
                  </div>
                  <div className="text-xs text-slate-500">Primary account</div>
                </div>
              </div>
              <Badge tone="green" icon={<Icon name="check" className="w-4 h-4" />}>
                Verified
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-600">Available</div>
                <div className="mt-1 text-lg font-extrabold text-slate-900 sf-number">
                  {fmt.rub(rubAvailable)}
                </div>
              </div>
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                <div className="text-xs font-semibold text-orange-700">
                  Reserved (Duties)
                </div>
                <div className="mt-1 text-lg font-extrabold text-orange-900 sf-number">
                  {fmt.rub(rubReserved)}
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <div className="text-xs font-semibold text-blue-700">Total</div>
                <div className="mt-1 text-lg font-extrabold text-blue-900 sf-number">
                  {fmt.rub(rubTotal)}
                </div>
              </div>
            </div>
          </div>

          {/* CNY */}
          <div className="sf-card rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 grid place-items-center text-lg font-extrabold">
                  ¥
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Chinese Yuan (CNY)
                  </div>
                  <div className="text-xs text-slate-500">Trade account</div>
                </div>
              </div>
              <Badge tone="green" icon={<Icon name="check" className="w-4 h-4" />}>
                Verified
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-600">Available</div>
                <div className="mt-1 text-lg font-extrabold text-slate-900 sf-number">
                  {fmt.cny(cnyAvailable)}
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-xs font-semibold text-emerald-700">
                  In Escrow
                </div>
                <div className="mt-1 text-lg font-extrabold text-emerald-900 sf-number">
                  {fmt.cny(cnyInEscrow)}
                </div>
              </div>
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-3">
                <div className="text-xs font-semibold text-teal-700">Total</div>
                <div className="mt-1 text-lg font-extrabold text-teal-900 sf-number">
                  {fmt.cny(cnyTotal)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Escrow Summary */}
      <div className="mt-5 sf-card rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-slate-900">Escrow Summary</div>
            <div className="mt-0.5 text-xs text-slate-600">
              Funds held securely until delivery confirmation.
            </div>
          </div>
          <Badge
            tone={escrowFunded ? 'green' : 'orange'}
            icon={
              escrowFunded ? (
                <Icon name="check" className="w-4 h-4" />
              ) : (
                <Icon name="clock" className="w-4 h-4" />
              )
            }
          >
            {escrowFunded ? 'Funded' : 'Not Funded'}
          </Badge>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">Active Deals</div>
            <div className="mt-1 text-lg font-extrabold text-slate-900 sf-number">1</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">
              Total in Escrow (RUB)
            </div>
            <div className="mt-1 text-lg font-extrabold text-slate-900 sf-number">
              {fmt.rub(escrowFunded ? escrowAmountRUB : 0)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">
              Pending Release
            </div>
            <div className="mt-1 text-lg font-extrabold text-slate-900 sf-number">
              {escrowFunded && deal.payment.status !== 'Funds Released'
                ? fmt.rub(escrowAmountRUB)
                : fmt.rub(0)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">Disputes</div>
            <div className="mt-1 text-lg font-extrabold text-emerald-700 sf-number">
              0
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-5 sf-card rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="text-sm font-bold text-slate-900">Recent Activity</div>
          <div className="mt-0.5 text-xs text-slate-600">
            Last 5 transactions across all accounts.
          </div>
          {paymentsLoading ? (
            <div className="mt-0.5 text-xs text-blue-600">
              Loading payments from backend…
            </div>
          ) : paymentsError ? (
            <div className="mt-0.5 text-xs text-orange-700">
              {paymentsError}
            </div>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                  Type
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">
                  Amount
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                  Currency
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                  Related Deal
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {activity.map((a, i) => (
                <tr
                  key={`${a.date}-${a.type}-${i}`}
                  className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                >
                  <td className="px-4 py-3 text-slate-700 sf-number">{a.date}</td>
                  <td className="px-4 py-3 text-slate-900 font-medium">{a.type}</td>
                  <td className="px-4 py-3 text-right text-slate-900 font-semibold sf-number">
                    {a.currency === 'RUB'
                      ? fmt.rub(a.amount)
                      : fmt.cny(a.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ' +
                        (a.currency === 'RUB'
                          ? 'bg-blue-50 text-blue-800'
                          : 'bg-teal-50 text-teal-800')
                      }
                    >
                      {a.currency}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 sf-number">{a.deal}</td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={a.status === 'Completed' ? 'green' : 'orange'}
                      icon={
                        a.status === 'Completed' ? (
                          <Icon name="check" className="w-4 h-4" />
                        ) : (
                          <Icon name="clock" className="w-4 h-4" />
                        )
                      }
                    >
                      {a.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-500">
            Showing last 5 transactions. Full history available in Documents.
          </div>
        </div>
      </div>

      {/* Top Up Modal */}
      {topUpOpen ? (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 grid place-items-center p-4"
          onClick={() => setTopUpOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 sf-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="text-base font-bold text-slate-900">
                Top up RUB Balance
              </div>
              <div className="mt-0.5 text-xs text-slate-600">
                Add funds to your SilkFlow wallet.
              </div>
            </div>
            <div className="p-5 space-y-4">
              <label className="block">
                <div className="text-sm font-semibold text-slate-700">
                  Amount (RUB)
                </div>
                <input
                  type="number"
                  step={10_000}
                  value={topUpAmount}
                  onChange={(e) =>
                    setTopUpAmount(
                      clamp(Number(e.target.value || 0), 0, 10_000_000),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 sf-number"
                />
              </label>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <div className="text-xs font-semibold text-blue-900">
                  New balance after top up
                </div>
                <div className="mt-1 text-lg font-extrabold text-blue-950 sf-number">
                  {fmt.rub(rubAvailable + topUpAmount)}
                </div>
              </div>
              <div className="text-xs text-slate-500">
                In production, this would connect to your bank account via secure transfer.
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setTopUpOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmTopUp}
                className="rounded-xl bg-[var(--sf-blue-900)] text-white px-4 py-2 text-sm font-semibold hover:bg-[var(--sf-blue-800)]"
              >
                Confirm Top Up
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Convert Modal */}
      {convertOpen ? (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 grid place-items-center p-4"
          onClick={() => setConvertOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 sf-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="text-base font-bold text-slate-900">
                Convert RUB → CNY
              </div>
              <div className="mt-0.5 text-xs text-slate-600">
                Exchange rubles to yuan at current rate.
              </div>
            </div>
            <div className="p-5 space-y-4">
              <label className="block">
                <div className="text-sm font-semibold text-slate-700">
                  From (RUB)
                </div>
                <input
                  type="number"
                  step={10_000}
                  value={convertAmount}
                  onChange={(e) =>
                    setConvertAmount(
                      clamp(Number(e.target.value || 0), 0, rubAvailable),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 sf-number"
                />
              </label>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-slate-600">
                    Exchange Rate
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 sf-number">
                      1 CNY = {fmt.num(fxRate, 2)} RUB
                    </span>
                    {deal.fx.locked ? (
                      <Badge
                        tone="green"
                        icon={<Icon name="check" className="w-4 h-4" />}
                      >
                        Locked
                      </Badge>
                    ) : (
                      <Badge tone="gray">Live</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-3">
                <div className="text-xs font-semibold text-teal-900">
                  You will receive (CNY)
                </div>
                <div className="mt-1 text-lg font-extrabold text-teal-950 sf-number">
                  {fmt.cny(convertAmount / fxRate)}
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Conversion is instant. CNY will be credited to your trade account.
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setConvertOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmConvert}
                className="rounded-xl bg-[var(--sf-teal-600)] text-white px-4 py-2 text-sm font-semibold hover:brightness-95"
              >
                Confirm Conversion
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};