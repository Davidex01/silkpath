import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { DealState } from '../../state/dealTypes';
import type { AuthState } from '../../state/authTypes';
import { Icon } from '../../components/common/Icon';
import { Badge } from '../../components/common/Badge';
import { fmt } from '../../components/lib/format';
import { clamp } from '../../components/lib/clamp';
import { HS_CODES } from './hsCodes';
import type { Toast } from '../../components/common/ToastStack';
import { loadDealSummary } from '../../api/loadDealSummary';
import { createPayment } from '../../api/payments';
import { createDealDocument } from '../../api/documents';


interface DealWorkspaceViewProps {
  deal: DealState;
  setDeal: React.Dispatch<React.SetStateAction<DealState>>;
  addToast: (t: Omit<Toast, 'id'>) => void;
  onGoLogistics: () => void;
  auth: AuthState;
}

function ProgressStepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2">
        {steps.map((s, i) => {
          const state = i < current ? 'done' : i === current ? 'active' : 'todo';
          return (
            <div key={s} className="flex-1">
              <div className="flex items-center gap-2">
                <div
                  className={
                    'w-7 h-7 rounded-full grid place-items-center ring-1 ring-inset ' +
                    (state === 'done'
                      ? 'bg-emerald-600 text-white ring-emerald-200'
                      : state === 'active'
                      ? 'bg-white text-blue-900 ring-blue-200'
                      : 'bg-white text-slate-400 ring-slate-200')
                  }
                >
                  {state === 'done' ? (
                    <Icon name="check" className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-bold">{i + 1}</span>
                  )}
                </div>
                <div
                  className={
                    'text-xs font-semibold ' +
                    (state === 'todo' ? 'text-slate-400' : 'text-slate-800')
                  }
                >
                  {s}
                </div>
              </div>
              <div
                className={
                  'mt-2 h-1.5 rounded-full ' +
                  (state === 'done'
                    ? 'bg-emerald-600'
                    : state === 'active'
                    ? 'bg-blue-200'
                    : 'bg-slate-200')
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ChatBubbleProps {
  side?: 'left' | 'right';
  meta?: string;
  children: React.ReactNode;
  sub?: React.ReactNode;
}

function ChatBubble({ side = 'left', meta, children, sub }: ChatBubbleProps) {
  const left = side === 'left';
  return (
    <div className={`flex ${left ? 'justify-start' : 'justify-end'} gap-2`}>
      <div className={`max-w-[82%] ${left ? '' : 'text-right'}`}>
        {meta ? (
          <div className="mb-1 text-[11px] text-slate-500">{meta}</div>
        ) : null}
        <div
          className={
            'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ring-1 ring-inset ' +
            (left
              ? 'bg-white text-slate-900 ring-slate-200'
              : 'bg-[var(--sf-blue-900)] text-white ring-blue-950/20')
          }
        >
          {children}
        </div>
        {sub ? (
          <div
            className={
              'mt-1 rounded-xl px-3 py-2 text-xs ring-1 ring-inset ' +
              (left
                ? 'bg-slate-50 text-slate-700 ring-slate-200'
                : 'bg-blue-50 text-blue-900 ring-blue-100')
            }
          >
            {sub}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const DealWorkspaceView: React.FC<DealWorkspaceViewProps> = ({
  deal,
  setDeal,
  addToast,
  onGoLogistics,
  auth,
}) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [draftText, setDraftText] = useState('');
  const [contractOpen, setContractOpen] = useState(false);
  const [fxConfirmOpen, setFxConfirmOpen] = useState(false);

  const [loadingBackend, setLoadingBackend] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const steps = ['Draft', 'Signed', 'Escrow Funded', 'Shipped'];
  const currentStep = useMemo(() => {
    const idx = steps.indexOf(deal.stage);
    return idx >= 0 ? idx : 0;
  }, [deal.stage]);

  const rateNow = deal.fx.rateLive;
  const rateShown = deal.fx.locked && deal.fx.lockedRate ? deal.fx.lockedRate : rateNow;

  const dutyRate = deal.calc.hs.duty;
  const vatRate = deal.calc.hs.vat;

  const factoryValueCNY = deal.calc.factoryPriceCNY * deal.calc.qty;
  const factoryValueRUB = factoryValueCNY * rateShown;
  const logisticsRUB = deal.calc.logisticsRUB;
  const customsBaseRUB = Math.max(0, factoryValueRUB + logisticsRUB);
  const dutyRUB = customsBaseRUB * dutyRate;
  const vatRUB = (customsBaseRUB + dutyRUB) * vatRate;
  const landedRUB = customsBaseRUB + dutyRUB + vatRUB;

  const dealIdLocal = useMemo(() => {
    const s = (deal.supplier?.id || 'sf').slice(0, 6).toUpperCase();
    return `SF-${s}-0142`;
  }, [deal.supplier?.id]);

  const escrowFunded = deal.payment.status === 'Escrow Funded';

  const lockRemaining = useMemo(() => {
    if (!deal.fx.locked || !deal.fx.lockExpiresAt) return 0;
    return Math.max(0, deal.fx.lockExpiresAt - Date.now());
  }, [deal.fx.locked, deal.fx.lockExpiresAt, deal.fx.tick]);

  const lockRemainingLabel = useMemo(() => {
    const ms = lockRemaining;
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }, [lockRemaining]);

  useEffect(() => {
    if (!deal.fx.locked) return;
    if (escrowFunded) return;
    if (lockRemaining <= 0) {
      setDeal((d) => ({
        ...d,
        fx: { ...d.fx, locked: false, lockedRate: null, lockExpiresAt: null },
      }));
      addToast({
        tone: 'warn',
        title: 'FX lock expired',
        message: 'Live rate resumed. Lock again before depositing to escrow.',
      });
    }
  }, [lockRemaining, deal.fx.locked, escrowFunded, setDeal, addToast]);

  const sendMessage = () => {
    const text = draftText.trim();
    if (!text) return;
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : String(Date.now() + Math.random());

    setDeal((d) => ({
      ...d,
      chat: [
        ...d.chat,
        {
          id,
          role: 'user',
          ru: text,
          ts: new Date().toISOString(),
        },
      ],
    }));
    setDraftText('');
  };

  const onAttachClick = () => {
    fileRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    addToast({
      tone: 'info',
      title: 'Attachment added',
      message: `${f.name} is ready to send.`,
    });
  };

  const openContractPreview = () => {
    setContractOpen(true);
  };

  const signContract = async () => {
    setContractOpen(false);

    setDeal((d) => ({
      ...d,
      stage: d.stage === 'Draft' ? 'Signed' : d.stage,
    }));

    addToast({
      tone: 'success',
      title: 'Contract signed',
      message: 'Deal is now in Signed stage. Next: lock FX and fund escrow.',
    });

    // создание документа на бэке, если есть dealId
    if (!deal.backend?.dealId) {
      return;
    }

    try {
      // Временный fileId-заглушка — бэкендер позже подставит реальный из /files
      const fakeFileId = 'TODO-fileId-from-backend';

      await createDealDocument(auth, deal.backend.dealId, {
        type: 'contract',
        title: `Main contract for deal ${deal.backend.dealId}`,
        fileId: fakeFileId,
      });

      addToast({
        tone: 'info',
        title: 'Backend document created',
        message: 'Contract document was registered on backend.',
      });
    } catch (e) {
      console.error('Failed to create backend contract document', e);
      addToast({
        tone: 'warn',
        title: 'Failed to create contract document',
        message: 'Please check documents API later.',
      });
    }
  };

  const openFxConfirm = () => {
    if (deal.stage === 'Draft') {
      addToast({
        tone: 'warn',
        title: 'Sign the contract first',
        message:
          'For compliance, sign RFQ/contract before locking FX & funding escrow.',
      });
      return;
    }
    setFxConfirmOpen(true);
  };

  const confirmFreezeAndFund = () => {
    const lockedRate = deal.fx.rateLive;
    const lockForMs = 15 * 60 * 1000;
    const lockExpiresAt = Date.now() + lockForMs;
    setFxConfirmOpen(false);

    setDeal((d) => ({
      ...d,
      fx: { ...d.fx, locked: true, lockedRate, lockExpiresAt },
      payment: {
        ...d.payment,
        status: 'Escrow Funded',
        escrowAmountRUB: Math.round(landedRUB),
      },
      stage: 'Escrow Funded',
    }));

    addToast({
      tone: 'success',
      title: 'Rate locked & escrow funded',
      message: 'Funds are protected. You can now release shipment.',
    });
  };

  const depositToEscrow = async () => {
    if (!deal.fx.locked) {
      addToast({
        tone: 'warn',
        title: 'Use “Freeze Rate” first',
        message:
          'To prevent margin risk, escrow deposit is only enabled after locking FX (demo rule).',
      });
      return;
    }
    if (escrowFunded) {
      addToast({
        tone: 'info',
        title: 'Already funded',
        message: 'Escrow is already funded for this deal.',
      });
      return;
    }
    if (!deal.backend?.dealId) {
      addToast({
        tone: 'warn',
        title: 'No backend deal linked',
        message: 'Create and link a backend deal before funding escrow.',
      });
      return;
    }

    try {
      addToast({
        tone: 'info',
        title: 'Creating payment…',
        message: 'Depositing funds to escrow on backend.',
      });

      const amount = Math.round(landedRUB);

      const payment = await createPayment(auth, {
        dealId: deal.backend.dealId,
        amount,
        currency: 'RUB',
        fxQuoteId: null,
      });

      // Обновляем локальное состояние
      setDeal((d) => ({
        ...d,
        payment: {
          ...d.payment,
          status: 'Escrow Funded',        // UI-слой: escrow пополнен
          escrowAmountRUB: amount,
          backendPaymentId: payment.id,
        },
        stage: 'Escrow Funded',
      }));

      addToast({
        tone: 'success',
        title: 'Escrow funded',
        message: `Payment ${payment.id} created (status: ${payment.status}).`,
      });
    } catch (e) {
      console.error('Failed to create payment', e);
      addToast({
        tone: 'warn',
        title: 'Payment failed',
        message: 'Could not create escrow payment. Please check backend.',
      });
    }
  };

  const markAsShipped = () => {
    if (!escrowFunded) return;
    setDeal((d) => ({
      ...d,
      stage: 'Shipped',
    }));
    addToast({
      tone: 'info',
      title: 'Shipment marked as dispatched',
      message: 'Tracking is available in Logistics.',
      action: { label: 'Go to Logistics', onClick: onGoLogistics },
    });
  };

  const isSignedStage = deal.stage !== 'Draft';

  const handleLoadBackendSummary = async () => {
    if (!deal.backend?.dealId) {
      addToast({
        tone: 'warn',
        title: 'No backend deal linked',
        message: 'Please create a backend deal first (via Create Deal).',
      });
      return;
    }

    try {
      setLoadingBackend(true);
      setBackendError(null);

      const summary = await loadDealSummary(auth, deal.backend.dealId);

      setDeal((prev) => ({
        ...prev,
        backendSummary: summary,
      }));

      addToast({
        tone: 'success',
        title: 'Loaded deal from backend',
        message: `Deal ${summary.dealId} — total ${summary.totalAmount} ${summary.currency}.`,
      });
    } catch (e) {
      console.error('Failed to load backend deal', e);
      setBackendError('Could not load deal from backend');
      addToast({
        tone: 'warn',
        title: 'Failed to load deal',
        message: 'Please check backend / auth and try again.',
      });
    } finally {
      setLoadingBackend(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-slate-900 text-xl font-bold">Deal Workspace</div>
          <div className="mt-1 text-sm text-slate-600">
            Manage negotiation, pricing, risk controls and payment for this deal.
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500">Deal ID</span>
            <span className="text-xs font-extrabold text-slate-900 sf-number">
              {dealIdLocal}
            </span>
            {isSignedStage ? (
              <Badge tone="green" icon={<Icon name="check" className="w-4 h-4" />}>
                Signed
              </Badge>
            ) : null}
          </div>
          {deal.backendSummary ? (
            <div className="mt-1 text-xs text-slate-600">
              Backend:&nbsp;
              <span className="sf-number font-semibold text-slate-900">
                {deal.backendSummary.dealId}
              </span>
              &nbsp;• Status&nbsp;
              <span className="sf-number font-semibold text-slate-900">
                {deal.backendSummary.status}
              </span>
              &nbsp;• Total&nbsp;
              <span className="sf-number font-semibold text-slate-900">
                {deal.backendSummary.totalAmount} {deal.backendSummary.currency}
              </span>
            </div>
          ) : null}
          {backendError ? (
            <div className="mt-1 text-xs text-orange-700">{backendError}</div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onGoLogistics}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Go to Logistics
          </button>
          <button
            onClick={handleLoadBackendSummary}
            disabled={loadingBackend || !deal.backend?.dealId}
            className={
              'rounded-xl border px-4 py-2 text-sm font-semibold ' +
              (deal.backend?.dealId
                ? loadingBackend
                  ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-wait'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed')
            }
          >
            {deal.backendSummary ? 'Refresh from Backend' : 'Load from Backend'}
          </button>
          <button
            onClick={openContractPreview}
            className="rounded-xl bg-[var(--sf-blue-900)] text-white px-4 py-2 text-sm font-semibold hover:bg-[var(--sf-blue-800)]"
          >
            Generate Contract (RFQ)
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* LEFT: Communication */}
        <div className="xl:col-span-6">
          <div className="sf-card rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-bold text-slate-900 truncate">
                      {deal.supplier.name || 'No supplier selected'}
                    </div>
                    {deal.supplier.name && (
                      <>
                        <Badge
                          tone="green"
                          icon={<Icon name="shield" className="w-4 h-4" />}
                        >
                          KYB Verified
                        </Badge>
                        {deal.supplier.rating > 0 && (
                          <Badge tone="gray">
                            Rating {deal.supplier.rating.toFixed(1)}/5
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    Item:{' '}
                    <span className="font-semibold text-slate-900">
                      {deal.item.name || 'Not specified'}
                    </span>
                    {deal.calc.qty ? (
                      <>
                        {' '}
                        • Target: MOQ {deal.calc.qty} units
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <span
                      className={
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ring-1 ring-inset ' +
                        (deal.chatTranslate
                          ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
                          : 'bg-slate-100 text-slate-700 ring-slate-200')
                      }
                    >
                      <span
                        className={
                          'w-2 h-2 rounded-full ' +
                          (deal.chatTranslate ? 'bg-emerald-600' : 'bg-slate-400')
                        }
                      />
                      Auto-Translate: {deal.chatTranslate ? 'ON (RU ↔ CN)' : 'OFF'}
                    </span>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={deal.chatTranslate}
                      onChange={(e) =>
                        setDeal((d) => ({ ...d, chatTranslate: e.target.checked }))
                      }
                    />
                  </label>

                  <button
                    onClick={onAttachClick}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Icon name="paperclip" />
                    Attach
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    onChange={onFileChange}
                  />
                </div>
              </div>
            </div>

            <div className="h-[520px] max-h-[60vh] p-4 overflow-y-auto sf-scrollbar bg-white">
              <div className="space-y-3">
                {deal.chat.length === 0 ? (
                  <div className="text-xs text-slate-400">
                    Start the conversation to see messages here.
                  </div>
                ) : null}
                {deal.chat.map((m) => (
                  <div key={m.id}>
                    {m.role === 'supplier' ? (
                      <ChatBubble
                        side="left"
                        meta={
                          deal.supplier.name
                            ? `Supplier • ${deal.supplier.city || 'Location TBD'}`
                            : undefined
                        }
                        sub={deal.chatTranslate ? m.ru : null}
                      >
                        <div className="font-medium">{m.cn ?? m.ru}</div>
                      </ChatBubble>
                    ) : (
                      <ChatBubble side="right" meta="You">
                        {m.ru}
                      </ChatBubble>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
              <div className="flex items-end gap-2">
                <textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder="Напишите сообщение поставщику… (например: 'Интересует партия. Условия и цена?')"
                  className="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <button
                  onClick={sendMessage}
                  className="rounded-xl bg-[var(--sf-blue-900)] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[var(--sf-blue-800)]"
                >
                  Send
                </button>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Tip: press Enter to send, Shift+Enter for new line.
              </div>
            </div>
          </div>
        </div>
        {/* RIGHT: Deal Engine */}
        <div className="xl:col-span-6">
          <div className="sf-card rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">Deal Engine</div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    Predict landed cost + keep money protected with escrow.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    tone={
                      deal.payment.status === 'Waiting for Deposit'
                        ? 'orange'
                        : deal.payment.status === 'Escrow Funded'
                        ? 'green'
                        : 'gray'
                    }
                    icon={
                      deal.payment.status === 'Waiting for Deposit' ? (
                        <Icon name="clock" className="w-4 h-4" />
                      ) : deal.payment.status === 'Escrow Funded' ? (
                        <Icon name="check" className="w-4 h-4" />
                      ) : undefined
                    }
                  >
                    {deal.payment.status}
                  </Badge>
                </div>
              </div>
              <ProgressStepper steps={steps} current={currentStep} />
            </div>

            <div className="p-4 space-y-4">
              {/* Unit Economy Calculator */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      Unit Economy Calculator
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      HS-code duties + VAT auto-applied to reduce surprises.
                    </div>
                  </div>
                  <Badge tone="blue">Landed Cost (RUB)</Badge>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="block">
                    <div className="text-xs font-semibold text-slate-700">
                      Factory Price (CNY) — per unit
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={deal.calc.factoryPriceCNY}
                      onChange={(e) =>
                        setDeal((d) => ({
                          ...d,
                          calc: {
                            ...d.calc,
                            factoryPriceCNY: clamp(
                              Number(e.target.value || 0),
                              0,
                              100000,
                            ),
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 sf-number"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs font-semibold text-slate-700">
                      Quantity (units)
                    </div>
                    <input
                      type="number"
                      step="1"
                      value={deal.calc.qty}
                      onChange={(e) =>
                        setDeal((d) => ({
                          ...d,
                          calc: {
                            ...d.calc,
                            qty: clamp(parseInt(e.target.value || '0', 10), 1, 100000),
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 sf-number"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs font-semibold text-slate-700">
                      Logistics (Estimated, RUB)
                    </div>
                    <input
                      type="number"
                      step="100"
                      value={deal.calc.logisticsRUB}
                      onChange={(e) =>
                        setDeal((d) => ({
                          ...d,
                          calc: {
                            ...d.calc,
                            logisticsRUB: clamp(Number(e.target.value || 0), 0, 1e9),
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 sf-number"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs font-semibold text-slate-700">HS Code</div>
                    <select
                      value={deal.calc.hs.code}
                      onChange={(e) => {
                        const hs =
                          HS_CODES.find((h) => h.code === e.target.value) || HS_CODES[0];
                        setDeal((d) => ({
                          ...d,
                          calc: { ...d.calc, hs },
                        }));
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                    >
                      {HS_CODES.map((h) => (
                        <option key={h.code} value={h.code}>
                          {h.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-700">
                      Breakdown (RUB)
                    </div>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-600">Factory value</span>
                        <span className="font-semibold text-slate-900 sf-number">
                          {fmt.rub(factoryValueRUB)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-600">+ Logistics</span>
                        <span className="font-semibold text-slate-900 sf-number">
                          {fmt.rub(logisticsRUB)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-600">
                          + Duty ({fmt.pct(dutyRate)})
                        </span>
                        <span className="font-semibold text-slate-900 sf-number">
                          {fmt.rub(dutyRUB)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-600">
                          + VAT ({fmt.pct(vatRate)})
                        </span>
                        <span className="font-semibold text-slate-900 sf-number">
                          {fmt.rub(vatRUB)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                    <div className="text-xs font-semibold text-blue-900">
                      Total Landed Cost
                    </div>
                    <div className="mt-2 text-3xl font-extrabold text-blue-950 sf-number">
                      {fmt.rub(landedRUB)}
                    </div>
                    <div className="mt-1 text-xs text-blue-800">
                      Per unit:{' '}
                      <span className="font-semibold sf-number">
                        {fmt.rub(landedRUB / deal.calc.qty)}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-blue-800">
                      Estimate only. Final duty/VAT depends on customs classification and
                      declared value.
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Block */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      Payment & FX Control
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      Lock CNY/RUB and deposit to escrow to prevent margin shock.
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Live exchange rate</div>
                    <div className="mt-0.5 text-sm font-bold text-slate-900 sf-number">
                      1 CNY = {fmt.num(rateNow, 2)} RUB
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-700">
                      Rate used in calculator
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 sf-number">
                        1 CNY = {fmt.num(rateShown, 2)} RUB
                      </span>
                      {deal.fx.locked ? (
                        <Badge
                          tone="green"
                          icon={<Icon name="check" className="w-4 h-4" />}
                        >
                          Rate Locked
                        </Badge>
                      ) : (
                        <Badge tone="gray">Live</Badge>
                      )}
                      {deal.fx.locked ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <Icon name="clock" className="w-4 h-4" /> {lockRemainingLabel}{' '}
                          left
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={openFxConfirm}
                      className={
                        'rounded-xl px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200 ' +
                        (escrowFunded
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          : 'bg-[var(--sf-teal-600)] text-white hover:brightness-95')
                      }
                      disabled={escrowFunded}
                    >
                      Freeze Rate & Deposit to Escrow
                    </button>
                    <button
                      onClick={depositToEscrow}
                      className={
                        'rounded-xl border px-4 py-2 text-sm font-semibold ' +
                        (escrowFunded
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 cursor-not-allowed'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')
                      }
                      disabled={escrowFunded}
                    >
                      Deposit Now
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-semibold text-slate-700">Escrow</div>
                    <div className="mt-1 text-xs text-slate-600">
                      Funds release only after delivery confirmation.
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-semibold text-slate-700">
                      Bank checks
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Beneficiary name match + KYB entity screening.
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-semibold text-slate-700">
                      Audit trail
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Chat, docs, and contract versions archived automatically.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  This is a prototype: actions simulate workflow states.
                </div>
                <button
                  onClick={markAsShipped}
                  className={
                    'rounded-xl px-4 py-2 text-sm font-semibold ' +
                    (escrowFunded
                      ? 'bg-orange-500 text-white hover:brightness-95'
                      : 'bg-slate-200 text-slate-500 cursor-not-allowed')
                  }
                  disabled={!escrowFunded}
                >
                  Mark as Shipped
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Preview (очень простой, чтобы не раздувать код) */}
      {contractOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 grid place-items-center p-4"
          onClick={() => setContractOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 sf-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="text-base font-bold text-slate-900">
                  Contract Preview
                </div>
                <div className="text-xs text-slate-600">
                  Simplified RFQ/contract placeholder.
                </div>
              </div>
              <button
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                onClick={() => setContractOpen(false)}
              >
                <Icon name="x" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm text-slate-700">
              <p>
                In a real product, here would be a generated PDF contract based on RFQ,
                offer, and order data.
              </p>
              <p>
                Deal ID: <span className="font-semibold sf-number">{dealIdLocal}</span>
              </p>
              <p>
                Supplier: <span className="font-semibold">{deal.supplier.name}</span> (
                {deal.supplier.city})
              </p>
              <p>
                Item: <span className="font-semibold">{deal.item.name}</span> • HS{' '}
                <span className="font-semibold sf-number">{deal.calc.hs.code}</span>
              </p>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() =>
                  addToast({
                    tone: 'info',
                    title: 'Download simulated',
                    message: 'In production, a PDF would be downloaded.',
                  })
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Download
              </button>
              <button
                onClick={signContract}
                className="rounded-xl bg-[var(--sf-blue-900)] text-white px-4 py-2 text-sm font-semibold hover:bg-[var(--sf-blue-800)]"
              >
                Sign Contract
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* FX Confirm Modal */}
      {fxConfirmOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 grid place-items-center p-4"
          onClick={() => setFxConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 sf-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="text-base font-bold text-slate-900">
                Freeze FX & Fund Escrow
              </div>
              <div className="text-xs text-slate-600">
                Lock current CNY/RUB rate and deposit escrow in one step.
              </div>
            </div>
            <div className="p-5 space-y-3 text-sm text-slate-700">
              <p>
                Current live rate:{' '}
                <span className="font-semibold sf-number">
                  1 CNY = {fmt.num(rateNow, 2)} RUB
                </span>
              </p>
              <p>
                Escrow amount (landed cost):{' '}
                <span className="font-semibold sf-number">{fmt.rub(landedRUB)}</span>
              </p>
              <p className="text-xs text-slate-500">
                In production, this would create an FX quote and a payment record, then
                debit your wallet and lock rate for a limited time.
              </p>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setFxConfirmOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmFreezeAndFund}
                className="rounded-xl bg-[var(--sf-teal-600)] text-white px-4 py-2 text-sm font-semibold hover:brightness-95"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};