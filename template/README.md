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

| Задача             | Библиотека                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| Платформа          | [Expo SDK 58](https://docs.expo.dev) + React Native 0.88 + React 19 + TypeScript                           |
| Экраны, навигация  | [Expo Router](https://docs.expo.dev/router/introduction/) — файл = экран                                   |
| Компоненты         | [React Native Reusables](https://reactnativereusables.com) — shadcn/ui для телефона                        |
| Стили              | [Uniwind](https://docs.uniwind.dev) — Tailwind 4 в React Native, светлая/тёмная тема                       |
| Иконки             | [Lucide](https://lucide.dev) (`lucide-react-native`)                                                       |
| Данные с сервера   | [TanStack Query](https://tanstack.com/query) — кэш, повтор, обновление                                     |
| Состояние          | [zustand](https://zustand.docs.pmnd.rs) + сохранение на устройстве                                         |
| Формы и проверка   | [react-hook-form](https://react-hook-form.com) + [zod](https://zod.dev)                                    |
| Локальная база     | [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) + [Drizzle ORM](https://orm.drizzle.team) |
| Секреты, токены    | expo-secure-store (Keychain / Keystore)                                                                    |
| Списки             | [FlashList](https://shopify.github.io/flash-list/)                                                         |
| Анимации, жесты    | Reanimated 4 + Gesture Handler                                                                             |
| Уведомления в app  | [sonner-native](https://github.com/gunnartorfis/sonner-native)                                             |
| Языки              | i18next + react-i18next + expo-localization                                                                |
| Вибрация, картинки | expo-haptics, expo-image                                                                                   |
| Тесты, качество    | Jest (jest-expo) + Testing Library, ESLint, Prettier                                                       |
| Сборка, публикация | EAS Build / Submit / Update                                                                                |

## Где что лежит

```
src/
  app/                 экраны: файл = адрес (Expo Router)
    _layout.tsx        корень: база, провайдеры, стек экранов
    (tabs)/            нижние вкладки: index, notes, feed, settings
    note/[id].tsx      экран с параметром: /note/5
    sign-in.tsx        модальное окно входа
  components/ui/       компоненты Reusables (Button, Card, Dialog, Select, …)
  components/app/      свои общие компоненты (Screen, EmptyState, FormField…)
  features/            код по разделам приложения (feed/api.ts — запросы ленты)
  db/                  схема SQLite, миграции, запросы (notes.ts)
  stores/              zustand: настройки (тема, язык), вход
  lib/                 api.ts, storage.ts, validation.ts, haptics.ts, theme.ts
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

**Свой сервер.** Адрес — `EXPO_PUBLIC_API_URL` в `.env` (см. `.env.example`). Запрос: `api('/path', zodSchema)` из `src/lib/api.ts`, обёрнутый в `useQuery` — как в `src/features/feed/api.ts`. Настоящий вход — в `src/stores/auth.ts` (`signIn`).

**Таблица в базе.** Добавьте её в `src/db/schema.ts` → `npm run db:generate` → запросы рядом, как в `src/db/notes.ts`. Миграция применится сама при запуске.

**Новый язык.** Скопируйте `src/i18n/en.ts` → `de.ts`, переведите, добавьте в `LANGUAGES` в `src/i18n/index.ts`.

**Нативный модуль, которого нет в Expo Go** (MMKV, Stripe, камера с ML и т. п.): `npx expo install <пакет>` → `npm run build:dev` → установите эту сборку на телефон вместо Expo Go. Дальше всё как раньше: `npm start`, изменения сразу.

**Пуш-уведомления.** `npx expo install expo-notifications` — на Android работают только в dev-сборке, не в Expo Go.

## Веб-версия

`npm run web` — для отладки вёрстки. База SQLite в браузере работает через WebAssembly и требует заголовков COOP/COEP (уже настроены в `metro.config.js` и `app.json`); при первом открытии адрес на секунду сменится на `/index.html` — так задумано.
