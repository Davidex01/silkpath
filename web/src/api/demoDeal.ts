import { api } from './client';
import type { AuthState } from '../state/authTypes';

export interface DemoDealIds {
  rfqId: string;
  offerId: string;
  orderId: string;
  dealId: string;
}

export async function createDemoDeal(auth: AuthState): Promise<DemoDealIds> {
  const token = auth.tokens.accessToken;
  const orgId = auth.org.id;

  // 1. Создаём RFQ
  const rfq = await api<{
    id: string;
  }>('/rfqs', {
    method: 'POST',
    body: JSON.stringify({
      supplierOrgId: orgId,
      items: [
        {
          productId: null,
          name: 'Wireless Headphones',
          qty: 500,
          unit: 'piece',
          targetPrice: 45,
          notes: 'demo RFQ from onboarding',
        },
      ],
    }),
  }, token);

  const rfqId = rfq.id;

  // 2. Отправляем RFQ
  await api(`/rfqs/${rfqId}/send`, { method: 'POST' }, token);

  // 3. Создаём Offer
  const offer = await api<{
    id: string;
  }>(`/rfqs/${rfqId}/offers`, {
    method: 'POST',
    body: JSON.stringify({
      currency: 'CNY',
      items: [
        {
          rfqItemIndex: 0,
          productId: null,
          name: 'Wireless Headphones',
          qty: 500,
          unit: 'piece',
          price: 45,
          subtotal: 45 * 500,
        },
      ],
      incoterms: 'FOB Shenzhen',
      paymentTerms: '100% prepayment',
      validUntil: null,
    }),
  }, token);

  const offerId = offer.id;

  // 4. Принимаем Offer → создаётся Order и Deal
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