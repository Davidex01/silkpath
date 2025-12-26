import { api } from './client';
import type { AuthState } from '../state/authTypes';

export type UnitOfMeasure = 'piece' | 'kg' | 'ton' | 'package' | 'm3' | 'other';
export type CurrencyCode = 'RUB' | 'CNY' | 'USD';

export type RFQStatus = 'draft' | 'sent' | 'responded' | 'closed';

export interface RFQItemDto {
  productId?: string | null;
  name: string;
  qty: number;
  unit: UnitOfMeasure;
  targetPrice?: number | null;
  notes?: string | null;
}

export interface RFQDto {
  id: string;
  buyerOrgId: string;
  supplierOrgId?: string | null;
  status: RFQStatus;
  items: RFQItemDto[];
  createdAt: string;
}

/** RFQ для текущей организации как supplier */
export async function listSupplierRFQs(auth: AuthState): Promise<RFQDto[]> {
  const token = auth.tokens.accessToken;
  return api<RFQDto[]>('/rfqs?role=supplier', {}, token);
}

/** RFQ для текущей организации как buyer */
export async function listBuyerRFQs(auth: AuthState): Promise<RFQDto[]> {
  const token = auth.tokens.accessToken;
  return api<RFQDto[]>('/rfqs?role=buyer', {}, token);
}

/* ---------- Offers ---------- */

export interface OfferItemInput {
  rfqItemIndex?: number | null;
  productId?: string | null;
  name: string;
  qty: number;
  unit: UnitOfMeasure;
  price: number;
  subtotal: number;
}

export type OfferStatus = 'sent' | 'accepted' | 'rejected';

export interface OfferDto {
  id: string;
  rfqId: string;
  supplierOrgId: string;
  status: OfferStatus;
  currency: CurrencyCode;
  items: OfferItemInput[];
  incoterms?: string | null;
  paymentTerms?: string | null;
  validUntil?: string | null;
  createdAt: string;
}

export interface OfferCreateInput {
  currency: CurrencyCode;
  items: OfferItemInput[];
  incoterms?: string | null;
  paymentTerms?: string | null;
  validUntil?: string | null;
}

/** Все офферы по RFQ */
export async function listOffersForRFQ(
  auth: AuthState,
  rfqId: string,
): Promise<OfferDto[]> {
  const token = auth.tokens.accessToken;
  return api<OfferDto[]>(`/rfqs/${rfqId}/offers`, {}, token);
}

/** Создать оффер (используется supplier-консолью) */
export async function createOfferForRFQ(
  auth: AuthState,
  rfqId: string,
  input: OfferCreateInput,
): Promise<OfferDto> {
  const token = auth.tokens.accessToken;
  return api<OfferDto>(
    `/rfqs/${rfqId}/offers`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token,
  );
}

/** Buyer принимает оффер → Order + Deal */
export interface AcceptOfferResult {
  offer: OfferDto;
  order: { id: string; currency: CurrencyCode; totalAmount: number };
  deal: { id: string };
}

export async function acceptOffer(
  auth: AuthState,
  offerId: string,
): Promise<AcceptOfferResult> {
  const token = auth.tokens.accessToken;
  return api<AcceptOfferResult>(
    `/offers/${offerId}/accept`,
    { method: 'POST' },
    token,
  );
}

/* ---------- Создание RFQ для buyer ---------- */

export interface CreateBuyerRFQInput {
  supplierOrgId: string;
  itemName: string;
  qty: number;
  unit: UnitOfMeasure;
  targetPrice?: number | null;
  notes?: string | null;
}

/** Создать RFQ и отправить supplier-у (без оффера и без сделки) */
export async function createBuyerRFQ(
  auth: AuthState,
  input: CreateBuyerRFQInput,
): Promise<RFQDto> {
  const token = auth.tokens.accessToken;

  // 1. Создаём RFQ
  const rfq = await api<RFQDto>(
    '/rfqs',
    {
      method: 'POST',
      body: JSON.stringify({
        supplierOrgId: input.supplierOrgId,
        items: [
          {
            productId: null,
            name: input.itemName,
            qty: input.qty,
            unit: input.unit,
            targetPrice: input.targetPrice ?? null,
            notes: input.notes ?? null,
          },
        ],
      }),
    },
    token,
  );

  // 2. Отправляем RFQ (меняем статус на sent)
  await api<RFQDto>(`/rfqs/${rfq.id}/send`, { method: 'POST' }, token);

  return rfq;
}