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
  hs: { code: string };
}

export interface DealFX {
  rateLive: number;
  locked: boolean;
  lockedRate: number | null;
  lockExpiresAt: number | null;
}

export interface DealPayment {
  status: 'Not Funded' | 'Waiting for Deposit' | 'Escrow Funded' | 'Funds Released';
  escrowAmountRUB: number;
  releaseScheduled: boolean;
}

export interface DealLogistics {
  current: string;
  delivered: boolean;
  deliveredAt: string | null;
}

export interface DealState {
  supplier: Supplier;
  item: { name: string; sku: string; incoterm: string };
  stage: 'Draft' | 'Signed' | 'Escrow Funded' | 'Shipped';
  calc: DealCalc;
  fx: DealFX;
  payment: DealPayment;
  logistics: DealLogistics;
}