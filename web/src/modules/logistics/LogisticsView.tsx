import React, { useState } from 'react';
import type { DealState } from '../../state/dealTypes';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icon';
import type { Toast } from '../../components/common/ToastStack';

interface LogisticsViewProps {
  deal: DealState;
  setDeal: React.Dispatch<React.SetStateAction<DealState>>;
  addToast: (t: Omit<Toast, 'id'>) => void;
}

export const LogisticsView: React.FC<LogisticsViewProps> = ({
  deal,
  setDeal,
  addToast,
}) => {
  const [videoOpen, setVideoOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [checkQty, setCheckQty] = useState(false);
  const [checkNoDamage, setCheckNoDamage] = useState(false);

  const delivered = deal.logistics.delivered;
  const releaseScheduled = deal.payment.releaseScheduled;
  const fundsReleased = deal.payment.status === 'Funds Released';

  const simulateDelivery = () => {
    setDeal((d) => ({
      ...d,
      logistics: {
        ...d.logistics,
        delivered: true,
        current: 'Delivered to Moscow',
        deliveredAt: new Date().toISOString(),
      },
    }));
    addToast({
      tone: 'success',
      title: 'Delivery marked complete',
      message:
        'You can now confirm receipt and release escrow funds (demo).',
    });
  };

  const openConfirmModal = () => {
    if (!delivered) return;
    setCheckQty(false);
    setCheckNoDamage(false);
    setConfirmOpen(true);
  };

  const reportProblem = () => {
    setConfirmOpen(false);
    addToast({
      tone: 'warn',
      title: 'Dispute flow (demo)',
      message:
        'Dispute flow is not implemented in this prototype. In production, this would open a claim form.',
    });
  };

  const confirmReceipt = () => {
    if (!checkQty || !checkNoDamage) {
      addToast({
        tone: 'warn',
        title: 'Please confirm both items',
        message: 'Check both boxes to confirm goods are received correctly.',
      });
      return;
    }
    setConfirmOpen(false);
    setDeal((d) => ({
      ...d,
      payment: {
        ...d.payment,
        status: 'Funds Released',
        releaseScheduled: true,
        releasedAt: new Date().toISOString(),
      },
      stage: 'Shipped',
    }));
    addToast({
      tone: 'success',
      title: 'Receipt confirmed. Escrow funds ready to release (demo)',
      message: 'Funds will be transferred to supplier within 24 hours.',
    });
  };

  const timelineSteps = [
    { label: 'Production Done', state: 'done', detail: 'Completed on schedule' },
    { label: 'Customs Cleared', state: 'done', detail: 'Cleared at Zabaikalsk' },
    {
      label: 'Last Mile Delivery',
      state: delivered ? 'done' : 'active',
      detail: delivered ? 'Delivered to Moscow' : 'In progress — driver assigned',
    },
  ] as const;

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-slate-900 text-xl font-bold">
            Logistics & Execution
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Track cargo from China to Moscow with proof and milestones.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            tone={delivered ? 'green' : 'orange'}
            icon={
              delivered ? (
                <Icon name="check" className="w-4 h-4" />
              ) : (
                <Icon name="clock" className="w-4 h-4" />
              )
            }
          >
            {delivered ? 'Delivered' : 'In transit'}
          </Badge>
          {fundsReleased ? (
            <Badge tone="green" icon={<Icon name="check" className="w-4 h-4" />}>
              Funds Released
            </Badge>
          ) : releaseScheduled ? (
            <Badge tone="blue" icon={<Icon name="clock" className="w-4 h-4" />}>
              Release Scheduled
            </Badge>
          ) : null}
          {!delivered ? (
            <button
              onClick={simulateDelivery}
              className="rounded-xl bg-orange-500 text-white px-4 py-2 text-sm font-semibold hover:brightness-95"
            >
              Simulate Delivery (demo)
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Map */}
        <div className="xl:col-span-8">
          <div className="sf-card rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">Route Map</div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    China → Border → Moscow
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Current status</div>
                  <div className="mt-0.5 text-sm font-bold text-slate-900">
                    {deal.logistics.current}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 sf-grid-bg p-4">
                <svg viewBox="0 0 900 320" className="w-full h-[260px]">
                  <defs>
                    <linearGradient id="routeComplete" x1="0" x2="1">
                      <stop offset="0" stopColor="#16A34A" />
                      <stop offset="0.5" stopColor="#16A34A" />
                      <stop offset="1" stopColor="#16A34A" />
                    </linearGradient>
                    <linearGradient id="routeInProgress" x1="0" x2="1">
                      <stop offset="0" stopColor="#0EA5A2" />
                      <stop offset="0.6" stopColor="#0B1F3B" />
                      <stop offset="1" stopColor="#F97316" />
                    </linearGradient>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow
                        dx="0"
                        dy="6"
                        stdDeviation="8"
                        floodColor="#0f172a"
                        floodOpacity="0.18"
                      />
                    </filter>
                  </defs>

                  {/* landmass cards */}
                  <g filter="url(#shadow)">
                    <rect
                      x="30"
                      y="30"
                      width="300"
                      height="260"
                      rx="22"
                      fill="#ffffff"
                      stroke="#e2e8f0"
                    />
                    <rect
                      x="350"
                      y="30"
                      width="200"
                      height="260"
                      rx="22"
                      fill="#ffffff"
                      stroke="#e2e8f0"
                    />
                    <rect
                      x="570"
                      y="30"
                      width="300"
                      height="260"
                      rx="22"
                      fill={delivered ? '#f0fdf4' : '#ffffff'}
                      stroke={delivered ? '#bbf7d0' : '#e2e8f0'}
                    />
                  </g>

                  <text
                    x="60"
                    y="70"
                    fill="#0f172a"
                    fontSize="16"
                    fontWeight="700"
                  >
                    China
                  </text>
                  <text
                    x="380"
                    y="70"
                    fill="#0f172a"
                    fontSize="16"
                    fontWeight="700"
                  >
                    Border
                  </text>
                  <text
                    x="600"
                    y="70"
                    fill={delivered ? '#166534' : '#0f172a'}
                    fontSize="16"
                    fontWeight="700"
                  >
                    Russia (Moscow)
                  </text>

                  {/* route */}
                  <path
                    d="M110 180 C 240 120, 300 240, 420 190 S 590 140, 740 180"
                    fill="none"
                    stroke={
                      delivered
                        ? 'url(#routeComplete)'
                        : 'url(#routeInProgress)'
                    }
                    strokeWidth="10"
                    strokeLinecap="round"
                    opacity="0.95"
                  />

                  {/* nodes */}
                  <g>
                    {/* China node */}
                    <circle cx="110" cy="180" r="22" fill="#16A34A" opacity="0.15" />
                    <circle cx="110" cy="180" r="12" fill="#16A34A" />

                    {/* Border node */}
                    <circle cx="420" cy="190" r="22" fill="#16A34A" opacity="0.15" />
                    <circle cx="420" cy="190" r="12" fill="#16A34A" />

                    {/* Moscow node */}
                    <circle
                      cx="740"
                      cy="180"
                      r="22"
                      fill={delivered ? '#16A34A' : '#F97316'}
                      opacity="0.15"
                    />
                    <circle
                      cx="740"
                      cy="180"
                      r={delivered ? 16 : 12}
                      fill={delivered ? '#16A34A' : '#F97316'}
                      className={delivered ? '' : 'sf-animate-pulse-soft'}
                    />
                    {delivered ? (
                      <g transform="translate(732, 172)">
                        <path
                          d="M3 8l3 3 6-6"
                          stroke="white"
                          strokeWidth="2.5"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                    ) : null}
                  </g>

                  <text
                    x="80"
                    y="220"
                    fill="#334155"
                    fontSize="12"
                    fontWeight="600"
                  >
                    Shenzhen
                  </text>
                  <text
                    x="385"
                    y="230"
                    fill="#334155"
                    fontSize="12"
                    fontWeight="600"
                  >
                    Zabaikalsk
                  </text>
                  <text
                    x="700"
                    y="220"
                    fill={delivered ? '#166534' : '#334155'}
                    fontSize="12"
                    fontWeight="700"
                  >
                    Moscow {delivered ? '✓' : ''}
                  </text>

                  {/* Delivered banner */}
                  {delivered ? (
                    <g>
                      <rect
                        x="620"
                        y="100"
                        width="140"
                        height="32"
                        rx="8"
                        fill="#16A34A"
                      />
                      <text
                        x="690"
                        y="121"
                        fill="white"
                        fontSize="13"
                        fontWeight="700"
                        textAnchor="middle"
                      >
                        DELIVERED
                      </text>
                    </g>
                  ) : null}
                </svg>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-semibold text-slate-700">
                      Container
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-900">
                      Rail LCL
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {delivered ? 'Delivered' : 'ETA: 9–12 days (demo)'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-semibold text-slate-700">
                      Tracking ID
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-900 sf-number">
                      SF-RT-2941-77
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {delivered ? 'Final status' : 'Updates every 6 hours'}
                    </div>
                  </div>
                  <div
                    className={
                      'rounded-xl border p-3 ' +
                      (fundsReleased
                        ? 'border-emerald-200 bg-emerald-50'
                        : releaseScheduled
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-slate-200 bg-white')
                    }
                  >
                    <div
                      className={
                        'text-xs font-semibold ' +
                        (fundsReleased
                          ? 'text-emerald-700'
                          : releaseScheduled
                          ? 'text-blue-700'
                          : 'text-slate-700')
                      }
                    >
                      Escrow
                    </div>
                    <div
                      className={
                        'mt-1 text-sm font-bold ' +
                        (fundsReleased
                          ? 'text-emerald-900'
                          : releaseScheduled
                          ? 'text-blue-900'
                          : 'text-slate-900')
                      }
                    >
                      {fundsReleased
                        ? 'Released'
                        : releaseScheduled
                        ? 'Release Scheduled'
                        : deal.payment.status}
                    </div>
                    <div
                      className={
                        'mt-1 text-xs ' +
                        (fundsReleased
                          ? 'text-emerald-700'
                          : releaseScheduled
                          ? 'text-blue-700'
                          : 'text-slate-600')
                      }
                    >
                      {fundsReleased
                        ? 'Transferred to supplier'
                        : releaseScheduled
                        ? 'Processing within 24h'
                        : 'Release after receipt confirmation'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline + Proof */}
        <div className="xl:col-span-4 space-y-4">
          <div className="sf-card rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-slate-900">
                Status Timeline
              </div>
              {delivered ? (
                <Badge
                  tone="green"
                  icon={<Icon name="check" className="w-4 h-4" />}
                >
                  Complete
                </Badge>
              ) : null}
            </div>
            <div className="mt-3 space-y-3">
              {timelineSteps.map((t, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className={
                      'mt-0.5 w-8 h-8 rounded-full grid place-items-center ring-1 ring-inset ' +
                      (t.state === 'done'
                        ? 'bg-emerald-600 text-white ring-emerald-200'
                        : 'bg-orange-50 text-orange-700 ring-orange-100')
                    }
                  >
                    {t.state === 'done' ? (
                      <Icon name="check" className="w-4 h-4" />
                    ) : (
                      <Icon name="clock" className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-900">
                      {t.label}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      {t.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!fundsReleased ? (
              <div
                className={
                  'mt-4 rounded-xl border p-3 ' +
                  (delivered
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-orange-200 bg-orange-50')
                }
              >
                <div className="flex items-start gap-2">
                  <div
                    className={
                      delivered
                        ? 'text-emerald-700 mt-0.5'
                        : 'text-orange-700 mt-0.5'
                    }
                  >
                    <Icon name={delivered ? 'check' : 'alert'} />
                  </div>
                  <div>
                    <div
                      className={
                        'text-xs font-semibold ' +
                        (delivered ? 'text-emerald-900' : 'text-orange-900')
                      }
                    >
                      {delivered ? 'Ready for confirmation' : 'Action required'}
                    </div>
                    <div
                      className={
                        'mt-0.5 text-xs ' +
                        (delivered ? 'text-emerald-800' : 'text-orange-800')
                      }
                    >
                      {delivered
                        ? 'Click below to confirm receipt and release escrow funds.'
                        : 'Confirm receipt to release escrow funds after delivery.'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-start gap-2">
                  <div className="text-emerald-700 mt-0.5">
                    <Icon name="check" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-emerald-900">
                      Transaction complete
                    </div>
                    <div className="mt-0.5 text-xs text-emerald-800">
                      Funds released to supplier. Deal archived.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Video Proof card */}
          <div className="sf-card rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900">Video Proof</div>
                <div className="mt-0.5 text-xs text-slate-600">
                  Supplier/warehouse uploads acceptance video.
                </div>
              </div>
              <Badge tone="green">Uploaded</Badge>
            </div>

            <button
              onClick={() => setVideoOpen(true)}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden hover:bg-slate-100 transition"
            >
              <div className="relative h-36">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-slate-900/60 to-teal-600/60" />
                <div className="absolute inset-0 sf-grid-bg opacity-30" />
                <div className="absolute inset-0 grid place-items-center">
                  <div className="rounded-full bg-white/15 ring-1 ring-white/25 p-4 hover:bg-white/25 transition">
                    <Icon name="play" className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div className="absolute left-3 bottom-3 text-left">
                  <div className="text-white text-sm font-bold">Acceptance Video</div>
                  <div className="text-white/80 text-xs">
                    Sealed cartons + random sample inspection
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

            <div className="mt-4">
              <button
                onClick={openConfirmModal}
                disabled={!delivered || fundsReleased}
                className={
                  'w-full rounded-xl px-4 py-3 text-sm font-extrabold tracking-wide focus:outline-none focus:ring-2 focus:ring-blue-200 transition ' +
                  (delivered && !fundsReleased
                    ? 'bg-[var(--sf-teal-600)] text-white hover:brightness-95'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed')
                }
              >
                {fundsReleased
                  ? 'Funds Already Released'
                  : 'Confirm Receipt & Release Funds'}
              </button>
              <div className="mt-2 text-xs text-slate-500">
                {fundsReleased
                  ? 'This transaction has been completed.'
                  : delivered
                  ? 'Click to open confirmation checklist.'
                  : 'Disabled until delivery is completed.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Preview Modal */}
      {videoOpen ? (
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
                  Acceptance Video Preview
                </div>
                <div className="text-xs text-slate-600">
                  Warehouse inspection footage from supplier
                </div>
              </div>
              <button
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                onClick={() => setVideoOpen(false)}
              >
                <Icon name="x" />
              </button>
            </div>
            <div className="p-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-100 h-72 grid place-items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-slate-900/10 to-teal-600/20" />
                <div className="absolute inset-0 sf-grid-bg opacity-40" />
                <div className="text-center relative z-10">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 grid place-items-center ring-4 ring-blue-50">
                    <Icon name="play" className="w-8 h-8" />
                  </div>
                  <div className="mt-4 text-sm font-semibold text-slate-900">
                    Video stream placeholder
                  </div>
                  <div className="mt-1 text-xs text-slate-600 max-w-xs mx-auto">
                    In a real app, this would be the inspection video from the warehouse
                    showing:
                  </div>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <Badge tone="gray">Sealed cartons</Badge>
                    <Badge tone="gray">Quantity check</Badge>
                    <Badge tone="gray">Random sampling</Badge>
                    <Badge tone="gray">Packaging condition</Badge>
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-start gap-2">
                  <div className="text-blue-700 mt-0.5">
                    <Icon name="spark" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-blue-900">
                      Why video proof matters
                    </div>
                    <div className="mt-0.5 text-xs text-blue-800">
                      Video evidence reduces dispute risk by documenting cargo condition
                      before shipment. Review before confirming receipt.
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setVideoOpen(false)}
                className="rounded-xl bg-[var(--sf-blue-900)] text-white px-4 py-2 text-sm font-semibold hover:bg-[var(--sf-blue-800)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Confirm Goods Receipt Modal */}
      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 grid place-items-center p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 sf-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="text-base font-bold text-slate-900">
                Confirm Goods Receipt
              </div>
              <div className="text-xs text-slate-600">
                Please verify the following before releasing escrow funds.
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
                      Quantity matches invoice
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      I confirm that the number of units received matches the invoice
                      quantity.
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
                      No visible damage or issues
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      I confirm that goods are in acceptable condition with no visible
                      defects.
                    </div>
                  </div>
                </label>
              </div>

              <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                <div className="flex items-start gap-2">
                  <div className="text-orange-700 mt-0.5">
                    <Icon name="alert" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-orange-900">
                      Important
                    </div>
                    <div className="mt-0.5 text-xs text-orange-800">
                      Once you confirm, escrow funds will be released to the supplier. This
                      action cannot be undone.
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={reportProblem}
                  className="text-sm font-semibold text-orange-700 hover:text-orange-900 underline underline-offset-2"
                >
                  Report a problem instead (demo)
                </button>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmReceipt}
                disabled={!checkQty || !checkNoDamage}
                className={
                  'rounded-xl px-4 py-2 text-sm font-semibold transition ' +
                  (checkQty && checkNoDamage
                    ? 'bg-[var(--sf-teal-600)] text-white hover:brightness-95'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed')
                }
              >
                Confirm & Release Funds
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};