Onboarding



Первый экран — лендинг + форма регистрации (телефон, ИНН, название компании, KYC‑документ).

Логика SMS/Lookup/KYC упрощена и работает как демо.

Кнопка “Continue to Control Center (demo)” переводит в основной интерфейс.





Shell (каркас приложения)



Sidebar слева: логотип, блок “Risk posture”, навигация (Search \& Suppliers, My Deals, Wallet, Logistics, Documents), информация о пользователе.

TopHeader сверху: название активного раздела, бейджи (KYB, статус FX, статус Escrow, “All systems normal”).

Под шапкой — мини‑табы “1. Discovery / 2. Negotiation \& Payment / 3. Logistics \& Execution / Wallet / Documents”.





Discovery (Search \& Suppliers)



Слева: поиск и фильтры (Verified, Export License, Low MOQ).

Справа: список демо‑поставщиков с бейджами, тегами, кнопками Shortlist и Chat Now.

Клик по карточке → открывает SupplierProfileDrawer.

Кнопка Chat Now → сразу переключает на вкладку Deal, обновляя deal.supplier и показывая toast.





SupplierProfileDrawer



Выезжающая справа панель профиля поставщика.

Вкладки:

Overview — локация, категория, основные продукты.

Compliance — KYB‑чеки, сертификаты и экспортная лицензия.

Trade History — последние 3 сделки (демо).

Reviews — отзывы проверенных покупателей.

Внизу кнопка Start Negotiation:

обновляет текущего deal.supplier,

переключает на вкладку Deal,

закрывает Drawer,

показывает toast.





Deal Workspace



Левая половина — чат с авто‑переводом (демо), вложениями и историей диалога.

Правая — Deal Engine:

прогресс (Draft → Signed → Escrow Funded → Shipped),

калькулятор юнит‑экономики (цена CNY, qty, логистика, HS‑код, duty/VAT),

блок Payment \& FX:

живой FX‑тикер (рандомный walk),

Freeze Rate \& Deposit to Escrow (демо‑лок FX + изменение статуса),

Deposit Now (demo),

Mark as Shipped (demo) → переводит сделку в Shipped и предлагает перейти в Logistics.





Logistics \& Execution



Карта маршрута China → Border → Moscow, с динамическим статусом (In transit / Delivered).

Таймлайн Production Done / Customs Cleared / Last Mile.

Карточка Video Proof с модалкой видео (заглушка).

Кнопка Simulate Delivery (demo) → помечает доставку.

Кнопка Confirm Receipt \& Release Funds → чек‑лист (2 чекбокса), после подтверждения:

статус платежа → Funds Released,

escrow считается выпущенным,

показывается toast.





Wallet



Карточки балансов RUB и CNY (Available/Reserved/Total, In Escrow).

Escrow Summary (Total in Escrow, Pending Release).

Таблица Recent Activity (последние 5 операций).

Модалки:

Top up RUB (demo) с пересчётом нового баланса и toast.

Convert RUB→CNY (demo) с использованием текущего/заблокированного FX‑курса.





Documents



Фильтр по этапам: All / Discovery / Negotiation \& Payment / Logistics \& Execution.

Таблица документов сделки: Contract, Invoice, Packing List, Customs Declaration, Acceptance Video, RFQ Draft.

Статусы динамически зависят от deal.stage, payment.status и logistics.delivered.

По View открывается модалка‑превью документа, по Download — toast (эмуляция скачивания).

Быстрые статистики (Total, Signed/Processed, Pending, In Review).

Всё это — чистый фронтовый прототип без реальных API‑вызовов, но структура уже хорошо мапится на swagger‑контракты (RFQ/Deals/Wallets/Payments/Documents), так что следующий шаг при желании — добавить слой API и подсоединить данные к бэкенду.

