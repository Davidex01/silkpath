import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import type { DealState } from '../../state/dealTypes';
import type { AuthState } from '../../state/authTypes';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icon';
import { fmt } from '../../components/lib/format';
import { clamp } from '../../components/lib/clamp';
import type { Toast } from '../../components/common/ToastStack';
import { HS_CODES, type HSCodeMeta } from './hsCodes';
import { getDealAggregated, type DealAggregatedView } from '../../api/deals';
import {
  getOrCreateChatForDeal,
  listChatMessagesByChatId,
  sendChatMessageToChat,
  translateMessageInChat,
  type MessageDto,
} from '../../api/chat';
import { createPayment } from '../../api/payments';

import {
  getDealUnitEconomics,
  type DealUnitEconomicsDto,
} from '../../api/analytics';

interface DealWorkspaceViewProps {
  deal: DealState;
  setDeal: React.Dispatch<React.SetStateAction<DealState>>;
  addToast: (t: Omit<Toast, 'id'>) => void;
  onGoLogistics: () => void;
  auth: AuthState;
  onPaymentCreated?: () => void;
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
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 grid place-items-center text-xs font-bold transition"
        aria-label="Подсказка"
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

// ===== Компонент шага workflow =====
interface WorkflowStepProps {
  step: number;
  title: string;
  description: string;
  status: 'done' | 'current' | 'upcoming';
  action?: { label: string; onClick: () => void };
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
        'flex-1 rounded-xl border p-3 transition ' +
        (status === 'done'
          ? 'border-emerald-200 bg-emerald-50'
          : status === 'current'
          ? 'border-blue-200 bg-blue-50 ring-2 ring-blue-100'
          : 'border-slate-200 bg-slate-50 opacity-60')
      }
    >
      <div className="flex items-start gap-3">
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
          {action && status === 'current' && (
            <button
              onClick={action.onClick}
              className="mt-2 rounded-lg bg-blue-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-blue-700"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ===== Компонент сообщения чата =====
interface ChatBubbleProps {
  isMe: boolean;
  author: string;
  text: string;
  translatedText?: string;
  ts: string;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  isMe,
  author,
  text,
  translatedText,
  ts,
}) => {
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-slate-500">{author}</span>
          <span className="text-xs text-slate-400">
            {new Date(ts).toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div
          className={
            'rounded-2xl px-4 py-2.5 text-sm ' +
            (isMe
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-white border border-slate-200 text-slate-900 rounded-bl-md')
          }
        >
          {translatedText || text}
        </div>
        {translatedText && translatedText !== text && (
          <div className="mt-1 text-xs text-slate-400 italic px-1">
            Оригинал: {text}
          </div>
        )}
      </div>
    </div>
  );
};

// ===== Компонент строки калькулятора =====
interface CalcRowProps {
  label: string;
  value: string;
  subLabel?: string;
  highlight?: boolean;
  large?: boolean;
}

const CalcRow: React.FC<CalcRowProps> = ({
  label,
  value,
  subLabel,
  highlight,
  large,
}) => {
  return (
    <div
      className={
        'flex items-center justify-between py-2 ' +
        (highlight ? 'border-t-2 border-slate-300 pt-3 mt-1' : 'border-b border-slate-100')
      }
    >
      <div>
        <span className={highlight ? 'text-sm font-bold text-slate-900' : 'text-xs text-slate-600'}>
          {label}
        </span>
        {subLabel && (
          <span className="ml-1 text-xs text-slate-400">({subLabel})</span>
        )}
      </div>
      <span
        className={
          'sf-number ' +
          (large
            ? 'text-xl font-extrabold text-slate-900'
            : highlight
            ? 'text-base font-bold text-slate-900'
            : 'text-sm font-semibold text-slate-800')
        }
      >
        {value}
      </span>
    </div>
  );
};

// ===== Основной компонент =====
export const DealWorkspaceView: React.FC<DealWorkspaceViewProps> = ({
  deal,
  setDeal,
  addToast,
  onGoLogistics,
  auth,
  onPaymentCreated,
}) => {
  // ===== Refs для предотвращения повторных загрузок =====
  const dealLoadedRef = useRef<string | null>(null);
  const chatLoadedRef = useRef<string | null>(null);
  const analyticsLoadedRef = useRef<string | null>(null);

  // ===== Состояния загрузки =====
  const [dealData, setDealData] = useState<DealAggregatedView | null>(null);

  // ===== Чат =====
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  // ===== Калькулятор — входные данные пользователя =====
  const [logisticsRUB, setLogisticsRUB] = useState(50000);
  const [insuranceRUB, setInsuranceRUB] = useState(5000);
  const [selectedHs, setSelectedHs] = useState<HSCodeMeta>(HS_CODES[0]);
  const [otherCostsRUB, setOtherCostsRUB] = useState(0);
  const [targetMarginPct, setTargetMarginPct] = useState(30);
  const [overrideQty, setOverrideQty] = useState<number | null>(null);

  // ===== Модалы =====
  const [helpOpen, setHelpOpen] = useState(false);
  const [fxLockOpen, setFxLockOpen] = useState(false);
  const [escrowOpen, setEscrowOpen] = useState(false);
  const [calcDetailsOpen, setCalcDetailsOpen] = useState(false);
  const [escrowProcessing, setEscrowProcessing] = useState(false);

  // Аналитика SilkFlow (backend-модель)
  const [analytics, setAnalytics] = useState<DealUnitEconomicsDto | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // ===== Вычисляемые значения =====
  const hasRealDeal = Boolean(deal.backend?.dealId);
  const escrowFunded = deal.payment.status === 'Escrow Funded' || deal.payment.status === 'Funds Released';

  // ===== Загрузка аналитики сделки (backend) =====
useEffect(() => {
  const dId = deal.backend?.dealId;
  if (!dId || analyticsLoadedRef.current === dId) return;

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      const data = await getDealUnitEconomics(auth, dId);
      setAnalytics(data);
      analyticsLoadedRef.current = dId;
    } catch (e) {
      console.error('Failed to load deal analytics', e);
      setAnalyticsError('Не удалось загрузить аналитику по сделке.');
      analyticsLoadedRef.current = null;
    } finally {
      setAnalyticsLoading(false);
    }
  };

  void loadAnalytics();
}, [auth, deal.backend?.dealId]);

  // ===== Загрузка данных сделки (только один раз) =====
  useEffect(() => {
    const dealId = deal.backend?.dealId;
    if (!dealId || dealLoadedRef.current === dealId) return;

    const loadDealData = async () => {
      try {
        dealLoadedRef.current = dealId;

        const data = await getDealAggregated(auth, dealId);
        setDealData(data);

        // Обновляем локальный state
        const offer = data.offer;
        const order = data.order;

        setDeal((prev) => ({
          ...prev,
          supplier: {
            ...prev.supplier,
            id: offer.supplierOrgId,
            name: `Поставщик ${offer.supplierOrgId.slice(0, 8)}…`,
          },
          item: {
            ...prev.item,
            name: offer.items[0]?.name || prev.item.name,
            incoterm: offer.incoterms || 'FOB',
          },
          calc: {
            ...prev.calc,
            factoryPriceCNY: offer.items[0]?.price || 0,
            qty: offer.items[0]?.qty || 0,
          },
          backendSummary: {
            dealId: data.deal.id,
            rfqId: data.rfq.id,
            offerId: data.offer.id,
            orderId: data.order.id,
            status: data.deal.status,
            currency: order.currency,
            totalAmount: order.totalAmount,
          },
        }));
      } catch (e) {
        console.error('Failed to load deal data', e);
        dealLoadedRef.current = null;
      } 
    };

    void loadDealData();
  }, [auth, deal.backend?.dealId, setDeal]);

  // ===== Загрузка чата (только один раз) =====
  useEffect(() => {
    const dealId = deal.backend?.dealId;
    if (!dealId || chatLoadedRef.current === dealId) return;

    const loadChat = async () => {
      try {
        setChatLoading(true);
        chatLoadedRef.current = dealId;

        const chat = await getOrCreateChatForDeal(auth, dealId);
        setChatId(chat.id);

        const msgs = await listChatMessagesByChatId(auth, chat.id);
        setMessages(msgs);
      } catch (e) {
        console.error('Failed to load chat', e);
        chatLoadedRef.current = null;
      } finally {
        setChatLoading(false);
      }
    };

    void loadChat();
  }, [auth, deal.backend?.dealId]);

  // ===== Polling чата (каждые 5 секунд) =====
  useEffect(() => {
    if (!chatId) return;

    const poll = async () => {
      try {
        const msgs = await listChatMessagesByChatId(auth, chatId);
        setMessages(msgs);
      } catch (e) {
        console.error('Failed to poll messages', e);
      }
    };

    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [auth, chatId]);

  // ===== Автоперевод входящих сообщений =====
  useEffect(() => {
    if (!chatId || messages.length === 0) return;

    const autoTranslate = async () => {
      const untranslated = messages.find((m) => {
        if (m.senderId === auth.user.id) return false;
        const hasRu = m.translations?.some((t) =>
          t.lang.toLowerCase().startsWith('ru'),
        );
        return !hasRu;
      });

      if (!untranslated) return;

      try {
        await translateMessageInChat(auth, chatId, untranslated.id, 'ru');
        // Следующий poll подхватит обновлённое сообщение
      } catch (e) {
        console.error('Failed to auto-translate', e);
      }
    };

    void autoTranslate();
  }, [auth, chatId, messages]);

  // ===== Расчёты калькулятора =====
  const calculations = useMemo(() => {
    // Данные из Offer (или демо-данные)
    const pricePerUnit = dealData?.offer.items[0]?.price || deal.calc.factoryPriceCNY || 10;
    const baseQty = dealData?.offer.items[0]?.qty || deal.calc.qty || 100;
    const qty = overrideQty ?? baseQty;
    const subtotalCNY = pricePerUnit * qty;

    // Курс
    const fxRate = deal.fx.locked && deal.fx.lockedRate
      ? deal.fx.lockedRate
      : deal.fx.rateLive;

    // Конвертация в рубли
    const subtotalRUB = subtotalCNY * fxRate;

    // FX комиссия (примерно 1.5%)
    const fxCommissionPct = 0.015;
    const fxCommissionRUB = subtotalRUB * fxCommissionPct;

    // Пошлина (от CIF стоимости = товар + доставка + страховка)
    const cifRUB = subtotalRUB + logisticsRUB + insuranceRUB;
    const dutyRUB = cifRUB * selectedHs.duty;

    // НДС (от CIF + пошлина)
    const vatBaseRUB = cifRUB + dutyRUB;
    const vatRUB = vatBaseRUB * selectedHs.vat;

    // Банковские комиссии (примерно 0.5%)
    const bankCommissionPct = 0.005;
    const bankCommissionRUB = subtotalRUB * bankCommissionPct;

    // Полная себестоимость
    const totalCostRUB =
      subtotalRUB +
      fxCommissionRUB +
      logisticsRUB +
      insuranceRUB +
      dutyRUB +
      vatRUB +
      bankCommissionRUB +
      otherCostsRUB;

    // Себестоимость за единицу
    const costPerUnitRUB = qty > 0 ? totalCostRUB / qty : 0;

    // Рекомендуемая цена продажи (с учётом маржи)
    const marginMultiplier = 1 + targetMarginPct / 100;
    const recommendedPriceRUB = costPerUnitRUB * marginMultiplier;

    // Прибыль на единицу
    const profitPerUnitRUB = recommendedPriceRUB - costPerUnitRUB;

    // Общая прибыль
    const totalProfitRUB = profitPerUnitRUB * qty;

    // Общая выручка
    const totalRevenueRUB = recommendedPriceRUB * qty;

    // ROI
    const roiPct = totalCostRUB > 0 ? (totalProfitRUB / totalCostRUB) * 100 : 0;

    // Структура затрат (для диаграммы)
    const costBreakdown = [
      { label: 'Товар', value: subtotalRUB, pct: (subtotalRUB / totalCostRUB) * 100, color: 'bg-blue-500' },
      { label: 'Логистика', value: logisticsRUB, pct: (logisticsRUB / totalCostRUB) * 100, color: 'bg-teal-500' },
      { label: 'Пошлина', value: dutyRUB, pct: (dutyRUB / totalCostRUB) * 100, color: 'bg-orange-500' },
      { label: 'НДС', value: vatRUB, pct: (vatRUB / totalCostRUB) * 100, color: 'bg-purple-500' },
      { label: 'Комиссии', value: fxCommissionRUB + bankCommissionRUB, pct: ((fxCommissionRUB + bankCommissionRUB) / totalCostRUB) * 100, color: 'bg-slate-400' },
    ];

    return {
      // Исходные данные
      pricePerUnit,
      baseQty,
      qty,
      subtotalCNY,
      fxRate,

      // Конвертация
      subtotalRUB,
      fxCommissionRUB,
      fxCommissionPct,

      // Логистика и страховка
      logisticsRUB,
      insuranceRUB,
      cifRUB,

      // Таможня
      dutyRUB,
      dutyPct: selectedHs.duty,
      vatRUB,
      vatPct: selectedHs.vat,

      // Комиссии
      bankCommissionRUB,
      bankCommissionPct,

      // Прочее
      otherCostsRUB,

      // Итоги
      totalCostRUB,
      costPerUnitRUB,

      // Маржинальность
      targetMarginPct,
      recommendedPriceRUB,
      profitPerUnitRUB,
      totalProfitRUB,
      totalRevenueRUB,
      roiPct,

      // Breakdown
      costBreakdown,
    };
  }, [
    deal.calc.factoryPriceCNY,
    deal.calc.qty,
    deal.fx.locked,
    deal.fx.lockedRate,
    deal.fx.rateLive,
    dealData,
    overrideQty,
    logisticsRUB,
    insuranceRUB,
    selectedHs,
    otherCostsRUB,
    targetMarginPct,
  ]);

  // ===== Определение текущего шага workflow =====
  const workflowStep = useMemo((): number => {
    if (!hasRealDeal) return 0;
    if (deal.payment.status === 'Funds Released') return 5;
    if (deal.payment.status === 'Escrow Funded') return 4;
    if (deal.fx.locked) return 3;
    if (dealData) return 2;
    return 1;
  }, [hasRealDeal, deal.payment.status, deal.fx.locked, dealData]);

  // ===== Handlers =====
  const handleSendMessage = useCallback(async () => {
    const text = draft.trim();
    if (!text || !chatId) return;

    try {
      setSending(true);
      const msg = await sendChatMessageToChat(auth, chatId, {
        text,
        lang: 'ru',
      });
      setMessages((prev) => [...prev, msg]);
      setDraft('');
    } catch (e) {
      console.error('Failed to send message', e);
      addToast({
        tone: 'warn',
        title: 'Ошибка отправки',
        message: 'Не удалось отправить сообщение.',
      });
    } finally {
      setSending(false);
    }
  }, [auth, chatId, draft, addToast]);

  const handleLockFx = useCallback(() => {
    setDeal((prev) => ({
      ...prev,
      fx: {
        ...prev.fx,
        locked: true,
        lockedRate: prev.fx.rateLive,
        lockExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
      },
    }));
    setFxLockOpen(false);
    addToast({
      tone: 'success',
      title: 'Курс зафиксирован',
      message: `1 CNY = ${fmt.num(deal.fx.rateLive, 2)} RUB на 24 часа.`,
    });
  }, [deal.fx.rateLive, setDeal, addToast]);

  const handleUnlockFx = useCallback(() => {
    setDeal((prev) => ({
      ...prev,
      fx: {
        ...prev.fx,
        locked: false,
        lockedRate: null,
        lockExpiresAt: null,
      },
    }));
    addToast({
      tone: 'info',
      title: 'Курс разблокирован',
      message: 'Теперь используется живой курс.',
    });
  }, [setDeal, addToast]);

  const handleEscrowDeposit = useCallback(async () => {
    if (!deal.backend?.dealId) {
      addToast({
        tone: 'warn',
        title: 'Сделка не создана',
        message: 'Сначала примите предложение поставщика через RFQ.',
      });
      return;
    }

    try {
      setEscrowProcessing(true);

      const payment = await createPayment(auth, {
        dealId: deal.backend.dealId,
        amount: calculations.totalCostRUB,
        currency: 'RUB',
      });

      setDeal((prev) => ({
        ...prev,
        payment: {
          ...prev.payment,
          status: 'Escrow Funded',
          escrowAmountRUB: calculations.totalCostRUB,
          backendPaymentId: payment.id,
        },
        stage: 'Escrow Funded',
      }));

      setEscrowOpen(false);
      onPaymentCreated?.();

      addToast({
        tone: 'success',
        title: 'Эскроу оплачен!',
        message: `${fmt.rub(calculations.totalCostRUB)} заблокировано до подтверждения доставки.`,
      });
    } catch (e) {
      console.error('Failed to create escrow payment', e);
      addToast({
        tone: 'warn',
        title: 'Ошибка оплаты',
        message: 'Не удалось создать платёж. Проверьте баланс.',
      });
    } finally {
      setEscrowProcessing(false);
    }
  }, [auth, deal.backend?.dealId, calculations.totalCostRUB, setDeal, onPaymentCreated, addToast]);

  const handleResetCalc = useCallback(() => {
    setLogisticsRUB(50000);
    setInsuranceRUB(5000);
    setSelectedHs(HS_CODES[0]);
    setOtherCostsRUB(0);
    setTargetMarginPct(30);
    setOverrideQty(null);
    addToast({
      tone: 'info',
      title: 'Калькулятор сброшен',
      message: 'Все значения вернулись к начальным.',
    });
  }, [addToast]);

   // ===== RENDER =====
  return (
    <div className="p-6 space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-slate-900 text-xl font-bold">
              Рабочее пространство сделки
            </div>
            <HelpTip title="Что здесь происходит?">
              Здесь вы общаетесь с поставщиком, рассчитываете полную себестоимость
              товара, фиксируете курс и вносите оплату в защищённый эскроу.
            </HelpTip>
          </div>
          {hasRealDeal ? (
            <div className="mt-1 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">
                {dealData?.offer.items[0]?.name || deal.item.name}
              </span>
              {' • '}
              <span className="sf-number">{calculations.qty} шт</span>
              {' • '}
              <span className="sf-number">{fmt.cny(calculations.subtotalCNY)}</span>
              {dealData && (
                <>
                  {' • '}
                  <span className="text-slate-500">
                    Поставщик: {dealData.offer.supplierOrgId.slice(0, 8)}…
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className="mt-1 text-sm text-slate-500">
              Создайте RFQ и примите предложение поставщика, чтобы начать
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

          {hasRealDeal && (
            <>
              <Badge
                tone={deal.fx.locked ? 'green' : 'orange'}
                icon={
                  deal.fx.locked ? (
                    <Icon name="check" className="w-4 h-4" />
                  ) : (
                    <Icon name="clock" className="w-4 h-4" />
                  )
                }
              >
                Курс: {deal.fx.locked ? 'зафиксирован' : 'живой'}
              </Badge>
              <Badge
                tone={escrowFunded ? 'green' : 'gray'}
                icon={
                  escrowFunded ? (
                    <Icon name="shield" className="w-4 h-4" />
                  ) : undefined
                }
              >
                {escrowFunded ? 'Эскроу оплачен' : 'Ожидает оплаты'}
              </Badge>
            </>
          )}
        </div>
      </div>

      {/* ===== WORKFLOW STEPS ===== */}
      {hasRealDeal && (
        <div className="sf-card rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="text-sm font-bold text-slate-900">
                Этапы сделки
              </div>
              <HelpTip title="Порядок действий">
                Следуйте этим шагам для безопасного завершения сделки.
                Каждый этап защищает ваши интересы.
              </HelpTip>
            </div>
            <div className="text-xs text-slate-500 sf-number">
              Этап {Math.min(workflowStep, 4)} из 4
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <WorkflowStep
              step={1}
              title="Согласование"
              description="Обсудите детали в чате"
              status={workflowStep > 1 ? 'done' : workflowStep === 1 ? 'current' : 'upcoming'}
            />
            <WorkflowStep
              step={2}
              title="Расчёт"
              description="Рассчитайте себестоимость"
              status={workflowStep > 2 ? 'done' : workflowStep === 2 ? 'current' : 'upcoming'}
              action={
                workflowStep === 2
                  ? { label: 'Открыть калькулятор', onClick: () => setCalcDetailsOpen(true) }
                  : undefined
              }
            />
            <WorkflowStep
              step={3}
              title="Фиксация курса"
              description="Заблокируйте курс CNY/RUB"
              status={workflowStep > 3 ? 'done' : workflowStep === 3 ? 'current' : 'upcoming'}
              action={
                workflowStep === 3
                  ? { label: 'Зафиксировать', onClick: () => setFxLockOpen(true) }
                  : undefined
              }
            />
            <WorkflowStep
              step={4}
              title="Оплата эскроу"
              description="Внесите средства в защиту"
              status={workflowStep > 4 ? 'done' : workflowStep === 4 ? 'current' : 'upcoming'}
              action={
                workflowStep === 4
                  ? { label: 'Оплатить', onClick: () => setEscrowOpen(true) }
                  : undefined
              }
            />
          </div>

          {workflowStep >= 4 && escrowFunded && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="check" className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-900">
                    Эскроу оплачен — ожидайте доставку
                  </span>
                </div>
                <button
                  onClick={onGoLogistics}
                  className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700"
                >
                  Перейти к логистике →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== NO DEAL STATE ===== */}
      {!hasRealDeal && (
        <div className="sf-card rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8">
          <div className="text-center max-w-lg mx-auto">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-slate-200 text-slate-400 grid place-items-center mb-4">
              <Icon name="deals" className="w-10 h-10" />
            </div>
            <div className="text-xl font-bold text-slate-700">
              Нет активной сделки
            </div>
            <div className="mt-2 text-sm text-slate-500">
              Чтобы начать работу, создайте запрос котировки (RFQ) поставщику
              и примите его коммерческое предложение.
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 grid place-items-center mb-2">
                  <span className="text-sm font-bold">1</span>
                </div>
                <div className="text-xs font-semibold text-slate-900">
                  Найдите поставщика
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Раздел «Search & Suppliers»
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 grid place-items-center mb-2">
                  <span className="text-sm font-bold">2</span>
                </div>
                <div className="text-xs font-semibold text-slate-900">
                  Создайте RFQ
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Кнопка «Create RFQ» в профиле
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 grid place-items-center mb-2">
                  <span className="text-sm font-bold">3</span>
                </div>
                <div className="text-xs font-semibold text-slate-900">
                  Примите Offer
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Вкладка «RFQs & Offers»
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MAIN CONTENT (only if deal exists) ===== */}
      {hasRealDeal && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* ===== LEFT COLUMN: CHAT ===== */}
          <div className="xl:col-span-5">
            <div className="sf-card rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col h-[600px]">
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold text-slate-900">
                      Чат с поставщиком
                    </div>
                    <HelpTip title="Автоперевод">
                      Сообщения автоматически переводятся: вы пишете на русском,
                      поставщик видит на китайском, и наоборот.
                    </HelpTip>
                  </div>
                  <Badge tone="blue">RU ↔ CN</Badge>
                </div>
                {dealData && (
                  <div className="mt-1 text-xs text-slate-500">
                    Поставщик: {dealData.offer.supplierOrgId.slice(0, 12)}…
                  </div>
                )}
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto sf-scrollbar bg-slate-50 space-y-3">
                {chatLoading ? (
                  <div className="text-center py-8 text-sm text-slate-500">
                    Загрузка чата…
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((m) => {
                    const isMe = m.senderId === auth.user.id;
                    const ruTr = m.translations?.find((t) =>
                      t.lang.toLowerCase().startsWith('ru'),
                    );
                    return (
                      <ChatBubble
                        key={m.id}
                        isMe={isMe}
                        author={isMe ? 'Вы' : 'Поставщик'}
                        text={m.text}
                        translatedText={!isMe ? ruTr?.text : undefined}
                        ts={m.createdAt}
                      />
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-white border border-slate-200 text-slate-400 grid place-items-center mb-3">
                      <Icon name="deals" className="w-7 h-7" />
                    </div>
                    <div className="text-sm font-semibold text-slate-700">
                      Начните обсуждение
                    </div>
                    <div className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
                      Уточните детали заказа: сроки производства, упаковку,
                      маркировку, способ доставки.
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="px-4 py-3 border-t border-slate-200 bg-white">
                <div className="flex items-end gap-3">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Напишите сообщение на русском…"
                    rows={2}
                    className="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSendMessage();
                      }
                    }}
                  />
                  <button
                    onClick={() => void handleSendMessage()}
                    disabled={sending || !draft.trim()}
                    className={
                      'rounded-xl px-4 py-3 text-sm font-semibold transition ' +
                      (sending || !draft.trim()
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700')
                    }
                  >
                    {sending ? '…' : 'Отправить'}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>Shift+Enter — новая строка</span>
                  <span className="flex items-center gap-1">
                    <Icon name="spark" className="w-3 h-3" />
                    Автоперевод включён
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* ===== RIGHT COLUMN: CALCULATOR ===== */}
          <div className="xl:col-span-7 space-y-4">
            {/* ===== DEAL INFO FROM OFFER ===== */}
            <div className="sf-card rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold text-slate-900">
                    Условия сделки
                  </div>
                  <Badge tone="gray">Из предложения</Badge>
                  <HelpTip title="Данные из Offer">
                    Эти параметры зафиксированы в принятом предложении поставщика.
                    Для изменения условий создайте новый RFQ.
                  </HelpTip>
                </div>
                {dealData && (
                  <span className="text-xs text-slate-500 sf-number">
                    Offer: {dealData.offer.id.slice(0, 8)}…
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Цена за ед.</div>
                  <div className="mt-1 text-lg font-bold text-slate-900 sf-number">
                    {fmt.cny(calculations.pricePerUnit)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Количество</div>
                  <div className="mt-1 text-lg font-bold text-slate-900 sf-number">
                    {calculations.baseQty} шт
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Сумма (CNY)</div>
                  <div className="mt-1 text-lg font-bold text-slate-900 sf-number">
                    {fmt.cny(calculations.subtotalCNY)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Incoterms</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {dealData?.offer.incoterms || deal.item.incoterm}
                  </div>
                </div>
              </div>
            </div>

            {/* ===== FX RATE CARD ===== */}
            <div
              className={
                'sf-card rounded-2xl border p-4 ' +
                (deal.fx.locked
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-orange-200 bg-orange-50')
              }
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div
                      className={
                        'text-sm font-bold ' +
                        (deal.fx.locked ? 'text-emerald-900' : 'text-orange-900')
                      }
                    >
                      Курс обмена CNY → RUB
                    </div>
                    <HelpTip title={deal.fx.locked ? 'Курс зафиксирован' : 'Живой курс'}>
                      {deal.fx.locked
                        ? 'Курс заблокирован и не изменится. Вы защищены от колебаний рынка.'
                        : 'Курс обновляется в реальном времени. Рекомендуем зафиксировать перед оплатой.'}
                    </HelpTip>
                  </div>
                  <div
                    className={
                      'mt-1 text-3xl font-extrabold sf-number ' +
                      (deal.fx.locked ? 'text-emerald-950' : 'text-orange-950')
                    }
                  >
                    1 CNY = {fmt.num(calculations.fxRate, 2)} ₽
                  </div>
                  <div
                    className={
                      'mt-1 text-xs ' +
                      (deal.fx.locked ? 'text-emerald-700' : 'text-orange-700')
                    }
                  >
                    {deal.fx.locked
                      ? `Зафиксирован до ${new Date(deal.fx.lockExpiresAt || 0).toLocaleString('ru-RU')}`
                      : 'Обновляется каждые 3 секунды'}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {!deal.fx.locked ? (
                    <button
                      onClick={() => setFxLockOpen(true)}
                      className="rounded-xl bg-orange-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-orange-700"
                    >
                      Зафиксировать курс
                    </button>
                  ) : (
                    <button
                      onClick={handleUnlockFx}
                      className="rounded-xl border border-emerald-300 bg-white text-emerald-800 px-4 py-2.5 text-sm font-semibold hover:bg-emerald-100"
                    >
                      Разблокировать
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ===== CALCULATOR ===== */}
            <div className="sf-card rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold text-slate-900">
                    Калькулятор себестоимости
                  </div>
                  <HelpTip title="Расчёт полной стоимости">
                    Введите ожидаемые расходы на логистику, страховку и прочее.
                    Калькулятор покажет полную себестоимость и рекомендуемую
                    цену продажи с учётом вашей маржи.
                  </HelpTip>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetCalc}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Сбросить
                  </button>
                  <button
                    onClick={() => setCalcDetailsOpen(true)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Подробнее
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LEFT: Inputs */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Ваши расходы
                  </div>

                  {/* Quantity Override */}
                  <div>
                    <label className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>Количество (для расчёта)</span>
                      <button
                        onClick={() => setOverrideQty(null)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Сбросить
                      </button>
                    </label>
                    <input
                      type="number"
                      value={overrideQty ?? calculations.baseQty}
                      onChange={(e) => setOverrideQty(Number(e.target.value) || 1)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 sf-number"
                    />
                  </div>

                  {/* Logistics */}
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Логистика (₽)
                    </label>
                    <input
                      type="number"
                      value={logisticsRUB}
                      onChange={(e) => setLogisticsRUB(clamp(Number(e.target.value) || 0, 0, 50000000))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 sf-number"
                    />
                  </div>

                  {/* Insurance */}
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Страховка (₽)
                    </label>
                    <input
                      type="number"
                      value={insuranceRUB}
                      onChange={(e) => setInsuranceRUB(clamp(Number(e.target.value) || 0, 0, 10000000))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 sf-number"
                    />
                  </div>

                  {/* HS Code */}
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      HS-код (пошлина + НДС)
                    </label>
                    <select
                      value={selectedHs.code}
                      onChange={(e) => {
                        const hs = HS_CODES.find((h) => h.code === e.target.value);
                        if (hs) setSelectedHs(hs);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      {HS_CODES.map((hs) => (
                        <option key={hs.code} value={hs.code}>
                          {hs.label}
                        </option>
                      ))}
                    </select>
                    <div className="mt-1 text-xs text-slate-400">
                      Пошлина: {fmt.pct(selectedHs.duty)} • НДС: {fmt.pct(selectedHs.vat)}
                    </div>
                  </div>

                  {/* Other Costs */}
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Прочие расходы (₽)
                    </label>
                    <input
                      type="number"
                      value={otherCostsRUB}
                      onChange={(e) => setOtherCostsRUB(clamp(Number(e.target.value) || 0, 0, 50000000))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 sf-number"
                    />
                  </div>

                  {/* Target Margin */}
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Целевая маржа (%)
                    </label>
                    <input
                      type="number"
                      value={targetMarginPct}
                      onChange={(e) => setTargetMarginPct(clamp(Number(e.target.value) || 0, 0, 500))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 sf-number"
                    />
                  </div>
                </div>

                {/* RIGHT: Results */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Результаты расчёта
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                    <CalcRow
                      label="Товар (CNY→RUB)"
                      value={fmt.rub(calculations.subtotalRUB)}
                    />
                    <CalcRow
                      label="Логистика"
                      value={fmt.rub(calculations.logisticsRUB)}
                    />
                    <CalcRow
                      label="Страховка"
                      value={fmt.rub(calculations.insuranceRUB)}
                    />
                    <CalcRow
                      label="Пошлина"
                      value={fmt.rub(calculations.dutyRUB)}
                      subLabel={fmt.pct(calculations.dutyPct)}
                    />
                    <CalcRow
                      label="НДС"
                      value={fmt.rub(calculations.vatRUB)}
                      subLabel={fmt.pct(calculations.vatPct)}
                    />
                    <CalcRow
                      label="Комиссии"
                      value={fmt.rub(calculations.fxCommissionRUB + calculations.bankCommissionRUB)}
                    />
                    {calculations.otherCostsRUB > 0 && (
                      <CalcRow
                        label="Прочее"
                        value={fmt.rub(calculations.otherCostsRUB)}
                      />
                    )}
                    <CalcRow
                      label="ИТОГО себестоимость"
                      value={fmt.rub(calculations.totalCostRUB)}
                      highlight
                      large
                    />
                  </div>

                  {/* Per Unit */}
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-800">
                        Себестоимость за единицу
                      </span>
                      <span className="text-lg font-extrabold text-blue-900 sf-number">
                        {fmt.rub(calculations.costPerUnitRUB)}
                      </span>
                    </div>
                  </div>

                  {/* Recommended Price */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-emerald-800">
                        Рекомендуемая цена (маржа {calculations.targetMarginPct}%)
                      </span>
                      <span className="text-lg font-extrabold text-emerald-900 sf-number">
                        {fmt.rub(calculations.recommendedPriceRUB)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-700">
                        Прибыль на единицу
                      </span>
                      <span className="font-semibold text-emerald-800 sf-number">
                        +{fmt.rub(calculations.profitPerUnitRUB)}
                      </span>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Общая выручка</span>
                      <span className="font-semibold text-slate-900 sf-number">
                        {fmt.rub(calculations.totalRevenueRUB)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Общая прибыль</span>
                      <span className="font-semibold text-emerald-700 sf-number">
                        +{fmt.rub(calculations.totalProfitRUB)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">ROI</span>
                      <span className="font-semibold text-slate-900 sf-number">
                        {fmt.num(calculations.roiPct, 1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cost Breakdown Bar */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600">
                    Структура затрат
                  </span>
                </div>
                <div className="h-4 rounded-full overflow-hidden flex">
                  {calculations.costBreakdown.map((item, i) => (
                    <div
                      key={i}
                      className={`${item.color} transition-all`}
                      style={{ width: `${item.pct}%` }}
                      title={`${item.label}: ${fmt.rub(item.value)} (${fmt.num(item.pct, 1)}%)`}
                    />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-3">
                  {calculations.costBreakdown.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                      <span>{item.label}</span>
                      <span className="text-slate-400 sf-number">
                        {fmt.num(item.pct, 0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ===== ANALYTICS (BACKEND) ===== */}
            <div className="sf-card rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold text-slate-900">
                    Аналитика SilkFlow
                  </div>
                  <Badge tone="gray">Backend model</Badge>
                </div>
                {analytics && (
                  <span className="text-xs text-slate-500 sf-number">
                    Deal: {analytics.dealId.slice(0, 8)}… • {analytics.currency}
                  </span>
                )}
              </div>

              {analyticsLoading ? (
                <div className="text-xs text-slate-500">
                  Загрузка аналитики по сделке…
                </div>
              ) : analyticsError ? (
                <div className="text-xs text-orange-700">{analyticsError}</div>
              ) : analytics ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Левая колонка: выручка и маржа */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-600">
                      Выручка (по заказу)
                    </div>
                    <div className="mt-1 text-lg font-extrabold text-slate-900 sf-number">
                      {fmt.num(analytics.revenue, 2)} {analytics.currency}
                    </div>
                    <div className="mt-3 text-xs font-semibold text-slate-600">
                      Валовая маржа
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-lg font-extrabold text-emerald-700 sf-number">
                        {fmt.num(analytics.grossMarginPct, 1)}%
                      </span>
                      <span className="text-xs text-slate-500 sf-number">
                        ({fmt.num(analytics.grossMarginAbs, 2)} {analytics.currency})
                      </span>
                    </div>
                  </div>

                  {/* Центр: структура затрат */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-600 mb-2">
                      Структура затрат (модель SilkFlow)
                    </div>
                    {[
                      { label: 'Товар', value: analytics.costBreakdown.productCost, color: 'bg-blue-500' },
                      { label: 'Логистика', value: analytics.costBreakdown.logisticsCost, color: 'bg-teal-500' },
                      { label: 'Пошлины и налоги', value: analytics.costBreakdown.dutiesTaxes, color: 'bg-orange-500' },
                      { label: 'FX', value: analytics.costBreakdown.fxCost, color: 'bg-purple-500' },
                      { label: 'Комиссии', value: analytics.costBreakdown.commissions, color: 'bg-slate-500' },
                    ].map((item, i) => {
                      const pct =
                        analytics.totalCost > 0
                          ? (item.value / analytics.totalCost) * 100
                          : 0;
                      return (
                       <div key={i} className="mt-1">
                         <div className="flex justify-between text-[11px] text-slate-600">
                           <span>{item.label}</span>
                           <span className="sf-number">
                             {fmt.num(pct, 1)}%
                           </span>
                         </div>
                         <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mt-0.5">
                           <div
                             className={`${item.color}`}
                             style={{ width: `${pct}%` }}
                           />
                         </div>
                       </div>
                      );
                    })}
                  </div>

                  {/* Правая колонка: сравнение с калькулятором */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-600 mb-1">
                      Сравнение с вашим расчётом
                    </div>
                    <div className="text-[11px] text-slate-500">
                      SilkFlow использует простую модель долей затрат на основе выручки.
                      Ваш калькулятор справа — детализированный сценарий.
                    </div>
                    <div className="mt-3 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Модель SilkFlow (margin)</span>
                        <span className="font-semibold text-slate-900 sf-number">
                          {fmt.num(analytics.grossMarginPct, 1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Ваш ROI (калькулятор)</span>
                        <span className="font-semibold text-slate-900 sf-number">
                          {fmt.num(calculations.roiPct, 1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  Аналитика станет доступна после создания сделки и заказа.
                </div>
              )}
            </div>

            {/* ===== ACTION BUTTONS ===== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {!deal.fx.locked && (
                <button
                  onClick={() => setFxLockOpen(true)}
                  className="rounded-xl border-2 border-orange-300 bg-orange-50 text-orange-900 py-4 text-sm font-bold hover:bg-orange-100 flex items-center justify-center gap-2"
                >
                  <Icon name="clock" className="w-5 h-5" />
                  Зафиксировать курс
                </button>
              )}

              {deal.fx.locked && !escrowFunded && (
                <button
                  onClick={() => setEscrowOpen(true)}
                  className="rounded-xl bg-emerald-600 text-white py-4 text-sm font-bold hover:bg-emerald-700 flex items-center justify-center gap-2 md:col-span-2"
                >
                  <Icon name="shield" className="w-5 h-5" />
                  Оплатить в эскроу: {fmt.rub(calculations.totalCostRUB)}
                </button>
              )}

              {escrowFunded && (
                <button
                  onClick={onGoLogistics}
                  className="rounded-xl bg-blue-600 text-white py-4 text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2 md:col-span-2"
                >
                  <Icon name="truck" className="w-5 h-5" />
                  Перейти к логистике →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
       {/* ===== FX LOCK MODAL ===== */}
      {fxLockOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 grid place-items-center p-4 sf-fade-in"
          onClick={() => setFxLockOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 sf-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 bg-orange-50">
              <div className="text-base font-bold text-orange-900">
                Зафиксировать курс
              </div>
              <div className="text-xs text-orange-700">
                Курс будет заблокирован на 24 часа
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-xs text-slate-600 mb-1">Текущий курс</div>
                <div className="text-3xl font-extrabold text-slate-900 sf-number">
                  1 CNY = {fmt.num(deal.fx.rateLive, 2)} RUB
                </div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-start gap-2">
                  <div className="text-blue-700 mt-0.5">
                    <Icon name="shield" className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-blue-800">
                    После фиксации курс не изменится вне зависимости от колебаний
                    рынка. Это защитит вас от неожиданных расходов при оплате.
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setFxLockOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                onClick={handleLockFx}
                className="rounded-xl bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700"
              >
                Зафиксировать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ESCROW MODAL ===== */}
      {escrowOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 grid place-items-center p-4 sf-fade-in"
          onClick={() => setEscrowOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 sf-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 bg-emerald-50">
              <div className="text-base font-bold text-emerald-900">
                Оплата в эскроу
              </div>
              <div className="text-xs text-emerald-700">
                Средства будут заблокированы до подтверждения доставки
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-xs text-slate-600 mb-1">Сумма к оплате</div>
                <div className="text-3xl font-extrabold text-slate-900 sf-number">
                  {fmt.rub(calculations.totalCostRUB)}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-start gap-2">
                  <div className="text-emerald-700 mt-0.5">
                    <Icon name="shield" className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-emerald-800">
                    <strong>Защита покупателя:</strong> Деньги не уйдут поставщику,
                    пока вы не подтвердите получение товара в разделе «Логистика».
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                <div className="flex items-start gap-2">
                  <div className="text-orange-700 mt-0.5">
                    <Icon name="alert" className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-orange-800">
                    После оплаты средства будут заблокированы. Отменить платёж
                    можно только через процедуру спора.
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setEscrowOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                onClick={handleEscrowDeposit}
                disabled={escrowProcessing}
                className={
                  'rounded-xl px-4 py-2 text-sm font-semibold transition ' +
                  (escrowProcessing
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700')
                }
              >
                {escrowProcessing ? 'Обработка…' : 'Оплатить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CALC DETAILS MODAL ===== */}
      {calcDetailsOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 grid place-items-center p-4 sf-fade-in"
          onClick={() => setCalcDetailsOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 sf-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 bg-blue-50 flex items-center justify-between">
              <div>
                <div className="text-base font-bold text-blue-900">
                  Детализация расчёта
                </div>
                <div className="text-xs text-blue-700">
                  Полная структура себестоимости
                </div>
              </div>
              <button
                onClick={() => setCalcDetailsOpen(false)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              >
                <Icon name="x" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto sf-scrollbar">
              <div className="space-y-2 text-sm">
                <CalcRow
                  label="Стоимость товара (CNY)"
                  value={fmt.cny(calculations.subtotalCNY)}
                />
                <CalcRow
                  label="Курс обмена"
                  value={`${fmt.num(calculations.fxRate, 2)} RUB/CNY`}
                />
                <CalcRow
                  label="Стоимость товара (RUB)"
                  value={fmt.rub(calculations.subtotalRUB)}
                  highlight
                />
                <CalcRow
                  label="Логистика"
                  value={fmt.rub(calculations.logisticsRUB)}
                />
                <CalcRow
                  label="Страховка"
                  value={fmt.rub(calculations.insuranceRUB)}
                />
                <CalcRow
                  label={`Пошлина (${fmt.pct(calculations.dutyPct)})`}
                  value={fmt.rub(calculations.dutyRUB)}
                />
                <CalcRow
                  label={`НДС (${fmt.pct(calculations.vatPct)})`}
                  value={fmt.rub(calculations.vatRUB)}
                />
                <CalcRow
                  label={`FX комиссия (${fmt.pct(calculations.fxCommissionPct)})`}
                  value={fmt.rub(calculations.fxCommissionRUB)}
                />
                <CalcRow
                  label={`Банковская комиссия (${fmt.pct(calculations.bankCommissionPct)})`}
                  value={fmt.rub(calculations.bankCommissionRUB)}
                />
                <CalcRow
                  label="Прочие расходы"
                  value={fmt.rub(calculations.otherCostsRUB)}
                />
                <div className="pt-4 mt-2 border-t-2 border-slate-200">
                  <CalcRow
                    label="ИТОГО СЕБЕСТОИМОСТЬ"
                    value={fmt.rub(calculations.totalCostRUB)}
                    large
                  />
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setCalcDetailsOpen(false)}
                className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== HELP MODAL ===== */}
      {helpOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 grid place-items-center p-4 sf-fade-in"
          onClick={() => setHelpOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 sf-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="text-base font-bold text-slate-900">
                  Как работает сделка?
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
                    Обсудите детали в чате
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    Уточните сроки, упаковку, маркировку. Сообщения
                    автоматически переводятся.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white grid place-items-center text-sm font-bold shrink-0">
                  2
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Рассчитайте себестоимость
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    Используйте калькулятор справа, чтобы учесть логистику,
                    пошлины и налоги.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white grid place-items-center text-sm font-bold shrink-0">
                  3
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Зафиксируйте курс
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    Заблокируйте текущий курс CNY/RUB на 24 часа, чтобы избежать
                    рисков.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white grid place-items-center text-sm font-bold shrink-0">
                  4
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Оплатите в эскроу
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    Внесите средства на защищённый счёт. Поставщик увидит оплату,
                    но получит деньги только после доставки.
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-start gap-2">
                  <div className="text-emerald-700 mt-0.5">
                    <Icon name="shield" className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-emerald-800">
                    <strong>Полная защита:</strong> На каждом этапе ваши деньги
                    защищены. Если что-то пойдёт не так — откройте спор, и
                    средства останутся заблокированы.
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