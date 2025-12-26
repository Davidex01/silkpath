// src/modules/logistics/LogisticsView.tsx
import React, { useEffect, useState } from 'react';
import type { DealState } from '../../state/dealTypes';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icon';
import { fmt } from '../../components/lib/format';
import type { Toast } from '../../components/common/ToastStack';
import type { AuthState } from '../../state/authTypes';
import { getDealLogistics, simulateDealDelivery } from '../../api/logistics';
import { releasePayment } from '../../api/payments';

interface LogisticsViewProps {
  deal: DealState;
  setDeal: React.Dispatch<React.SetStateAction<DealState>>;
  addToast: (t: Omit<Toast, 'id'>) => void;
  auth: AuthState;
  onFinanceUpdate?: () => void;
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
        <div className="absolute z-50 left-6 top-0 w-72 rounded-xl border border-slate-200 bg-white shadow-lg p-3 sf-fade-in">
          <div className="text-xs font-bold text-slate-900 mb-1">{title}</div>
          <div className="text-xs text-slate-600 leading-relaxed">{children}</div>
        </div>
      )}
    </div>
  );
};

// ===== Компонент шага логистики =====
interface LogisticsStepProps {
  step: number;
  title: string;
  description: string;
  status: 'done' | 'current' | 'upcoming';
  timestamp?: string;
  location?: string;
}

