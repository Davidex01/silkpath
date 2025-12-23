import { api } from './client';
import type { AuthState } from '../state/authTypes';
import type { BackendDealSummary } from '../state/dealTypes';

interface DealAggregatedView {
  deal: {
    id: string;
    rfqId: string;
    offerId: string;
    orderId: string;
    status: string;          // DealStatus
    mainCurrency: string;    // CurrencyCode
  };
  rfq: unknown;
  offer: {
    currency: string;
  };
  order: {
    id: string;
    currency: string;
    totalAmount: number;
  };
}

export async function loadDealSummary(
  auth: AuthState,
  dealId: string,
): Promise<BackendDealSummary> {
  const token = auth.tokens.accessToken;
  const data = await api<DealAggregatedView>(`/deals/${dealId}`, {}, token);

  return {
    dealId: data.deal.id,
    rfqId: data.deal.rfqId,
    offerId: data.deal.offerId,
    orderId: data.deal.orderId,
    status: data.deal.status,
    currency: data.order.currency,
    totalAmount: data.order.totalAmount,
  };
}