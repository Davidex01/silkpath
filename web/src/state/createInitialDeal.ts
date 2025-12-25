// src/state/createInitialDeal.ts
import type { DealState } from './dealTypes';
import { HS_CODES } from '../modules/deal/hsCodes';

export const createInitialDeal = (): DealState => ({
  // Поставщик по умолчанию — пустой. Заполняется при выборе в Discovery / Create Deal.
  supplier: {
    id: '',
    name: 'Select supplier to start',
    city: '',
    category: '',
    rating: 0,
  },

  // Товар по умолчанию — нейтральный.
  item: {
    name: 'New Product',
    sku: '',
    incoterm: 'FOB',
  },

  // Стартовая стадия сделки
  stage: 'Draft',

  // Базовые параметры калькулятора (можно менять пользователю)
  calc: {
    factoryPriceCNY: 0,
    qty: 100,
    logisticsRUB: 0,
    hs: HS_CODES[0], // первый из списка — как дефолтный HS-код
  },

  // FX: только “живой” курс, без блокировки
  fx: {
    rateLive: 13.2,
    locked: false,
    lockedRate: null,
    lockExpiresAt: null,
    tick: 0,
  },

  // Платежи: эскроу ещё не пополнен, платежей нет
  payment: {
    status: 'Not Funded',
    escrowAmountRUB: 0,
    releaseScheduled: false,
    releasedAt: null,
    backendPaymentId: undefined,
  },

  // Логистика: пока только базовый статус, без доставки
  logistics: {
    current: 'Not started',
    delivered: false,
    deliveredAt: null,
  },

  // Признак авто-перевода в чате
  chatTranslate: true,

  // Чат — пустой. Сообщения появятся только при вводе пользователем.
  chat: [],

  // Связка с бэком (RFQ/Offer/Order/Deal) появится после создания сделки
  backend: undefined,
  backendSummary: undefined,
});