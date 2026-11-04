# AGENTS.md — правила для ИИ-ассистентов в этом проекте

> **Сначала ТЗ.** Папка `TechnicalSpecification/` — техническое задание (хранилище Obsidian). Если в ней заполнены заметки (в `00 Паспорт.md` статус не «черновик» или есть данные) — это главный источник требований: прочитай её целиком по `TechnicalSpecification/README.md` до начала работы, пустые поля реши сам и запиши в `13 Решения и вопросы.md`, а при изменении решений обновляй ТЗ.

> **Платформа и магазины.** Под какие платформы (`Android`, `iOS`) и магазины (Google Play, App Store, RuStore…) пишется приложение — поля `платформы`, `магазины`, `устройства`, `веб_версия` в `TechnicalSpecification/00 Паспорт.md`. Пусто — не начинай, спроси. Стек не меняется: Expo / React Native (не Flutter, не Kotlin/Swift, не сайт). Вход, оплата, сбор данных, разрешения — сначала сверь с правилами выбранных магазинов в `STORES.md` (официальные ссылки). Перед публикацией — `npm run store:check` и чек-лист из `STORES.md`.

Мобильное приложение на **Expo SDK 58** (React Native 0.88, React 19, TypeScript, Expo Router) для Android и iOS. Создано стартером AppJS. Если в корне есть заполненный `PROMT.md` — это ТЗ, работайте по нему этапами.

## Expo меняется — не доверяйте памяти

API Expo меняется каждый SDK. Перед кодом с Expo/EAS/React Native API читайте документацию нужной версии: `https://docs.expo.dev/versions/v58.0.0/` и `https://docs.expo.dev/llms.txt`. В `node_modules/<пакет>/skills/` у многих пакетов есть актуальные инструкции для ИИ.

## Команды

```bash
npx expo install <пакет>   # ВСЕГДА вместо npm install — подбирает версию под SDK
npm start                  # dev-сервер (Expo Go по QR), npm run tunnel — через интернет
npm run check              # типы + линтер + тесты: обязательно перед тем, как сказать «готово»
npm run format             # prettier
npm run db:generate        # миграция после правки src/db/schema.ts
npx expo export --platform android --platform ios   # проверка, что бандлы собираются
```

На Windows в PowerShell вызывайте `npx.cmd` / `npm.cmd`, если `npx` блокируется политикой выполнения.

## Устройство проекта

- `src/app/` — только экраны (Expo Router). Остальной код — вне `src/app/`.
- UI — компоненты из `src/components/ui/` (React Native Reusables, shadcn-стиль). Новые — `npx shadcn@latest add https://reactnativereusables.com/r/uniwind/<имя>.json`. Не пишите свои кнопки/диалоги, если есть готовые.
- Стили — классы Tailwind через **Uniwind** (`className`). Цвета только из темы (`bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `border-border` …), без жёстких `#hex` — иначе сломается тёмная тема. Тема — `src/global.css`; для навигации те же цвета в `src/lib/theme.ts`. Условные классы — `cn()` из `@/lib/utils`.
- Текст — только `<Text>` из `@/components/ui/text` (RN не позволяет текст вне `<Text>`). Иконки — `<Icon as={ИмяИзLucide} />`.
- Все строки интерфейса — через `t('…')`, ключи в `src/i18n/locales/ru.json` (база) и остальных `*.json`; новый язык — `npm run i18n -- add <код>`; `npm run i18n -- check` ловит забытые ключи и текст без перевода. Числа, деньги, даты — через Intl с языком пользователя, не склеивать строки руками. Отступы — `ps-`/`pe-` (start/end), а не `pl-`/`pr-`, чтобы работало письмо справа налево.
- Данные с сервера — TanStack Query + `api(path, zodSchema)` из `src/lib/api.ts`; хуки запросов — в `src/features/<раздел>/api.ts`.
- Глобальное состояние — zustand в `src/stores/`. Настройки сохраняются через `kvStorage`, токены — только через `secureStorage` (`src/lib/storage.ts`).
- Формы — react-hook-form + zod; схемы в `src/lib/validation.ts`, поле — `<FormField>`.
- Локальная база — Drizzle + expo-sqlite: схема `src/db/schema.ts`, запросы — `src/db/<таблица>.ts`, экраны SQL не пишут. Миграции в `src/db/migrations/` генерирует drizzle-kit — руками не править.
- Живые потоки (WebSocket) — только через `throttleLatest` / `batchByKey` (`src/lib/throttle.ts`): не больше 4–10 обновлений экрана в секунду.
- Бэкенд — по выбору при создании (`--backend`): `server/` (свой сервер, свой README) или `supabase/`. Вход — только через `useAuth`, заголовки — `authHeaders()`; секреты сервера и ключи бирж — никогда в приложении.
- Длинные списки — `FlashList`, не `ScrollView` + `map`; таблицы — `DataTable` (TanStack Table).
- **Деньги, цены, количества — только Decimal** (`D()` из `src/lib/decimal.ts`), хранить строками; `number` — только для статистики и графиков.
- Графики — только из `@/components/charts` (там же веб-версия, которая ждёт загрузки Skia). Цвета — `useChartTheme()`. `CandleChart` — Expo DOM component (`'use dom'`): пропсы только JSON-данные.
- Рыночные данные — через `MarketSource` (`src/features/market`); новая биржа = новый адаптер. Торговые API-ключи — никогда в приложении, только на сервере.
- Статистика сделок — `src/lib/deal-stats.ts` (перенос `DealStatisticGenerator.cs` из OsEngine; формулы не менять без сверки с OsEngine), метрики капитала — `src/lib/finance.ts`. Новая формула — с тестом в `src/__tests__/finance.test.ts`.
- Запросы Drizzle ленивые: в репозиториях всегда `await` (иначе запрос не выполнится). `DELETE` — всегда с `where`, иначе `useLiveQuery` не узнает об удалении.
- Секреты не класть в код и в `EXPO_PUBLIC_*` — эти переменные видны в приложении.

## Правила

- Папок `ios/` и `android/` нет — их генерирует Expo (CNG). Нативные настройки — только через `app.json` и config-плагины.
- Expo Go содержит только встроенные модули. Пакет с нативным кодом не из Expo SDK → нужна dev-сборка (`npm run build:dev`). Предпочитайте модули Expo.
- Проверяйте на обеих платформах: различия iOS/Android — через `Platform.select` или префиксы классов `ios:` / `android:`.
- Перед ответом «готово»: `npm run check` зелёный, новые строки есть в обоих словарях.
