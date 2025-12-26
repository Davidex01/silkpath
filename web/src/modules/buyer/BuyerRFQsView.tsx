import React, { useEffect, useMemo, useState } from 'react';
import type { AuthState } from '../../state/authTypes';
import type { DealState } from '../../state/dealTypes';
import {
  listBuyerRFQs,
  listOffersForRFQ,
  createBuyerRFQ,
  acceptOffer,
  type RFQDto,
  type OfferDto,
  type UnitOfMeasure,
} from '../../api/rfqs';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icon';
import { fmt } from '../../components/lib/format';
import type { Toast } from '../../components/common/ToastStack';

interface BuyerRFQsViewProps {
  auth: AuthState;
  deal: DealState;
  setDeal: React.Dispatch<React.SetStateAction<DealState>>;
  addToast: (t: Omit<Toast, 'id'>) => void;

  prefillSupplierOrgId?: string | null;
  prefillDefaultItemName?: string | null;
  onPrefillConsumed?: () => void;
  onActivateDealView?: () => void;
}

export const BuyerRFQsView: React.FC<BuyerRFQsViewProps> = ({
  auth,
  deal,
  setDeal,
  addToast,
  prefillSupplierOrgId,
  prefillDefaultItemName,
  onPrefillConsumed,
  onActivateDealView,
}) => {
  const [rfqs, setRfqs] = useState<RFQDto[]>([]);
  const [rfqsLoading, setRfqsLoading] = useState(false);
  const [rfqsError, setRfqsError] = useState<string | null>(null);

  const [selectedRfq, setSelectedRfq] = useState<RFQDto | null>(null);
  const [offers, setOffers] = useState<OfferDto[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState<string | null>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [newSupplierOrgId, setNewSupplierOrgId] = useState('');
  const [newItemName, setNewItemName] = useState('Wireless Headphones');
  const [newQty, setNewQty] = useState(100);
  const [newUnit, setNewUnit] = useState<UnitOfMeasure>('piece');
  const [newTargetPrice, setNewTargetPrice] = useState<number | undefined>(10);
  const [newSubmitting, setNewSubmitting] = useState(false);

  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setRfqsLoading(true);
        setRfqsError(null);
        const data = await listBuyerRFQs(auth);
        setRfqs(
          data.slice().sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)),
        );
      } catch (e) {
        console.error('Failed to load buyer RFQs', e);
        setRfqsError('Could not load RFQs for this buyer.');
      } finally {
        setRfqsLoading(false);
      }
    };
    void load();
  }, [auth]);

  useEffect(() => {
    if (!prefillSupplierOrgId) return;

    setNewSupplierOrgId(prefillSupplierOrgId);
    if (prefillDefaultItemName) {
      setNewItemName(prefillDefaultItemName);
    }
    setNewOpen(true);
    onPrefillConsumed?.();
  }, [prefillSupplierOrgId, prefillDefaultItemName, onPrefillConsumed]);

  const totalResponded = useMemo(
    () => rfqs.filter((r) => r.status === 'responded').length,
    [rfqs],
  );

  const loadOffers = async (rfq: RFQDto) => {
    try {
      setOffersLoading(true);
      setOffersError(null);
      const data = await listOffersForRFQ(auth, rfq.id);
      setOffers(
        data.slice().sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)),
      );
    } catch (e) {
      console.error('Failed to load offers', e);
      setOffersError('Could not load offers for selected RFQ.');
    } finally {
      setOffersLoading(false);
    }
  };

  const handleSelectRfq = (rfq: RFQDto) => {
    setSelectedRfq(rfq);
    void loadOffers(rfq);
  };

  const handleCreateRfq = async () => {
    if (!newSupplierOrgId) {
      addToast({
        tone: 'warn',
        title: 'Choose supplier',
        message: 'Please paste supplier Org ID to create RFQ (demo).',
      });
      return;
    }
    try {
      setNewSubmitting(true);
      const rfq = await createBuyerRFQ(auth, {
        supplierOrgId: newSupplierOrgId,
        itemName: newItemName,
        qty: newQty,
        unit: newUnit,
        targetPrice: newTargetPrice,
        notes: 'Created from Buyer RFQs view (demo)',
      });
      setRfqs((prev) => [rfq, ...prev]);
      setNewOpen(false);
      setSelectedRfq(rfq);
      void loadOffers(rfq);

      addToast({
        tone: 'success',
        title: 'RFQ created and sent',
        message: `RFQ ${rfq.id.slice(0, 8)}Е sent to supplier.`,
      });
    } catch (e) {
      console.error('Failed to create RFQ', e);
      addToast({
        tone: 'warn',
        title: 'RFQ creation failed',
        message: 'Please check backend API and try again.',
      });
    } finally {
      setNewSubmitting(false);
    }
  };

  const handleAcceptOffer = async (offer: OfferDto) => {
  try {
    const res = await acceptOffer(auth, offer.id);

    setDeal((prev) => ({
      ...prev,
      backend: {
        rfqId: res.offer.rfqId,
        offerId: res.offer.id,
        orderId: res.order.id,
        dealId: res.deal.id,
      },
      stage: 'Draft',
    }));

    addToast({
      tone: 'success',
      title: 'Offer accepted, deal created',
      message: `Deal ${res.deal.id.slice(
        0,
        8,
      )}Е created. Switching to Deal Workspace.`,
    });

    onActivateDealView?.();
  } catch (e) {
    console.error('Failed to accept offer', e);
    addToast({
      tone: 'warn',
      title: 'Offer accept failed',
      message: 'Please check backend API and try again.',
    });
  }
};

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-slate-900 text-xl font-bold">
            RFQs &amp; Offers (Buyer)
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Manage RFQs sent to suppliers and accept offers to create secured
            deals.
          </div>
          {rfqsLoading ? (
            <div className="mt-1 text-xs text-blue-600">
              Loading RFQs from backend...
            </div>
          ) : rfqsError ? (
            <div className="mt-1 text-xs text-orange-700">{rfqsError}</div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {/* Help-кнопка */}
          <button
            onClick={() => setShowHelp((prev) => !prev)}
            className="rounded-full border border-slate-200 bg-white w-9 h-9 text-slate-600 hover:bg-slate-50 flex items-center justify-center text-sm font-bold"
            title="Show help"
          >
            ?
          </button>
          <button
            onClick={() => setNewOpen(true)}
            className="rounded-xl bg-[var(--sf-blue-900)] text-white px-4 py-2 text-sm font-semibold hover:bg-[var(--sf-blue-800)]"
          >
            New RFQ
          </button>
        </div>
      </div>

      {/* Step-индикатор процесса Ч показываем только когда юзер нажал "?" */}
      {showHelp && (
        <div className="mt-4 sf-card rounded-2xl border border-slate-200 bg-white p-3">
          <div className="text-xs font-semibold text-slate-700 mb-2">
            How it works
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-900 font-semibold">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white grid place-items-center text-[10px]">
                1
              </span>
              Create RFQ
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 text-slate-700 font-semibold">
              <span className="w-4 h-4 rounded-full bg-slate-400 text-white grid place-items-center text-[10px]">
                2
              </span>
              Get offers from suppliers
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 text-slate-700 font-semibold">
              <span className="w-4 h-4 rounded-full bg-slate-400 text-white grid place-items-center text-[10px]">
                3
              </span>
              Accept best offer and create deal
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 text-slate-700 font-semibold">
              <span className="w-4 h-4 rounded-full bg-slate-400 text-white grid place-items-center text-[10px]">
                4
              </span>
              Manage payments &amp; logistics in Deal Workspace
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="sf-card rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-xs font-semibold text-slate-600">
            Total RFQs
          </div>
          <div className="mt-1 text-lg font-extrabold text-slate-900 sf-number">
            {rfqs.length}
          </div>
        </div>
        <div className="sf-card rounded-xl border border-blue-200 bg-blue-50 p-3">
          <div className="text-xs font-semibold text-blue-700">
            With offers
          </div>
          <div className="mt-1 text-lg font-extrabold text-blue-900 sf-number">
            {totalResponded}
          </div>
        </div>
        <div className="sf-card rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="text-xs font-semibold text-emerald-700">
            Linked to current deal (backend)
          </div>
          <div className="mt-1 text-lg font-extrabold text-emerald-900 sf-number">
            {deal.backend?.rfqId ? 1 : 0}
          </div>
        </div>
      </div>

      {/* RFQ table + offers */}
      <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* RFQs */}
        <div className="sf-card rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="text-sm font-bold text-slate-900">My RFQs</div>
            <div className="text-xs text-slate-500">
              Showing {rfqs.length} request{rfqs.length !== 1 ? 's' : ''}.
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                    RFQ ID
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                    Item
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                    Qty
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rfqs.map((rfq, i) => {
                  const item = rfq.items[0];
                  const isEven = i % 2 === 0;
                  const isSelected = selectedRfq?.id === rfq.id;
                  return (
                    <tr
                      key={rfq.id}
                      className={
                        (isEven ? 'bg-white' : 'bg-slate-50/50') +
                        (isSelected ? ' ring-1 ring-inset ring-blue-200' : '')
                      }
                    >
                      <td className="px-4 py-3 text-slate-700 sf-number">
                        {rfq.id.slice(0, 8)}Е
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-900 font-medium truncate">
                          {item?.name || 'Ч'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 sf-number">
                        {item ? `${item.qty} ${item.unit}` : 'Ч'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={
                            rfq.status === 'closed'
                              ? 'gray'
                              : rfq.status === 'responded'
                              ? 'blue'
                              : 'orange'
                          }
                        >
                          {rfq.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSelectRfq(rfq)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View Offers
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rfqs.length === 0 && !rfqsLoading ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              No RFQs yet. Use &quot;New RFQ&quot; to send a request to your
              supplier.
            </div>
          ) : null}
        </div>

        {/* Offers for selected RFQ */}
        <div className="sf-card rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-900">
                Offers for RFQ
              </div>
              <div className="mt-0.5 text-xs text-slate-600">
                {selectedRfq
                  ? `RFQ ${selectedRfq.id.slice(
                      0,
                      8,
                    )}Е (${selectedRfq.items[0]?.name || 'Ч'})`
                  : 'Select RFQ on the left.'}
              </div>
              {offersLoading ? (
                <div className="mt-1 text-xs text-blue-600">
                  Loading offersЕ
                </div>
              ) : offersError ? (
                <div className="mt-1 text-xs text-orange-700">
                  {offersError}
                </div>
              ) : null}
            </div>
          </div>

          {selectedRfq ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                      Offer ID
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                      Price
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                      Incoterms
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer, i) => {
                    const item = offer.items[0];
                    const isEven = i % 2 === 0;
                    const accepted = offer.status === 'accepted';
                    return (
                      <tr
                        key={offer.id}
                        className={isEven ? 'bg-white' : 'bg-slate-50/50'}
                      >
                        <td className="px-4 py-3 text-slate-700 sf-number">
                          {offer.id.slice(0, 8)}Е
                        </td>
                        <td className="px-4 py-3 text-slate-700 sf-number">
                          {item
                            ? `${fmt.num(item.price, 2)} ${
                                offer.currency
                              } / ${item.qty} ${item.unit}`
                            : 'Ч'}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {offer.incoterms || 'Ч'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            tone={
                              accepted
                                ? 'green'
                                : offer.status === 'rejected'
                                ? 'gray'
                                : 'blue'
                            }
                          >
                            {offer.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleAcceptOffer(offer)}
                            disabled={accepted}
                            className={
                              'rounded-xl px-3 py-1.5 text-xs font-semibold ' +
                              (accepted
                                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                : 'bg-[var(--sf-teal-600)] text-white hover:brightness-95')
                            }
                          >
                            {accepted ? 'Accepted' : 'Accept offer'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {offers.length === 0 && !offersLoading ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  No offers yet for this RFQ.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              Select RFQ on the left to see offers.
            </div>
          )}
        </div>
      </div>

      {/* New RFQ modal (упрощЄнный: вводим supplierOrgId вручную) */}
      {newOpen ? (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 grid place-items-center p-4"
          onClick={() => setNewOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 sf-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="text-base font-bold text-slate-900">
                  New RFQ (demo)
                </div>
                <div className="text-xs text-slate-600">
                  For simplicity, paste supplier Org ID from Supplier Console.
                </div>
              </div>
              <button
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                onClick={() => setNewOpen(false)}
              >
                <Icon name="x" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <label className="block">
                <div className="text-xs font-semibold text-slate-700">
                  Supplier Org ID
                </div>
                <input
                  value={newSupplierOrgId}
                  onChange={(e) => setNewSupplierOrgId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs sf-number outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                />
                <div className="mt-1 text-[11px] text-slate-500">
                  In real product this would be a dropdown of verified suppliers.
                </div>
              </label>
              <label className="block">
                <div className="text-xs font-semibold text-slate-700">
                  Item name
                </div>
                <input
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                />
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-xs font-semibold text-slate-700">
                    Quantity
                  </div>
                  <input
                    type="number"
                    value={newQty}
                    onChange={(e) =>
                      setNewQty(parseInt(e.target.value || '0', 10))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 sf-number"
                  />
                </label>
                <label className="block">
                  <div className="text-xs font-semibold text-slate-700">
                    Unit
                  </div>
                  <select
                    value={newUnit}
                    onChange={(e) =>
                      setNewUnit(e.target.value as UnitOfMeasure)
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  >
                    <option value="piece">piece</option>
                    <option value="kg">kg</option>
                    <option value="ton">ton</option>
                    <option value="package">package</option>
                    <option value="m3">m3</option>
                    <option value="other">other</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <div className="text-xs font-semibold text-slate-700">
                  Target price (optional)
                </div>
                <input
                  type="number"
                  step={0.01}
                  value={newTargetPrice ?? ''}
                  onChange={(e) =>
                    setNewTargetPrice(
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 sf-number"
                />
              </label>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setNewOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRfq}
                disabled={newSubmitting}
                className={
                  'rounded-xl bg-[var(--sf-blue-900)] text-white px-4 py-2 text-sm font-semibold ' +
                  (newSubmitting
                    ? 'opacity-60 cursor-wait'
                    : 'hover:bg-[var(--sf-blue-800)]')
                }
              >
                {newSubmitting ? 'CreatingЕ' : 'Create RFQ'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};