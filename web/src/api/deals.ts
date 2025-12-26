// src/api/deals.ts
import { api } from './client';
import type { AuthState } from '../state/authTypes';

export interface DealLogisticsDto {
  current: string;
  delivered: boolean;
  deliveredAt: string | null;
}

export interface DealDto {
  id: string;
  rfqId: string;
  offerId: string;
  orderId: string;
  status: 'negotiation' | 'ordered' | 'paid_partially' | 'paid' | 'closed';
  mainCurrency: 'RUB' | 'CNY' | 'USD';
  summary?: Record<string, unknown> | null;
  logistics?: DealLogisticsDto | null;
}

export interface DealAggregatedView {
  deal: DealDto;
  rfq: {
    id: string;
    buyerOrgId: string;
    supplierOrgId: string | null;
    status: string;
    items: Array<{
      productId?: string | null;
      name: string;
      qty: number;
      unit: string;
      targetPrice?: number | null;
      notes?: string | null;
    }>;
    createdAt: string;
  };
  offer: {
    id: string;
    rfqId: string;
    supplierOrgId: string;
    status: string;
    currency: string;
    items: Array<{
      name: string;
      qty: number;
      unit: string;
      price: number;
      subtotal: number;
    }>;
    incoterms?: string | null;
    paymentTerms?: string | null;
    createdAt: string;
  };
  order: {
    id: string;
    buyerOrgId: string;
    supplierOrgId: string;
    currency: string;
    totalAmount: number;
    status: string;
    items: Array<{
      name: string;
      qty: number;
      unit: string;
      price: number;
      subtotal: number;
    }>;
    createdAt: string;
  };
}

/** —писок сделок дл€ текущей организации как buyer */
export async function listBuyerDeals(auth: AuthState): Promise<DealDto[]> {
  return api<DealDto[]>('/deals?role=buyer', {}, auth.tokens.accessToken);
}

/** —писок сделок дл€ текущей организации как supplier */
export async function listSupplierDeals(auth: AuthState): Promise<DealDto[]> {
  return api<DealDto[]>('/deals?role=supplier', {}, auth.tokens.accessToken);
}

/** ѕолучить агрегированное представление сделки */
export async function getDealAggregated(
  auth: AuthState,
  dealId: string,
): Promise<DealAggregatedView> {
  return api<DealAggregatedView>(`/deals/${dealId}`, {}, auth.tokens.accessToken);
}