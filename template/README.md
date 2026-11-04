# AppJS — приложение для Android и iOS

Один код на TypeScript → приложение для **Android**, **iOS** (и веб-версия для отладки). Создано стартером [AppJS](https://github.com/si0683/appjs).

## Запуск на телефоне

1. Установите на телефон **Expo Go** (App Store / Google Play).
2. `npm start` — в терминале появится QR-код.
3. iPhone: наведите камеру на QR. Android: отсканируйте QR в Expo Go.

Не подключается (другая сеть, брандмауэр Windows)? `npm run tunnel` — то же самое через интернет.
Сохраните файл — изменения появятся на телефоне сразу.

## Команды

| Команда                 | Что делает                                                   |
| ----------------------- | ------------------------------------------------------------ |
| `npm start`             | Dev-сервер + QR для Expo Go                                  |
| `npm run tunnel`        | То же через туннель (если телефон не видит компьютер)        |
| `npm run web`           | Веб-версия в браузере (для быстрой отладки вёрстки)          |
| `npm run check`         | Типы + линтер + тесты — запускайте перед коммитом            |
| `npm run format`        | Prettier, классы Tailwind сортируются сами                   |
| `npm run db:generate`   | Миграция после правки `src/db/schema.ts`                     |
| `npm run doctor`        | Проверка версий пакетов и настроек Expo                      |
| `npm run build:dev`     | Своя dev-сборка (когда нужен модуль, которого нет в Expo Go) |
| `npm run build:preview` | Сборка для тестировщиков: APK для Android, ad-hoc для iOS    |
| `npm run build:prod`    | Сборка для магазинов (номер сборки растёт сам)               |
| `npm run submit`        | Отправка в App Store Connect / Google Play                   |
| `npm run update`        | Обновление «по воздуху» без магазина (только JS-код)         |

Сборки делает облако **EAS** — Mac для iOS не нужен. Нужен бесплатный аккаунт expo.dev, для App Store — Apple Developer ($99/год), для Google Play — $25 один раз.

## Стек

| Задача             | Библиотека                                                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Платформа          | [Expo SDK 58](https://docs.expo.dev) + React Native 0.88 + React 19 + TypeScript                                                                                        |
| Экраны, навигация  | [Expo Router](https://docs.expo.dev/router/introduction/) — файл = экран                                                                                                |
| Компоненты         | [React Native Reusables](https://reactnativereusables.com) — shadcn/ui для телефона                                                                                     |
| Стили              | [Uniwind](https://docs.uniwind.dev) — Tailwind 4 в React Native, светлая/тёмная тема                                                                                    |
| Иконки             | [Lucide](https://lucide.dev) (`lucide-react-native`)                                                                                                                    |
| Данные с сервера   | [TanStack Query](https://tanstack.com/query) — кэш, повтор, обновление; WebSocket с переподключением                                                                    |
| Биржевые графики   | [TradingView Lightweight Charts](https://tradingview.github.io/lightweight-charts/) — свечи, объём, индикаторы, зум (Expo DOM component)                                |
| Графики аналитики  | [Victory Native XL](https://nearform.com/open-source/victory-native/) на [Skia](https://shopify.github.io/react-native-skia/) — линии, области, столбцы, кольца, 60 fps |
| Деньги и точность  | [decimal.js](https://mikemcl.github.io/decimal.js/) — без ошибок 0.1 + 0.2, суммы хранятся строками                                                                     |
| Математика         | [mathjs](https://mathjs.org) — выражения, матрицы, единицы, статистика                                                                                                  |
| Индикаторы         | [trading-signals](https://github.com/bennycode/trading-signals) — EMA, RSI, Bollinger, MACD, ATR и ещё 100+                                                             |
| Статистика сделок  | как в журнале [OsEngine](https://github.com/AlexWan/OsEngine) + CAGR, Сортино, волатильность (`src/lib/deal-stats.ts`, `finance.ts`)                                    |
| Таблицы            | [TanStack Table](https://tanstack.com/table) — сортировка, фильтры, группировка                                                                                         |
| Экспорт / импорт   | [SheetJS](https://sheetjs.com) (Excel), [Papa Parse](https://www.papaparse.com) (CSV), expo-print (PDF), expo-sharing                                                   |
| Даты               | [date-fns](https://date-fns.org)                                                                                                                                        |
| Состояние          | [zustand](https://zustand.docs.pmnd.rs) + сохранение на устройстве                                                                                                      |
| Формы и проверка   | [react-hook-form](https://react-hook-form.com) + [zod](https://zod.dev)                                                                                                 |
| Локальная база     | [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) + [Drizzle ORM](https://orm.drizzle.team)                                                              |
| Секреты, токены    | expo-secure-store (Keychain / Keystore)                                                                                                                                 |
| Списки             | [FlashList](https://shopify.github.io/flash-list/)                                                                                                                      |
| Анимации, жесты    | Reanimated 4 + Gesture Handler                                                                                                                                          |
| Уведомления в app  | [sonner-native](https://github.com/gunnartorfis/sonner-native)                                                                                                          |
| Языки              | i18next + react-i18next + expo-localization                                                                                                                             |
| Вибрация, картинки | expo-haptics, expo-image                                                                                                                                                |
| Тесты, качество    | Jest (jest-expo) + Testing Library, ESLint, Prettier                                                                                                                    |
| Сборка, публикация | EAS Build / Submit / Update                                                                                                                                             |

## Где что лежит

```
src/
  app/                 экраны: файл = адрес (Expo Router)
    _layout.tsx        корень: база, провайдеры, стек экранов
    (tabs)/            нижние вкладки: index, market, portfolio, notes, settings
    market/[symbol].tsx  инструмент: свечи, индикаторы, стакан, сделка
    calculator.tsx     калькулятор: выражения, размер позиции, сложный процент
    note/[id].tsx      экран с параметром: /note/5
    sign-in.tsx        модальное окно входа
  components/ui/       компоненты Reusables (Button, Card, Dialog, Select, …)
  components/app/      свои общие компоненты (Screen, EmptyState, FormField, DataTable, DealReportView…)
  components/charts/   графики: CandleChart, AreaChart, BarChart, PieChart, Sparkline
  components/market/   стакан, форма сделки
  features/market/     биржа: адаптеры (binance.ts, demo.ts), хуки, индикаторы
  features/portfolio/  статистика портфеля, импорт сделок
  db/                  схема SQLite, миграции, запросы (notes.ts)
  stores/              zustand: настройки (тема, язык), вход
  lib/                 api.ts, ws.ts, decimal.ts, finance.ts, deal-stats.ts, export.ts,
                       chart-theme.ts, storage.ts, validation.ts, haptics.ts, theme.ts
  i18n/                ru.ts (база), en.ts
  config/app.ts        имя, адрес API
  global.css           цвета темы (светлая и тёмная)
app.json               имя, иконка, id приложения, плагины
eas.json               профили сборки EAS
```

## Рецепты

**Новый экран.** Создайте `src/app/about.tsx` с `export default function About()`. Ссылка: `<Link href="/about">`. Вкладка — файл в `src/app/(tabs)/` + `<Tabs.Screen>` в `(tabs)/_layout.tsx`.

**Новый компонент Reusables.** `npx shadcn@latest add https://reactnativereusables.com/r/uniwind/<имя>.json` (список: accordion, dialog, select, tabs, tooltip… — на reactnativereusables.com). Все основные уже добавлены.

**Иконка.** Найдите на [lucide.dev](https://lucide.dev), импортируйте по имени: `import { Rocket } from 'lucide-react-native'`, рисуйте `<Icon as={Rocket} className="size-5 text-primary" />`.

**Цвета.** `src/global.css` — переменные `--color-primary` и др. для светлой и тёмной темы; `src/lib/theme.ts` — те же цвета для шапки и вкладок.

**Свой сервер.** Адрес — `EXPO_PUBLIC_API_URL` в `.env` (см. `.env.example`). Запрос: `api('/path', zodSchema)` из `src/lib/api.ts`, обёрнутый в `useQuery` — как в `src/features/market/index.ts`. Настоящий вход — в `src/stores/auth.ts` (`signIn`).

**Таблица в базе.** Добавьте её в `src/db/schema.ts` → `npm run db:generate` → запросы рядом, как в `src/db/notes.ts`. Миграция применится сама при запуске.

**График.** `import { AreaChart, BarChart, PieChart, CandleChart } from '@/components/charts'` — примеры на экранах «Портфель» и «Инструмент». Цвета графиков — `src/lib/chart-theme.ts`.

**Деньги.** Только через `D()` из `src/lib/decimal.ts`: `D(price).mul(qty).toFixed(2)`; хранить строками. Форматирование — `formatNumber`, `formatMoney`, `formatPercent`.

**Другая биржа.** Скопируйте `src/features/market/binance.ts`, реализуйте интерфейс `MarketSource` (REST + WebSocket) и добавьте в `SOURCES` в `src/features/market/index.ts`. Выбор — `EXPO_PUBLIC_MARKET_SOURCE`. Реальные ордера — только через свой сервер: API-ключи в приложении хранить нельзя.

**Экспорт таблицы.** `exportTable({ format: 'xlsx' | 'csv' | 'pdf', rows, columns, … })` из `src/lib/export.ts`; импорт — `importTable()`.

**Статистика.** `dealReport(dealsFromTrades(trades, капитал))` — отчёт как в OsEngine; `cagr`, `maxDrawdown`, `sharpe`, `sortino`, `positionSize` — в `src/lib/finance.ts`.

**Новый язык.** Скопируйте `src/i18n/en.ts` → `de.ts`, переведите, добавьте в `LANGUAGES` в `src/i18n/index.ts`.

**Нативный модуль, которого нет в Expo Go** (MMKV, Stripe, камера с ML и т. п.): `npx expo install <пакет>` → `npm run build:dev` → установите эту сборку на телефон вместо Expo Go. Дальше всё как раньше: `npm start`, изменения сразу.

**Пуш-уведомления.** `npx expo install expo-notifications` — на Android работают только в dev-сборке, не в Expo Go.

## Веб-версия

`npm run web` — для отладки вёрстки. Графики Skia в браузере грузят `public/canvaskit.wasm` (копируется сам при `npm install`). База SQLite в браузере работает через WebAssembly и требует заголовков COOP/COEP (уже настроены в `metro.config.js` и `app.json`); при первом открытии адрес на секунду сменится на `/index.html` — так задумано.

## Магазины приложений

Требования Google Play, App Store, RuStore, AppGallery, Galaxy Store, Amazon, F-Droid — [STORES.md](STORES.md), только официальные ссылки. Уже сделано в шаблоне: targetSdk 36 (Google Play с 31.08.2026), AAB для Google Play, удаление аккаунта и ссылка на политику конфиденциальности в настройках (адреса — `app.json` → `expo.extra.privacyPolicyUrl`, `deleteAccountUrl`). Перед отправкой: `npm run store:check` + чек-лист из STORES.md.

## Сначала ТЗ

Откройте папку `TechnicalSpecification` в [Obsidian](https://obsidian.md) как хранилище и заполните заметки (начните с `README.md` и `00 Паспорт.md`). Потом попросите ИИ-ассистента: «Прочитай TechnicalSpecification/ и разверни проект».