const LogisticsStep: React.FC<LogisticsStepProps> = ({
  step,
  title,
  description,
  status,
  timestamp,
  location,
}) => {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div
          className={
            'w-10 h-10 rounded-full grid place-items-center text-sm font-bold shrink-0 ring-4 ' +
            (status === 'done'
              ? 'bg-emerald-600 text-white ring-emerald-100'
              : status === 'current'
              ? 'bg-blue-600 text-white ring-blue-100 sf-animate-pulse-soft'
              : 'bg-slate-200 text-slate-500 ring-slate-100')
          }
        >
          {status === 'done' ? (
            <Icon name="check" className="w-5 h-5" />
          ) : (
            step
          )}
        </div>
        {step < 5 && (
          <div
            className={
              'w-0.5 h-12 mt-1 ' +
              (status === 'done' ? 'bg-emerald-300' : 'bg-slate-200')
            }
          />
        )}
      </div>
      <div className="flex-1 pb-4">
        <div
          className={
            'text-sm font-semibold ' +
            (status === 'done'
              ? 'text-emerald-900'
              : status === 'current'
              ? 'text-blue-900'
              : 'text-slate-500')
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
              : 'text-slate-400')
          }
        >
          {description}
        </div>
        {(timestamp || location) && status !== 'upcoming' && (
          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
            {timestamp && (
              <span className="flex items-center gap-1">
                <Icon name="clock" className="w-3 h-3" />
                {timestamp}
              </span>
            )}
            {location && (
              <span className="flex items-center gap-1">
                <Icon name="truck" className="w-3 h-3" />
                {location}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ===== Основной компонент =====
export const LogisticsView: React.FC<LogisticsViewProps> = ({
  deal,
  setDeal,
  addToast,
  auth,
  onFinanceUpdate,
}) => {
  const [videoOpen, setVideoOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [checkQty, setCheckQty] = useState(false);
  const [checkNoDamage, setCheckNoDamage] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);

  const [loadingLogistics, setLoadingLogistics] = useState(false);
  const [logisticsError, setLogisticsError] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);

  const delivered = deal.logistics.delivered;
  const fundsReleased = deal.payment.status === 'Funds Released';
  const escrowFunded =
    deal.payment.status === 'Escrow Funded' ||
    deal.payment.status === 'Funds Released';

  // Загрузка состояния логистики с бэкенда
  useEffect(() => {
    const load = async () => {
      if (!deal.backend?.dealId) return;

      try {
        setLoadingLogistics(true);
        setLogisticsError(null);
        const state = await getDealLogistics(auth, deal.backend.dealId);
        setDeal((prev) => ({
          ...prev,
          logistics: {
            current: state.current,
            delivered: state.delivered,
            deliveredAt: state.deliveredAt,
          },
        }));
      } catch (e) {
        console.error('Failed to load logistics', e);
        setLogisticsError('Не удалось загрузить статус логистики');
      } finally {
        setLoadingLogistics(false);
      }
    };

    void load();
  }, [auth, deal.backend?.dealId, setDeal]);

  // Симуляция доставки (для демо)
  const simulateDelivery = async () => {
    if (!deal.backend?.dealId) {
      addToast({
        tone: 'warn',
        title: 'Сделка не привязана',
        message: 'Сначала создайте сделку в разделе «Переговоры».',
      });
      return;
    }

    try {
      const state = await simulateDealDelivery(auth, deal.backend.dealId);
      setDeal((d) => ({
        ...d,
        logistics: {
          current: state.current,
          delivered: state.delivered,
          deliveredAt: state.deliveredAt,
        },
      }));
      addToast({
        tone: 'success',
        title: 'Доставка завершена',
        message: 'Теперь вы можете подтвердить получение и выпустить эскроу.',
      });
    } catch (e) {
      console.error('Failed to simulate delivery', e);
      addToast({
        tone: 'warn',
        title: 'Ошибка симуляции',
        message: 'Проверьте подключение к серверу.',
      });
    }
  };

  // Открыть модал подтверждения
  const openConfirmModal = () => {
    if (!delivered) {
      addToast({
        tone: 'warn',
        title: 'Доставка не завершена',
        message: 'Дождитесь доставки груза на склад.',
      });
      return;
    }
    setCheckQty(false);
    setCheckNoDamage(false);
    setConfirmOpen(true);
  };

  // Подтверждение получения и release escrow
  const confirmReceipt = async () => {
    if (!checkQty || !checkNoDamage) {
      addToast({
        tone: 'warn',
        title: 'Подтвердите оба пункта',
        message: 'Отметьте галочками, что товар получен корректно.',
      });
      return;
    }

    if (!deal.payment.backendPaymentId) {
      addToast({
        tone: 'warn',
        title: 'Нет платежа для выплаты',
        message: 'Эскроу-платёж не найден для этой сделки.',
      });
      return;
    }

    try {
      setReleasing(true);
      const releasedPayment = await releasePayment(auth, deal.payment.backendPaymentId);

      onFinanceUpdate?.();

      setConfirmOpen(false);
      setDeal((d) => ({
        ...d,
        payment: {
          ...d.payment,
          status: 'Funds Released',
          releaseScheduled: false,
          releasedAt: releasedPayment.completedAt ?? new Date().toISOString(),
        },
        stage: 'Shipped',
      }));

      addToast({
        tone: 'success',
        title: 'Получение подтверждено!',
        message: `Эскроу выплачен поставщику. ID: ${releasedPayment.id.slice(0, 8)}…`,
      });
    } catch (e) {
      console.error('Failed to release payment', e);
      addToast({
        tone: 'warn',
        title: 'Ошибка выплаты',
        message: 'Не удалось выпустить эскроу. Попробуйте позже.',
      });
    } finally {
      setReleasing(false);
    }
  };

  // Определение текущего шага
  const getStepStatus = (
    step: number,
  ): 'done' | 'current' | 'upcoming' => {
    if (!escrowFunded) return step === 1 ? 'current' : 'upcoming';
    
    const currentStep = fundsReleased
      ? 6
      : delivered
      ? 5
      : deal.logistics.current.includes('transit') ||
        deal.logistics.current.includes('Customs')
      ? 3
      : deal.logistics.current.includes('Production')
      ? 2
      : 2;

    if (step < currentStep) return 'done';
    if (step === currentStep) return 'current';
    return 'upcoming';
  };

  // Данные для шагов
  const steps = [
    {
      title: 'Эскроу оплачен',
      description: 'Средства заблокированы на защищённом счёте',
      timestamp: escrowFunded ? '2 дня назад' : undefined,
      location: 'SilkFlow Escrow',
    },
    {
      title: 'Производство завершено',
      description: 'Товар готов к отправке со склада поставщика',
      timestamp:
        getStepStatus(2) === 'done' || getStepStatus(2) === 'current'
          ? '1 день назад'
          : undefined,
      location: 'Shenzhen, China',
    },
    {
      title: 'В пути',
      description: 'Груз передан перевозчику, движется к границе',
      timestamp: getStepStatus(3) === 'done' ? '12 часов назад' : undefined,
      location: 'Rail LCL → Zabaikalsk',
    },
    {
      title: 'Таможенное оформление',
      description: 'Прохождение таможни на границе РФ',
      timestamp: getStepStatus(4) === 'done' ? '6 часов назад' : undefined,
      location: 'Zabaikalsk, Russia',
    },
    {
      title: 'Доставлено на склад',
      description: delivered
        ? 'Груз получен, ожидает проверки'
        : 'Последняя миля до вашего склада',
      timestamp: delivered ? 'Сегодня, 14:30' : undefined,
      location: delivered ? 'Moscow, Russia' : undefined,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-slate-900 text-xl font-bold">
              Логистика и исполнение
            </div>
            <HelpTip title="Что здесь происходит?">
              Здесь вы отслеживаете путь груза от поставщика до вашего склада.
              После получения подтвердите доставку — и средства из эскроу уйдут
              поставщику.
            </HelpTip>
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Отслеживание груза Китай → Россия с доказательствами и этапами
          </div>
          {loadingLogistics && (
            <div className="mt-1 text-xs text-blue-600">
              Загрузка статуса с сервера…
            </div>
          )}
          {logisticsError && (
            <div className="mt-1 text-xs text-orange-700">{logisticsError}</div>
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
          <Badge
            tone={delivered ? 'green' : escrowFunded ? 'blue' : 'gray'}
            icon={
              delivered ? (
                <Icon name="check" className="w-4 h-4" />
              ) : (
                <Icon name="truck" className="w-4 h-4" />
              )
            }
          >
            {delivered ? 'Доставлено' : escrowFunded ? 'В пути' : 'Ожидание оплаты'}
          </Badge>
          {fundsReleased && (
            <Badge tone="green" icon={<Icon name="check" className="w-4 h-4" />}>
              Эскроу выплачен
            </Badge>
          )}
        </div>
      </div>

      {/* ===== MAIN GRID ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ===== LEFT: MAP + ROUTE ===== */}
        <div className="xl:col-span-2 space-y-4">
          {/* Map Card */}
          <div className="sf-card rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold text-slate-900">
                    Карта маршрута
                  </div>
                  <HelpTip title="Маршрут доставки">
                    Визуальное отображение пути груза. Зелёные точки — пройденные
                    этапы, оранжевая — текущее местоположение.
                  </HelpTip>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Текущий статус</div>
                  <div className="text-sm font-bold text-slate-900">
                    {deal.logistics.current || 'Ожидание'}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-4 relative overflow-hidden">
                <div className="absolute inset-0 sf-grid-bg opacity-30" />
                
                <svg viewBox="0 0 900 280" className="w-full h-[220px] relative z-10">
                  <defs>
                    <linearGradient id="routeDone" x1="0" x2="1">
                      <stop offset="0" stopColor="#16A34A" />
                      <stop offset="1" stopColor="#16A34A" />
                    </linearGradient>
                    <linearGradient id="routeActive" x1="0" x2="1">
                      <stop offset="0" stopColor="#16A34A" />
                      <stop offset="0.5" stopColor="#3B82F6" />
                      <stop offset="1" stopColor="#94A3B8" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Region labels */}
                  <text x="120" y="40" fill="#64748b" fontSize="11" fontWeight="600">
                    CHINA
                  </text>
                  <text x="420" y="40" fill="#64748b" fontSize="11" fontWeight="600">
                    BORDER
                  </text>
                  <text x="700" y="40" fill={delivered ? '#166534' : '#64748b'} fontSize="11" fontWeight="600">
                    RUSSIA
                  </text>

                  {/* Route path */}
                  <path
                    d="M100 150 C 200 100, 280 180, 400 140 S 550 100, 700 150"
                    fill="none"
                    stroke={delivered ? 'url(#routeDone)' : 'url(#routeActive)'}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={delivered ? 'none' : '12 6'}
                  />

                  {/* Nodes */}
                  {/* Shenzhen */}
                  <circle cx="100" cy="150" r="16" fill="#16A34A" opacity="0.2" />
                  <circle cx="100" cy="150" r="10" fill="#16A34A" />
                  <text x="100" y="185" fill="#334155" fontSize="11" fontWeight="600" textAnchor="middle">
                    Shenzhen
                  </text>

                  {/* Border */}
                  <circle cx="400" cy="140" r="16" fill={getStepStatus(4) === 'done' ? '#16A34A' : '#3B82F6'} opacity="0.2" />
                  <circle cx="400" cy="140" r="10" fill={getStepStatus(4) === 'done' ? '#16A34A' : '#3B82F6'} />
                  <text x="400" y="175" fill="#334155" fontSize="11" fontWeight="600" textAnchor="middle">
                    Zabaikalsk
                  </text>

                  {/* Moscow */}
                  <circle
                    cx="700"
                    cy="150"
                    r="20"
                    fill={delivered ? '#16A34A' : '#94A3B8'}
                    opacity="0.2"
                    className={!delivered && escrowFunded ? 'sf-animate-pulse-soft' : ''}
                  />
                  <circle
                    cx="700"
                    cy="150"
                    r="12"
                    fill={delivered ? '#16A34A' : '#94A3B8'}
                  />
                  {delivered && (
                    <g transform="translate(692, 143)">
                      <path
                        d="M3 7l3 3 5-5"
                        stroke="white"
                        strokeWidth="2.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  )}
                  <text x="700" y="185" fill={delivered ? '#166534' : '#334155'} fontSize="11" fontWeight="700" textAnchor="middle">
                    Moscow {delivered ? '✓' : ''}
                  </text>

                  {/* Delivered banner */}
                  {delivered && (
                    <g filter="url(#glow)">
                      <rect x="620" y="60" width="160" height="36" rx="18" fill="#16A34A" />
                      <text x="700" y="84" fill="white" fontSize="13" fontWeight="700" textAnchor="middle">
                        ✓ ДОСТАВЛЕНО
                      </text>
                    </g>
                  )}

                  {/* Cargo icon (if in transit) */}
                  {!delivered && escrowFunded && (
                    <g transform="translate(380, 90)">
                      <rect x="0" y="0" width="40" height="24" rx="4" fill="#3B82F6" />
                      <text x="20" y="16" fill="white" fontSize="10" fontWeight="600" textAnchor="middle">
                        📦
                      </text>
                    </g>
                  )}
                </svg>

                {/* Route info cards */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-semibold text-slate-600">
                        Способ доставки
                      </div>
                      <HelpTip title="Rail LCL">
                        Less than Container Load — сборный груз по железной дороге.
                        Экономичный вариант для небольших партий.
                      </HelpTip>
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-900">
                      Rail LCL (ЖД сборный)
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {delivered ? 'Доставлено' : 'ETA: 9–12 дней'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-semibold text-slate-600">
                      Трекинг-номер
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-900 sf-number">
                      SF-RT-2941-77
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Обновляется каждые 6 часов
                    </div>
                  </div>
                  <div
                    className={
                      'rounded-xl border p-3 ' +
                      (fundsReleased
                        ? 'border-emerald-200 bg-emerald-50'
                        : escrowFunded
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-slate-200 bg-white')
                    }
                  >
                    <div
                      className={
                        'text-xs font-semibold ' +
                        (fundsReleased
                          ? 'text-emerald-700'
                          : escrowFunded
                          ? 'text-blue-700'
                          : 'text-slate-600')
                      }
                    >
                      Эскроу
                    </div>
                    <div
                      className={
                        'mt-1 text-sm font-bold ' +
                        (fundsReleased
                          ? 'text-emerald-900'
                          : escrowFunded
                          ? 'text-blue-900'
                          : 'text-slate-900')
                      }
                    >
                      {fundsReleased
                        ? 'Выплачен'
                        : escrowFunded
                        ? fmt.rub(deal.payment.escrowAmountRUB)
                        : 'Не оплачен'}
                    </div>
                    <div
                      className={
                        'mt-1 text-xs ' +
                        (fundsReleased
                          ? 'text-emerald-700'
                          : escrowFunded
                          ? 'text-blue-700'
                          : 'text-slate-500')
                      }
                    >
                      {fundsReleased
                        ? 'Переведён поставщику'
                        : escrowFunded
                        ? 'Защищён до подтверждения'
                        : 'Ожидает депозита'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Card */}
          {delivered && !fundsReleased && (
            <div className="sf-card rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white grid place-items-center shrink-0">
                  <Icon name="check" className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-emerald-900">
                    Груз доставлен! Подтвердите получение
                  </div>
                  <div className="mt-1 text-sm text-emerald-800">
                    Проверьте количество и состояние товара. После подтверждения
                    средства из эскроу будут переведены поставщику.
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={openConfirmModal}
                      className="rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-bold hover:bg-emerald-700 transition"
                    >
                      Подтвердить получение
                    </button>
                    <button
                      onClick={() => setDisputeOpen(true)}
                      className="rounded-xl border border-emerald-300 bg-white text-emerald-800 px-4 py-2.5 text-sm font-semibold hover:bg-emerald-100 transition"
                    >
                      Сообщить о проблеме
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Completed Card */}
          {fundsReleased && (
            <div className="sf-card rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white grid place-items-center shrink-0">
                  <Icon name="check" className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-emerald-900">
                    Сделка завершена успешно!
                  </div>
                  <div className="mt-1 text-sm text-emerald-800">
                    Товар получен, эскроу выплачен поставщику. Все документы
                    сохранены в разделе «Документы».
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-emerald-700">
                    <span className="flex items-center gap-1">
                      <Icon name="check" className="w-4 h-4" />
                      Доставка подтверждена
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="check" className="w-4 h-4" />
                      Эскроу выплачен
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="check" className="w-4 h-4" />
                      Документы архивированы
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Demo controls */}
          {!delivered && (
            <div className="sf-card rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="text-orange-600 mt-0.5">
                    <Icon name="spark" className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-orange-900">
                      Демо-режим
                    </div>
                    <div className="text-xs text-orange-800">
                      Нажмите кнопку справа, чтобы симулировать доставку груза и
                      протестировать процесс подтверждения.
                    </div>
                  </div>
                </div>
                <button
                  onClick={simulateDelivery}
                  disabled={!deal.backend?.dealId}
                  className={
                    'rounded-xl px-4 py-2 text-sm font-semibold transition shrink-0 ' +
                    (!deal.backend?.dealId
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-orange-600 text-white hover:bg-orange-700')
                  }
                >
                  Симулировать доставку
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ===== RIGHT: TIMELINE + PROOF ===== */}
        <div className="space-y-4">
          {/* Timeline */}
          <div className="sf-card rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold text-slate-900">
                  Этапы доставки
                </div>
                <HelpTip title="Отслеживание этапов">
                  Каждый этап обновляется автоматически на основе данных от
                  перевозчика и таможни.
                </HelpTip>
              </div>
              <Badge
                tone={fundsReleased ? 'green' : delivered ? 'blue' : 'gray'}
              >
                {fundsReleased
                  ? 'Завершено'
                  : delivered
                  ? '5/5 этапов'
                  : `${Math.max(1, steps.filter((_, i) => getStepStatus(i + 1) === 'done').length)}/5 этапов`}
              </Badge>
            </div>

            <div className="space-y-0">
              {steps.map((step, i) => (
                <LogisticsStep
                  key={i}
                  step={i + 1}
                  title={step.title}
                  description={step.description}
                  status={getStepStatus(i + 1)}
                  timestamp={step.timestamp}
                  location={step.location}
                />
              ))}
            </div>
          </div>

          {/* Video Proof */}
          <div className="sf-card rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold text-slate-900">
                  Видео-подтверждение
                </div>
                <HelpTip title="Зачем нужно видео?">
                  Видеозапись приёмки снижает риск споров — вы видите состояние
                  груза до вскрытия упаковки.
                </HelpTip>
              </div>
              <Badge tone="green" icon={<Icon name="check" className="w-4 h-4" />}>
                Загружено
              </Badge>
            </div>

            <button
              onClick={() => setVideoOpen(true)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 overflow-hidden hover:bg-slate-100 transition group"
            >
              <div className="relative h-32">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-slate-900/60 to-teal-600/60" />
                <div className="absolute inset-0 sf-grid-bg opacity-20" />
                <div className="absolute inset-0 grid place-items-center">
                  <div className="rounded-full bg-white/20 ring-2 ring-white/40 p-3 group-hover:bg-white/30 transition">
                    <Icon name="play" className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="absolute left-3 bottom-3">
                  <div className="text-white text-sm font-bold">Приёмка груза</div>
                  <div className="text-white/80 text-xs">
                    Проверка целостности упаковки
                  </div>
                </div>
                <div className="absolute right-3 bottom-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    2:34
                  </span>
                </div>
              </div>
            </button>

            <div className="mt-3 text-xs text-slate-500">
              Видео загружено поставщиком/складом. Просмотрите перед подтверждением
              получения.
            </div>
          </div>

          {/* Quick Stats */}
          <div className="sf-card rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-bold text-slate-900 mb-3">
              Сводка по сделке
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-600">Поставщик</span>
                <span className="text-xs font-semibold text-slate-900">
                  {deal.supplier.name || 'Не выбран'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-600">Товар</span>
                <span className="text-xs font-semibold text-slate-900">
                  {deal.item.name}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-600">Incoterms</span>
                <span className="text-xs font-semibold text-slate-900">
                  {deal.item.incoterm}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-600">Эскроу</span>
                <span className="text-xs font-semibold text-slate-900 sf-number">
                  {fmt.rub(deal.payment.escrowAmountRUB)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-slate-600">Статус</span>
                <Badge
                  tone={
                    fundsReleased ? 'green' : delivered ? 'blue' : 'gray'
                  }
                >
                  {fundsReleased
                    ? 'Завершено'
                    : delivered
                    ? 'Ожидает подтверждения'
                    : 'В процессе'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== VIDEO MODAL ===== */}
      {videoOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 grid place-items-center p-4"
          onClick={() => setVideoOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 sf-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="text-base font-bold text-slate-900">
                  Видео приёмки груза
                </div>
                <div className="text-xs text-slate-600">
                  Запись со склада поставщика
                </div>
              </div>
              <button
                onClick={() => setVideoOpen(false)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              >
                <Icon name="x" />
              </button>
            </div>
            <div className="p-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-100 h-64 grid place-items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-slate-900/10 to-teal-600/20" />
                <div className="absolute inset-0 sf-grid-bg opacity-30" />
                <div className="text-center relative z-10">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 grid place-items-center ring-4 ring-blue-50">
                    <Icon name="play" className="w-8 h-8" />
                  </div>
                  <div className="mt-4 text-sm font-semibold text-slate-900">
                    Демо-превью видео
                  </div>
                  <div className="mt-1 text-xs text-slate-600 max-w-xs mx-auto">
                    В реальном приложении здесь будет видео проверки груза
                  </div>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Badge tone="gray">Целостность упаковки</Badge>
                    <Badge tone="gray">Подсчёт мест</Badge>
                    <Badge tone="gray">Выборочная проверка</Badge>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-start gap-2">
                  <div className="text-blue-700 mt-0.5">
                    <Icon name="shield" className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-blue-800">
                    <strong>Важно:</strong> Просмотрите видео перед подтверждением
                    получения. При обнаружении повреждений — откройте спор до
                    подтверждения.
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setVideoOpen(false)}
                className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CONFIRM MODAL ===== */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 grid place-items-center p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 sf-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 bg-emerald-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white grid place-items-center">
                  <Icon name="check" className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-bold text-emerald-900">
                    Подтверждение получения
                  </div>
                  <div className="text-xs text-emerald-700">
                    Проверьте товар перед выплатой эскроу
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkQty}
                    onChange={(e) => setCheckQty(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Количество соответствует накладной
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      Я пересчитал места и подтверждаю, что количество совпадает
                    </div>
                  </div>
                </label>
                <div className="border-t border-slate-200" />
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkNoDamage}
                    onChange={(e) => setCheckNoDamage(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Видимых повреждений нет
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      Упаковка цела, товар без дефектов (визуальный осмотр)
                    </div>
                  </div>
                </label>
              </div>

              <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                <div className="flex items-start gap-2">
                  <div className="text-orange-700 mt-0.5">
                    <Icon name="alert" className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-orange-800">
                    <strong>Внимание:</strong> После подтверждения средства будут
                    переведены поставщику. Это действие нельзя отменить.
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">Сумма к выплате</span>
                  <span className="text-lg font-bold text-slate-900 sf-number">
                    {fmt.rub(deal.payment.escrowAmountRUB)}
                  </span>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <button
                onClick={() => setDisputeOpen(true)}
                className="text-sm font-semibold text-orange-700 hover:text-orange-900"
              >
                Сообщить о проблеме
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Отмена
                </button>
                <button
                  onClick={confirmReceipt}
                  disabled={!checkQty || !checkNoDamage || releasing}
                  className={
                    'rounded-xl px-4 py-2 text-sm font-semibold transition ' +
                    (!checkQty || !checkNoDamage || releasing
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700')
                  }
                >
                  {releasing ? 'Обработка…' : 'Подтвердить и выплатить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== DISPUTE MODAL ===== */}
      {disputeOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 grid place-items-center p-4"
          onClick={() => setDisputeOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 sf-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 bg-orange-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-600 text-white grid place-items-center">
                  <Icon name="alert" className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-bold text-orange-900">
                    Сообщить о проблеме
                  </div>
                  <div className="text-xs text-orange-700">
                    Эскроу останется заблокирован до разрешения
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900 mb-2">
                  Выберите тип проблемы:
                </div>
                <div className="space-y-2">
                  {[
                    'Товар повреждён',
                    'Количество не совпадает',
                    'Неверный товар',
                    'Другое',
                  ].map((issue) => (
                    <label
                      key={issue}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="issue"
                        className="text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm text-slate-700">{issue}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-start gap-2">
                  <div className="text-blue-700 mt-0.5">
                    <Icon name="shield" className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-blue-800">
                    <strong>Защита покупателя:</strong> Пока спор не разрешён,
                    средства остаются на эскроу. Мы свяжемся с поставщиком и
                    поможем решить вопрос.
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setDisputeOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  setDisputeOpen(false);
                  setConfirmOpen(false);
                  addToast({
                    tone: 'info',
                    title: 'Спор открыт (демо)',
                    message:
                      'В реальном приложении здесь начнётся процесс разрешения спора.',
                  });
                }}
                className="rounded-xl bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700"
              >
                Открыть спор
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
                  Как работает логистика?
                </div>
                <div className="text-xs text-slate-600">
                  От оплаты до получения товара
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
                    Оплата в эскроу
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    Вы вносите оплату, но деньги не уходят поставщику сразу — они
                    блокируются на защищённом счёте SilkFlow.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white grid place-items-center text-sm font-bold shrink-0">
                  2
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Производство и отправка
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    Поставщик готовит заказ и передаёт перевозчику. Вы видите
                    статус в реальном времени.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white grid place-items-center text-sm font-bold shrink-0">
                  3
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Транзит и таможня
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    Груз движется к границе, проходит таможенное оформление.
                    Трекинг обновляется каждые 6 часов.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white grid place-items-center text-sm font-bold shrink-0">
                  4
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Доставка на склад
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    Груз прибывает к вам. Склад снимает видео приёмки для
                    подтверждения состояния.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white grid place-items-center text-sm font-bold shrink-0">
                  5
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Подтверждение и выплата
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    Вы проверяете товар и подтверждаете получение. Только после
                    этого деньги переводятся поставщику.
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-start gap-2">
                  <div className="text-emerald-700 mt-0.5">
                    <Icon name="shield" className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-emerald-800">
                    <strong>Защита на каждом этапе:</strong> Если что-то пойдёт не
                    так — вы можете открыть спор, и деньги останутся заблокированы
                    до разрешения ситуации.
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