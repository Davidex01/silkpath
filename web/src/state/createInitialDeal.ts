// src/state/createInitialDeal.ts
import type { DealState } from './dealTypes';
import { HS_CODES } from '../modules/deal/hsCodes';

export const createInitialDeal = (): DealState => ({
  supplier: {
    id: '',
    name: 'Select supplier to start',
    city: '',
    category: '',
    rating: 0,
  },

  item: {
    name: 'New Product',
    sku: '',
    incoterm: 'FOB',
  },

  stage: 'Draft',

  calc: {
    factoryPriceCNY: 0,
    qty: 100,
    logisticsRUB: 0,
    hs: HS_CODES[0],
  },

  fx: {
    rateLive: 13.2,
    locked: false,
    lockedRate: null,
    lockExpiresAt: null,
    tick: 0,
  },

  payment: {
    status: 'Not Funded',
    escrowAmountRUB: 0,
    releaseScheduled: false,
    releasedAt: null,
    backendPaymentId: undefined,
  },

  logistics: {
    current: 'Not started',
    delivered: false,
    deliveredAt: null,
  },

  chatTranslate: true,
  chat: [],

  backend: undefined,
  backendSummary: undefined,
  chatId: undefined,
});