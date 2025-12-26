// src/modules/suppliers/SupplierConsoleView.tsx
import React, { useEffect, useMemo, useState } from 'react';
import type { AuthState } from '../../state/authTypes';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icon';
import { fmt } from '../../components/lib/format';
import type { Toast } from '../../components/common/ToastStack';
import { api } from '../../api/client';

interface SupplierConsoleViewProps {
  auth: AuthState;
  addToast: (t: Omit<Toast, 'id'>) => void;
}

interface RFQItemDto {
  productId?: string | null;
  name: string;
  qty: number;
  unit: string;
  targetPrice?: number | null;
  notes?: string | null;
}

type RFQStatus = 'draft' | 'sent' | 'responded' | 'closed';

interface RFQDto {
  id: string;
  buyerOrgId: string;
  supplierOrgId?: string | null;
  status: RFQStatus;
  items: RFQItemDto[];
  createdAt: string;
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

// ===== API функции =====
async function listSupplierRFQs(auth: AuthState): Promise<RFQDto[]> {
  return api<RFQDto[]>('/rfqs?role=supplier', {}, auth.tokens.accessToken);
}

interface OfferCreateInput {
  currency: 'CNY' | 'RUB' | 'USD';
  items: {
    rfqItemIndex: number;
    productId: string | null;
    name: string;
    qty: number;
    unit: string;
    price: number;
    subtotal: number;
  }[];
  incoterms: string;
  paymentTerms: string;
  validUntil: string | null;
}

async function createOffer(
  auth: AuthState,
  rfqId: string,
  input: OfferCreateInput,
): Promise<{ id: string }> {
  return api<{ id: string }>(
    `/rfqs/${rfqId}/offers`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    auth.tokens.accessToken,
  );
}

export const SupplierConsoleView: React.FC<SupplierConsoleViewProps> = ({
  auth,
  addToast,
}) => {
  const [rfqs, setRfqs] = useState<RFQDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Модал создания Offer
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [selectedRfq, setSelectedRfq] = useState<RFQDto | null>(null);
  const [offerPrice, setOfferPrice] = useState<number>(0);
  const [offerQty, setOfferQty] = useState<number>(0);
  const [offerIncoterms, setOfferIncoterms] = useState<string>('FOB Shenzhen');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Детали RFQ
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRfq, setDetailsRfq] = useState<RFQDto | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await listSupplierRFQs(auth);
        setRfqs(
          data.slice().sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)),
        );
      } catch (e) {
        console.error('Failed to load supplier RFQs', e);
        setError('Не удалось загрузить запросы');
        addToast({
          tone: 'warn',
          title: 'Ошибка загрузки',
          message: 'Проверьте подключение к серверу.',
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [auth, addToast]);

  const stats = useMemo(() => {
    const total = rfqs.length;
    const pending = rfqs.filter((r) => r.status === 'sent').length;
    const responded = rfqs.filter((r) => r.status === 'responded').length;
    const closed = rfqs.filter((r) => r.status === 'closed').length;
    return { total, pending, responded, closed };
  }, [rfqs]);

  const openOfferModal = (rfq: RFQDto) => {
    const item = rfq.items[0];
    setSelectedRfq(rfq);
    setOfferPrice(item?.targetPrice || 100);
    setOfferQty(item?.qty || 100);
    setOfferIncoterms('FOB Shenzhen');
    setOfferModalOpen(true);
  };

  const submitOffer = async () => {
    if (!selectedRfq) return;

    const item = selectedRfq.items[0];
    if (!item) {
      addToast({
        tone: 'warn',
        title: 'Ошибка',
        message: 'RFQ не содержит позиций.',
      });
      return;
    }

    try {
      setSubmittingOffer(true);

      const input: OfferCreateInput = {
        currency: 'CNY',
        items: [
          {
            rfqItemIndex: 0,
            productId: item.productId || null,
            name: item.name,
            qty: offerQty,
            unit: item.unit,
            price: offerPrice,
            subtotal: offerPrice * offerQty,
          },
        ],
        incoterms: offerIncoterms,
        paymentTerms: '100% предоплата в эскроу',
        validUntil: null,
      };

      const offer = await createOffer(auth, selectedRfq.id, input);

      setOfferModalOpen(false);
      addToast({
        tone: 'success',
        title: 'Предложение отправлено!',
        message: `Offer ID: ${offer.id.slice(0, 8)}… Покупатель получит уведомление.`,
      });

      // Обновляем список RFQ
      const updated = await listSupplierRFQs(auth);
      setRfqs(updated.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)));
    } catch (e) {
      console.error('Failed to create offer', e);
      addToast({
        tone: 'warn',
        title: 'Ошибка отправки',
        message: 'Не удалось создать предложение. Попробуйте позже.',
      });
    } finally {
      setSubmittingOffer(false);
    }
  };

  const openDetails = (rfq: RFQDto) => {
    setDetailsRfq(rfq);
    setDetailsOpen(true);
  };

  const getStatusBadge = (status: RFQStatus) => {
    switch (status) {
      case 'sent':
        return (
          <Badge tone="orange" icon={<Icon name="clock" className="w-4 h-4" />}>
            Ожидает ответа
          </Badge>
        );
      case 'responded':
        return (
          <Badge tone="blue" icon={<Icon name="check" className="w-4 h-4" />}>
            Отправлен Offer
          </Badge>
        );
      case 'closed':
        return (
          <Badge tone="green" icon={<Icon name="check" className="w-4 h-4" />}>
            Сделка создана
          </Badge>
        );
      default:
        return <Badge tone="gray">Черновик</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* ===== STATS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="sf-card rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 grid place-items-center">
              <Icon name="docs" className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Всего запросов</div>
              <div className="text-xl font-extrabold text-slate-900 sf-number">
                {stats.total}
              </div>
            </div>
          </div>
        </div>
        <div className="sf-card rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 grid place-items-center">
              <Icon name="clock" className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-orange-700">Ожидают ответа</div>
              <div className="text-xl font-extrabold text-orange-900 sf-number">
                {stats.pending}
              </div>
            </div>
          </div>
        </div>
        <div className="sf-card rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 grid place-items-center">
              <Icon name="deals" className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-blue-700">Offer отправлен</div>
              <div className="text-xl font-extrabold text-blue-900 sf-number">
                {stats.responded}
              </div>
            </div>
          </div>
        </div>
        <div className="sf-card rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 grid place-items-center">
              <Icon name="check" className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-emerald-700">Сделки созданы</div>
              <div className="text-xl font-extrabold text-emerald-900 sf-number">
                {stats.closed}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== RFQ LIST ===== */}
      <div className="sf-card rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-sm font-bold text-slate-900">
                Входящие запросы (RFQ)
              </div>
              <HelpTip title="Что такое RFQ?">
                Request for Quotation — запрос коммерческого предложения от
                покупателя. Вы можете ответить своим Offer с ценой и условиями.
              </HelpTip>
            </div>
            <div className="text-xs text-slate-500">
              {loading ? 'Загрузка…' : `${rfqs.length} запросов`}
            </div>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 bg-orange-50 border-b border-orange-200">
            <div className="text-xs text-orange-700">{error}</div>
          </div>
        )}

        {rfqs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {rfqs.map((rfq) => {
              const item = rfq.items[0];
              const canRespond = rfq.status === 'sent';

              return (
                <div
                  key={rfq.id}
                  className="p-4 hover:bg-slate-50 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">
                          {item?.name || 'Без названия'}
                        </span>
                        {getStatusBadge(rfq.status)}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        <span className="sf-number">
                          Кол-во: {item?.qty} {item?.unit}
                        </span>
                        {item?.targetPrice && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="sf-number">
                              Целевая цена: {fmt.cny(item.targetPrice)}
                            </span>
                          </>
                        )}
                        <span className="text-slate-300">•</span>
                        <span>
                          {new Date(rfq.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      {item?.notes && (
                        <div className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-2">
                          💬 {item.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openDetails(rfq)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Детали
                      </button>
                      {canRespond && (
                        <button
                          onClick={() => openOfferModal(rfq)}
                          className="rounded-xl bg-blue-600 text-white px-4 py-2 text-xs font-semibold hover:bg-blue-700"
                        >
                          Отправить Offer
                        </button>
                      )}
                      {rfq.status === 'responded' && (
                        <span className="text-xs text-blue-600 font-medium">
                          Ожидаем ответ покупателя
                        </span>
                      )}
                      {rfq.status === 'closed' && (
                        <span className="text-xs text-emerald-600 font-medium">
                          ✓ Сделка активна
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : !loading ? (
          <div className="px-4 py-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 grid place-items-center mb-4">
              <Icon name="docs" className="w-8 h-8" />
            </div>
            <div className="text-sm font-semibold text-slate-700">
              Пока нет входящих запросов
            </div>
            <div className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Когда покупатель создаст RFQ для вашей организации, он появится
              здесь. В демо-режиме войдите как покупатель и создайте RFQ.
            </div>
          </div>
        ) : null}
      </div>

      {/* ===== INFO CARD ===== */}
      <div className="sf-card rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 mt-0.5">
            <Icon name="spark" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-blue-900">
              Совет: быстрый ответ повышает конверсию
            </div>
            <div className="mt-1 text-xs text-blue-800">
              Покупатели чаще выбирают поставщиков, которые отвечают в течение
              часа. Настройте уведомления, чтобы не пропустить новые запросы.
            </div>
          </div>
        </div>
      </div>

      {/* ===== OFFER MODAL ===== */}
      {offerModalOpen && selectedRfq && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 grid place-items-center p-4"
          onClick={() => setOfferModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 sf-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 bg-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white grid place-items-center">
                  <Icon name="deals" className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-bold text-blue-900">
                    Создать коммерческое предложение
                  </div>
                  <div className="text-xs text-blue-700">
                    RFQ: {selectedRfq.id.slice(0, 8)}…
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Товар из RFQ */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-600 mb-1">
                  Запрашиваемый товар
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {selectedRfq.items[0]?.name}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Запрошено: {selectedRfq.items[0]?.qty}{' '}
                  {selectedRfq.items[0]?.unit}
                  {selectedRfq.items[0]?.targetPrice && (
                    <span>
                      {' '}
                      • Целевая цена: {fmt.cny(selectedRfq.items[0].targetPrice)}
                    </span>
                  )}
                </div>
              </div>

              {/* Цена за единицу */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Цена за единицу (CNY)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-4 pr-12 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 sf-number"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
                    ¥
                  </span>
                </div>
              </div>

              {/* Количество */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Количество
                </label>
                <input
                  type="number"
                  value={offerQty}
                  onChange={(e) => setOfferQty(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 sf-number"
                />
              </div>

              {/* Incoterms */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Условия поставки (Incoterms)
                </label>
                <select
                  value={offerIncoterms}
                  onChange={(e) => setOfferIncoterms(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                >
                  <option value="FOB Shenzhen">FOB Shenzhen</option>
                  <option value="FOB Ningbo">FOB Ningbo</option>
                  <option value="CIF Moscow">CIF Moscow</option>
                  <option value="DAP Moscow">DAP Moscow</option>
                  <option value="EXW Factory">EXW Factory</option>
                </select>
              </div>

              {/* Итого */}
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-teal-900">
                    Итого по предложению
                  </div>
                  <div className="text-xl font-extrabold text-teal-950 sf-number">
                    {fmt.cny(offerPrice * offerQty)}
                  </div>
                </div>
                <div className="mt-1 text-xs text-teal-700">
                  {offerQty} × {fmt.cny(offerPrice)} = {fmt.cny(offerPrice * offerQty)}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setOfferModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                onClick={submitOffer}
                disabled={submittingOffer || offerPrice <= 0 || offerQty <= 0}
                className={
                  'rounded-xl px-4 py-2 text-sm font-semibold transition ' +
                  (submittingOffer || offerPrice <= 0 || offerQty <= 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700')
                }
              >
                {submittingOffer ? 'Отправка…' : 'Отправить Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DETAILS MODAL ===== */}
      {detailsOpen && detailsRfq && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 grid place-items-center p-4"
          onClick={() => setDetailsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 sf-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="text-base font-bold text-slate-900">
                Детали запроса
              </div>
              <div className="text-xs text-slate-600">
                ID: {detailsRfq.id}
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-600">Товар</span>
                <span className="text-sm font-semibold text-slate-900">
                  {detailsRfq.items[0]?.name || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-600">Количество</span>
                <span className="text-sm font-semibold text-slate-900 sf-number">
                  {detailsRfq.items[0]?.qty} {detailsRfq.items[0]?.unit}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-600">Целевая цена</span>
                <span className="text-sm font-semibold text-slate-900 sf-number">
                  {detailsRfq.items[0]?.targetPrice
                    ? fmt.cny(detailsRfq.items[0].targetPrice)
                    : 'Не указана'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-600">Статус</span>
                {getStatusBadge(detailsRfq.status)}
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-600">Дата создания</span>
                <span className="text-sm font-semibold text-slate-900">
                  {new Date(detailsRfq.createdAt).toLocaleString('ru-RU')}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-slate-600">ID покупателя</span>
                <span className="text-xs text-slate-500 sf-number">
                  {detailsRfq.buyerOrgId.slice(0, 12)}…
                </span>
              </div>
              {detailsRfq.items[0]?.notes && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-600 mb-1">
                    Комментарий покупателя
                  </div>
                  <div className="text-sm text-slate-700">
                    {detailsRfq.items[0].notes}
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setDetailsOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Закрыть
              </button>
              {detailsRfq.status === 'sent' && (
                <button
                  onClick={() => {
                    setDetailsOpen(false);
                    openOfferModal(detailsRfq);
                  }}
                  className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
                >
                  Отправить Offer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};