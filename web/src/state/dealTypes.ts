export interface Supplier {
  id: string;
  name: string;
  city: string;
  category: string;
  rating: number;
}

export interface DealCalc {
  factoryPriceCNY: number;
  qty: number;
  logisticsRUB: number;
  hs: {
    code: string;
    duty: number;
    vat: number;
  };
}

export interface DealFX {
  rateLive: number;
  locked: boolean;
  lockedRate: number | null;
  lockExpiresAt: number | null;
  /** служебный тикер, чтобы пересчитывать таймеры FX‑лока */
  tick: number;
}

export interface DealPayment {
  status: 'Not Funded' | 'Waiting for Deposit' | 'Escrow Funded' | 'Funds Released';
  escrowAmountRUB: number;
  releaseScheduled: boolean;
  releasedAt?: string | null;
}

export interface DealLogistics {
  current: string;
  delivered: boolean;
  deliveredAt: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'supplier' | 'user';
  /** Оригинальный текст по‑китайски (для сообщений поставщика) */
  cn?: string;
  /** Русский текст, который видит пользователь */
  ru: string;
  ts: string; // ISO‑дата
}

export interface DealState {
  supplier: Supplier;
  item: { name: string; sku: string; incoterm: string };
  stage: 'Draft' | 'Signed' | 'Escrow Funded' | 'Shipped';
  calc: DealCalc;
  fx: DealFX;
  payment: DealPayment;
  logistics: DealLogistics;

  /** Авто‑перевод чата включен/выключен */
  chatTranslate: boolean;
  /** Сообщения по сделке */
  chat: ChatMessage[];
}