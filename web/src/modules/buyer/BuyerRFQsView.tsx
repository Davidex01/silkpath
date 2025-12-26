// src/modules/buyer/BuyerRFQsView.tsx
import React, { useEffect, useMemo, useState } from 'react';
import type { AuthState } from '../../state/authTypes';
import type { DealState } from '../../state/dealTypes';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icon';
import { fmt } from '../../components/lib/format';
import type { Toast } from '../../components/common/ToastStack';
import {
  listBuyerRFQs,
  listOffersForRFQ,
  acceptOffer,
  createBuyerRFQ,
  type RFQDto,
  type OfferDto,
} from '../../api/rfqs';

interface BuyerRFQsViewProps {
  auth: AuthState;
  setDeal: React.Dispatch<React.SetStateAction<DealState>>;
  addToast: (t: Omit<Toast, 'id'>) => void;
  prefillSupplierOrgId: string | null;
  prefillDefaultItemName: string | null;
  onPrefillConsumed: () => void;
  onActivateDealView: () => void;
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

export const BuyerRFQsView: React.FC<BuyerRFQsViewProps> = ({
  auth,
  setDeal,
  addToast,
  prefillSupplierOrgId,
  prefillDefaultItemName,
  onPrefillConsumed,
  onActivateDealView,
}) => {
  const [rfqs, setRfqs] = useState<RFQDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Создание RFQ
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRfqSupplierOrgId, setNewRfqSupplierOrgId] = useState('');
  const [newRfqItemName, setNewRfqItemName] = useState('');
  const [newRfqQty, setNewRfqQty] = useState(100);
  const [newRfqTargetPrice, setNewRfqTargetPrice] = useState<number | null>(null);
  const [newRfqNotes, setNewRfqNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // Просмотр Offers
  const [offersModalOpen, setOffersModalOpen] = useState(false);
  const [selectedRfq, setSelectedRfq] = useState<RFQDto | null>(null);
  const [offers, setOffers] = useState<OfferDto[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);

  // Загрузка RFQ
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await listBuyerRFQs(auth);
        setRfqs(data.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)));
      } catch (e) {
        console.error('Failed to load buyer RFQs', e);
        setError('Не удалось загрузить запросы');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [auth]);

  // Автозаполнение при переходе из SupplierProfileDrawer
  useEffect(() => {
    if (prefillSupplierOrgId) {
      setNewRfqSupplierOrgId(prefillSupplierOrgId);
      setNewRfqItemName(prefillDefaultItemName || 'Новый товар');
      setCreateModalOpen(true);
      onPrefillConsumed();
    }
  }, [prefillSupplierOrgId, prefillDefaultItemName, onPrefillConsumed]);

  const stats = useMemo(() => {
    const total = rfqs.length;
    const sent = rfqs.filter((r) => r.status === 'sent').length;
    const responded = rfqs.filter((r) => r.status === 'responded').length;
    const closed = rfqs.filter((r) => r.status === 'closed').length;
    return { total, sent, responded, closed };
  }, [rfqs]);

  // Создание RFQ
  const handleCreateRfq = async () => {
    if (!newRfqSupplierOrgId || !newRfqItemName) {
      addToast({
        tone: 'warn',
        title: 'Заполните поля',
        message: 'Укажите ID поставщика и название товара.',
      });
      return;
    }

    try {
      setCreating(true);
      await createBuyerRFQ(auth, {
        supplierOrgId: newRfqSupplierOrgId,
        itemName: newRfqItemName,
        qty: newRfqQty,
        unit: 'piece',
        targetPrice: newRfqTargetPrice,
        notes: newRfqNotes || null,
      });

      setCreateModalOpen(false);
      setNewRfqSupplierOrgId('');
      setNewRfqItemName('');
      setNewRfqQty(100);
      setNewRfqTargetPrice(null);
      setNewRfqNotes('');

      addToast({
        tone: 'success',
        title: 'RFQ отправлен!',
        message: 'Поставщик получит уведомление и сможет ответить предложением.',
      });

      // Обновляем список
      const updated = await listBuyerRFQs(auth);
      setRfqs(updated.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)));
    } catch (e) {
      console.error('Failed to create RFQ', e);
      addToast({
        tone: 'warn',
        title: 'Ошибка создания',
        message: 'Не удалось создать RFQ. Проверьте данные.',
      });
    } finally {
      setCreating(false);
    }
  };

  // Открыть Offers для RFQ
  const openOffers = async (rfq: RFQDto) => {
    setSelectedRfq(rfq);
    setOffers([]);
    setOffersModalOpen(true);

    try {
      setOffersLoading(true);
      const data = await listOffersForRFQ(auth, rfq.id);
      setOffers(data);
    } catch (e) {
      console.error('Failed to load offers', e);
      addToast({
        tone: 'warn',
        title: 'Ошибка загрузки',
        message: 'Не удалось загрузить предложения.',
      });
    } finally {
      setOffersLoading(false);
    }
  };

  // Принять Offer → создаётся Deal
  const handleAcceptOffer = async (offer: OfferDto) => {
    try {
      setAccepting(true);
      const result = await acceptOffer(auth, offer.id);

      setOffersModalOpen(false);

      // Обновляем состояние deal
      setDeal((prev) => ({
        ...prev,
        backend: {
          rfqId: selectedRfq?.id,
          offerId: result.offer.id,
          orderId: result.order.id,
          dealId: result.deal.id,
        },
        backendSummary: {
          dealId: result.deal.id,
          rfqId: selectedRfq?.id || '',
          offerId: result.offer.id,
          orderId: result.order.id,
          status: 'ordered',
          currency: result.order.currency,
          totalAmount: result.order.totalAmount,
        },
      }));

      addToast({
        tone: 'success',
        title: 'Предложение принято!',
        message: `Сделка создана. ID: ${result.deal.id.slice(0, 8)}…`,
        action: {
          label: 'Перейти к сделке',
          onClick: onActivateDealView,
        },
      });

      // Обновляем список RFQ
      const updated = await listBuyerRFQs(auth);
      setRfqs(updated.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)));
    } catch (e) {
      console.error('Failed to accept offer', e);
      addToast({
        tone: 'warn',
        title: 'Ошибка',
        message: 'Не удалось принять предложение.',
      });
    } finally {
      setAccepting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge tone="gray">Черновик</Badge>;
      case 'sent':
        return (
          <Badge tone="orange" icon={<Icon name="clock" className="w-4 h-4" />}>
            Ожидает ответа
          </Badge>
        );
      case 'responded':
        return (
          <Badge tone="blue" icon={<Icon name="check" className="w-4 h-4" />}>
            Есть предложения
          </Badge>
        );
      case 'closed':
        return (
          <Badge tone="green" icon={<Icon name="check" className="w-4 h-4" />}>
            Сделка создана
          </Badge>
        );
      default:
        return <Badge tone="gray">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-slate-900 text-xl font-bold">
              Мои запросы (RFQ)
            </div>
            <HelpTip title="Что такое RFQ?">
              Request for Quotation — запрос коммерческого предложения. Вы
              отправляете запрос поставщику, он отвечает своим Offer с ценой и
              условиями.
            </HelpTip>
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Создавайте запросы поставщикам и принимайте лучшие предложения
          </div>
          {error && (
            <div className="mt-1 text-xs text-orange-700">{error}</div>
          )}
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="rounded-xl bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 flex items-center gap-2"
        >
          <Icon name="docs" className="w-4 h-4" />
          Создать RFQ
        </button>
      </div>

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
                {stats.sent}
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
              <div className="text-xs text-blue-700">Есть предложения</div>
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
            <div className="text-sm font-bold text-slate-900">
              Ваши запросы
            </div>
            <div className="text-xs text-slate-500">
              {loading ? 'Загрузка…' : `${rfqs.length} запросов`}
            </div>
          </div>
        </div>

        {rfqs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {rfqs.map((rfq) => {
              const item = rfq.items[0];
              const hasOffers = rfq.status === 'responded';
              const isClosed = rfq.status === 'closed';

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
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasOffers && (
                        <button
                          onClick={() => openOffers(rfq)}
                          className="rounded-xl bg-blue-600 text-white px-4 py-2 text-xs font-semibold hover:bg-blue-700 flex items-center gap-1"
                        >
                          <Icon name="deals" className="w-4 h-4" />
                          Смотреть предложения
                        </button>
                      )}
                      {!hasOffers && !isClosed && (
                        <span className="text-xs text-slate-500">
                          Ожидаем ответ поставщика
                        </span>
                      )}
                      {isClosed && (
                        <button
                          onClick={onActivateDealView}
                          className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-2 text-xs font-semibold hover:bg-emerald-100"
                        >
                          Перейти к сделке
                        </button>
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
              У вас пока нет запросов
            </div>
            <div className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Создайте первый RFQ, чтобы начать получать предложения от
              поставщиков.
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="mt-4 rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
            >
              Создать RFQ
            </button>
          </div>
        ) : null}
      </div>

      {/* ===== WORKFLOW HINT ===== */}
      <div className="sf-card rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 mt-0.5">
            <Icon name="spark" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-blue-900">
              Как это работает
            </div>
            <div className="mt-1 text-xs text-blue-800">
              1. Создайте RFQ с описанием товара и желаемым количеством →
              2. Поставщик получит уведомление и отправит Offer с ценой →
              3. Примите лучшее предложение — создастся сделка →
              4. Оплатите через эскроу и получите товар.
            </div>
          </div>
        </div>
      </div>

      {/* ===== CREATE RFQ MODAL ===== */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 grid place-items-center p-4"
          onClick={() => setCreateModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 sf-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 bg-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white grid place-items-center">
                  <Icon name="docs" className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-bold text-blue-900">
                    Создать запрос (RFQ)
                  </div>
                  <div className="text-xs text-blue-700">
                    Опишите товар и отправьте поставщику
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  ID организации поставщика
                </label>
                <input
                  value={newRfqSupplierOrgId}
                  onChange={(e) => setNewRfqSupplierOrgId(e.target.value)}
                  placeholder="UUID поставщика"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 sf-number"
                />
                <div className="mt-1 text-xs text-slate-500">
                  Скопируйте из профиля поставщика в разделе Discovery
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Название товара
                </label>
                <input
                  value={newRfqItemName}
                  onChange={(e) => setNewRfqItemName(e.target.value)}
                  placeholder="Например: Беспроводные наушники TWS"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Количество
                  </label>
                  <input
                    type="number"
                    value={newRfqQty}
                    onChange={(e) => setNewRfqQty(Number(e.target.value) || 1)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 sf-number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Целевая цена (CNY)
                  </label>
                  <input
                    type="number"
                    value={newRfqTargetPrice || ''}
                    onChange={(e) =>
                      setNewRfqTargetPrice(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    placeholder="Необязательно"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 sf-number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Комментарий (необязательно)
                </label>
                <textarea
                  value={newRfqNotes}
                  onChange={(e) => setNewRfqNotes(e.target.value)}
                  placeholder="Дополнительные требования к товару или доставке"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setCreateModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateRfq}
                disabled={creating || !newRfqSupplierOrgId || !newRfqItemName}
                className={
                  'rounded-xl px-4 py-2 text-sm font-semibold transition ' +
                  (creating || !newRfqSupplierOrgId || !newRfqItemName
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700')
                }
              >
                {creating ? 'Отправка…' : 'Отправить RFQ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== OFFERS MODAL ===== */}
      {offersModalOpen && selectedRfq && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 grid place-items-center p-4"
          onClick={() => setOffersModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 sf-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-bold text-slate-900">
                    Предложения по запросу
                  </div>
                  <div className="text-xs text-slate-600">
                    {selectedRfq.items[0]?.name} • RFQ: {selectedRfq.id.slice(0, 8)}…
                  </div>
                </div>
                <button
                  onClick={() => setOffersModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                >
                  <Icon name="x" />
                </button>
              </div>
            </div>
            <div className="p-5">
              {offersLoading ? (
                <div className="text-center py-8 text-sm text-slate-500">
                  Загрузка предложений…
                </div>
              ) : offers.length > 0 ? (
                <div className="space-y-4">
                  {offers.map((offer) => {
                    const item = offer.items[0];
                    const isAccepted = offer.status === 'accepted';

                    return (
                      <div
                        key={offer.id}
                        className={
                          'rounded-xl border p-4 ' +
                          (isAccepted
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-slate-200 bg-white')
                        }
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">
                                {item?.name}
                              </span>
                              {isAccepted && (
                                <Badge
                                  tone="green"
                                  icon={<Icon name="check" className="w-4 h-4" />}
                                >
                                  Принято
                                </Badge>
                              )}
                            </div>
                            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <div className="text-xs text-slate-500">Цена за ед.</div>
                                <div className="text-sm font-bold text-slate-900 sf-number">
                                  {fmt.cny(item?.price || 0)}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-slate-500">Количество</div>
                                <div className="text-sm font-bold text-slate-900 sf-number">
                                  {item?.qty} {item?.unit}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-slate-500">Итого</div>
                                <div className="text-sm font-bold text-slate-900 sf-number">
                                  {fmt.cny(item?.subtotal || 0)}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-slate-500">Incoterms</div>
                                <div className="text-sm font-semibold text-slate-900">
                                  {offer.incoterms || '—'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {!isAccepted && offer.status === 'sent' && (
                            <button
                              onClick={() => handleAcceptOffer(offer)}
                              disabled={accepting}
                              className={
                                'rounded-xl px-4 py-2 text-sm font-semibold transition shrink-0 ' +
                                (accepting
                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700')
                              }
                            >
                              {accepting ? 'Обработка…' : 'Принять'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 grid place-items-center mb-3">
                    <Icon name="deals" className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-slate-700">
                    Пока нет предложений
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Поставщик ещё не ответил на ваш запрос.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};