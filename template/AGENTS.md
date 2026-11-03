# AGENTS.md — правила для ИИ-ассистентов в этом проекте

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
- Все строки интерфейса — через `t('…')`, ключи в `src/i18n/ru.ts` (база) и `en.ts`. Тест `src/__tests__/i18n.test.ts` проверяет, что словари совпадают.
- Данные с сервера — TanStack Query + `api(path, zodSchema)` из `src/lib/api.ts`; хуки запросов — в `src/features/<раздел>/api.ts`.
- Глобальное состояние — zustand в `src/stores/`. Настройки сохраняются через `kvStorage`, токены — только через `secureStorage` (`src/lib/storage.ts`).
- Формы — react-hook-form + zod; схемы в `src/lib/validation.ts`, поле — `<FormField>`.
- Локальная база — Drizzle + expo-sqlite: схема `src/db/schema.ts`, запросы — `src/db/<таблица>.ts`, экраны SQL не пишут. Миграции в `src/db/migrations/` генерирует drizzle-kit — руками не править.
- Длинные списки — `FlashList`, не `ScrollView` + `map`.
- Секреты не класть в код и в `EXPO_PUBLIC_*` — эти переменные видны в приложении.

## Правила

- Папок `ios/` и `android/` нет — их генерирует Expo (CNG). Нативные настройки — только через `app.json` и config-плагины.
- Expo Go содержит только встроенные модули. Пакет с нативным кодом не из Expo SDK → нужна dev-сборка (`npm run build:dev`). Предпочитайте модули Expo.
- Проверяйте на обеих платформах: различия iOS/Android — через `Platform.select` или префиксы классов `ios:` / `android:`.
- Перед ответом «готово»: `npm run check` зелёный, новые строки есть в обоих словарях.
