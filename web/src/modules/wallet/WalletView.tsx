// src/modules/wallet/WalletView.tsx
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

// ===== Компонент подсказки =====
interface HelpTipProps {
  title: string;
  children: React.ReactNode;
}

const HelpTip: React.FC<HelpTipProps> = ({ title, children }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 grid place-items-center text-xs font-bold transition"
        aria-label="Help"
      >
        ?
      </button>
      {open && (
        <div className="absolute z-50 left-6 top-0 w-64 rounded-xl border border-slate-200 bg-white shadow-lg p-3 sf-fade-in">
          <div className="text-xs font-bold text-slate-900 mb-1">{title}</div>
          <div className="text-xs text-slate-600 leading-relaxed">{children}</div>
        </div>
      )}
    </div>
  );
};

// ===== Компонент шага workflow =====
interface WorkflowStepProps {
  step: number;
  title: string;
  description: string;
  status: 'done' | 'current' | 'upcoming';
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
}

const WorkflowStep: React.FC<WorkflowStepProps> = ({
  step,
  title,
  description,
  status,
  action,
}) => {
  return (
    <div
      className={
        'flex items-start gap-3 p-3 rounded-xl border transition ' +
        (status === 'done'
          ? 'border-emerald-200 bg-emerald-50'
          : status === 'current'
          ? 'border-blue-200 bg-blue-50 ring-2 ring-blue-100'
          : 'border-slate-200 bg-slate-50 opacity-60')
      }
    >
      <div
        className={
          'w-8 h-8 rounded-full grid place-items-center text-sm font-bold shrink-0 ' +
          (status === 'done'
            ? 'bg-emerald-600 text-white'
            : status === 'current'
            ? 'bg-blue-600 text-white'
            : 'bg-slate-300 text-slate-600')
        }
      >
        {status === 'done' ? <Icon name="check" className="w-4 h-4" /> : step}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={
            'text-sm font-semibold ' +
            (status === 'done'
              ? 'text-emerald-900'
              : status === 'current'
              ? 'text-blue-900'
              : 'text-slate-600')
          }
        >
          {title}
        </div>
        <div
          className={
            'mt-0.5 text-xs ' +
            (status === 'done'
              ? 'text-emerald-700'
              : status === 'current'
              ? 'text-blue-700'
              : 'text-slate-500')
          }
        >
          {description}
        </div>
        {action && status === 'current' && (
          <button
            onClick={action.onClick}
            disabled={action.disabled}
            className={
              'mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ' +
              (action.disabled
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700')
            }
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
};

// ===== Основной компонент =====
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
  const [helpOpen, setHelpOpen] = useState(false);

  // Demo-дополнения к реальным балансам
  const [rubDemoDelta, setRubDemoDelta] = useState<number>(0);
  const [cnyDemoDelta, setCnyDemoDelta] = useState<number>(0);

  // Определяем состояние escrow
  const hasActiveEscrow =
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

  // Балансы из бэкенда + демо-дельты
  const rubWallet = wallets.find((w) => w.currency === 'RUB');
  const cnyWallet = wallets.find((w) => w.currency === 'CNY');

  const rubAvailable = (rubWallet?.balance ?? 0) + rubDemoDelta;
  const rubBlocked = rubWallet?.blockedAmount ?? 0;
  const rubTotal = rubAvailable + rubBlocked;

  const cnyAvailable = (cnyWallet?.balance ?? 0) + cnyDemoDelta;
  const cnyBlocked = cnyWallet?.blockedAmount ?? 0;
  const cnyTotal = cnyAvailable + cnyBlocked;

  // Определяем текущий шаг workflow
  const getWorkflowStatus = (
    step: number,
  ): 'done' | 'current' | 'upcoming' => {
    const hasFunds = rubAvailable > 0 || cnyAvailable > 0;
    const hasEscrow = hasActiveEscrow;
    const isReleased = deal.payment.status === 'Funds Released';

    if (step === 1) return hasFunds ? 'done' : 'current';
    if (step === 2) return hasEscrow ? 'done' : hasFunds ? 'current' : 'upcoming';
    if (step === 3) return isReleased ? 'done' : hasEscrow ? 'current' : 'upcoming';
    return 'upcoming';
  };

  // Последние транзакции
  const recentActivity = payments
    .slice()
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      date: p.createdAt.slice(0, 10),
      time: p.createdAt.slice(11, 16),
      type:
        p.status === 'completed'
          ? 'Escrow Released'
          : p.status === 'pending'
          ? 'Escrow Deposit'
          : 'Failed',
      amount: p.amount,
      currency: p.currency,
      dealId: p.dealId.slice(0, 8),
      status: p.status,
    }));

  // Handlers
  const confirmTopUp = () => {
    setTopUpOpen(false);
    setRubDemoDelta((prev) => prev + topUpAmount);
    addToast({
      tone: 'success',
      title: 'Баланс пополнен',
      message: `+${fmt.rub(topUpAmount)} добавлено на счёт RUB (демо).`,
    });
  };

  const confirmConvert = () => {
    if (convertAmount > rubAvailable) {
      addToast({
        tone: 'warn',
        title: 'Недостаточно средств',
        message: 'Сначала пополните баланс RUB.',
      });
      return;
    }
    const toCNY = convertAmount / fxRate;
    setConvertOpen(false);
    setRubDemoDelta((prev) => prev - convertAmount);
    setCnyDemoDelta((prev) => prev + toCNY);
    addToast({
      tone: 'success',
      title: 'Конвертация выполнена',
      message: `${fmt.rub(convertAmount)} → ${fmt.cny(toCNY)} по курсу ${fmt.num(fxRate, 2)} (демо).`,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-slate-900 text-xl font-bold">Кошелёк</div>
            <HelpTip title="Что такое Кошелёк?">
              Здесь вы управляете балансами в рублях и юанях, пополняете счёт,
              конвертируете валюту и отслеживаете все платежи по сделкам.
              Средства в эскроу защищены до подтверждения доставки.
            </HelpTip>
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Управление балансами, эскроу и конвертация валют
          </div>
          {(walletsLoading || paymentsLoading) && (
            <div className="mt-1 text-xs text-blue-600">
              Загрузка данных с сервера…
            </div>
          )}
          {(walletsError || paymentsError) && (
            <div className="mt-1 text-xs text-orange-700">
              {walletsError || paymentsError}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHelpOpen(true)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <Icon name="spark" className="w-4 h-4" />
            Как это работает?
          </button>
          <button
            onClick={() => setTopUpOpen(true)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Пополнить RUB
          </button>
          <button
            onClick={() => setConvertOpen(true)}
            className="rounded-xl bg-[var(--sf-teal-600)] text-white px-4 py-2 text-sm font-semibold hover:brightness-95"
          >
            Конвертировать RUB→CNY
          </button>
        </div>
      </div>

      {/* ===== WORKFLOW GUIDE ===== */}
      <div className="sf-card rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold text-slate-900">
              Порядок действий
            </div>
            <HelpTip title="Зачем нужен этот блок?">
              Этот блок показывает на каком этапе вы находитесь и какие шаги
              нужно выполнить для успешного завершения сделки.
            </HelpTip>
          </div>
          <Badge
            tone={getWorkflowStatus(3) === 'done' ? 'green' : 'blue'}
            icon={
              getWorkflowStatus(3) === 'done' ? (
                <Icon name="check" className="w-4 h-4" />
              ) : (
                <Icon name="clock" className="w-4 h-4" />
              )
            }
          >
            {getWorkflowStatus(3) === 'done' ? 'Завершено' : 'В процессе'}
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <WorkflowStep
            step={1}
            title="Пополните баланс"
            description="Добавьте рубли на счёт для оплаты сделок"
            status={getWorkflowStatus(1)}
            action={{
              label: 'Пополнить',
              onClick: () => setTopUpOpen(true),
              disabled: rubAvailable > 100000,
            }}
          />
          <WorkflowStep
            step={2}
            title="Внесите в эскроу"
            description="Заблокируйте средства для защиты сделки"
            status={getWorkflowStatus(2)}
          />
          <WorkflowStep
            step={3}
            title="Получите товар"
            description="После доставки средства уйдут поставщику"
            status={getWorkflowStatus(3)}
          />
        </div>
      </div>

      {/* ===== BALANCES ===== */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="text-sm font-bold text-slate-900">Балансы</div>
          <HelpTip title="Как работают балансы?">
            <strong>Доступно</strong> — средства, которые можно использовать для
            новых сделок или конвертации.
            <br />
            <strong>Заблокировано</strong> — средства в эскроу, защищённые до
            подтверждения доставки.
          </HelpTip>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* RUB Card */}
          <div className="sf-card rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 grid place-items-center text-lg font-extrabold">
                  ₽
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Российский рубль
                  </div>
                  <div className="text-xs text-slate-500">Основной счёт</div>
                </div>
              </div>
              <Badge tone="green" icon={<Icon name="shield" className="w-4 h-4" />}>
                Верифицирован
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-1">
                  <div className="text-xs font-semibold text-slate-600">
                    Доступно
                  </div>
                  <HelpTip title="Доступный баланс">
                    Средства, которые можно использовать для новых платежей или
                    конвертации в CNY.
                  </HelpTip>
                </div>
                <div className="mt-1 text-lg font-extrabold text-slate-900 sf-number">
                  {fmt.rub(rubAvailable)}
                </div>
              </div>
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                <div className="flex items-center gap-1">
                  <div className="text-xs font-semibold text-orange-700">
                    В эскроу
                  </div>
                  <HelpTip title="Средства в эскроу">
                    Заблокированы до подтверждения доставки. После подтверждения
                    автоматически переводятся поставщику.
                  </HelpTip>
                </div>
                <div className="mt-1 text-lg font-extrabold text-orange-900 sf-number">
                  {fmt.rub(rubBlocked)}
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <div className="text-xs font-semibold text-blue-700">Всего</div>
                <div className="mt-1 text-lg font-extrabold text-blue-900 sf-number">
                  {fmt.rub(rubTotal)}
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setTopUpOpen(true)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Пополнить
              </button>
              <button
                onClick={() => setConvertOpen(true)}
                className="flex-1 rounded-xl bg-blue-600 text-white px-3 py-2 text-sm font-semibold hover:bg-blue-700"
              >
                Конвертировать в CNY
              </button>
            </div>
          </div>

          {/* CNY Card */}
          <div className="sf-card rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 grid place-items-center text-lg font-extrabold">
                  ¥
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Китайский юань
                  </div>
                  <div className="text-xs text-slate-500">Торговый счёт</div>
                </div>
              </div>
              <Badge tone="green" icon={<Icon name="shield" className="w-4 h-4" />}>
                Верифицирован
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-600">Доступно</div>
                <div className="mt-1 text-lg font-extrabold text-slate-900 sf-number">
                  {fmt.cny(cnyAvailable)}
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-xs font-semibold text-emerald-700">
                  В эскроу
                </div>
                <div className="mt-1 text-lg font-extrabold text-emerald-900 sf-number">
                  {fmt.cny(cnyBlocked)}
                </div>
              </div>
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-3">
                <div className="text-xs font-semibold text-teal-700">Всего</div>
                <div className="mt-1 text-lg font-extrabold text-teal-900 sf-number">
                  {fmt.cny(cnyTotal)}
                </div>
              </div>
            </div>

            {/* FX Rate Info */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold text-slate-600">
                    Текущий курс
                  </div>
                  <HelpTip title="Курс обмена">
                    {deal.fx.locked
                      ? 'Курс зафиксирован для вашей сделки и не изменится.'
                      : 'Живой курс обновляется каждые несколько секунд. Зафиксируйте его в разделе сделки.'}
                  </HelpTip>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 sf-number">
                    1 CNY = {fmt.num(fxRate, 2)} RUB
                  </span>
                  <Badge
                    tone={deal.fx.locked ? 'green' : 'gray'}
                    icon={
                      deal.fx.locked ? (
                        <Icon name="check" className="w-4 h-4" />
                      ) : undefined
                    }
                  >
                    {deal.fx.locked ? 'Зафиксирован' : 'Живой'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== ESCROW STATUS ===== */}
      <div className="sf-card rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold text-slate-900">Статус эскроу</div>
            <HelpTip title="Что такое эскроу?">
              Эскроу — это защищённый счёт, на котором хранятся ваши деньги до
              подтверждения доставки товара. Поставщик получит оплату только после
              того, как вы подтвердите получение.
            </HelpTip>
          </div>
          <Badge
            tone={
              deal.payment.status === 'Funds Released'
                ? 'green'
                : hasActiveEscrow
                ? 'blue'
                : 'gray'
            }
            icon={
              deal.payment.status === 'Funds Released' ? (
                <Icon name="check" className="w-4 h-4" />
              ) : hasActiveEscrow ? (
                <Icon name="shield" className="w-4 h-4" />
              ) : undefined
            }
          >
            {deal.payment.status === 'Funds Released'
              ? 'Средства выплачены'
              : hasActiveEscrow
              ? 'Средства защищены'
              : 'Нет активных'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">
              Активных сделок
            </div>
            <div className="mt-1 text-lg font-extrabold text-slate-900 sf-number">
              {hasActiveEscrow ? 1 : 0}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">
              Всего в эскроу
            </div>
            <div className="mt-1 text-lg font-extrabold text-slate-900 sf-number">
              {fmt.rub(escrowAmountRUB)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">
              Ожидает выплаты
            </div>
            <div className="mt-1 text-lg font-extrabold text-slate-900 sf-number">
              {hasActiveEscrow && deal.payment.status !== 'Funds Released'
                ? fmt.rub(escrowAmountRUB)
                : fmt.rub(0)}
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="text-xs font-semibold text-emerald-700">Споров</div>
            <div className="mt-1 text-lg font-extrabold text-emerald-900 sf-number">
              0
            </div>
          </div>
        </div>

        {!hasActiveEscrow && (
          <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-start gap-2">
              <div className="text-blue-700 mt-0.5">
                <Icon name="spark" className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-blue-900">
                  Как создать эскроу?
                </div>
                <div className="mt-0.5 text-xs text-blue-800">
                  Перейдите во вкладку «Сделка», настройте условия и нажмите
                  «Депозит в эскроу». Средства будут защищены до доставки.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== RECENT ACTIVITY ===== */}
      <div className="sf-card rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-sm font-bold text-slate-900">
                Последние операции
              </div>
              <HelpTip title="История операций">
                Здесь отображаются все платежи: депозиты в эскроу, выплаты
                поставщикам и конвертации валют.
              </HelpTip>
            </div>
            <div className="text-xs text-slate-500">
              Показано последних: {recentActivity.length}
            </div>
          </div>
        </div>

        {recentActivity.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                    Дата
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                    Тип операции
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">
                    Сумма
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
                {recentActivity.map((item, i) => (
                  <tr
                    key={item.id}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                  >
                    <td className="px-4 py-3">
                      <div className="text-slate-900 sf-number">{item.date}</div>
                      <div className="text-xs text-slate-500 sf-number">
                        {item.time}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={
                            'w-8 h-8 rounded-lg grid place-items-center ' +
                            (item.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : item.status === 'pending'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-red-50 text-red-700')
                          }
                        >
                          <Icon
                            name={
                              item.status === 'completed'
                                ? 'check'
                                : item.status === 'pending'
                                ? 'clock'
                                : 'alert'
                            }
                            className="w-4 h-4"
                          />
                        </div>
                        <span className="font-medium text-slate-900">
                          {item.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          'font-semibold sf-number ' +
                          (item.status === 'completed'
                            ? 'text-emerald-700'
                            : 'text-slate-900')
                        }
                      >
                        {item.currency === 'RUB'
                          ? fmt.rub(item.amount)
                          : fmt.cny(item.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-600 sf-number">
                        {item.dealId}…
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          item.status === 'completed'
                            ? 'green'
                            : item.status === 'pending'
                            ? 'blue'
                            : 'orange'
                        }
                        icon={
                          item.status === 'completed' ? (
                            <Icon name="check" className="w-4 h-4" />
                          ) : item.status === 'pending' ? (
                            <Icon name="clock" className="w-4 h-4" />
                          ) : undefined
                        }
                      >
                        {item.status === 'completed'
                          ? 'Выполнено'
                          : item.status === 'pending'
                          ? 'В обработке'
                          : 'Ошибка'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 grid place-items-center mb-3">
              <Icon name="wallet" className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-700">
              Операций пока нет
            </div>
            <div className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Когда вы создадите первую сделку и внесёте депозит в эскроу, операции
              появятся здесь.
            </div>
            <button
              onClick={() => setTopUpOpen(true)}
              className="mt-4 rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
            >
              Пополнить баланс
            </button>
          </div>
        )}

        {recentActivity.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Полная история доступна в разделе «Документы»
              </div>
              <button
                onClick={() =>
                  addToast({
                    tone: 'info',
                    title: 'Экспорт',
                    message:
                      'В продакшене здесь будет выгрузка истории в Excel/PDF.',
                  })
                }
                className="text-xs font-semibold text-blue-700 hover:text-blue-900"
              >
                Экспортировать →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== TOP UP MODAL ===== */}
      {topUpOpen && (
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
                Пополнение баланса RUB
              </div>
              <div className="mt-0.5 text-xs text-slate-600">
                Добавьте средства на ваш счёт в SilkFlow
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Сумма пополнения
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step={10_000}
                    value={topUpAmount}
                    onChange={(e) =>
                      setTopUpAmount(
                        clamp(Number(e.target.value || 0), 0, 10_000_000),
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white pl-4 pr-12 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 sf-number"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
                    ₽
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                {[100_000, 250_000, 500_000, 1_000_000].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setTopUpAmount(preset)}
                    className={
                      'flex-1 rounded-lg py-2 text-xs font-semibold transition ' +
                      (topUpAmount === preset
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
                    }
                  >
                    {fmt.rub(preset)}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-blue-900">
                    Баланс после пополнения
                  </div>
                  <div className="text-lg font-extrabold text-blue-950 sf-number">
                    {fmt.rub(rubAvailable + topUpAmount)}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start gap-2">
                  <div className="text-slate-500 mt-0.5">
                    <Icon name="spark" className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-slate-600">
                    <strong>Демо-режим:</strong> средства добавляются только на
                    фронтенде. В продакшене здесь будет интеграция с банком.
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setTopUpOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                onClick={confirmTopUp}
                className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
              >
                Пополнить {fmt.rub(topUpAmount)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CONVERT MODAL ===== */}
      {convertOpen && (
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
                Конвертация RUB → CNY
              </div>
              <div className="mt-0.5 text-xs text-slate-600">
                Обменяйте рубли на юани по текущему курсу
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Сумма в рублях
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step={10_000}
                    value={convertAmount}
                    onChange={(e) =>
                      setConvertAmount(
                        clamp(Number(e.target.value || 0), 0, rubAvailable),
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white pl-4 pr-12 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 sf-number"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
                    ₽
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Доступно: {fmt.rub(rubAvailable)}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-slate-600">
                    Курс обмена
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 sf-number">
                      1 CNY = {fmt.num(fxRate, 2)} RUB
                    </span>
                    <Badge tone={deal.fx.locked ? 'green' : 'gray'}>
                      {deal.fx.locked ? 'Зафиксирован' : 'Живой'}
                    </Badge>
                  </div>
                </div>
                <div className="h-px bg-slate-200 my-2" />
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-600">
                    Комиссия
                  </div>
                  <span className="text-sm font-semibold text-emerald-700">
                    0% (демо)
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                <div className="text-xs font-semibold text-teal-900 mb-1">
                  Вы получите
                </div>
                <div className="text-2xl font-extrabold text-teal-950 sf-number">
                  {fmt.cny(convertAmount / fxRate)}
                </div>
              </div>

              {convertAmount > rubAvailable && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                  <div className="flex items-start gap-2">
                    <div className="text-orange-700 mt-0.5">
                      <Icon name="alert" className="w-4 h-4" />
                    </div>
                    <div className="text-xs text-orange-800">
                      Недостаточно средств. Сначала пополните баланс RUB.
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setConvertOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                onClick={confirmConvert}
                disabled={convertAmount > rubAvailable || convertAmount <= 0}
                className={
                  'rounded-xl px-4 py-2 text-sm font-semibold transition ' +
                  (convertAmount > rubAvailable || convertAmount <= 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-teal-600 text-white hover:bg-teal-700')
                }
              >
                Конвертировать
              </button>
            </div>
          </div>
        </div>
      )}

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
                  Как работает Кошелёк?
                </div>
                <div className="text-xs text-slate-600">
                  Пошаговое руководство по управлению финансами
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
                    Пополните баланс RUB
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    Переведите рубли на ваш счёт в SilkFlow. В демо-режиме это
                    делается кнопкой «Пополнить».
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white grid place-items-center text-sm font-bold shrink-0">
                  2
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Конвертируйте в CNY (опционально)
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    Если сделка в юанях — конвертируйте рубли по текущему курсу.
                    Курс можно зафиксировать в разделе сделки.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white grid place-items-center text-sm font-bold shrink-0">
                  3
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Внесите депозит в эскроу
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    В разделе «Сделка» нажмите «Депозит в эскроу». Средства
                    заблокируются до подтверждения доставки.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white grid place-items-center text-sm font-bold shrink-0">
                  4
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Подтвердите получение товара
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    После доставки перейдите в «Логистика» и подтвердите
                    получение. Средства автоматически переведутся поставщику.
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-start gap-2">
                  <div className="text-blue-700 mt-0.5">
                    <Icon name="shield" className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-blue-800">
                    <strong>Защита покупателя:</strong> пока вы не подтвердите
                    получение, поставщик не получит деньги. Если возникнет спор —
                    средства останутся на эскроу до разрешения.
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