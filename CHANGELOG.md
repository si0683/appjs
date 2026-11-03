# Changelog

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
