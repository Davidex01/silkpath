import { api } from './client';
import type { AuthState } from '../state/authTypes';
import type { DiscoverySupplier } from '../modules/discovery/DiscoveryView';

export interface BackendDealIds {
  rfqId: string;
  offerId: string;
  orderId: string;
  dealId: string;
}

export async function createDealForSupplier(
  auth: AuthState,
  supplier: DiscoverySupplier,
): Promise<BackendDealIds> {
  const token = auth.tokens.accessToken;
  const supplierOrgId = supplier.id;

  // 1. Create RFQ
  const rfq = await api<{ id: string }>('/rfqs', {
    method: 'POST',
    body: JSON.stringify({
      supplierOrgId,
      items: [
        {
          productId: null,
          name: supplier.items[0] || 'Demo Item',
          qty: 100,
          unit: 'piece',
          targetPrice: 10,
          notes: `RFQ created from UI for supplier ${supplier.name}`,
        },
      ],
    }),
  }, token);

  const rfqId = rfq.id;

  // 2. Send RFQ
  await api(`/rfqs/${rfqId}/send`, { method: 'POST' }, token);

  // 3. Create Offer (от лица supplierOrgId)
  const offer = await api<{ id: string }>(
    `/rfqs/${rfqId}/offers`,
    {
      method: 'POST',
      body: JSON.stringify({
        currency: 'CNY',
        items: [
          {
            rfqItemIndex: 0,
            productId: null,
            name: supplier.items[0] || 'Demo Item',
            qty: 100,
            unit: 'piece',
            price: 10,
            subtotal: 100 * 10,
          },
        ],
        incoterms: supplier.city.includes('Shenzhen') ? 'FOB Shenzhen' : 'FOB',
        paymentTerms: '100% prepayment',
        validUntil: null,
      }),
    },
    token,
  );

  const offerId = offer.id;

  // 4. Accept Offer (создаёт Order и Deal)
  const accept = await api<{
    offer: { id: string };
    order: { id: string };
    deal: { id: string };
  }>(`/offers/${offerId}/accept`, { method: 'POST' }, token);

  return {
    rfqId,
    offerId: accept.offer.id,
    orderId: accept.order.id,
    dealId: accept.deal.id,
  };
}