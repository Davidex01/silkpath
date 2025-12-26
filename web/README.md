Ниже — вариант README специально для фронтенда (папка `web/`), ориентированный на бэкенд‑разработчика и интеграцию. Можешь сохранить его как `web/README.md` (заменив текущий или положив рядом, например, `README.silkflow.md`).

---

```md
# SilkFlow Frontend (MVP)

Одностраничное SPA на React + TypeScript + Vite для прототипа B2B‑мессенджера и контроль‑центра сделок Россия ⇄ Китай.

Фронтенд уже частично привязан к текущему FastAPI‑бэкенду и отражает основные сущности: пользователи, организации, RFQ/Offers/Deals, платежи, логистика, документы.

## Стек

- React 19 + TypeScript
- Vite
- Tailwind CSS
- Минимальный state‑management через `useState` / `useEffect` + собственные API‑обёртки в `src/api/*`

---

## Запуск фронтенда

```bash
cd web
npm install
npm run dev
# http://localhost:5173
```

Фронтенд ожидает, что API доступен по адресу, указанному в `VITE_API_BASE`:

```env
# web/.env.development
VITE_API_BASE=http://localhost:8000
```

Если не задан, по умолчанию используется `http://localhost:8000`.

---

## Основные модули

Структура (кратко):

- `src/app/App.tsx` — корневой компонент, роутинг по вкладкам (Discovery / Deal / Logistics / Wallet / Documents) и управление auth‑сессией.
- `src/modules/onboarding/OnboardingLanding.tsx` — лендинг / первый экран.
- `src/modules/auth/RegisterView.tsx` — регистрация.
- `src/modules/auth/LoginView.tsx` — логин.
- `src/modules/discovery/DiscoveryView.tsx` — поиск поставщиков и список `orgs/suppliers`.
- `src/modules/suppliers/SupplierProfileDrawer.tsx` — профиль поставщика (drawer справа), в т.ч. кнопка **Create Deal**.
- `src/modules/deal/DealWorkspaceView.tsx` — рабочее пространство сделки (чат + калькулятор + Payment & FX).
- `src/modules/logistics/LogisticsView.tsx` — логистика (маршрут, таймлайн, подтверждение получения).
- `src/modules/wallet/WalletView.tsx` — кошельки и платежи.
- `src/modules/documents/DocumentsView.tsx` — документы сделки.

Служебное:

- `src/api/*` — обёртки над REST‑эндпоинтами бэка.
- `src/state/*` — типы и начальное состояние сделок, auth‑состояние, secureSession.
- `src/components/*` — UI‑компоненты (Badge, Icon, Sidebar, TopHeader, ToastStack и т.п.).

---

## Auth и сессии

### API

- `POST /auth/register`
- `POST /auth/login`
- `GET /orgs/me`

### Где используется

- `src/modules/auth/RegisterView.tsx`:
  - по submit → `POST /auth/register`;
  - ответ (`user`, `org`, `tokens`) маппится в `AuthState`.
- `src/modules/auth/LoginView.tsx`:
  - по submit → `POST /auth/login`;
- `src/app/App.tsx`:
  - `handleAuthSuccess` сохраняет `AuthState`:
    - в состоянии `App`;
    - в `sessionStorage` зашифрованным блоком (`state/secureSession.ts`).
  - при монтировании:
    - `loadAuthEncrypted()` восстанавливает сессию;
    - `GET /orgs/me` обновляет актуальную организацию.

### Хранение

- `src/state/authTypes.ts` — интерфейсы `AuthState`, `BackendUser`, `BackendOrg`, `BackendTokens`.
- `src/state/secureSession.ts` — запись/чтение `AuthState` в `sessionStorage` c AES‑GCM (обфускация, не прод‑шифрование).

---

## Organizations & Discovery

### API

- `GET /orgs/suppliers` — список организаций, у которых `role` = `supplier` или `both`.

### Где используется

- `src/app/App.tsx`:
  - `loadSuppliers(token)` → `GET /orgs/suppliers`;
  - маппит `Organization` в `DiscoverySupplier` (добавляя демо‑поля: `city`, `category`, `rating`, `tags`, `items`);
  - состояние: `suppliers`, `suppliersLoading`, `suppliersError`.
- `src/modules/discovery/DiscoveryView.tsx`:
  - пропы: `suppliers`, `loading`, `error`;
  - отображает список поставщиков, фильтры, поисковую строку.

---

## RFQ / Offers / Deals (Create Deal)

### API

- `POST /rfqs`
- `POST /rfqs/{id}/send`
- `POST /rfqs/{id}/offers`
- `POST /offers/{id}/accept`
- `GET /deals/{dealId}` — агрегированное представление сделки (Deal + RFQ + Offer + Order).

### Где используется

- `src/api/createDealForSupplier.ts`:
  - функция `createDealForSupplier(auth, supplier)`:
    1. `POST /rfqs` с `supplierOrgId = supplier.id`;
    2. `POST /rfqs/{rfqId}/send`;
    3. `POST /rfqs/{rfqId}/offers`;
    4. `POST /offers/{offerId}/accept`;
    5. возвращает `{ rfqId, offerId, orderId, dealId }`.

- `src/app/App.tsx`:
  - в `SupplierProfileDrawer` проп `onCreateDeal`:
    - вызывает `createDealForSupplier(auth, supplier)`;
    - записывает `deal.backend = { rfqId, ... }`;
    - переключает вкладку на `Deal`.

- `src/api/loadDealSummary.ts`:
  - `loadDealSummary(auth, dealId)` → `GET /deals/{dealId}`;
  - возвращает упрощённый `BackendDealSummary` (валюта + сумма + статус).

- `src/modules/deal/DealWorkspaceView.tsx`:
  - кнопка **Load from Backend**:
    - вызывает `loadDealSummary(auth, deal.backend.dealId)`;
    - сохраняет `deal.backendSummary`;
    - показывает строку “Backend: dealId • Status • Total …”.

---

## Payments & Wallet

### API

- `GET /wallets`
- `GET /payments?dealId=...`
- `POST /payments`
- `POST /payments/{paymentId}/release`

### Где используется

- `src/api/wallets.ts`:
  - `listWallets(auth)` → `GET /wallets`.

- `src/api/payments.ts`:
  - `createPayment(auth, { dealId, amount, currency })` → `POST /payments`;
  - `listPaymentsForDeal(auth, dealId)` → `GET /payments?dealId=...`;
  - `releasePayment(auth, paymentId)` → `POST /payments/{paymentId}/release`.

- `src/app/App.tsx`:
  - `loadWallets(auth)` → инициализация балансов;
  - `loadDealPayments(auth, deal)` → загрузка платежей конкретной сделки;
  - состояние: `wallets`, `dealPayments`.

- `src/modules/deal/DealWorkspaceView.tsx`:
  - при “Deposit to Escrow”:
    - проверяет `deal.backend.dealId`;
    - `createPayment(auth, { dealId, amount: landedRUB, currency: 'RUB' })`;
    - сохраняет `deal.payment.backendPaymentId` и обновляет UI‑статус `Escrow Funded`.

- `src/modules/logistics/LogisticsView.tsx`:
  - при `Confirm Receipt & Release Funds`:
    - использует `deal.payment.backendPaymentId`;
    - `releasePayment(auth, paymentId)`;
    - при успехе ставит `deal.payment.status = 'Funds Released'`.

- `src/modules/wallet/WalletView.tsx`:
  - принимает `wallets` и `payments` из `App`;
  - отображает балансы RUB/CNY и “Escrow Summary”;
  - “Top up RUB / Convert RUB→CNY” пока симулируются на фронте (TODO: заменить на реальные POST‑эндпоинты при наличии).

---

## Logistics

### API

- `GET /deals/{dealId}/logistics`
- `POST /deals/{dealId}/logistics/simulate`

### Где используется

- `src/api/logistics.ts`:
  - `getDealLogistics(auth, dealId)` → `GET /deals/{dealId}/logistics`;
  - `simulateDealDelivery(auth, dealId)` → `POST /deals/{dealId}/logistics/simulate`.

- `src/modules/logistics/LogisticsView.tsx`:
  - `useEffect` при монтировании:
    - `getDealLogistics` по `deal.backend.dealId`;
    - обновляет `deal.logistics` в `App`;
  - кнопка **Simulate Delivery**:
    - `simulateDealDelivery(auth, deal.backend.dealId)`;
    - обновляет `deal.logistics` и UI (маршрут, статус).

---

## Documents

### API

- `GET /deals/{dealId}/documents`
- `POST /deals/{dealId}/documents`
- `POST /files` — ожидаемый upload (сейчас на фронте не реализован полностью)

### Где используется

- `src/api/documents.ts`:
  - `listDealDocuments(auth, dealId, type?)` → `GET /deals/{dealId}/documents`;
  - `createDealDocument(auth, dealId, { type, title, fileId })` → `POST /deals/{dealId}/documents`.

- `src/modules/deal/DealWorkspaceView.tsx`:
  - в `signContract`:
    - после изменения локального статуса вызывает `createDealDocument(auth, deal.backend.dealId, { type: 'contract', ... })`;
    - пока `fileId` — заглушка, для реальной интеграции нужен upload в `/files`.

- `src/modules/documents/DocumentsView.tsx`:
  - `useEffect`:
    - `listDealDocuments(auth, deal.backend.dealId)` → `backendDocs`;
    - маппит в `DealDocumentUI` (type/label/name/status).
  - `demoDocuments` — локальные, завязанные на `deal.stage`, `deal.payment.status`, `deal.logistics.delivered`;
  - `allDocuments = backendDocs + demoDocuments`:
    - таблица документов;
    - статистика (Total / Signed/Processed / Pending / In Review).

---

## Analytics (не используется в UI, но есть API)

На бэке:

- `GET /analytics/deals/{deal_id}/unit-economics`

Можно легко добавить кнопку в `DealWorkspaceView.tsx`:

- при нажатии → `GET /analytics/deals/{id}` → отобразить breakdown (product/logistics/duties/fx/commissions).

---

## Где ещё нужен бэкенд (TODO точки)

- `src/api/files.ts` — сейчас содержит заглушку `createDummyFile()`; фронтенд ожидает возможность:
  - отправить `multipart/form-data` с файлом,
  - получить `fileId` и затем связать его с Document через `/deals/{dealId}/documents`.
- `WalletView`:
  - Top up / Convert — пока чисто фронтовые симуляции изменения `wallets`; нужны POST‑эндпоинты для:
    - пополнения кошелька;
    - конвертации валют.

В коде рядом с такими местами можно оставить `// TODO: backend integration` для явного указания точек доработки.

---

## Важно при интеграции

1. **Deal связывается с UI через `deal.backend.dealId`.**
   - Весь остальной функционал (payments, logistics, documents) опирается на этот ID.
2. Фронт ожидает, что авторизация — через Bearer‑токен из `AuthState.tokens.accessToken`.
3. Многие тексты и UI‑блоки уже нейтральны; слово “demo” убрано из интерфейса и осталось только в комментариях или сообщениях разработчикам (TODO).

Если что‑то в API будет меняться (например, структура `DealAggregatedView`), достаточно поправить функции в `src/api/*` и точечно в местах, где используются поля ответа. Основные интерфейсные соглашения описаны выше.
```