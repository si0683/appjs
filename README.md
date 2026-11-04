# AppJS

**Стек для мобильных приложений Android и iOS одной командой.** Один код на TypeScript → два магазина. Без Mac.

```bash
npm create appjs@latest my-app
```

До публикации в npm: `npx github:si0683/appjs my-app`

## Как начать

1. `npm create appjs@latest my-app` — проект с демо-приложением: рынок с живыми котировками Binance, экран инструмента (свечи, индикаторы, стакан, бумажная торговля), портфель (доходность, статистика, экспорт в Excel/CSV/PDF), калькулятор, заметки в SQLite, настройки, вход.
2. `cd my-app` → `npm start` → отсканируйте QR в **Expo Go** на телефоне. Не видит компьютер — `npm run tunnel`.
3. Меняйте экраны в `src/app/` — телефон обновится сразу. Сборка для магазинов — `npm run build:prod` и `npm run submit` (облако EAS).

Опции: `--id=ru.company.myapp` (id для App Store / Google Play), `--no-install`, `--no-git`.

## Стек

| Задача | Библиотека |
| --- | --- |
| Платформа | [Expo SDK 58](https://docs.expo.dev) · React Native 0.88 · React 19 · TypeScript · React Compiler |
| Экраны | [Expo Router](https://docs.expo.dev/router/introduction/) — файл = экран, вкладки, модальные окна, deep links |
| Компоненты | [React Native Reusables](https://reactnativereusables.com) — shadcn/ui для телефона (30 компонентов) |
| Стили | [Uniwind](https://docs.uniwind.dev) — Tailwind 4, светлая и тёмная тема |
| Иконки | [Lucide](https://lucide.dev) |
| Сервер | [TanStack Query](https://tanstack.com/query) + fetch со схемами zod, WebSocket с переподключением |
| Биржевые графики | [TradingView Lightweight Charts](https://tradingview.github.io/lightweight-charts/) — свечи, объём, индикаторы |
| Графики аналитики | [Victory Native XL](https://nearform.com/open-source/victory-native/) + [Skia](https://shopify.github.io/react-native-skia/) |
| Математика | [decimal.js](https://mikemcl.github.io/decimal.js/) (деньги) · [mathjs](https://mathjs.org) · [trading-signals](https://github.com/bennycode/trading-signals) (индикаторы) |
| Статистика | доходность, CAGR, просадка, Шарп, Сортино + отчёт сделок как в [OsEngine](https://github.com/AlexWan/OsEngine) |
| Таблицы и экспорт | [TanStack Table](https://tanstack.com/table) · Excel ([SheetJS](https://sheetjs.com)) · CSV ([Papa Parse](https://www.papaparse.com)) · PDF |
| Состояние | [zustand](https://zustand.docs.pmnd.rs) с сохранением на устройстве |
| Формы | [react-hook-form](https://react-hook-form.com) + [zod](https://zod.dev) |
| База на телефоне | [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) + [Drizzle ORM](https://orm.drizzle.team) с миграциями |
| Секреты | expo-secure-store (Keychain / Keystore) |
| Списки, анимации | FlashList · Reanimated 4 · Gesture Handler · sonner-native |
| Языки | i18next · expo-localization (ru, en) |
| Качество | Jest + Testing Library · ESLint · Prettier |
| Сборка | EAS Build / Submit / Update |

Всё из шаблона работает в **Expo Go** — ставить Xcode и Android Studio не нужно.

## Разработка стартера

```bash
cd template && npm install && npm start   # шаблон — обычное рабочее приложение
npm run check                             # в template/: типы, линтер, тесты
```

Требования магазинов (Google Play, App Store, RuStore и др.) с официальными ссылками — [STORES.md](STORES.md); проверка проекта — `npm run store:check`.

Правила для ИИ-агентов — [AGENTS.md](AGENTS.md). ТЗ-заполнялка для приложения — [PROMT.md](PROMT.md).

MIT

## Сначала ТЗ

Папка [`TechnicalSpecification/`](TechnicalSpecification/README.md) — техническое задание в виде хранилища [Obsidian](https://obsidian.md): заметки по разделам (цвета, шрифты, языки, экраны, где хранятся данные, оплата, публикация, этапы) и карты `.canvas`. Заполните её до кода — по ней ИИ-ассистент развернёт проект. В каждом новом проекте она уже лежит.
