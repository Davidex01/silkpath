// web/src/api/deals.ts
import { api } from './client';
import type { AuthState } from '../state/authTypes';

export type DealStatusBackend =
  | 'negotiation'
  | 'ordered'
  | 'paid_partially'
  | 'paid'
  | 'closed';

export type CurrencyCode = 'RUB' | 'CNY' | 'USD';

export interface DealLogisticsStateDto {
  current: string;
  delivered: boolean;
  deliveredAt?: string | null;
}

export interface DealDto {
  id: string;
  rfqId: string;
  offerId: string;
  orderId: string;
  status: DealStatusBackend;
  mainCurrency: CurrencyCode;
  summary?: Record<string, unknown> | null;
  logistics?: DealLogisticsStateDto | null;
}

/** Список сделок для текущей организации как supplier */
export async function listSupplierDeals(auth: AuthState): Promise<DealDto[]> {
  const token = auth.tokens.accessToken;
  return api<DealDto[]>('/deals?role=supplier', {}, token);
}