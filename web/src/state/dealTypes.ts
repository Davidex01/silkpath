export type DealStage = 'Draft' | 'Signed' | 'Escrow Funded' | 'Shipped';

export type PaymentStatusUI =
  | 'Not Funded'
  | 'Waiting for Deposit'
  | 'Escrow Funded'
  | 'Funds Released';

export interface SupplierInfo {
  id: string;
  name: string;
  city: string;
  category: string;
  rating: number;
}

export interface ItemInfo {
  name: string;
  sku: string;
  incoterm: string;
}

export interface HSCodeMeta {
  code: string;
  label: string;
  duty: number; // 0..1
  vat: number;  // 0..1
}

export interface DealCalcState {
  factoryPriceCNY: number;
  qty: number;
  logisticsRUB: number;
  hs: HSCodeMeta;
}

export interface DealFxState {
  rateLive: number;
  locked: boolean;
  lockedRate: number | null;
  lockExpiresAt: number | null; // timestamp (ms since epoch)
  tick: number;
}

export interface DealPaymentState {
  status: PaymentStatusUI;
  escrowAmountRUB: number;
  releaseScheduled: boolean;
  releasedAt: string | null;
  // на будущее для интеграции с беком:
  backendPaymentId?: string;
}

export interface DealLogisticsStateUI {
  current: string;
  delivered: boolean;
  deliveredAt: string | null;
}

export type ChatRole = 'user' | 'supplier';

export interface DealChatMessage {
  id: string;
  role: ChatRole;
  ru: string;
  cn?: string;
  ts: string; // ISO datetime
}

export interface BackendIds {
  rfqId?: string;
  offerId?: string;
  orderId?: string;
  dealId?: string;
}

export interface DealState {
  supplier: SupplierInfo;
  item: ItemInfo;
  stage: DealStage;
  calc: DealCalcState;
  fx: DealFxState;
  payment: DealPaymentState;
  logistics: DealLogisticsStateUI;
  chatTranslate: boolean;
  chat: DealChatMessage[];

  // Связка с сущностями бэка (можно использовать позже)
  backend?: BackendIds;
  backendSummary?: BackendDealSummary;
}

export interface BackendDealSummary {
  dealId: string;
  rfqId: string;
  offerId: string;
  orderId: string;
  status: string;          // DealStatus из бэка ('ordered', 'paid', ...)
  currency: string;        // 'CNY' | 'RUB' | 'USD'
  totalAmount: number;     // из order.totalAmount
}