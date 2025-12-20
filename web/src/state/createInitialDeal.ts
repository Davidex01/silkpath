import type { DealState } from './dealTypes';

export const createInitialDeal = (): DealState => ({
  supplier: {
    id: 'shenzhen-electronics',
    name: 'Shenzhen Electronics Ltd',
    city: 'Shenzhen, CN',
    category: 'Consumer Electronics',
    rating: 4.9,
  },
  item: { name: 'Wireless Headphones', sku: 'WH-500', incoterm: 'FOB Shenzhen' },
  stage: 'Draft',
  calc: {
    factoryPriceCNY: 45,
    qty: 500,
    logisticsRUB: 120_000,
    hs: { code: '8518.30' },
  },
  fx: {
    rateLive: 13.2,
    locked: false,
    lockedRate: null,
    lockExpiresAt: null,
  },
  payment: {
    status: 'Not Funded',
    escrowAmountRUB: 0,
    releaseScheduled: false,
  },
  logistics: {
    current: 'Last Mile Delivery',
    delivered: false,
    deliveredAt: null,
  },
});