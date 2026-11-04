# Changelog

## 1.5.0 — 2026-11-04

Свой сервер (`--backend=server`) готов к большой нагрузке; цифры замерены — `server/LOAD.md`.

- Метрики: `GET /metrics` (prom-client) — время ответа по маршрутам, задержка event loop, память, WebSocket (клиенты, сообщения, пропуски, лидер потока), очередь BullMQ, отказы лимита; закрывается `METRICS_TOKEN`.
- Мониторинг: `npm run up:monitoring` — Prometheus (сам находит все копии API), Grafana с готовой панелью «AppJS — сервер», Jaeger, экспортёры PostgreSQL и Redis.
- Трассы OpenTelemetry (`OTEL_EXPORTER_OTLP_ENDPOINT`): входящие запросы, запросы к бирже и Redis; без переменной не загружаются.
- Масштабирование: `npm run up:scale` (`docker-compose.scale.yml`) — N копий API (`API_REPLICAS`) за Caddy (least_conn, проверка `/ready`), PgBouncer в режиме transaction (`DB_PREPARE=false`), несколько worker; миграции — отдельный сервис `migrate` один раз до старта.
- Нагрузочные тесты k6: `load/http.js` (смесь запросов до `MAX_RPS`), `load/ws.js` (`CLIENTS` подключений WebSocket); `npm run load:http`, `load:ws`, `load:http:scale`, `load:ws:scale`.
- Найдено тестами и исправлено:
  - список сделок постранично (`?limit=50&before=<id>`, ответ `{ items, next }`), индекс `(user_id, id)` — миграция `0002_trades_index`;
  - кэш рынка «отдать сразу, обновить в фоне» с одним запросом к бирже на копию (котировки p95 222 → 9 мс);
  - лимит SMS общий для всех копий (Redis, по IP и по номеру), хранилище Better Auth в Redis, атомарный счётчик лимитов;
  - `X-Forwarded-For` учитывается только при `TRUST_PROXY=true`.
- Замер (Docker, 4 ядра): 1 копия — ~1150 запросов/с, p95 955 мс; 4 копии — пик 3000/с, p95 42 мс, 0 % ошибок; 2000 клиентов WebSocket — подключение p95 14 мс, 0 пропусков.

## 1.4.0 — 2026-11-04

- Способы входа: почта и пароль, телефон с кодом по SMS, Google, Apple, Яндекс ID, VK ID.
  - Экран входа: вкладки «Почта / Телефон», код из 6 цифр с автоподстановкой из SMS и таймером повторной отправки, кнопки провайдеров. В iOS — нативная кнопка Apple (`expo-apple-authentication`). Показываются только включённые способы (`useAuth().methods()`).
  - Свой сервер (Better Auth): провайдеры включаются ключами в `server/.env`, приложение узнаёт их из `GET /api/auth-methods`. Яндекс ID — через общий OAuth (готовая настройка `yandex`). Телефон — плагин `phone-number`, шлюзы `console` / `smsru` / `twilio` (`src/lib/sms.ts`): код 5 минут, 3 попытки, не больше 3 кодов за 10 минут. Аккаунты с одной почтой связываются (Google, Apple, Яндекс). Миграция `0001_phone`. Инструкция по ключам — `server/AUTH.md`.
  - Supabase: телефон (OTP), Google и Apple (PKCE через браузер, нативная кнопка Apple в iOS), список способов — `EXPO_PUBLIC_AUTH_METHODS`.
  - Демо: все способы, код по SMS — `123456`.
- Номер телефона приводится к международному формату (`normalizePhone`), в настройках у аккаунта по телефону показывается номер.
- ТЗ: способы входа, уже доступные в шаблоне.

## 1.3.0 — 2026-11-04

- Бэкенд по выбору: `--backend=none|server|supabase` (или вопрос установщика).
  - `server` — папка `server/`: Node 24 + Hono, PostgreSQL 17 + Drizzle, Redis 7, BullMQ (worker), Better Auth (почта + пароль, удаление аккаунта, сессия в Keychain/Keystore через `@better-auth/expo`), WebSocket `/ws` с подписками; одно соединение с биржей на кластер (лидер по блокировке в Redis), прореживание до 4 обновлений/с, раздача через Redis pub/sub, защита от медленных клиентов; прокси рыночных данных с кэшем; лимит запросов в Redis; страницы `/privacy` и `/delete-account`; `/health`, `/ready`; Dockerfile (не root), Docker Compose; GitHub Actions публикует образ в ghcr.io (amd64 + arm64), Docker Hub по желанию.
  - `supabase` — клиент Supabase (сессия в expo-sqlite), вход, таблица сделок с RLS, Edge Function удаления аккаунта.
  - В приложении: адаптер рынка `server`, регистрация на экране входа, `src/lib/auth-headers.ts`, пароль от 8 символов.
