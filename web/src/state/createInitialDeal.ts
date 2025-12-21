import type { DealState } from './dealTypes';
import { HS_CODES } from '../modules/deal/hsCodes';

const makeId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return String(Date.now() + Math.random());
};

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
    hs: HS_CODES[0], // 8518.30 — наушники
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
  },
  logistics: {
    current: 'Last Mile Delivery',
    delivered: false,
    deliveredAt: null,
  },
  chatTranslate: true,
  chat: [
    {
      id: makeId(),
      role: 'supplier',
      cn: '你好！请问你需要什么产品？',
      ru: 'Здравствуйте! Какой товар вас интересует?',
      ts: new Date().toISOString(),
    },
    {
      id: makeId(),
      role: 'user',
      ru: 'Здравствуйте. Интересуют беспроводные наушники. MOQ 500? Цена? Нужен контроль качества.',
      ts: new Date().toISOString(),
    },
    {
      id: makeId(),
      role: 'supplier',
      cn: 'MOQ 500。单价 ¥45.00。我们可以提供质检照片和视频。',
      ru: 'MOQ 500. Цена ¥45.00. Можем предоставить фото и видео контроля качества.',
      ts: new Date().toISOString(),
    },
  ],
});