- Realtime: обновления сокета прореживаются (`src/lib/throttle.ts`, `UI_RATE`): тикеры пачкой раз в 250 мс, свеча 100 мс, стакан 250 мс.
- Мировая локализация: словари в JSON (`src/i18n/locales`), ленивая загрузка языков (i18next-resources-to-backend), письмо справа налево (`dir: 'rtl'`, перезапуск через `reloadAppAsync`), регион телефона (`deviceRegion`), название приложения на языке телефона (`app.json` → `locales`), выбор языка приложения в настройках Android 13+ (`supportedLocales`); `npm run i18n -- check | export | import | add`.
- ТЗ: поле `бэкенд` в «Данные», регионы и письмо справа налево в «Языки».

## 1.2.0 — 2026-11-04

- `STORES.md` (в корне и в каждом проекте): требования Google Play, App Store, RuStore, Huawei AppGallery, Samsung Galaxy Store, Amazon Appstore, F-Droid, Aptoide — только официальные ссылки, проверены 04.11.2026; что уже сделано в шаблоне; чек-лист перед отправкой.
- `npm run store:check`: название ≤ 30 символов без эмодзи, свой id вместо com.example, иконка 1024×1024 без прозрачности, AAB для Google Play, autoIncrement, шифрование iOS, ссылки на политику и удаление аккаунта, Expo SDK для targetSdk 36.
- В приложении: «Удалить аккаунт» (App Store, Google Play), «Политика конфиденциальности» и «Написать в поддержку» в настройках; адреса — `app.json` → `expo.extra`.
- ТЗ: обязательный блок «Платформа» в `00 Паспорт.md` (платформы, магазины, устройства, веб-версия, стек, минимальные версии); ИИ не начинает без него.

## 1.1.0 — 2026-11-04

- Финансовый стек для трейдинга, доходности и клиентов бирж (всё работает в Expo Go):
  - графики: TradingView Lightweight Charts (свечи, объём, EMA/Bollinger, зум) как Expo DOM component; Victory Native XL на Skia (область с «ползунком», столбцы плюс/минус, кольцо, мини-графики); веб-версия ждёт загрузки CanvasKit (`public/canvaskit.wasm` копируется при `npm install`);
  - математика: decimal.js (деньги без ошибок округления), mathjs (выражения, матрицы, единицы), trading-signals (100+ индикаторов), date-fns;
  - статистика: перенос `DealStatisticGenerator.cs` из OsEngine (`src/lib/deal-stats.ts`: чистый П/У, Шарп OsEngine, профит-фактор, восстановление, payoff, серии, просадка, комиссия) + CAGR, Сортино, волатильность, доходность по месяцам, размер позиции по риску (`src/lib/finance.ts`);
  - таблицы TanStack Table v9 (`DataTable`), экспорт Excel (SheetJS 0.20.3), CSV с BOM (Papa Parse), PDF (expo-print) с «Поделиться»; импорт сделок из CSV/Excel;
  - рынок: адаптер `MarketSource`, публичные данные Binance (REST + WebSocket с переподключением), автоматический переход на офлайн-демо.
- Демо: вкладки «Рынок» и «Портфель», экран инструмента (свечи, индикаторы, стакан, бумажная торговля в журнал), калькулятор; вкладка «Лента» удалена.
- Исправлено: запросы Drizzle в репозиториях не выполнялись без `await` (отметка заметки «выполнено» не сохранялась); `DELETE` без `where` не обновлял экран.
- ТЗ (`TechnicalSpecification`): поля графиков, экспорта, расчётов, рыночных данных.
- Папка `TechnicalSpecification/` — ТЗ в виде хранилища Obsidian (заметки со свойствами: цвета, шрифты, языки, экраны, данные, оплата, публикация, этапы; шаблоны, примеры, карты `.canvas`). Лежит в корне и в каждом новом проекте.

## 1.0.0 — 2026-11-04

- Первая версия: `npm create appjs` — Expo SDK 58, Expo Router, React Native Reusables (30 компонентов, Uniwind), Lucide, TanStack Query, zustand, react-hook-form + zod, Drizzle + expo-sqlite, expo-secure-store, FlashList, Reanimated 4, sonner-native, i18next (ru/en), Jest, ESLint, Prettier, EAS (development / preview / production).
- Демо-приложение: вкладки «Главная», «Заметки» (SQLite), «Лента» (сервер, бесконечная прокрутка), «Настройки» (тема, язык, вибрация), модальный вход, экран заметки с удалением.
